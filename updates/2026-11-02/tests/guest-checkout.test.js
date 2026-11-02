import test from 'node:test';
import assert from 'node:assert/strict';
import {submitGuestCheckout} from '../src/lib/guestCheckout.js';
test('guest passes the same request and secret on retry',async()=>{const args={p_request:'request',p_guest_token:'secret',p_data:{}};let calls=0;const client={auth:{getSession:async()=>({data:{session:null}})},rpc:async(name,a)=>{calls++;assert.equal(name,'dlp_guest_checkout');assert.equal(a,args);return {data:{id:'saved'}};}};assert.deepEqual(await submitGuestCheckout(client,args),await submitGuestCheckout(client,args));assert.equal(calls,2);});
test('session error or authenticated user cannot use guest endpoint',async()=>{for(const response of [{error:Error('offline')},{data:{session:{user:{id:'user'}}}}]){await assert.rejects(submitGuestCheckout({auth:{getSession:async()=>response},rpc:()=>assert.fail('must not submit')},{}));}});
