import CounterProductGrid from './CounterProductGrid';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {earnedItemPoints} from '../lib/points';
import {useCallback,useEffect,useRef,useState} from 'react';
import {rpc} from '../lib/api';
import {prepareOrderWhatsapp} from '../lib/customerOrders';
import {whatsappLink} from '../lib/boardOperations';
import {savedCounterCopy} from '../lib/counterWhatsapp';
import {counterAttempt} from '../lib/counterDrafts';
import {cartKey,deliveryZone,money,priceCart} from '../lib/domain';
import {availableFor} from '../lib/catalogRules';
import {availablePayments,roundMoney} from '../lib/commerce';
import {earnedPoints,pointsMultiplier} from '../lib/pointsPromotion';
import {storageKey} from '../lib/mode';
import useCouponQuote from '../lib/useCouponQuote';
import CouponCodeField from './CouponCodeField';
import ProductPicker from './ProductPicker';
import './CounterOrder.css';
import useRedemptionQuote from '../lib/useRedemptionQuote';
import RedemptionFields from './RedemptionFields';
import {AddressSearch} from './Maps';
import CrossStreetsField,{crossStreetsError} from './CrossStreetsField';
import useStampQuote from '../lib/useStampQuote';
import StampRedemptionFields from './StampRedemptionFields';
import {earnsStamp} from '../lib/stamps';
import useSchedule from '../lib/useSchedule';
import {scheduledLabel} from '../lib/schedule';
import CounterScheduleFields,{emptyCounterSchedule} from './CounterScheduleFields';

