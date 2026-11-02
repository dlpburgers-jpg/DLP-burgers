import PointsRedemptionFields from './PointsRedemptionFields';
import {money} from '../lib/domain';
import {eligibleDoubleBurgers,stampRules} from '../lib/stamps';

export default function StampRedemptionFields({data,balance,channel,lines,reward,onReward,productId,variantId,onBurger,quote,customerId=null}){
 if(data.pointsVersion===87)return <PointsRedemptionFields {...{data,balance,channel,lines,reward,onReward,productId,variantId,onBurger,quote,customerId}}/>;
 const rules=stampRules(data),burgers=eligibleDoubleBurgers(lines,data),known=Number.isFinite(Number(balance)),available=known?Number(balance):Number(quote.balance||0);
 const deliveryUnavailable=channel!=='delivery'||(known&&available<rules.deliveryCost);
 const burgerUnavailable=!burgers.length||(known&&available<rules.burgerCost);
 return <fieldset className="stamp-redemption"><legend>Canjear sellos</legend>
  <p className="stamp-balance">Tenés <strong>{known?available:'—'} sellos</strong></p>
  <label className="field"><span>Beneficio para este pedido</span><select value={reward||''} onChange={e=>onReward(e.target.value)}><option value="">Guardar mis sellos</option><option value="delivery_free" disabled={deliveryUnavailable}>{rules.deliveryCost} sellos · Delivery sin cargo{channel!=='delivery'?' · solo delivery':''}</option><option value="burger_double" disabled={burgerUnavailable}>{rules.burgerCost} sellos · Una hamburguesa doble{!burgers.length?' · agregá una doble':''}</option></select></label>
  {reward==='burger_double'&&<label className="field"><span>Hamburguesa doble a canjear</span><select required value={productId?`${productId}|${variantId||''}`:''} onChange={e=>{const [nextProduct,nextVariant='']=e.target.value.split('|');onBurger(nextProduct,nextVariant);}}><option value="">Elegí una hamburguesa</option>{burgers.map(item=><option key={`${item.productId}:${item.variantId||'base'}`} value={`${item.productId}|${item.variantId}`}>{item.label}</option>)}</select></label>}
  <p className="muted">El canje es opcional y se usa una sola vez por pedido. La hamburguesa incluye su presentación Doble; los adicionales pagos se cobran aparte.</p>
  {quote.error&&<p className="notice" role="status">{quote.error}</p>}
  {quote.stamps>0&&!quote.error&&<p>Se descontarán <strong>{quote.stamps} sellos</strong>. Beneficio: <strong>{quote.label}</strong>{quote.discount+quote.deliveryDiscount>0?` (${money(quote.discount+quote.deliveryDiscount)})`:''}.</p>}
 </fieldset>;
}
