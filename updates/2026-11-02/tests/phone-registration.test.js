import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeCustomerPhone,registrationMessage} from '../supabase/functions/_shared/phoneIdentity.js';
import {accountIdentifier,normalizeLoginIdentifier} from '../src/lib/staffLogin.js';
import {temporaryAccessMessage} from '../src/lib/temporaryPassword.js';
test('Argentine phone variants produce one login identity',()=>{
 for(const input of ['2241699774','02241699774','54 2241 699774','+54 2241 699774','+5492241699774','005492241699774'])assert.equal(normalizeCustomerPhone(input),'+5492241699774');
 for(const input of ['','abc','2241 15 699774','+11234567890','123','+549224169977499','22<script>41699774'])assert.throws(()=>normalizeCustomerPhone(input));
});
test('WhatsApp receipt contains no credentials and retains the complete request',()=>{
 const receipt={name:'Cliente Prueba',phone:'+5492241699774',requestId:'10000000-0000-4000-8000-000000000001',password:'secret'};
 const message=registrationMessage(receipt);
 assert.ok(message.includes(receipt.requestId));assert.ok(message.includes(receipt.phone));assert.ok(!message.includes('secret'));
});
test('Existing email and staff login remain compatible; phone accounts display a phone',()=>{
 assert.equal(normalizeLoginIdentifier('COCINA'),'cocina@usuarios.dlpburgers.com');
 assert.equal(normalizeLoginIdentifier('A@EXAMPLE.COM'),'a@example.com');
 assert.equal(accountIdentifier({phone:'+5492241699774'}),'+5492241699774');
 assert.match(temporaryAccessMessage({name:'Ana',phone:'+5492241699774',password:'temporary'}),/Celular: \+5492241699774/);
});
test('Rollout defaults off and pending data are not public',()=>{
 const sql=readFileSync(new URL('../supabase/083_manual_registration.sql',import.meta.url),'utf8');
 assert.match(sql,/"enabled":false,"configured":false/);
 assert.match(sql,/revoke all on public\.dlp_registration_requests from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.dlp_reserve_registration\(uuid,text,text\) to service_role/);
 assert.match(sql,/before insert on public\.orders/);
 assert.match(sql,/if not public\.v5_is_admin\(\)/);
 const edge=readFileSync(new URL('../supabase/functions/dlp-users/index.ts',import.meta.url),'utf8');
 assert.ok(edge.indexOf("if(input.action==='approve_registration')")>edge.indexOf("if(roleError||admin!==true)"));
 assert.match(edge,/email_confirm:true/);assert.match(edge,/approved:true,method:\x27automatic\x27/);assert.match(edge,/senderVerified!==true/);
 assert.match(edge,/dlp_phone_login_allowed/);
});