const empty=()=>({...emptyCounterSchedule(),fulfillment_type:'pickup',customer_name:'',customer_phone:'',customer_user_id:null,customer_stamp_balance:null,address:'',cross_streets:'',lat:null,lng:null,notes:'',payment_method:'',reward_id:'',remainder_payment:'',stamp_reward:'',stamp_product_id:'',stamp_variant_id:'',coupon_code:'',items:[]});
function savedPending(key){try{const v=JSON.parse(sessionStorage.getItem(key)||'null');return typeof v?.id==='string'&&Array.isArray(v?.payload?.items)?v:null;}catch{return null;}}
export default function CounterOrder({data,reload,onBoard,owner,draftId,initialSnapshot,onSnapshot,onBusyChange,toolbar,mobileInbox=false}){
 const retryKey=storageKey(`counter-pending.${owner||'preview'}${draftId?'.'+draftId:''}`),[restored]=useState(()=>initialSnapshot?.pending||savedPending(retryKey));
 const [draft,setDraft]=useState(()=>({...empty(),...(restored?.payload||initialSnapshot?.draft)})),[picker,setPicker]=useState(()=>{const saved=initialSnapshot?.picker,product=data.products.find(p=>p.id===saved?.productId);return product?{...saved,product}:null;});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState(initialSnapshot?.result||null),[attempt,setAttempt]=useState(0),[couponInput,setCouponInput]=useState(()=>initialSnapshot?.couponInput||draft.coupon_code||'');
 const lock=useRef(false),pending=useRef(restored),form=useRef(null);
 const [step,setStep]=useState(()=>Math.max(0,Math.min(3,initialSnapshot?.step||0))),[copyStatus,setCopyStatus]=useState('');
 const snapshot=useCallback(()=>({draft,step,couponInput,picker:picker?{productId:picker.product.id,editingKey:picker.editingKey,initial:picker.initial}:null,pending:pending.current,result}),[draft,step,couponInput,picker,result]);
 useEffect(()=>{onSnapshot?.(snapshot());},[snapshot,onSnapshot]);
 useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
 // Al abrir un producto, mover la pantalla lo justo para que su panel quede completo a la vista.
 const pickerId=picker?.product.id;
 useEffect(()=>{if(!pickerId)return;const frame=requestAnimationFrame(()=>document.querySelector('.counter-inline-picker')?.scrollIntoView({block:'nearest',behavior:'smooth'}));return()=>cancelAnimationFrame(frame);},[pickerId]);
 const savePicker=useCallback(selection=>setPicker(current=>current&&JSON.stringify(current.initial)!==JSON.stringify(selection)?{...current,initial:selection}:current),[]);
 function validateStep(index){
  if(index===1){if(!valid){setStep(1);setMessage('Agregá productos válidos para continuar.');return false;}return true;}
  const invalid=[...(form.current?.querySelectorAll(`[data-counter-step="${index}"] input,[data-counter-step="${index}"] select,[data-counter-step="${index}"] textarea`)||[])].find(input=>!input.checkValidity());
  if(invalid){setStep(index);setMessage(invalid.validationMessage);requestAnimationFrame(()=>{invalid.focus();invalid.reportValidity();});return false;}
  if(index===2&&deliveryError){setStep(2);setMessage(deliveryError);return false;}
  return true;
 }
 function goToStep(next){
  if(next>step){for(let index=0;index<next;index++)if(!validateStep(index))return;}
  setStep(next);setMessage('');
 }
 const change=(key,value)=>setDraft(d=>({...d,[key]:value}));
 const schedule=useSchedule(true,draft.fulfillment_type,attempt);
 const channel=draft.fulfillment_type,products=data.products.filter(p=>availableFor(p,channel)&&data.categories.some(c=>c.active&&c.id===p.category_id));
 const lines=priceCart(draft.items,data.products.filter(p=>data.categories.some(c=>c.active&&c.id===p.category_id)),data.extras,data.links,data,channel,true);
 const zone=channel==='delivery'&&draft.lat!=null?deliveryZone(draft,data.zones):null,fee=channel==='delivery'?Number(zone?.fee||0):0;
 const subtotal=roundMoney(lines.reduce((sum,l)=>sum+l.total,0)),valid=lines.length>0&&lines.every(l=>l.valid&&Number.isInteger(l.quantity)&&l.quantity>=1&&l.quantity<=99),payments=availablePayments(data.paymentMethods,channel),method=payments.find(p=>p.id===draft.payment_method);
 const coupon=useCouponQuote(draft.coupon_code,draft.items,channel,method?.id,subtotal,valid,data,attempt,true);
 const stampMode=data.loyaltyVersion===80,redemptionMode=!stampMode&&data.redemptionVersion===60&&method?.id==='points';
 const reward=useRedemptionQuote({enabled:redemptionMode,items:draft.items,channel,code:draft.coupon_code,rewardId:draft.reward_id,customerId:draft.customer_user_id,canUse:Boolean(draft.customer_user_id),valid:valid&&!coupon.error&&!coupon.pending,data,attempt,staff:true});
 const stampQuote=useStampQuote({enabled:stampMode,reward:draft.stamp_reward,productId:draft.stamp_product_id,variantId:draft.stamp_variant_id,items:draft.items,channel,code:draft.coupon_code,payment:method?.id,address:draft.address,lat:draft.lat,lng:draft.lng,customerId:draft.customer_user_id,canUse:Boolean(draft.customer_user_id),valid:valid&&!coupon.error&&!coupon.pending&&(channel!=='delivery'||Boolean(zone)),data,attempt,staff:true});
 const total=roundMoney(subtotal+fee-coupon.discount-reward.discount-stampQuote.discount-stampQuote.deliveryDiscount),pointsError=redemptionMode?(reward.error||((total>0&&!payments.some(p=>p.id===draft.remainder_payment&&p.id!=='points'))?'Elegí cómo pagar el saldo restante.':'')):'';
 const stampError=stampMode&&draft.stamp_reward?stampQuote.error:'';
 const deliveryError=channel!=='delivery'?'':!data.settings.delivery_enabled?'Delivery no está habilitado.':draft.lat==null?'Seleccioná el domicilio desde el buscador.':!zone?'El domicilio queda fuera de la zona de reparto.':subtotal<Number(zone.minimum)?`El mínimo de ${zone.name} es ${money(zone.minimum)}.`:'';
 const points=draft.customer_user_id?earnedPoints(total,data.settings,data.pointsPromotion):0;
 function add(product,selection){
  const key=cartKey(product.id,selection.extraIds,selection.variantId,selection.options,selection.notes,selection.unitPrice),old=draft.items.find(l=>l.key===picker.editingKey),quantity=Number(selection.quantity)||old?.quantity||1;
  const rest=old?draft.items.filter(l=>l.key!==old.key):draft.items,found=rest.find(l=>l.key===key);
  if(rest.length>=50&&!found)return setMessage('Máximo 50 combinaciones por pedido.');
  if((found?.quantity||0)+quantity>99)return setMessage('Máximo 99 unidades por combinación.');
  change('items',found?rest.map(l=>l.key===key?{...l,quantity:l.quantity+quantity}:l):[...rest,{...selection,key,productId:product.id,quantity}]);setPicker(null);setMessage('');
 }
 async function sendCustomerCopy(order,whatsapp){
  setBusy(true);
  try{
   const copy=await savedCounterCopy(order,args=>rpc(data.finalVersion>=72?'v72_board':'v71_board',args));
   setResult(copy.order);
   const opened=await whatsapp.open(copy.url);
   setCopyStatus(opened?'WhatsApp abierto. Confirmá el envío de la copia al cliente allí.':'El pedido ya está cargado. Volvé a abrir la copia en WhatsApp, sin cargarlo de nuevo.');
  }catch{
   whatsapp.close();setCopyStatus('El pedido ya está cargado, pero no se pudo abrir la copia. Reintentá con el botón de WhatsApp.');
  }finally{setBusy(false);}
 }
 async function submit(e){
  e.preventDefault();if(lock.current)return;if(step<3){goToStep(step+1);return;}for(let index=0;index<4;index++)if(!validateStep(index))return;if(!valid||!method||coupon.pending||coupon.error||pointsError||stampError||stampQuote.pending)return;
  const streetsError=crossStreetsError(channel,draft.cross_streets);if(streetsError){setMessage(streetsError);return;}
  const sendCopy=e.nativeEvent?.submitter?.value==='customer-copy';
  if(sendCopy&&!whatsappLink(draft.customer_phone)){setStep(0);setMessage('Ingresá un teléfono válido del cliente con código de área para enviar la copia.');return;}
  const whatsapp=sendCopy?prepareOrderWhatsapp():null;
  lock.current=true;setBusy(true);setMessage('');setCopyStatus('');
  try{
   const payload={...draft,cross_streets:channel==='delivery'?String(draft.cross_streets||'').trim():null,address:channel==='delivery'?draft.address:null,lat:channel==='delivery'?draft.lat:null,lng:channel==='delivery'?draft.lng:null,expected_total:total,redeem_points:reward.points},signature=JSON.stringify(payload);
   if(pending.current?.signature!==signature)pending.current=counterAttempt(pending.current,payload);
   try{sessionStorage.setItem(retryKey,JSON.stringify(pending.current));}catch{/* The in-memory request still prevents repeated submission. */}
   if(onSnapshot?.({...snapshot(),pending:pending.current})===false)throw new Error('No se pudo guardar el envío pendiente en esta PC');
   const order=await rpc(stampMode?'v80_counter_checkout':'v59_counter_checkout',{p_request:pending.current.id,p_data:payload});
   pending.current=null;try{sessionStorage.removeItem(retryKey);}catch{/* Order is already confirmed and remains visible below. */}
   onSnapshot?.({draft:empty(),step:0,couponInput:'',picker:null,pending:null,result:order});
   setResult(order);setDraft(empty());setCouponInput('');setStep(0);setPicker(null);
   if(sendCopy)await sendCustomerCopy(order,whatsapp);
  }catch(e){whatsapp?.close();setMessage(`${e.message}. Si se cortó la conexión, reintentá sin cambiar el pedido.`);}
  finally{lock.current=false;setBusy(false);}
 }
 if(result)return <section className="card counter-success" role="status"><h2>Pedido enviado a cocina</h2><p className="counter-number">#{result.order_number||result.id.slice(0,8)}</p><p>{result.customer_name} · {money(result.total)}</p>{scheduledLabel(result)&&<p>Horario: {scheduledLabel(result)}</p>}<p>Ya aparece en <strong>Ingreso a cocina</strong>, identificado como Mostrador.</p>{Number(result.v87_earn_points)>0&&<p>Al entregarlo se acreditarán {result.v87_earn_points} puntos a la cuenta asociada.</p>}{Number(result.v80_earn_stamps)>0&&<p>Al entregarlo se acreditará 1 sello a la cuenta asociada.</p>}{Number(result.earn_points)>0&&data.loyaltyVersion!==80&&<p>Al entregarlo se acreditarán {result.earn_points} puntos{result.v59_points_multiplier===2?' · puntos dobles':''} a la cuenta asociada.</p>}{copyStatus&&<p role="status">{copyStatus}</p>}{whatsappLink(result.customer_phone)&&<button type="button" className="button quiet" disabled={busy} onClick={()=>sendCustomerCopy(result,prepareOrderWhatsapp())}>Abrir copia para el cliente en WhatsApp</button>}<div className="actions"><button className="button" onClick={onBoard}>Ver pedidos</button><button className="button quiet" onClick={()=>{setResult(null);setMessage('');}}>Cargar otro pedido</button></div></section>;
 return <section className="counter"><div className="section-header counter-head"><div><span className="counter-kicker">Pedidos · Mostrador</span><h2>{draft.customer_name?.trim()&&draft.customer_name.trim()!=='Mostrador'?draft.customer_name.trim():'Nuevo pedido de mostrador'}</h2></div><div className="counter-head-actions">{toolbar}<button className="button quiet" disabled={busy} onClick={async()=>{await reload();setAttempt(n=>n+1);}}>Actualizar catálogo</button></div></div>
 <p className="counter-current-step" aria-live="polite">Paso {step+1} de 4 · {['Cliente','Productos','Entrega','Pago'][step]}</p>
 <div className="counter-layout"><div className="counter-main"><section className="counter-catalog" hidden={step!==1}><CounterProductGrid products={products} compact={mobileInbox} categories={data.categories} items={draft.items} selectedId={picker?.product.id||''} disabled={busy} onPick={product=>setPicker({product})}/>{picker&&<ProductPicker key={picker.product.id+':'+channel+':'+(picker.editingKey||'new')} inline adminPricing product={picker.product} initial={picker.initial} data={data} channel={channel} onAdd={add} onDraftChange={savePicker} editing={Boolean(picker.editingKey)} onClose={()=>setPicker(null)}/>}<div className="counter-step-actions"><button type="button" className="button quiet counter-arrow" title="Volver a cliente" aria-label="Volver a cliente" disabled={busy} onClick={()=>goToStep(0)}><ArrowLeft aria-hidden="true"/></button><button type="button" className="button counter-arrow" title="Siguiente: entrega" aria-label="Siguiente: entrega" disabled={!valid||busy} onClick={()=>goToStep(2)}><ArrowRight aria-hidden="true"/></button></div></section>
 <form ref={form} onSubmit={submit} noValidate hidden={step===1}>
 <fieldset disabled={busy}><section data-counter-step="0" hidden={step!==0}><h3>Cliente</h3><p className="counter-step-hint">Con el nombre queda identificado si lo minimizás para cargar otro.</p>{draft.customer_user_id&&<p className="notice">Cuenta asociada: {draft.customer_name} · {draft.customer_stamp_balance??0} puntos <button type="button" className="text-button" disabled={busy} onClick={()=>setDraft(d=>({...d,customer_user_id:null,customer_stamp_balance:null,stamp_reward:'',stamp_product_id:'',stamp_variant_id:''}))}>Quitar cuenta</button></p>}<div className="form-grid"><label className="field"><span>Nombre del cliente</span><input required autoFocus={step===0} minLength={2} maxLength={120} autoComplete="off" value={draft.customer_name} onChange={e=>change('customer_name',e.target.value)}/></label><label className="field"><span>{channel==='delivery'?'Teléfono':'Teléfono (opcional en take away)'}</span><input type="tel" required={channel==='delivery'} minLength={6} maxLength={30} autoComplete="off" value={draft.customer_phone} onChange={e=>change('customer_phone',e.target.value)}/></label></div></section>
 <section data-counter-step="2" hidden={step!==2}><h3>Entrega</h3><fieldset disabled={busy} className="counter-delivery-mode"><fieldset className="counter-channel"><legend>Tipo de entrega</legend><label className="choice"><input type="radio" name="counter-channel" value="pickup" checked={channel==='pickup'} onChange={()=>setDraft(d=>({...d,...emptyCounterSchedule(),fulfillment_type:'pickup',payment_method:'',reward_id:'',remainder_payment:'',stamp_reward:'',stamp_product_id:'',stamp_variant_id:'',coupon_code:'',address:'',cross_streets:'',lat:null,lng:null}))}/><span>Take away</span></label><label className="choice"><input type="radio" name="counter-channel" value="delivery" checked={channel==='delivery'} disabled={!data.settings.delivery_enabled} onChange={()=>setDraft(d=>({...d,...emptyCounterSchedule(),fulfillment_type:'delivery',payment_method:'',reward_id:'',remainder_payment:'',stamp_reward:'',stamp_product_id:'',stamp_variant_id:'',coupon_code:''}))}/><span>Delivery</span></label></fieldset></fieldset>{channel==='delivery'&&<><AddressSearch apiKey={data.settings.maps_key} onSelect={place=>setDraft(d=>({...d,...place,cross_streets:d.address===place.address?d.cross_streets:''}))}/>{draft.address&&<p className="notice">{draft.address}{zone&&<><br/>{zone.name} · Envío {money(fee)}</>}</p>}{deliveryError&&<p className="notice error">{deliveryError}</p>}</>}
 {channel==='delivery'&&<CrossStreetsField value={draft.cross_streets} onChange={value=>change('cross_streets',value)}/>}
 <CounterScheduleFields draft={draft} channel={channel} schedule={schedule} onChange={patch=>setDraft(d=>({...d,...patch}))}/></section>
 <section data-counter-step="3" hidden={step!==3}><h3>Pago</h3><label className="field"><span>Forma de pago</span><select required value={draft.payment_method} onChange={e=>change('payment_method',e.target.value)}><option value="">Elegí una forma de pago</option>{payments.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>{!payments.length&&<p className="notice">Habilitá una forma de pago para Take away.</p>}{method?.message&&<p className="payment-message">{method.message}</p>}
 <CouponCodeField label="Cupón (opcional)" value={couponInput} onChange={setCouponInput}/><div className="actions"><button className="button quiet" type="button" disabled={!method||!valid||coupon.pending||!couponInput.trim()} onClick={()=>{change('coupon_code',couponInput.trim().toUpperCase());setAttempt(n=>n+1);}}>Aplicar cupón</button>{draft.coupon_code&&<button className="text-button" type="button" onClick={()=>{change('coupon_code','');setCouponInput('');}}>Quitar cupón</button>}</div>{coupon.error&&<p role="alert">{coupon.error}</p>}
 {stampMode&&draft.customer_user_id&&<StampRedemptionFields customerId={draft.customer_user_id} data={data} balance={draft.customer_stamp_balance} channel={channel} lines={lines} reward={draft.stamp_reward} onReward={value=>setDraft(d=>({...d,stamp_reward:value,stamp_product_id:'',stamp_variant_id:''}))} productId={draft.stamp_product_id} variantId={draft.stamp_variant_id} onBurger={(productId,variantId)=>{setDraft(d=>({...d,stamp_product_id:productId,stamp_variant_id:variantId}));if(data.pointsVersion===87&&!lines.some(l=>String(l.product?.id)===productId&&String(l.variant?.id||'')===variantId)){const product=data.products.find(p=>String(p.id)===productId);if(product){setStep(1);setPicker({product,initial:{variantId,quantity:1,extraIds:[],options:[]}});}}}} quote={stampQuote}/>} {redemptionMode&&<RedemptionFields data={data} channel={channel} rewardId={draft.reward_id} onReward={v=>change('reward_id',v)} remainder={draft.remainder_payment} onRemainder={v=>change('remainder_payment',v)} total={total} quote={reward}/>}<label className="field"><span>Notas para cocina</span><textarea maxLength={1000} value={draft.notes} onChange={e=>change('notes',e.target.value)}/></label>{data.pointsVersion===87&&draft.customer_user_id&&<p className="notice">Al entregar: {earnedItemPoints(lines,data,draft.stamp_reward,draft.stamp_product_id,draft.stamp_variant_id)} sellos para la cuenta asociada.</p>}{data.pointsVersion!==87&&stampMode&&draft.customer_user_id&&earnsStamp(subtotal-coupon.discount-stampQuote.discount,data)&&<p className="notice">Al entregar: 1 sello para la cuenta asociada.</p>}{points>0&&!stampMode&&<p className="notice">Al entregar: {points} puntos estimados para la cuenta{pointsMultiplier(data.pointsPromotion)===2?' · puntos dobles':''}.</p>}</section>
 <div className="counter-step-actions">{step>0&&<button type="button" className="button quiet counter-arrow" title="Paso anterior" aria-label="Paso anterior" onClick={()=>goToStep(step-1)}><ArrowLeft aria-hidden="true"/></button>}{step<3?<button type="button" className="button counter-arrow" title={step===0?'Siguiente: productos':'Siguiente paso'} aria-label={step===0?'Siguiente: productos':'Siguiente paso'} onClick={()=>goToStep(step+1)}><ArrowRight aria-hidden="true"/></button>: <><button type="submit" className="button counter-submit" disabled={!valid||!method||coupon.pending||stampQuote.pending||Boolean(coupon.error||pointsError||stampError||deliveryError)}>{busy?'Enviando…':'Enviar directo a cocina'}</button><button type="submit" name="action" value="customer-copy" className="button quiet counter-submit" disabled={busy||!valid||!method||coupon.pending||stampQuote.pending||Boolean(coupon.error||pointsError||stampError||deliveryError)}>Cargar pedido y enviar copia al cliente</button></>}</div></fieldset></form>
 {message&&<p className="notice" role="status">{message}</p>}</div>
 <details className="counter-cart" open={step===3?true:undefined}><summary>Resumen del pedido · {lines.reduce((n,l)=>n+l.quantity,0)} productos · {money(total)}</summary><fieldset disabled={busy}>{!lines.length&&<p>Elegí productos para empezar.</p>}{lines.map(l=><article className="counter-line" key={l.key}><div><strong>{l.product?.name||'Producto no disponible'}</strong>{l.variant?.name&&<small>{l.variant.name}</small>}{l.selected?.length>0&&<small>{l.selected.map(x=>`${x.quantity>1?x.quantity+' × ':''}${x.name}`).join(' · ')}</small>}{l.notes&&<small className="line-note">Aclaración: {l.notes}</small>}{l.unitPrice!=null&&<small>Precio ajustado: {money(l.unit)} por unidad</small>}{!l.valid&&<p role="alert">{l.issues.join(' · ')}</p>}</div><strong>{money(l.total)}</strong><div className="counter-line-actions"><label>Cantidad<input type="number" min="1" max="99" required value={l.quantity} onChange={e=>change('items',draft.items.map(x=>x.key===l.key?{...x,quantity:Number(e.target.value)}:x))}/></label><button className="text-button" type="button" disabled={!l.product} onClick={()=>{setStep(1);setPicker({product:l.product,editingKey:l.key,initial:draft.items.find(x=>x.key===l.key)});}}>Editar</button><button className="text-button" type="button" onClick={()=>change('items',draft.items.filter(x=>x.key!==l.key))}>Quitar</button></div></article>)}</fieldset><div className="summary"><span>Productos</span><span>{money(subtotal)}</span>{channel==='delivery'&&<><span>Envío</span><span>{zone?money(fee):'Por confirmar'}</span></>}{coupon.discount>0&&<><span>Cupón {draft.coupon_code}</span><span>−{money(coupon.discount)}</span></>}{reward.discount>0&&<><span>Canje de {reward.points} puntos</span><span>−{money(reward.discount)}</span></>}{stampQuote.discount>0&&<><span>Canje de puntos</span><span>−{money(stampQuote.discount)}</span></>}{stampQuote.deliveryDiscount>0&&<><span>Delivery sin cargo</span><span>−{money(stampQuote.deliveryDiscount)}</span></>}<strong>Total</strong><strong>{money(total)}</strong></div>
</details></div></section>;
}
