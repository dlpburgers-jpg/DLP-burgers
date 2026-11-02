import {useRef,useState} from 'react';
import {ProfileFields} from './CustomerProfile';
import {emptyProfile,profileError} from '../lib/customerProfile';
import {normalizeCustomerPhone,registrationAction} from '../lib/phoneRegistration';
import {storageKey} from '../lib/mode';

const receiptKey=storageKey('pending-registration');
const attemptKey=storageKey('registration-attempt');
function savedReceipt(){try{const value=JSON.parse(localStorage.getItem(receiptKey));return value?.requestId&&value?.phone?value:null;}catch{return null;}}
function savedAttempt(){try{const value=JSON.parse(localStorage.getItem(attemptKey));return value?.id&&value?.phone?value:null;}catch{return null;}}
export default function PhoneRegistration({apiKey,onLogin,initialProfile=emptyProfile}){
 const [profile,setProfile]=useState({...emptyProfile,...initialProfile}),[password,setPassword]=useState(''),[accepted,setAccepted]=useState(false);
 const [receipt,setReceipt]=useState(savedReceipt),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(savedAttempt()),lock=useRef(false);
 async function submit(event){
  event.preventDefault();if(lock.current)return;setError('');
  let phone;try{const error=profileError(profile);if(error)throw new Error(error);phone=normalizeCustomerPhone(profile.phone);}catch(e){setError(e.message);return;}
  if(!accepted||password.length<8||password.length>64)return setError('Aceptá la privacidad y elegí una contraseña de 8 a 64 caracteres.');
  lock.current=true;setBusy(true);
  if(request.current?.phone!==phone)request.current={phone,id:crypto.randomUUID()};
  try{localStorage.setItem(attemptKey,JSON.stringify(request.current));}catch{/* Retry remains available in this tab. */}
  try{
   const result=await registrationAction({action:'register_phone',registrationVersion:2,requestId:request.current.id,profile:{...profile,phone},password,privacyAccepted:accepted});
   if(!result?.created||result.pending!==false||result.requestId!==request.current.id)throw new Error('No pudimos confirmar el registro. Reintentá.');
   const next={phone,requestId:result.requestId,name:`${profile.first_name.trim()} ${profile.last_name.trim()}`};
   setReceipt(next);setPassword('');try{localStorage.setItem(receiptKey,JSON.stringify(next));localStorage.removeItem(attemptKey);}catch{/* The visible link still works. */}
  }catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
 }
 if(receipt)return <section><h2>Cuenta creada</h2><p>Tu cuenta ya está habilitada. Ingresá con <strong>{receipt.phone}</strong> y tu contraseña.</p><div className="actions"><button className="button" onClick={()=>onLogin(receipt.phone)}>Ingresar a mi cuenta</button></div><button className="text-button" onClick={()=>{try{localStorage.removeItem(receiptKey);}catch{/* Optional storage. */}setReceipt(null);}}>Registrar otro celular</button></section>;
 return <form onSubmit={submit}><fieldset className="plain-fieldset" disabled={busy}><ProfileFields value={profile} onChange={setProfile} apiKey={apiKey}/><label className="field"><span>Contraseña</span><input type="password" required minLength={8} maxLength={64} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="check-row"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>Leí y acepto la <a href="?screen=privacy" target="_blank" rel="noopener noreferrer">Política de privacidad</a>.</span></label><p>Tu cuenta queda habilitada al registrarte. No necesitás enviar un WhatsApp.</p><div className="actions"><button className="button" disabled={busy}>{busy?'Registrando…':'Crear cuenta'}</button><button type="button" className="button quiet" onClick={()=>onLogin('')}>Ya tengo cuenta</button></div></fieldset>{error&&<p className="notice error" role="alert">{error}</p>}</form>;
}
