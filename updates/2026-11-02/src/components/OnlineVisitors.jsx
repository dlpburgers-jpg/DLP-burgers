import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
export default function OnlineVisitors(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let alive=true,running=false;
  async function load(){if(document.hidden||running)return;running=true;
   try{const {data,error}=await supabase.rpc('dlp_online_visitors');if(!alive)return;if(error||!Array.isArray(data?.visitors))throw Error();setData(data);setError('');}
   catch{if(alive){setData(null);setError('No pudimos actualizar los usuarios en línea. Volvé a intentar.');}}
   finally{running=false;}
  }
  void load();const timer=setInterval(load,15000);document.addEventListener('visibilitychange',load);
  return ()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',load);};
 },[refresh]);
 const labels={ios:'iOS',android:'Android',web:'Web'};
 return <section className="users-admin"><div className="users-heading"><h2>Usuarios en línea</h2><button className="button quiet" onClick={()=>setRefresh(n=>n+1)}>Actualizar</button></div>
  <p>Personas con la app abierta en primer plano y señal recibida en los últimos 2 minutos. Se actualiza cada 15 segundos.</p>
  <p className="muted">Las versiones móviles anteriores aparecerán después de actualizar la app. Los invitados se cuentan por pestaña; una cuenta abierta en varios dispositivos se muestra una sola vez.</p>
  {error?<p className="notice error" role="alert">{error}</p>:!data?<p role="status">Consultando actividad…</p>:<>
   <div className="card"><strong>{data.total} en línea</strong><p>{data.total-data.guests} con cuenta · {data.guests} invitados · {data.connections} conexiones</p><p className="muted">Actualizado a las {new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(data.as_of))}</p></div>
   {data.visitors.length?data.visitors.map((v,index)=><article className="user-row" key={v.id}><div><h3>{v.kind==='guest'?`Invitado ${index+1}`:v.name}</h3><p>{v.kind==='staff'?'Equipo DLP':v.kind==='customer'?'Cliente registrado':'Sin iniciar sesión'} · {v.platforms.map(p=>labels[p]||'Web').join(', ')}</p><p>{v.connections} {v.connections===1?'conexión':'conexiones'} · Señal hace {Math.max(0,Math.floor((Date.parse(data.as_of)-Date.parse(v.last_seen))/1000))} s</p></div></article>):<p>No hay usuarios en línea en este momento.</p>}
  </>}
 </section>;
}
