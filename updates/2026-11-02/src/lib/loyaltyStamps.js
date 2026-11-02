import {availableFor} from './catalogRules.js';
export const stampRewards=[
 {id:'delivery_free',cost:5,label:'Delivery sin cargo',short:'Delivery'},
 {id:'starter_free',cost:10,label:'Un starter gratis',short:'Starter'},
 {id:'burger_simple',cost:20,label:'Una hamburguesa simple gratis',short:'Burger simple'},
];
export const convertLegacyPoints=points=>Math.floor(Math.max(0,Number(points)||0)/1000);
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function burgerQuantity(lines,data){return (lines||[]).reduce((sum,l)=>sum+(/burger|hamburgues/.test(norm(data.categories?.find(c=>String(c.id)===String(l.product?.category_id))?.name))?Math.max(0,Math.floor(Number(l.quantity)||0)):0),0);}
export function earnedBurgerStamps(lines,data,reward='',productId='',variantId=''){
 const count=burgerQuantity(lines,data);
 const free=reward==='burger_simple'&&(lines||[]).some(l=>String(l.product?.id)===String(productId)&&String(l.variant?.id||'')===String(variantId||'')&&l.quantity>0);
 return Math.max(0,count-(free?1:0));
}
export function stampProducts(data,reward,channel='pickup'){
 return (data.products||[]).flatMap(p=>{
  const c=data.categories?.find(c=>String(c.id)===String(p.category_id)&&c.active!==false);
  if(!c||!availableFor(p,channel))return [];
  const variants=p.v51_variants||[];
  return (variants.length?variants.filter(v=>v.active):[null]).filter(v=>reward==='starter_free'?/starter|entrada/.test(norm(c.name)):reward==='burger_simple'&&/burger|hamburgues/.test(norm(c.name))&&(v?/\bsimple\b/.test(norm(v.name)):/\bsimple\b/.test(norm(p.name))&&!/doble|double|triple/.test(norm(p.name+' '+p.description)))).map(v=>({productId:String(p.id),variantId:String(v?.id||''),label:p.name+(v?' · '+v.name:''),image:p.image_url}));
 });
}
