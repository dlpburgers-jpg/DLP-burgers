// Prepare the reviewed web runtime for a NEW signed iOS build, without rebuilding
// unrelated historical source differences. Run before `npx cap sync ios` on macOS.
import './build-reviewed-release.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
let html=readFileSync('dist/index.html','utf8');
const old=html.match(/src="\.\/(assets\/app-auto-accounts-[^"]+)"/)?.[1];
if(!old)throw Error('Review the current release before preparing iOS');
let code=readFileSync('dist/'+old,'utf8');
const anchor='action: "register_phone",';
if(code.split(anchor).length!==2)throw Error('Registration component changed');
code=code.replace(anchor,anchor+'\n                registrationVersion: 2,');
parse(code,{ecmaVersion:'latest',sourceType:'module'});
const hash=createHash('sha256').update(code).digest('hex');
const asset='assets/app-ios-registration-'+hash.slice(0,12)+'.js';
writeFileSync('dist/'+asset,code);
writeFileSync('dist/index.html',html.replace(old,asset));
writeFileSync('dist/sw.js',readFileSync('dist/sw.js','utf8').replace(old,asset).replace(/const CACHE = '[^']+';/,"const CACHE = 'dlp-v5-ios-"+hash.slice(0,12)+"';"));
console.log(JSON.stringify({asset,sha256:hash,note:'Prepared resources only; requires macOS signing and TestFlight/App Store publication.'}));
