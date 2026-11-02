import {supabase} from './supabaseClient';
import {DLP_WHATSAPP} from '../config';
import {whatsappLink} from './boardOperations';
import {normalizeCustomerPhone,registrationMessage} from '../../supabase/functions/_shared/phoneIdentity.js';
export {normalizeCustomerPhone};
export async function signInWithPhone(phone,password){
 const result=await registrationAction({action:'login_phone',phone:normalizeCustomerPhone(phone),password});
 if(!result?.session?.access_token||!result.session.refresh_token)throw new Error('No pudimos iniciar sesión. Reintentá.');
 return supabase.auth.setSession({access_token:result.session.access_token,refresh_token:result.session.refresh_token});
}

export async function registrationAction(body){
 const {data,error}=await supabase.functions.invoke('dlp-users',{body});
 if(error){let message='No pudimos conectar con DLP. Reintentá.';try{message=(await error.context.json()).error||message;}catch{/* Transport failure. */}throw new Error(message);}
 if(data?.error)throw new Error(data.error);
 return data;
}
export function registrationWhatsapp(receipt){
 return `${whatsappLink(DLP_WHATSAPP)}?text=${encodeURIComponent(registrationMessage(receipt))}`;
}
export function recoveryWhatsapp(identifier=''){
 const account=String(identifier||'').trim().slice(0,254);
 const message='Hola DLP. Olvidé mi contraseña y solicito una clave provisoria para recuperar el acceso a mi cuenta.'+(account?`\nCelular, correo o usuario de la cuenta: ${account}`:'')+'\nEscribo desde mi celular registrado para que puedan verificar mi identidad.';
 return `${whatsappLink(DLP_WHATSAPP)}?text=${encodeURIComponent(message)}`;
}
