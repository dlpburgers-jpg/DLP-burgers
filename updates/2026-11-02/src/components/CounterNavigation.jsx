import {Columns3,Plus,Armchair,LockKeyhole} from 'lucide-react';
import adminLogo from '../assets/dlp-admin-logo.webp';

export default function CounterNavigation({tabs,active,onSelect,onLogout}){
 return <header className="counter-navigation"><div className="operative-counter-brand"><img src={adminLogo} alt="DLP Burgers"/><div><strong>DLP BURGERS</strong><span>Mostrador</span></div></div><nav aria-label="Mostrador">
 {[
  ['board','Pedidos',Columns3],
  ['counter','Nuevo pedido mostrador',Plus],
  ['salon','Salón',Armchair],
  ['sales','Ventas del día',LockKeyhole],
  ['activation','Cuentas creadas',LockKeyhole],
 ].filter(([key])=>Object.hasOwn(tabs,key==='sales'?'board':key)).map(([key,label,Icon])=><button type="button" className="button" key={key} aria-current={active===key?'page':undefined} onClick={()=>onSelect(key)}><Icon size={18} aria-hidden="true"/>{label}</button>)}
 </nav>{onLogout&&<button type="button" className="text-button" onClick={onLogout}>Cerrar sesión</button>}</header>;
}
