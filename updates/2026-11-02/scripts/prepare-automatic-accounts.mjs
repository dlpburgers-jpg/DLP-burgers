import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
import {transformSync} from 'rolldown/utils';
const hash=s=>createHash('sha256').update(s).digest('hex');
const old='assets/app-guest-tables-8b7048d8e6dc.js',root='release-static';
let app=readFileSync(join(root,old),'utf8');
if(hash(app)!=='8b7048d8e6dca3539eafca8bbfc3119734583886a8ac3905a18d0915bd0e5eef')throw Error('Base release changed');
function component(file,bindings,componentName){
 const source=readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export default /g,'').replace(/export function /g,'function ');
 const transformed=transformSync(file,source,{jsx:{runtime:'classic',pragma:'m.createElement',pragmaFrag:'m.Fragment'}});
 if(transformed.errors.length)throw Error(JSON.stringify(transformed.errors));
 const built=transformed.code;
 return `(()=>{${bindings};${built};return ${componentName}})()`;
}
const nodes=parse(app,{ecmaVersion:'latest',sourceType:'module'}).body;
for(const [name,replacement] of [
 ['Ph',`const Ph=${component('src/components/CreatedAccounts.jsx','const {useState,useEffect}=m;const supabase=Z','CreatedAccounts')};`],
 ['Yl',`const Yl=${component('src/components/PhoneRegistration.jsx','const {useState,useRef}=m;const ProfileFields=Sc,emptyProfile=vc,profileError=yc,normalizeCustomerPhone=nl,registrationAction=al;const storageKey=s=>s===\'pending-registration\'?Gl:Kl','PhoneRegistration')};`]
].sort((a,b)=>nodes.find(n=>n.id?.name===b[0]).start-nodes.find(n=>n.id?.name===a[0]).start)){
 const node=nodes.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);
 if(!node)throw Error('Missing component '+name);
 app=app.slice(0,node.start)+replacement+app.slice(node.end);
}
function change(a,b,count=1){if(app.split(a).length!==count+1)throw Error('Anchor changed: '+a);app=app.split(a).join(b);}
change('activation`,`Habilitar cuenta`','activation`,`Cuentas creadas`');
change('activation:`Habilitar cuenta`','activation:`Cuentas creadas`');
change('Habilitar cuentas nuevas','Cuentas creadas');
change('Verificá que el WhatsApp recibido coincida con el número de la solicitud.','Consultá las cuentas registradas por día.');
parse(app,{ecmaVersion:'latest',sourceType:'module'});
const asset='assets/app-auto-accounts-'+hash(app).slice(0,12)+'.js';
let html=readFileSync(join(root,'index.html'),'utf8'),sw=readFileSync(join(root,'sw.js'),'utf8');
if(!html.includes(old)||!sw.includes(old))throw Error('Entrypoint changed');
html=html.replace(old,asset);sw=sw.replace(old,asset).replace(/const CACHE = 'dlp-v5-[a-f0-9]+';/,"const CACHE = 'dlp-v5-"+hash(app+html+sw).slice(0,12)+"';");
writeFileSync(join(root,asset),app);writeFileSync(join(root,'index.html'),html);writeFileSync(join(root,'sw.js'),sw);
const walk=(d,p='')=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name),p+e.name+'/'):[p+e.name]);
writeFileSync('docs/release-static-sha256.json',JSON.stringify(Object.fromEntries(walk(root).sort().map(p=>[p,hash(readFileSync(join(root,p)))])),null,2)+'\n');
writeFileSync('scripts/build-reviewed-release.mjs',readFileSync('scripts/build-reviewed-release.mjs','utf8').replace(old.split('/')[1],asset.split('/')[1]));
console.log(JSON.stringify({asset,sha256:hash(app)}));
