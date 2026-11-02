import { createClient } from 'npm:@supabase/supabase-js@2.114.0';
export function normalizeCustomerPhone(value) {
 const raw=String(value||'').trim();
 if(!/^\+?[\d ().-]+$/.test(raw))throw new Error('Ingresá tu celular con código de área, sin 0 ni 15.');
 let digits=raw.replace(/\D/g,'');
 if(digits.startsWith('00'))digits=digits.slice(2);
 if(digits.startsWith('549')&&digits.length===13)return `+${digits}`;
 if(digits.startsWith('54')&&digits.length===12)return `+549${digits.slice(2)}`;
 if(!raw.startsWith('+')&&digits.startsWith('0')&&digits.length===11)digits=digits.slice(1);
 if(!raw.startsWith('+')&&digits.length===10)return `+549${digits}`;
 throw new Error('Ingresá un celular argentino con código de área, sin 0 ni 15.');
}

export function registrationMessage({name,phone,requestId}) {
 return `Hola DLP. Me registré en la app y solicito habilitar mi cuenta.\n\nNombre: ${name}\nCelular: ${phone}\nSolicitud: ${requestId}\n\nEnvío este mensaje desde mi número registrado.`;
}


const ORIGIN='https://dlpburgers.com';
const ALLOWED_ORIGINS=new Set([ORIGIN,'https://www.dlpburgers.com','https://dlp-burgers-v5-simm.ccovetta.chatgpt.site','https://dlpburgers-jpg.github.io','http://localhost','https://localhost','capacitor://localhost']);
const responseOrigin=(req:Request)=>ALLOWED_ORIGINS.has(req.headers.get('origin')||'')?(req.headers.get('origin')||ORIGIN):ORIGIN;
const json=(data:unknown,status=200,origin=ORIGIN)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'}});
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function cleanProfile(p:any){
 const value={first_name:String(p?.first_name||'').trim(),last_name:String(p?.last_name||'').trim(),birthday_month:Number(p?.birthday_month),birthday_day:Number(p?.birthday_day),phone:String(p?.phone||'').trim(),address:String(p?.address||'').trim(),lat:p?.lat,lng:p?.lng};
 const {first_name:f,last_name:l,birthday_month:m,birthday_day:d,phone,address,lat,lng}=value;
 if(!f||!l||f.length>80||l.length>80||(f+' '+l).length>120||!Number.isInteger(m)||m<1||m>12||!Number.isInteger(d)||d<1||d>new Date(2000,m,0).getDate()||!/^\+?[0-9 () .-]+$/.test(phone)||!/^[0-9]{10,15}$/.test(phone.replace(/\D/g,''))||phone.length>24||address.length<5||address.length>300||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('Completá nombre, apellido, cumpleaños, celular y dirección.');
 return value;
}
Deno.serve(async(req:Request)=>{
 const requestOrigin=req.headers.get('origin')||'',origin=responseOrigin(req),reply=(data:unknown,status=200)=>json(data,status,origin);
 if(requestOrigin&&!ALLOWED_ORIGINS.has(requestOrigin))return reply({error:'Origen no permitido'},403);
 if(req.method==='OPTIONS')return reply({ok:true});
 if(req.method!=='POST')return reply({error:'Método no permitido'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if(!url||!anon||!secret)return reply({error:'El servicio de usuarios todavía no está preparado'},503);
  const raw=await req.text();if(raw.length>6000)return reply({error:'Solicitud demasiado grande'},413);
  let input;try{input=JSON.parse(raw);}catch{return reply({error:'Solicitud inválida'},400);}
  if(!input||typeof input!=='object')return reply({error:'Solicitud inválida'},400);
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  async function requestHash(){
   const source=req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown';
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${secret}:${source}`));
   return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  if(input.action==='login_phone'){
   let phone;try{phone=normalizeCustomerPhone(input.phone);}catch{return reply({error:'Revisá el celular y la contraseña.'},400);}
   if(typeof input.password!=='string'||input.password.length<1||input.password.length>128)return reply({error:'Ingresá tu contraseña'},400);
   const limit=await db.rpc('dlp_phone_login_allowed',{p_ip_hash:await requestHash(),p_phone:phone});
   if(limit.error||limit.data!==true)return reply({error:'Esperá 15 minutos antes de volver a intentar.'},429);
   const lookup=await db.from('dlp_registration_requests').select('user_id,approved_at').eq('phone',phone).not('user_id','is',null).maybeSingle();
   const denied=()=>reply({error:'Revisá el celular y la contraseña.'},401);
   if(lookup.error||!lookup.data?.user_id||!lookup.data.approved_at)return denied();
   const target=await db.auth.admin.getUserById(lookup.data.user_id);
   if(target.error||!target.data.user?.email||target.data.user.app_metadata?.dlp_manual_registration?.approved!==true)return denied();
   const verifier=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
   const checked=await verifier.auth.signInWithPassword({email:target.data.user.email,password:input.password});
   if(checked.error||!checked.data.session||checked.data.user?.id!==lookup.data.user_id)return denied();
   return reply({session:checked.data.session});
  }
  if(input.action==='register_phone'){
   if(!uuid(input.requestId)||input.privacyAccepted!==true||typeof input.password!=='string'||input.password.length<8||input.password.length>64)return reply({error:'Aceptá la privacidad y elegí una contraseña de 8 a 64 caracteres'},400);
   let profile,phone;try{profile=cleanProfile(input.profile);phone=normalizeCustomerPhone(profile.phone);profile.phone=phone;}catch(e){return reply({error:(e as Error).message},400);}
   const ipHash=await requestHash();
   const reserved=await db.rpc('dlp_reserve_registration',{p_request:input.requestId,p_phone:phone,p_ip_hash:ipHash});
   if(reserved.error)return reply({error:'No pudimos iniciar el registro. Esperá unos minutos o contactá a DLP.'},429);
   async function complete(userId:string){
    const target=await db.auth.admin.getUserById(userId);
    const user=target.data.user,marker=user?.app_metadata?.dlp_manual_registration;
    if(target.error||!user||marker?.request!==input.requestId||marker?.phone!==phone)throw new Error('Registro no disponible');
    if(marker.approved!==true){
     const updated=await db.auth.admin.updateUserById(userId,{email_confirm:true,app_metadata:{...user.app_metadata,dlp_manual_registration:{...marker,approved:true,method:'automatic'}}});
     if(updated.error)throw new Error('No pudimos finalizar el registro');
    }
    return reply({created:true,pending:false,requestId:input.requestId,phone});
   }
   if(reserved.data?.user_id)return await complete(reserved.data.user_id);
   const result=await db.auth.admin.createUser({email:`reg-${input.requestId}@cuentas.dlpburgers.com`,password:input.password,email_confirm:true,user_metadata:{dlp_profile:profile,dlp_privacy:{version:'2026-10-04',accepted_at:new Date().toISOString(),source:'phone_registration'}},app_metadata:{dlp_manual_registration:{request:input.requestId,phone,approved:true,method:'automatic'}}});
   if(result.error){
    const receipt=await db.from('dlp_registration_requests').select('user_id').eq('id',input.requestId).maybeSingle();
    if(!receipt.data?.user_id)return reply({error:'No pudimos registrar ese celular. Si ya tenés cuenta, ingresá o pedí ayuda a DLP.'},409);
    return await complete(receipt.data.user_id);
   }
   return reply({created:true,pending:false,requestId:input.requestId,phone});
  }
  const authorization=req.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))return reply({error:'Ingresá a tu cuenta'},401);
  const client=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await client.auth.getUser(authorization.slice(7));
  if(authError||!user||user.is_anonymous)return reply({error:'Volvé a iniciar sesión'},401);
  if(input.action==='request_deletion'){
   if(input.confirmation!=='ELIMINAR'||!uuid(input.requestId)||typeof input.password!=='string'||input.password.length<1||input.password.length>128)return reply({error:'Ingresá tu contraseña y escribí ELIMINAR'},400);
   // Reauthenticate against the verified user's email, never an email/id from the request body.
   const verifier=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
   const checked=await verifier.auth.signInWithPassword({...user.email?{email:user.email}:{phone:user.phone!},password:input.password});
   if(checked.error||checked.data.user?.id!==user.id)return reply({error:'No pudimos verificar tu contraseña. Revisala y reintentá.'},403);
   await verifier.auth.signOut({scope:'local'});
   const {data,error}=await db.rpc('v79_request_deletion',{p_user:user.id,p_request:input.requestId});
   if(error)return reply({error:'No pudimos guardar la solicitud. Si tenés acceso administrativo, primero transferilo a otra cuenta.'},409);
   return reply({request:data});
  }
  if(input.action==='complete_temporary_password'){
   if(!uuid(input.requestId))return reply({error:'Solicitud inválida'},400);
   const {data:current,error:currentError}=await db.auth.admin.getUserById(user.id);
   if(currentError||!current.user)return reply({error:'Usuario no encontrado'},404);
   const marker=current.user.app_metadata?.dlp_password_reset;
   if(!marker?.required)return reply({completed:true});
   if(marker.request!==input.requestId)return reply({error:'La contraseña provisoria ya no está vigente'},409);
   const {error}=await db.auth.admin.updateUserById(user.id,{app_metadata:{...current.user.app_metadata,dlp_password_reset:{...marker,required:false,completed_at:new Date().toISOString()}}});
   if(error)return reply({error:'La contraseña cambió, pero no pudimos finalizar el acceso. Reintentá.'},409);
   return reply({completed:true});
  }
  const {data:admin,error:roleError}=await client.rpc(input.action==='approve_registration'?'v87_can_activate_accounts':'v5_is_admin');
  if(roleError||admin!==true)return reply({error:'Acceso de administrador requerido'},403);
  if(input.action==='approve_registration'){
   if(!uuid(input.requestId)||input.senderVerified!==true)return reply({error:'Verificá el número remitente del WhatsApp antes de habilitar'},400);
   const {data:request,error:requestError}=await db.from('dlp_registration_requests').select('*').eq('id',input.requestId).maybeSingle();
   if(requestError||!request?.user_id)return reply({error:'Solicitud no encontrada'},404);
   if(request.approved_at)return reply({approved:true});
   const target=await db.auth.admin.getUserById(request.user_id);
   const current=target.data.user;
   if(target.error||!current||current.app_metadata?.dlp_manual_registration?.phone!==request.phone||current.app_metadata?.dlp_manual_registration?.request!==input.requestId)return reply({error:'El celular o la solicitud cambiaron. Actualizá la lista.'},409);
   const result=await db.auth.admin.updateUserById(current.id,{email_confirm:true,app_metadata:{...current.app_metadata,dlp_manual_registration:{...current.app_metadata.dlp_manual_registration,approved:true,by:user.id}}});
   if(result.error)return reply({error:'No pudimos habilitar la cuenta. Reintentá.'},409);
   return reply({approved:true});
  }
  if(input.action==='complete_deletion'){
   if(!uuid(input.userId)||!uuid(input.requestId)||input.confirmation!=='ELIMINAR')return reply({error:'Confirmación inválida'},400);
   const allowed=await db.rpc('v79_authorize_deletion',{p_actor:user.id,p_user:input.userId,p_request:input.requestId});
   if(allowed.error)return reply({error:'La solicitud ya no está vigente. Actualizá la lista.'},409);
   const result=await db.auth.admin.deleteUser(input.userId);
   if(result.error)return reply({error:'No se eliminó la cuenta. Verificá que no tenga pedidos en curso ni acceso administrativo y reintentá.'},409);
   return reply({deleted:true});
  }
  if(input.action==='reset_password'){
   if(!uuid(input.userId)||!uuid(input.requestId)||typeof input.password!=='string'||input.password.length<8||input.password.length>64)return reply({error:'Ingresá una contraseña provisoria de 8 a 64 caracteres'},400);
   if(input.userId===user.id)return reply({error:'Recuperá tu propia cuenta mediante el enlace enviado por correo'},400);
   const {data:target,error:targetError}=await db.auth.admin.getUserById(input.userId);
   if(targetError||!target.user||target.user.is_anonymous)return reply({error:'Usuario no encontrado'},404);
   const {data:access,error:accessError}=await db.from('profiles').select('role,v5_admin_approved').eq('id',input.userId).maybeSingle();
   if(accessError)return reply({error:'No pudimos comprobar el tipo de usuario'},503);
   if(access?.role==='admin'&&access?.v5_admin_approved)return reply({error:'Las cuentas administrativas se recuperan mediante el enlace por correo'},400);
   const previous=target.user.app_metadata?.dlp_password_reset;
   if(previous?.request===input.requestId&&previous?.by===user.id)return reply({id:target.user.id,reset:true});
   const marker={required:true,request:input.requestId,by:user.id,created_at:new Date().toISOString()};
   const {error}=await db.auth.admin.updateUserById(target.user.id,{password:input.password,app_metadata:{...target.user.app_metadata,dlp_password_reset:marker}});
   if(error)return reply({error:'No pudimos restablecer la contraseña. Actualizá la lista y reintentá.'},409);
   return reply({id:target.user.id,reset:true});
  }
  if(!['create','update'].includes(input.action)||!uuid(input.requestId))return reply({error:'Acción inválida'},400);
  let profile;try{profile=cleanProfile(input.profile);}catch(e){return reply({error:(e as Error).message},400);}
  const email=String(input.email||'').trim().toLowerCase();
  if((input.action==='create'||email)&&(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)))return reply({error:'Ingresá un correo válido'},400);
  if(input.action==='create'){
   if(typeof input.password!=='string'||input.password.length<8||input.password.length>64)return reply({error:'La contraseña provisoria debe tener entre 8 y 64 caracteres'},400);
   const {data:existing,error:lookupError}=await db.rpc('v68_account_request',{p_request:input.requestId,p_actor:user.id});
   if(lookupError)return reply({error:'Falta activar la administración de usuarios'},503);
   if(existing)return reply({id:existing,created:true});
   const marker={required:true,request:input.requestId,by:user.id,created_at:new Date().toISOString()};
   const {data,error}=await db.auth.admin.createUser({email,password:input.password,email_confirm:true,user_metadata:{dlp_profile:profile},app_metadata:{dlp_staff_create:{request:input.requestId,by:user.id},dlp_password_reset:marker}});
   if(error){
    const retry=await db.rpc('v68_account_request',{p_request:input.requestId,p_actor:user.id});
    if(retry.data)return reply({id:retry.data,created:true});
    return reply({error:error.code==='email_exists'||error.code==='email_already_exists'?'Ya existe una cuenta con ese correo. Buscala en la lista.':'No pudimos crear la cuenta. Revisá el correo y los datos e intentá nuevamente.'},409);
   }
   return reply({id:data.user.id,created:true});
  }
  if(!uuid(input.userId))return reply({error:'Usuario inválido'},400);
  const {data:target,error:targetError}=await db.auth.admin.getUserById(input.userId);
  if(targetError||!target.user||target.user.is_anonymous)return reply({error:'Usuario no encontrado'},404);
  const old=target.user;
  if(!email&&old.email&&!old.app_metadata?.dlp_manual_registration)return reply({error:'No se puede eliminar el correo de esta cuenta'},400);
  if(old.app_metadata?.dlp_manual_registration){
   if(email||normalizeCustomerPhone(profile.phone)!==old.app_metadata.dlp_manual_registration.phone)return reply({error:'El celular de acceso requiere una nueva verificación y no puede cambiarse desde este formulario'},400);
  }
  if(old.app_metadata?.dlp_staff_edit?.request===input.requestId&&old.app_metadata?.dlp_staff_edit?.by===user.id)return reply({id:old.id,updated:true});
  const {error}=await db.auth.admin.updateUserById(old.id,{...(email?{email,...(email!==old.email?{email_confirm:true}:{})}:{}),user_metadata:{...old.user_metadata,dlp_profile:profile},app_metadata:{...old.app_metadata,dlp_staff_edit:{request:input.requestId,by:user.id,expected_updated_at:input.updatedAt||null}}});
  if(error)return reply({error:'No pudimos guardar. El correo puede estar en uso o los datos cambiaron. Actualizá la lista y revisá la cuenta.'},409);
  return reply({id:old.id,updated:true});
 }catch{return reply({error:'No pudimos conectar con el servicio de usuarios. Reintentá.'},500);}
});
