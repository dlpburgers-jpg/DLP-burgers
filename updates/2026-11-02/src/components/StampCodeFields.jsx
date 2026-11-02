import {useState} from 'react';
import {rpc} from '../lib/api';
import {stampRewards,stampProducts,burgerQuantity} from '../lib/loyaltyStamps';
import {money} from '../lib/domain';
export default function StampCodeFields({data,balance,channel,lines=[],reward,onReward,productId,variantId,onBurger,quote,customerId=null}){
 const available=Math.max(0,Number(balance)||0),choices=stampProducts(data,reward,channel),[busy,setBusy]=useState(false),[code,setCode]=useState(''),[error,setError]=useState('');
 async function choose(value){setError('');if(!value){setCode('');onReward('');return;}setBusy(true);try{const result=await rpc('dlp_issue_stamp_code',{p_reward:value,p_customer:customerId});setCode(result.code);onReward(value);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <fieldset className="stamp-redemption points-redemption" disabled={busy}><legend>Canjear sellos</legend><p>Tenés <strong>{available} sellos</strong></p>
 <label className="field"><span>Premio para este pedido</span><select value={reward||''} onChange={e=>choose(e.target.value)}><option value="">Guardar mis sellos</option>{stampRewards.map(r=><option key={r.id} value={r.id} disabled={available<r.cost||(r.id==='delivery_free'?channel!=='delivery'||burgerQuantity(lines,data)<3:!stampProducts(data,r.id,channel).length)}>{r.cost} sellos · {r.label}</option>)}</select></label>
 {reward&&reward!=='delivery_free'&&<label className="field"><span>Elegí tu premio</span><select required value={productId?`${productId}|${variantId||''}`:''} onChange={e=>{const [p,v='']=e.target.value.split('|');onBurger(p,v);}}><option value="">Elegir producto</option>{choices.map(c=><option key={c.productId+'|'+c.variantId} value={c.productId+'|'+c.variantId}>{c.label}</option>)}</select></label>}
 <p className="muted">Delivery gratis con 3 hamburguesas o más. Un premio por pedido. Los sellos se descuentan al confirmar; si cancelás, se devuelven. Los adicionales se cobran aparte.</p>
 {reward&&(quote.code||code)&&<p>Código: <strong>{quote.code||code}</strong> · se aplica automáticamente al confirmar.</p>}
 {(error||quote.error)&&<p className="notice" role="status">{error||quote.error}</p>}{quote.stamps>0&&!quote.error&&<p role="status">{quote.label} · −{quote.stamps} sellos · {money(quote.discount+quote.deliveryDiscount)} de beneficio.</p>}
 </fieldset>;
}
