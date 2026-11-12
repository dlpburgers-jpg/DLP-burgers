# Publicación en Cloudflare Pages

Proyecto de Cloudflare Pages: `dlp-burgers` (cuenta de DLP Burgers).

- Comando de compilación: `node cloudflare/build.mjs`
- Carpeta de salida: `dist`

`build.mjs` copia a `dist/` solo los archivos listados en `deploy-manifest.json` y verifica
su SHA-256. Si un archivo falta o cambió sin actualizar el manifiesto, la compilación falla y
no se publica nada.

## Cómo publicar un cambio

1. Agregar o reemplazar los archivos compilados.
2. Actualizar `deploy-manifest.json` con los SHA-256 nuevos (y la entrada de `index.html`).
3. Revisar la vista previa de la rama en `*.dlp-burgers.pages.dev` antes de pasar a `main`.

Hasta que se mueva el DNS, dlpburgers.com sigue servido por ChatGPT Sites.
