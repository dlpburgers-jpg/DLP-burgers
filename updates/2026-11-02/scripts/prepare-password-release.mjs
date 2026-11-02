import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
import {transformSync} from 'rolldown/utils';
const hash=s=>createHash('sha256').update(s).digest('hex');
function edit(path,a,b){let s=readFileSync(path,'utf8');if(s.split(a).length!==2)throw Error('Source anchor changed: '+path);writeFileSync(path,s.replace(a,b));}
edit('src/components/PhoneRegistration.jsx','<label className="field"><span>Contraseña</span><input type="password" required minLength={8} maxLength={64} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>','<PasswordInput required minLength={8} maxLength={64} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/>');
edit('src/components/PhoneRegistration.jsx','</fieldset>{error&&','</fieldset><PasswordRecoveryHelp identifier={profile.phone}/>{error&&');
edit('src/AppV5.jsx',"import PhoneRegistration from './components/PhoneRegistration';","import PhoneRegistration from './components/PhoneRegistration';\nimport PasswordInput,{PasswordRecoveryHelp} from './components/PasswordInput';");
edit('src/AppV5.jsx','<Field label="Contraseña" type="password" required minLength={8} autoComplete="current-password" value={account.password} onChange={e=>setAccount(a=>({...a,password:e.target.value}))} />','<PasswordInput key={signup?\'signup-password\':\'login-password\'} required minLength={8} autoComplete={signup?\'new-password\':\'current-password\'} value={account.password} onChange={e=>setAccount(a=>({...a,password:e.target.value}))} />');
edit('src/AppV5.jsx',"{authReady&&!session&&!signup&&!account.email.includes('@')&&<p className=\"muted\">Los usuarios internos ingresan con su nombre de usuario. <a href={recoveryWhatsapp()} target=\"_blank\" rel=\"noopener noreferrer\">Recuperar acceso por WhatsApp</a></p>}","{authReady&&(!session||session.user.is_anonymous)&&!signup&&<PasswordRecoveryHelp identifier={account.email}/>}");
const root='release-static',old='assets/app-presence-19d7fbce0033.js';let app=readFileSync(join(root,old),'utf8');
if(hash(app)!=='19d7fbce00335c8112ee57c24adb3491a9815b6864656ebc137c2d384d4f41a4')throw Error('Base release changed');
function compile(path){const source=readFileSync(path,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export default ','').replaceAll('export function ','function ');const r=transformSync(path,source,{jsx:{runtime:'classic',pragma:'m.createElement',pragmaFrag:'m.Fragment'}});if(r.errors.length)throw Error('JSX compilation failed');return r.code;}
const nodes=parse(app,{ecmaVersion:'latest',sourceType:'module'}).body;
const registration=nodes.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='Yl'));
if(!registration)throw Error('Registration component missing');
const replacement=`const Yl=(()=>{const {useState,useRef}=m;const ProfileFields=Sc,emptyProfile=vc,profileError=yc,normalizeCustomerPhone=nl,registrationAction=al,PasswordInput=DlpPasswordInput,PasswordRecoveryHelp=DlpPasswordRecovery;const storageKey=s=>s==='pending-registration'?Gl:Kl;${compile('src/components/PhoneRegistration.jsx')};return PhoneRegistration})();`;
app=app.slice(0,registration.start)+replacement+app.slice(registration.end);
function change(a,b){if(app.split(a).length!==2)throw Error('Bundle anchor changed: '+a);app=app.replace(a,()=>b);}
const ui=`const {PasswordInput:DlpPasswordInput,PasswordRecoveryHelp:DlpPasswordRecovery}=(()=>{const {useState,useId}=m;const recoveryWhatsapp=sl;${compile('src/components/PasswordInput.jsx')};return {PasswordInput,PasswordRecoveryHelp}})();`;
change('const Yl=',ui+'\nconst Yl=');
change('(0,q.jsx)(Z_,{label:`Contraseña`,type:`password`,required:!0,minLength:8,autoComplete:`current-password`,value:we.password,onChange:e=>Te(t=>({...t,password:e.target.value}))})','(0,q.jsx)(DlpPasswordInput,{required:!0,minLength:8,autoComplete:pe?`new-password`:`current-password`,value:we.password,onChange:e=>Te(t=>({...t,password:e.target.value}))},pe?`signup-password`:`login-password`)');
change('be&&!x&&!pe&&!we.email.includes(`@`)&&(0,q.jsxs)(`p`,{className:`muted`,children:[`Los usuarios internos ingresan con su nombre de usuario. `,(0,q.jsx)(`a`,{href:sl(),target:`_blank`,rel:`noopener noreferrer`,children:`Recuperar acceso por WhatsApp`})]})','be&&(!x||x.user.is_anonymous)&&!pe&&(0,q.jsx)(DlpPasswordRecovery,{identifier:we.email})');
// Keep the configured WhatsApp destination; replace only the prepared message helper.
const slNode=parse(app,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='sl');
const oldFunction=app.slice(slNode.start,slNode.end);
const link=oldFunction.match(/return`\$\{([^}]+)\}\?text=/)?.[1];
if(!link)throw Error('Recovery destination helper changed');
const fn=`function sl(identifier=''){const account=String(identifier||'').trim().slice(0,254);const message='Hola DLP. Olvidé mi contraseña y solicito una clave provisoria para recuperar el acceso a mi cuenta.'+(account?'\\nCelular, correo o usuario de la cuenta: '+account:'')+'\\nEscribo desde mi celular registrado para que puedan verificar mi identidad.';return ${link}+'?text='+encodeURIComponent(message)}`;
app=app.slice(0,slNode.start)+fn+app.slice(slNode.end);
parse(app,{ecmaVersion:'latest',sourceType:'module'});
const asset='assets/app-password-'+hash(app).slice(0,12)+'.js';let html=readFileSync(join(root,'index.html'),'utf8'),sw=readFileSync(join(root,'sw.js'),'utf8');
if(!html.includes(old)||!sw.includes(old))throw Error('Entrypoint changed');
html=html.replace(old,asset);sw=sw.replace(old,asset).replace(/const CACHE = 'dlp-v5-[a-f0-9]+';/,"const CACHE = 'dlp-v5-"+hash(app+html+sw).slice(0,12)+"';");
writeFileSync(join(root,asset),app);writeFileSync(join(root,'index.html'),html);writeFileSync(join(root,'sw.js'),sw);
const walk=(d,p='')=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name),p+e.name+'/'):[p+e.name]);
writeFileSync('docs/release-static-sha256.json',JSON.stringify(Object.fromEntries(walk(root).sort().map(p=>[p,hash(readFileSync(join(root,p)))])),null,2)+'\n');
writeFileSync('scripts/build-reviewed-release.mjs',readFileSync('scripts/build-reviewed-release.mjs','utf8').replace(old.split('/')[1],asset.split('/')[1]));
console.log(JSON.stringify({asset,sha256:hash(app)}));
