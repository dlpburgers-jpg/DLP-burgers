import {useId,useState} from 'react';
import {recoveryWhatsapp} from '../lib/phoneRegistration';

export default function PasswordInput({label='Contraseña',...props}){
 const id=useId(),[visible,setVisible]=useState(false);
 return <div className="field"><label htmlFor={id}>{label}</label><div style={{display:'flex',gap:8,alignItems:'center'}}>
  <input {...props} id={id} type={visible?'text':'password'} style={{flex:1,minWidth:0}}/>
  <button type="button" className="button quiet" style={{minHeight:44,minWidth:86,flexShrink:0}} disabled={props.disabled} aria-label={visible?'Ocultar contraseña':'Ver contraseña'} aria-controls={id} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?'Ocultar':'Ver'}</button>
 </div></div>;
}
export function PasswordRecoveryHelp({identifier=''}){
 return <section aria-label="Recuperar contraseña"><p>¿Olvidaste tu contraseña?</p><a className="button quiet" href={recoveryWhatsapp(identifier)} target="_blank" rel="noopener noreferrer">Solicitar clave provisoria</a><p className="muted">Se abrirá WhatsApp para que envíes la solicitud a DLP. Después de verificar tu identidad, te crearemos una clave provisoria. Al ingresar, tendrás que cambiarla.</p></section>;
}
