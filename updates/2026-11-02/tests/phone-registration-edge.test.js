import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {normalizeCustomerPhone} from '../supabase/functions/_shared/phoneIdentity.js';
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/dlp-users/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,''));
const id='10000000-0000-4000-8000-000000000001';
const profile={first_name:'Test',last_name:'Account',birthday_month:1,birthday_day:1,phone:'2241699774',address:'Test address 123',lat:-35.57,lng:-58.01};
function runtime({admin=false,request=null,reserved=null,rate=true,target=null,passwordOK=false}={}){
 let handler;const writes=[],logins=[];
 const query={select(){return this;},eq(){return this;},not(){return this;},async maybeSingle(){return {data:request};}};
 const db={
  rpc:async name=>({data:name==='dlp_phone_login_allowed'?rate:{user_id:reserved}}),from:()=>query,
  auth:{admin:{
   createUser:async data=>{writes.push(data);return {data:{user:{id}}};},
   getUserById:async()=>({data:{user:target}}),
   updateUserById:async(_,data)=>{writes.push(data);return {data:{user:{id}}};}
  }}
 };
 const client={rpc:async()=>({data:admin}),auth:{getUser:async()=>({data:{user:{id:'actor',is_anonymous:false}}}),signInWithPassword:async data=>{logins.push(data);return passwordOK?{data:{session:{access_token:'test',refresh_token:'test'},user:{id}}}:{error:{message:'Invalid credentials'}};}}};
 runInNewContext(source,{createClient:(_url,key)=>key==='service'?db:client,normalizeCustomerPhone,Deno:{env:{get:key=>({SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'}[key])},serve:fn=>{handler=fn;}},Request,Response,TextEncoder,crypto});
 return {writes,logins,call:async(body,authorized=false,origin='https://dlpburgers.com')=>{
  const result=await handler(new Request('https://example.invalid',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(authorized?{Authorization:'Bearer test'}:{})},body:JSON.stringify(body)}));
  return {status:result.status,body:await result.json()};
 }};
}
test('Registration creates an enabled internal identity without issuing a session',async()=>{
 const server=runtime();const result=await server.call({action:'register_phone',requestId:id,profile,password:'test-password',privacyAccepted:true});
 assert.equal(result.status,200);assert.equal(result.body.pending,false);assert.equal(result.body.created,true);assert.equal(result.body.session,undefined);
 assert.equal(server.writes[0].email,`reg-${id}@cuentas.dlpburgers.com`);
 assert.equal(server.writes[0].email_confirm,true);assert.equal(server.writes[0].app_metadata.dlp_manual_registration.approved,true);
 assert.equal(server.writes[0].app_metadata.dlp_manual_registration.method,'automatic');
 assert.equal(server.writes[0].app_metadata.dlp_manual_registration.phone,'+5492241699774');
});

test('Retry returns the same enabled registration without duplicating users or changing passwords',async()=>{
 const server=runtime({reserved:id,target:{id,app_metadata:{dlp_manual_registration:{request:id,phone:'+5492241699774',approved:true}}}});
 const result=await server.call({action:'register_phone',requestId:id,profile,password:'different-password',privacyAccepted:true});
 assert.equal(result.status,200);assert.equal(result.body.created,true);assert.equal(server.writes.length,0);
});
test('A retry can finish a matching pending account without changing its password',async()=>{
 const server=runtime({reserved:id,target:{id,app_metadata:{dlp_manual_registration:{request:id,phone:'+5492241699774',approved:false}}}});
 const result=await server.call({action:'register_phone',requestId:id,profile,password:'different-password',privacyAccepted:true});
 assert.equal(result.status,200);assert.equal(server.writes.length,1);
 assert.equal(server.writes[0].password,undefined);assert.equal(server.writes[0].email_confirm,true);
});
test('Retry cannot enable an unrelated registration',async()=>{
 const server=runtime({reserved:id,target:{id,app_metadata:{dlp_manual_registration:{request:'different',phone:'+5492241699774',approved:false}}}});
 const result=await server.call({action:'register_phone',requestId:id,profile,password:'different-password',privacyAccepted:true});
 assert.equal(result.status,500);assert.equal(server.writes.length,0);
});
test('Registration refuses missing privacy acceptance without creating anything',async()=>{
 const server=runtime();assert.equal((await server.call({action:'register_phone',requestId:id,profile,password:'test-password'})).status,400);assert.equal(server.writes.length,0);
});

test('Installed legacy iOS app receives actionable success, never false failure or pending approval',async()=>{
 const server=runtime();const result=await server.call({action:'register_phone',requestId:id,profile,password:'test-password',privacyAccepted:true},false,'capacitor://localhost');
 assert.equal(result.status,200);assert.equal(result.body.created,true);assert.equal(result.body.pending,false);
 assert.equal(result.body.code,'account_created');assert.match(result.body.error,/ya está creada y habilitada/);assert.match(result.body.error,/Ya tengo cuenta/);
 assert.doesNotMatch(result.body.error,/No pudimos confirmar|Reintentá/);
 assert.equal(server.writes[0].app_metadata.dlp_manual_registration.approved,true);
});
test('Updated native client gets normal success without legacy banner',async()=>{
 const server=runtime();const result=await server.call({action:'register_phone',registrationVersion:2,requestId:id,profile,password:'test-password',privacyAccepted:true},false,'capacitor://localhost');
 assert.equal(result.status,200);assert.equal(result.body.created,true);assert.equal(result.body.pending,false);assert.equal(result.body.error,undefined);
});
test('Legacy native retry returns the same success message without creating or resetting anything',async()=>{
 const server=runtime({reserved:id,target:{id,app_metadata:{dlp_manual_registration:{request:id,phone:'+5492241699774',approved:true}}}});
 const result=await server.call({action:'register_phone',requestId:id,profile,password:'test-password',privacyAccepted:true},false,'capacitor://localhost');
 assert.equal(result.body.code,'account_created');assert.equal(server.writes.length,0);
});
test('Only administrators can approve accounts',async()=>{
 const server=runtime();assert.equal((await server.call({action:'approve_registration',requestId:id,senderVerified:true},true)).status,403);assert.equal(server.writes.length,0);
});
test('Approval also requires the sender verification checkbox',async()=>{
 const server=runtime({admin:true});assert.equal((await server.call({action:'approve_registration',requestId:id},true)).status,400);assert.equal(server.writes.length,0);
});
test('Pending accounts cannot authenticate even with a valid password',async()=>{
 const server=runtime({request:{user_id:id,approved_at:null},passwordOK:true});assert.equal((await server.call({action:'login_phone',phone:profile.phone,password:'test-password'})).status,401);assert.equal(server.logins.length,0);
});
test('Approved accounts still require a correct password',async()=>{
 const server=runtime({request:{user_id:id,approved_at:'now'},target:{id,email:'internal@example.invalid',app_metadata:{dlp_manual_registration:{approved:true}}}});
 assert.equal((await server.call({action:'login_phone',phone:profile.phone,password:'wrong'})).status,401);assert.equal(server.logins.length,1);
});
test('Login rate limit prevents calling Auth',async()=>{
 const server=runtime({rate:false});assert.equal((await server.call({action:'login_phone',phone:profile.phone,password:'test-password'})).status,429);assert.equal(server.logins.length,0);
});
