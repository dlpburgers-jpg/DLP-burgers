import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';

const root='release-static';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifestPath='docs/release-static-sha256.json';
const previousManifest=JSON.parse(readFileSync(manifestPath,'utf8'));
for(const [path,expected] of Object.entries(previousManifest)){
  if(hash(readFileSync(join(root,path)))!==expected)throw Error('Unreviewed release change: '+path);
}
const css=readFileSync('src/components/PopularMosaic.css','utf8');
const asset='assets/popular-mosaic-'+hash(css).slice(0,12)+'.css';
let html=readFileSync(join(root,'index.html'),'utf8').replace(/\r/g,'');
let sw=readFileSync(join(root,'sw.js'),'utf8').replace(/\r/g,'').replace(/[ \t]+$/gm,'');
const script=html.match(/<script[^>]+src="\.\/([^"\s]+)"/)[1];
if(hash(readFileSync(join(root,script)))!=='b3be5f472a5807cdf411df826ba17e3dc3e93fca8273417ec635c602299ff197')throw Error('Unexpected application baseline');
html=html.replace(/[ \t]*<link\b[^>]*href="\.\/assets\/popular-mosaic-[^"]+"[^>]*>[ \t]*\n?/g,'').replace(/[ \t]+$/gm,'');
html=html.replace('</head>',`  <link rel="stylesheet" href="./${asset}">\n</head>`);
const fileMatch=sw.match(/const FILES = (\[[^;]+\]);/);
if(!fileMatch)throw Error('Missing worker resource list');
const files=JSON.parse(fileMatch[1]).filter(path=>!path.startsWith('./assets/popular-mosaic-'));
files.push('./'+asset);
sw=sw.replace(fileMatch[0],`const FILES = ${JSON.stringify(files)};`);
sw=sw.replace(/const CACHE = 'dlp-v5-[a-f0-9]+';/,`const CACHE = 'dlp-v5-${hash(html+css).slice(0,12)}';`);
const events=new Set();
runInNewContext(sw,{self:{addEventListener:type=>events.add(type)}},{timeout:1000});
if(!['install','activate','fetch','push','notificationclick','message'].every(type=>events.has(type)))throw Error('Worker lifecycle changed');
writeFileSync(join(root,asset),css);
writeFileSync(join(root,'index.html'),html);
writeFileSync(join(root,'sw.js'),sw);
const walk=(dir,prefix='')=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name),prefix+entry.name+'/'):[prefix+entry.name]);
const manifest=Object.fromEntries(walk(root).sort().map(path=>[path,hash(readFileSync(join(root,path)))]));
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
for(const [path,expected] of Object.entries(previousManifest))if(path!=='index.html'&&path!=='sw.js'&&manifest[path]!==expected)throw Error('Unexpected resource modification: '+path);
console.log(JSON.stringify({asset,sha256:hash(css),unchangedApplication:script,resources:Object.keys(manifest).length}));
