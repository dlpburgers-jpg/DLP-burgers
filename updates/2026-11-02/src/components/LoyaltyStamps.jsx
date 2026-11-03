import {useState,useRef} from 'react';
import {rpc} from '../lib/api';
import {stampRewards,stampProducts} from '../lib/loyaltyStamps';
import './LoyaltyStamps.css';
export default function LoyaltyStamps({data,history={},signedIn=true,onLogin,compact=false}){
 const balance=Math.max(0,Number(history.stampBalance)||0),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[selection,setSelection]=useState({}),[openReward,setOpenReward]=useState(''),lock=useRef(false);
 async function redeem(reward){
  if(lock.current)return;lock.current=true;setBusy(reward.id);setMessage('');
  try{const code=await rpc('dlp_issue_stamp_code',{p_reward:reward.id});const [productId='',variantId='']=(selection[reward.id]||'').split('|');window.dispatchEvent(new CustomEvent('dlp-stamp-redeem',{detail:{reward:reward.id,productId,variantId,code:code.code}}));setMessage('Código '+code.code+' seleccionado para tu pedido. Los sellos se descuentan al confirmar.');}
  catch(e){setMessage(e.message||'No pudimos generar el código. Reintentá.');}finally{setBusy('');lock.current=false;}
 }
 return <section className="dlp-stamps" aria-label="Mis sellos DLP">
  <header><div><p>CLUB DLP</p><h2>Mis sellos</h2><span>Una burger. Un sello.</span></div><strong>{signedIn?balance:'—'}<small>disponibles</small></strong></header>
  <div className="dlp-stamps-track" role="progressbar" aria-label="Sellos hacia la hamburguesa simple" aria-valuemin={0} aria-valuemax={20} aria-valuenow={signedIn?Math.min(20,balance):0} aria-valuetext={signedIn?balance+' sellos disponibles':'Ingresá para ver tus sellos'}>{Array.from({length:20},(_,i)=><span key={i} className={signedIn&&i<balance?'filled':''}><img src="/dlp-circular-192.png" alt=""/><small aria-hidden="true">{[5,10,20].includes(i+1)?i+1:'\u00a0'}</small></span>)}</div>
  <div className="dlp-stamp-prize-heading"><h3>Tus premios</h3><p>Cada canje descuenta sellos</p></div>
  <div className="dlp-stamp-prizes">{stampRewards.map(r=>{
   const products=stampProducts(data,r.id),unlocked=signedIn&&balance>=r.cost,choosing=unlocked&&openReward===r.id,delivery=r.id==='delivery_free';
   return <article key={r.id} className={unlocked?'unlocked':''}>
    <div className="dlp-stamp-prize-row">
     <b className="dlp-stamp-cost">{r.cost}<small>sellos</small></b>
     <div className="dlp-stamp-prize-copy"><h3>{delivery?'Delivery gratis':r.id==='starter_free'?'Starter gratis':'Burger simple'}</h3><p>{delivery?'Con 3 burgers o más':r.id==='starter_free'?'A elección':'Gratis · a elección'}</p></div>
     <button type="button" className="button dlp-stamp-action" disabled={!unlocked||Boolean(busy)} aria-label={!unlocked?'Faltan '+Math.max(0,r.cost-balance)+' sellos para '+r.label:delivery?'Canjear delivery sin cargo':(choosing?'Cerrar opciones de ':'Elegir ')+r.label} aria-expanded={delivery?undefined:choosing} onClick={()=>delivery?redeem(r):setOpenReward(choosing?'':r.id)}>{busy===r.id?'Generando…':!unlocked?'Faltan '+Math.max(0,r.cost-balance):delivery?'Canjear':choosing?'Cerrar':'Elegir'}</button>
    </div>
    {choosing&&!delivery&&<div className="dlp-stamp-choice"><label><span>{r.id==='starter_free'?'Elegí tu starter':'Elegí tu burger simple'}</span><select value={selection[r.id]||''} onChange={e=>setSelection(s=>({...s,[r.id]:e.target.value}))}><option value="">Elegir producto</option>{products.map(p=><option key={p.productId+'|'+p.variantId} value={p.productId+'|'+p.variantId}>{p.label}</option>)}</select></label>{!products.length&&<p>No hay opciones disponibles en este momento.</p>}<button type="button" className="button" disabled={Boolean(busy)||!selection[r.id]} onClick={()=>redeem(r)}>{busy===r.id?'Generando…':'Canjear y aplicar'}</button></div>}
   </article>;
  })}</div>
  {message&&<p role="status" className="notice">{message}</p>}
  <details className="dlp-stamp-help"><summary>Cómo funciona</summary><p className="dlp-stamp-rules">Sumás 1 sello por cada hamburguesa comprada, cuando recibís el pedido. Las hamburguesas gratis no suman sellos. Cada canje descuenta sus sellos. Un premio por pedido; los adicionales se cobran aparte.</p></details>
  {!signedIn&&onLogin&&<button className="button" onClick={onLogin}>Ingresar para sumar sellos</button>}
  {signedIn&&!compact&&<details><summary>Movimientos de sellos</summary>{!(history.stampLedger||[]).length?<p>Todavía no tenés movimientos.</p>:(history.stampLedger||[]).map(m=><p key={m.id}>{new Date(m.created_at).toLocaleDateString('es-AR')} · {{earn:'Pedido entregado',redeem:'Canje',refund:'Canje devuelto',reversal:'Pedido cancelado',conversion:'Conversión de puntos'}[m.kind]||'Movimiento'} <b>{m.amount>0?'+':''}{m.amount} sellos</b></p>)}</details>}
 </section>;
}
