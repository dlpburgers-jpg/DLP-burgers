import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabaseClient';

export function accountDay(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const get=type=>parts.find(p=>p.type===type).value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}
export default function CreatedAccounts(){
 const [date,setDate]=useState(accountDay),[page,setPage]=useState(0),[refresh,setRefresh]=useState(0);
 const [result,setResult]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;setBusy(true);setError('');setResult(null);
  Promise.resolve().then(()=>supabase.rpc('dlp_created_accounts',{p_date:date,p_page:page})).then(({data,error})=>{
   if(!active)return;
   if(error||!data||!Array.isArray(data.accounts))setError('No pudimos cargar las cuentas. Volvé a intentar.');
   else setResult(data);
  }).catch(()=>{if(active)setError('No pudimos cargar las cuentas. Volvé a intentar.');})
   .finally(()=>{if(active)setBusy(false);});
  return ()=>{active=false;};
 },[date,page,refresh]);
 const visible=result?.date===date&&result?.page===page?result:null;
 return <section className="card"><div className="users-heading"><h3>Cuentas creadas</h3><button className="button quiet" disabled={busy} onClick={()=>setRefresh(n=>n+1)}>Actualizar</button></div>
  <label className="field"><span>Fecha de creación</span><input type="date" value={date} onChange={e=>{if(e.target.value){setDate(e.target.value);setPage(0);}}}/></label>
  <p className="muted">Horario de Buenos Aires. Las cuentas se habilitan automáticamente.</p>
  {busy&&<p role="status">Cargando cuentas…</p>}
  {error&&<p className="notice error" role="alert">{error}</p>}
  {!busy&&visible&&<><p><strong>{visible.total}</strong> cuentas creadas en esta fecha.</p>
   {visible.accounts.length?visible.accounts.map(row=><article className="user-row" key={row.id}><div><h4>{row.name}</h4><p>{row.phone||'Sin celular informado'}</p><p>Creada a las {new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(row.created_at))}</p></div></article>):<p>No se crearon cuentas en esta fecha.</p>}
   {(page>0||visible.total>100)&&<div className="actions"><button className="button quiet" disabled={page===0} onClick={()=>setPage(n=>n-1)}>Anterior</button><span>Página {page+1} de {Math.max(1,Math.ceil(visible.total/100))}</span><button className="button quiet" disabled={(page+1)*100>=visible.total} onClick={()=>setPage(n=>n+1)}>Siguiente</button></div>}
  </>}
 </section>;
}
