import {useState,useRef} from 'react';
import {rpc} from '../lib/api';
import {stampRewards,stampProducts} from '../lib/loyaltyStamps';
import './LoyaltyStamps.css';
export default function LoyaltyStamps({data,history={},signedIn=true,onLogin,compact=false}){
 const balance=Math.max(0,Number(history.stampBalance)||0),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[selection,setSelection]=useState({}),lock=useRef(false);
 async function redeem(reward){
  if(lock.current)return;lock.current=true;setBusy(reward.id);setMessage('');
  try{const code=await rpc('dlp_issue_stamp_code',{p_reward:reward.id});const [productId='',variantId='']=(selection[reward.id]||'').split('|');window.dispatchEvent(new CustomEvent('dlp-stamp-redeem',{detail:{reward:reward.id,productId,variantId,code:code.code}}));setMessage('Código '+code.code+' seleccionado para tu pedido. Los sellos se descuentan al confirmar.');}
  catch(e){setMessage(e.message||'No pudimos generar el código. Reintentá.');}finally{setBusy('');lock.current=false;}
 }
 return <section className="dlp-stamps" aria-label="Mis sellos DLP"><header><p>CLUB DLP</p><h2>Una burger. Un sello.</h2><strong>{signedIn?balance:'—'} <small>sellos disponibles</small></strong></header>
  <div className="dlp-stamps-track" role="progressbar" aria-label="Sellos hacia la hamburguesa simple" aria-valuemin={0} aria-valuemax={20} aria-valuenow={signedIn?Math.min(20,balance):0} aria-valuetext={signedIn?`${balance} sellos disponibles`:'Ingresá para ver tus sellos'}>{Array.from({length:20},(_,i)=><span key={i} className={signedIn&&i<balance?'filled':''}><img src="/dlp-circular-192.png" alt=""/><small>{i+1}</small></span>)}</div>
  <div className="dlp-stamp-prizes">{stampRewards.map(r=>{const products=stampProducts(data,r.id);return <article key={r.id} className={signedIn&&balance>=r.cost?'unlocked':''}><b>{r.cost} sellos</b><h3>{r.label}</h3><p>{r.id==='delivery_free'?'Con 3 hamburguesas o más.':r.id==='starter_free'?'Elegí un starter disponible.':'Elegí una presentación Simple.'}</p>{r.id!=='delivery_free'&&<label><span>Tu premio</span><select value={selection[r.id]||''} onChange={e=>setSelection(s=>({...s,[r.id]:e.target.value}))}><option value="">Elegir producto</option>{products.map(p=><option key={p.productId+'|'+p.variantId} value={p.productId+'|'+p.variantId}>{p.label}</option>)}</select></label>}<button type="button" className="button" disabled={!signedIn||balance<r.cost||Boolean(busy)||(r.id!=='delivery_free'&&!selection[r.id])} onClick={()=>redeem(r)}>{busy===r.id?'Generando…':balance<r.cost?`Faltan ${r.cost-balance} sellos`:'Canjear y aplicar'}</button></article>;})}</div>
  {message&&<p role="status" className="notice">{message}</p>}<p className="dlp-stamp-rules">Sumás 1 sello por cada hamburguesa comprada, cuando recibís el pedido. Las hamburguesas gratis no suman sellos. Cada canje descuenta sus sellos. Un premio por pedido; los adicionales se cobran aparte.</p>
  {!signedIn&&onLogin&&<button className="button" onClick={onLogin}>Ingresar para sumar sellos</button>}
  {signedIn&&!compact&&<details><summary>Movimientos de sellos</summary>{!(history.stampLedger||[]).length?<p>Todavía no tenés movimientos.</p>:(history.stampLedger||[]).map(m=><p key={m.id}>{new Date(m.created_at).toLocaleDateString('es-AR')} · {{earn:'Pedido entregado',redeem:'Canje',refund:'Canje devuelto',reversal:'Pedido cancelado',conversion:'Conversión de puntos'}[m.kind]||'Movimiento'} <b>{m.amount>0?'+':''}{m.amount} sellos</b></p>)}</details>}
 </section>;
}
