import test from 'node:test';
import assert from 'node:assert/strict';
import {startPresence,presencePlatform} from '../src/lib/presence.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 let auth,tick,serial=0;const requests=[],events=new Map(),timeouts=[];
 const page={hidden:false,addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const browser={crypto:{randomUUID:()=>`token-${++serial}`},navigator:{userAgent:'iPhone'},setTimeout:f=>timeouts.push(f),setInterval:f=>(tick=f,1),clearInterval:()=>tick=null,addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const client={rpc:async(name,args)=>{requests.push({name,...args});return {data:null};},auth:{onAuthStateChange:f=>(auth=f,{data:{subscription:{unsubscribe:()=>auth=null}}})}};
 return {page,browser,client,requests,events,get tick(){return tick;},login:async id=>{auth('INITIAL_SESSION',id?{user:{id}}:null);timeouts.splice(0).forEach(f=>f());await flush();}};
}
test('Presence waits for auth, sends no claimed identity, and expires hidden tabs',async()=>{
 const f=fixture(),stop=startPresence(f.client,f.browser,f.page);
 assert.equal(f.requests.length,0);await f.login(null);assert.equal(f.requests.length,1);
 assert.equal(f.requests[0].p_platform,'ios');assert.equal(f.requests[0].p_active,true);assert.equal(f.requests[0].user_id,undefined);
 const token=f.requests[0].p_session;await f.login(null);assert.equal(f.requests.length,1);
 f.page.hidden=true;f.events.get('visibilitychange')();await flush();assert.equal(f.requests.at(-1).p_active,false);
 f.page.hidden=false;await f.login('user-a');assert.notEqual(f.requests.at(-1).p_session,token);
 stop();assert.equal(f.tick,null);assert.equal(f.events.size,0);
});
test('Network failure never blocks the app and later pings recover',async()=>{
 const f=fixture();let calls=0;f.client.rpc=async()=>{calls++;throw Error('offline');};
 const stop=startPresence(f.client,f.browser,f.page);await f.login(null);f.tick();await flush();assert.equal(calls,2);stop();
});
test('Platform distinguishes native, mobile browser and desktop without sending user agent',()=>{
 assert.equal(presencePlatform({Capacitor:{getPlatform:()=> 'android'}}),'android');
 assert.equal(presencePlatform({navigator:{userAgent:'Macintosh',maxTouchPoints:5}}),'ios');
 assert.equal(presencePlatform({navigator:{userAgent:'Windows'}}),'web');
});
