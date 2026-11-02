import {useState} from 'react';
import {Bell,UserRound,Gift,KeyRound,Gamepad2,ChevronDown} from 'lucide-react';
import './AccountSections.css';

export default function AccountSections({notifications,profile,points,password,gaming,raffle,footer}){
 const [open,setOpen]=useState(null);
 const sections=[['notifications','Activar notificaciones',Bell,notifications],['profile','Mis datos',UserRound,profile],['points','Mis sellos',Gift,points],['password','Cambiar contraseña',KeyRound,password],['gaming','DLP Gaming',Gamepad2,gaming],['raffle','Sorteo semanal',Gift,raffle]];
 return <div className="account-sections">{sections.map(([id,label,Icon,content])=><section className="account-section" key={id}>
  <button type="button" className="account-section-button" aria-expanded={open===id} aria-controls={'account-'+id} onClick={()=>setOpen(open===id?null:id)}><Icon size={22}/><span>{label}{id==='profile'&&<small>Direcciones frecuentes</small>}{id==='points'&&<small>Canjear en mi próximo pedido</small>}</span><ChevronDown size={18}/></button>
  <div id={'account-'+id} hidden={open!==id} className="account-section-content">{open===id&&content}</div>
 </section>)}{footer}</div>;
}
