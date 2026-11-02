import {useEffect,useState} from 'react';
import {rpc} from './api';

export default function useStampQuote({enabled,reward,productId,variantId,items,channel,code,payment,address,lat,lng,customerId=null,canUse,valid,data,attempt=0,staff=false}){
 const input={staff_pricing:staff,items,fulfillment_type:channel,coupon_code:code||null,payment_method:payment||null,address:address||null,lat,lng,stamp_reward:reward||null,stamp_product_id:productId||null,stamp_variant_id:variantId||null};
 const key=JSON.stringify({enabled,input,customerId,canUse,valid,attempt}),[result,setResult]=useState(null);
 useEffect(()=>{
  if(!enabled||!reward||!canUse||!valid||!payment)return;
  let active=true;const timer=setTimeout(async()=>{try{const quote=await rpc('v80_stamp_quote',{p_data:input,p_customer:customerId});if(active)setResult({key,data,quote});}catch(e){if(active)setResult({key,data,error:e.message});}},250);
  return()=>{active=false;clearTimeout(timer);};
  // The serialized key represents the complete order selection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,data]);
 const empty={discount:0,deliveryDiscount:0,stamps:0,pending:false,error:''};
 if(!enabled||!reward)return empty;
 if(!canUse)return {...empty,error:'Se necesita una cuenta registrada para canjear sellos.'};
 if(!valid)return {...empty,error:'Revisá los productos, la entrega y el cupón antes de canjear.'};
 if(!payment)return {...empty,error:'Elegí primero una forma de pago.'};
 if(reward!=='delivery_free'&&!productId)return {...empty,error:'Elegí el producto que querés canjear.'};
 if(result?.key!==key||result.data!==data)return {...empty,pending:true,error:'Validando el canje…'};
 return {...empty,discount:Number(result.quote?.discount||0),deliveryDiscount:Number(result.quote?.delivery_discount||0),stamps:Number(result.quote?.stamps||0),balance:Number(result.quote?.balance||0),code:result.quote?.code||'',label:result.quote?.label||'',error:result.error||''};
}
