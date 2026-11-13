// Arma la carpeta que publica Cloudflare Pages para dlpburgers.com.
// Copia SOLO los archivos listados en deploy-manifest.json y verifica su SHA-256.
// Si un archivo falta o cambió sin actualizar el manifiesto, la publicación falla
// y el sitio en producción queda como estaba.
// Comando de build en Cloudflare: node cloudflare/build.mjs   ·   Salida: dist
import {readFileSync, writeFileSync, mkdirSync, rmSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'dist');
const manifest = JSON.parse(readFileSync(join(root, 'cloudflare', 'deploy-manifest.json'), 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');

rmSync(out, {recursive: true, force: true});
const errors = [];
for (const [path, expected] of Object.entries(manifest)) {
  if (path.includes('..') || path.startsWith('/')) { errors.push('Ruta inválida: ' + path); continue; }
  const src = join(root, path);
  if (!existsSync(src)) { errors.push('Falta: ' + path); continue; }
  const bytes = readFileSync(src);
  if (sha(bytes) !== expected) { errors.push('Cambió sin revisar: ' + path); continue; }
  mkdirSync(dirname(join(out, path)), {recursive: true});
  writeFileSync(join(out, path), bytes);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

// SEGURO DE PRUEBAS: esta rama apunta a la base de pruebas (jpajoiijbeypselvqmza).
// Si alguna vez se uniera a main, la publicación de producción se cancela.
if (readFileSync(join(out, 'assets/BrandLogo-BiGP6jCE.js'), 'utf8').includes('jpajoiijbeypselvqmza') && (process.env.CF_PAGES_BRANCH || 'main') !== 'pruebas-no-unir') {
  console.error('Esta versión apunta a la base de PRUEBAS: solo se publica en la rama pruebas-no-unir.');
  process.exit(1);
}

// El HTML debe apuntar al punto de entrada que está en el manifiesto.
const html = readFileSync(join(out, 'index.html'), 'utf8');
const entry = html.match(/<script[^>]+src="\.\/([^"]+\.js)"/)?.[1];
if (!entry || !manifest[entry]) { console.error('index.html apunta a un archivo fuera del manifiesto: ' + entry); process.exit(1); }

// Cabeceras: el HTML y el service worker siempre se revalidan; los assets con hash se cachean largo.
writeFileSync(join(out, '_headers'), [
  '/', '  Cache-Control: public, max-age=0, must-revalidate',
  '/index.html', '  Cache-Control: public, max-age=0, must-revalidate',
  '/sw.js', '  Cache-Control: public, max-age=0, must-revalidate',
  '/menu/*', '  Cache-Control: public, max-age=0, must-revalidate',
  '/assets/*', '  Cache-Control: public, max-age=31536000, immutable',
  ''].join('\n'));
// Direcciones inexistentes: 404 real (como ChatGPT Sites), en lugar de devolver la app con 200.
writeFileSync(join(out, '404.html'), '<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1"><title>No encontrado · DLP Burgers</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:3rem 1rem"><h1>Página no encontrada</h1><p><a href="/">Ir a DLP Burgers</a></p></body></html>\n');

// El service worker precarga ./index.html: se sirve sin la redirección automática a "/".
writeFileSync(join(out, '_redirects'), ['/index.html / 200', '/menu/index.html /menu/ 200', ''].join('\n'));

console.log(`Listo: ${Object.keys(manifest).length} archivos verificados en dist/ (entrada ${entry}).`);
