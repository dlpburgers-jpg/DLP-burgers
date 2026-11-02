import WebPages from './components/WebPages';
import './web-desktop.css';
import WeeklyRaffle from './components/WeeklyRaffle';
import PhoneRegistration from './components/PhoneRegistration';
import {signInWithPhone,recoveryWhatsapp} from './lib/phoneRegistration';
import AccountSections from './components/AccountSections';
import {confirmationLanding} from './lib/accountLanding';
import {requestedPc} from './lib/stationPolicy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import {ACCOUNT_URL,recoveryLanding,temporaryPasswordRequest} from './lib/accountSecurity';
import {PasswordResetRequest,PasswordChange,RecoveryPage,TemporaryPasswordPage} from './components/AccountSecurity';
import AccountDeletion from './components/AccountDeletion';
import Support from './components/Support';
import Privacy from './components/Privacy';
import { supabase } from './lib/supabaseClient';
import {watchSession,signOutThisDevice} from './lib/session';
import { catalog, rpc } from './lib/api';
import {submitGuestCheckout} from './lib/guestCheckout';
import {submitCustomerCheckout,checkoutFailureMessage} from './lib/customerCheckout';
import { cartKey, deliveryZone, money, priceCart, readCart } from './lib/domain';
import Admin, { Field } from './components/Admin';
import Orders from './components/Orders';
import { AddressSearch } from './components/Maps';
import CrossStreetsField,{crossStreetsError} from './components/CrossStreetsField';
import ProductPicker from './components/ProductPicker';
import {availableFor} from './lib/catalogRules';
import ProductMenu from './components/ProductMenu';
import {PREVIEW,storageKey} from './lib/mode';
import {availablePayments,roundMoney} from './lib/commerce';
import useCouponQuote from './lib/useCouponQuote';
import CouponCodeField from './components/CouponCodeField';
import BrandLogo from './components/BrandLogo';
import burgerBanner from './assets/dlp-burgers-banner.webp';
import stampMascot from './assets/dlp-stamp-mascot.webp';
import PointsAccount from './components/PointsAccount';
import {earnedItemPoints} from './lib/points';
import useSchedule from './lib/useSchedule';
import SchedulePicker from './components/SchedulePicker';
import {scheduledLabel,scheduleSelectionError} from './lib/schedule';
import useStoreStatus from './lib/useStoreStatus';
import StoreClosedNotice from './components/StoreClosedNotice';
import {closedStoreNotice} from './lib/storeNotice';
import useRedemptionQuote from './lib/useRedemptionQuote';
import RedemptionFields from './components/RedemptionFields';
import useStampQuote from './lib/useStampQuote';
import StampRedemptionFields from './components/StampRedemptionFields';
import {earnsStamp,stampRules} from './lib/stamps';
import PushPreferences from './components/PushPreferences';
import PushInstallPrompt from './components/PushInstallPrompt';
import {detachPushOnLogout,openNativeNotification,PUSH_TARGETS,refreshNativePushRegistration} from './lib/push';
import CustomerProfile, {ProfileFields} from './components/CustomerProfile';
import useCustomerProfile from './lib/useCustomerProfile';
import {emptyProfile,profileError,orderContact} from './lib/customerProfile';
import {DLP_WHATSAPP,PRIVACY_VERSION} from './config';
import {withTimeout} from './lib/pwa';
import {orderWhatsappLink,prepareOrderWhatsapp,watchCustomerOrders} from './lib/customerOrders';
import {whatsappLink} from './lib/boardOperations';
import CustomerCampaigns from './components/CustomerCampaigns';
import GamingLive from './components/GamingLive';
import GamingAccount from './components/GamingAccount';
import {accountIdentifier,internalStaffUsername,normalizeLoginIdentifier} from './lib/staffLogin';
const requestedPushView=new URLSearchParams(window.location.search).get('screen');
const landingOrderId=new URLSearchParams(window.location.search).get('order');
const pushLanding=Object.hasOwn(PUSH_TARGETS,requestedPushView||'');
const initial = { products: [], categories: [], extras: [], links: [], groups: [], options: [], groupLinks: [], zones: [], promotions:[], events:[], drivers:[], bestSellers:[], settings: {}, ready: false };
function tokens() { try { const x = JSON.parse(localStorage.getItem(storageKey('receipts')) || '[]'); return Array.isArray(x) ? x.filter(v => typeof v === 'string').slice(0, 200) : []; } catch { return []; } }
import {getAccess,isStaff} from './lib/staffAccess';

const customerCategoryOrder=['burgers','starters','sandwiches','bebidas'];
function customerCategoryKind(name=''){
 const value=String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 if(value.includes('BURGER')||value.includes('HAMBURG'))return 'burgers';
 if(value.includes('STARTER')||value.includes('ENTRADA')||value.includes('PAPA')||value.includes('ACOMPAN'))return 'starters';
 if(value.includes('SANDWICH')||value.includes('SANGUCHE')||value.includes('LOMITO'))return 'sandwiches';
 if(value.includes('BEBIDA')||value.includes('DRINK')||value.includes('GASEOSA'))return 'bebidas';
 return 'other';
}
function CustomerMenuIcon({kind}){
 if(kind==='burgers')return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10c.3-3 2.8-5 7-5s6.7 2 7 5"/><path d="M4 10h16M5 14h14M6 14c0 3 1.2 4 3.5 4h5C16.8 18 18 17 18 14"/></svg>;
 if(kind==='starters')return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 3 1 7M12 2v8m5-7-1 7"/><path d="M5 9h14l-1.5 11h-11z"/></svg>;
 if(kind==='sandwiches')return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18 12 5l8 13H4Z"/><path d="M7 15h10M9 12h6"/></svg>;
 return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13H7z"/><path d="m9 3 6 4m0-4-2 6"/></svg>;
}
function CustomerCartIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 11H6z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;}

function LoyaltyAccount({data,history}){
 if(data.pointsVersion===87)return <PointsAccount data={data} history={history}/>;
 if(data.loyaltyVersion===80){
  const balance=Math.max(0,Number(history.stampBalance||0));
  const earned=Math.min(30,balance);
  return <details className="card stamp-account">
   <summary className="stamp-account-summary"><span>Mis sellos</span><strong>{balance} / 30</strong></summary>
   <div className="stamp-account-content">
    <div className="stamp-grid" aria-label={`${earned} de 30 sellos obtenidos`}>{Array.from({length:30},(_,i)=><span key={i} className={i<earned?'earned':''} aria-hidden="true"><img src={stampMascot} alt="" /></span>)}</div>
    <p>Recibís 1 sello por cada {money(stampRules(data).minimum)} en productos, sin contar el envío.</p>
    <p><strong>5 sellos:</strong> delivery sin cargo. <strong>30 sellos:</strong> una hamburguesa doble a elección.</p>
    <p className="muted">Elegís si querés canjearlos al finalizar un pedido. Podés guardarlos hasta llegar a 30.</p>
    {(history.stampLedger||[]).map(l=><div className="admin-row" key={l.id}><span>{{earn:'Compra entregada',redeem:'Canje',refund:'Devolución'}[l.kind]||'Movimiento'}{l.reward&&<small>{l.reward==='delivery_free'?'Delivery sin cargo':l.reward==='burger_double'?'Hamburguesa doble':''}</small>}<small>{new Date(l.created_at).toLocaleDateString('es-AR')}</small></span><strong>{l.amount>0?'+':''}{l.amount}</strong></div>)}
   </div>
  </details>;
 }
 return <div className="card"><p className="eyebrow">Tus puntos</p><h2 className="points-balance">{history.balance}</h2><p>{data.settings.points_enabled ? `Sumás 1 punto cada ${money(data.settings.earn_every)} de compra. ${data.redemptionVersion===60?'Elegí una equivalencia disponible en Canjeo puntos al hacer tu pedido.':`Cada punto vale ${money(data.settings.point_value)} al canjear.`}` : 'El programa de puntos todavía no está habilitado.'}</p><p className="muted">Se acreditan al entregar el pedido. Comprá con tu sesión iniciada para acumularlos.</p>{history.ledger.map(l=><div className="admin-row" key={l.id}><span>{{earn:'Compra entregada',redeem:'Canje',refund:'Devolución'}[l.kind]}<small>{new Date(l.created_at).toLocaleDateString('es-AR')}</small></span><strong>{l.amount>0?'+':''}{l.amount}</strong></div>)}</div>;
}

export default function App() {
 const [manualRegistration,setManualRegistration]=useState(false);
 useEffect(()=>{let active=true;supabase.rpc('dlp_registration_config').then(({data,error})=>{if(active&&!error)setManualRegistration(data?.enabled===true);});return()=>{active=false;};},[]);
 const [data, setData] = useState(initial), [loading, setLoading] = useState(true), [message, setMessage] = useState('');
 const [notificationWelcome,setNotificationWelcome]=useState(confirmationLanding);
 const [recovery,setRecovery]=useState(recoveryLanding),[recoveryUser,setRecoveryUser]=useState(null);
 const [view, setView] = useState(['support','privacy','gaming'].includes(requestedPushView)?requestedPushView:pushLanding?requestedPushView:'shop'), [session, setSession] = useState(null), [admin, setAdmin] = useState(false);
 const [cart, setCart] = useState(() => readCart(undefined,storageKey('cart'))), [storageMessage, setStorageMessage] = useState('');
 const [picker,setPicker] = useState(null), [category, setCategory] = useState('all');
 const [checkoutStep,setCheckoutStep]=useState(1);
 const [checkoutInView,setCheckoutInView]=useState(false);
 const [customer, setCustomer] = useState({ name: '', phone: '', type: 'pickup', payment:'', reward:'', remainder:'', stampReward:'', stampProduct:'', stampVariant:'', scheduled:'', notes: '', address: '', cross_streets:'', lat: null, lng: null, redeem: 0 });
 const [couponInput,setCouponInput]=useState(''),[couponCode,setCouponCode]=useState('');
 const [couponAttempt,setCouponAttempt]=useState(0);
 const [history, setHistory] = useState({ orders: [], legacy: [], ledger: [], balance: 0, stampLedger:[], stampBalance:0 }), [historyBusy, setHistoryBusy] = useState(false);
 const [focusOrder,setFocusOrder]=useState(null),[historyError,setHistoryError]=useState('');
 const historyRequest=useRef(null);
 const [submitting, setSubmitting] = useState(false), [checkoutMessage, setCheckoutMessage] = useState('');
 const [pendingRetry,setPendingRetry]=useState(()=>{try{return JSON.parse(localStorage.getItem(storageKey('pending'))||'null');}catch{return null;}});
 const [signup,setSignup]=useState(false),[registration,setRegistration]=useState({...emptyProfile}),[addressMode,setAddressMode]=useState('saved');
 const contactOwner=useRef(null);
 const [authReady,setAuthReady]=useState(PREVIEW),[authError,setAuthError]=useState('');
 const [account, setAccount] = useState({ email: requestedPc(), password: '' }), [accountMessage, setAccountMessage] = useState(''), [authBusy, setAuthBusy] = useState(false);
 const [online, setOnline] = useState(navigator.onLine), [installPrompt, setInstallPrompt] = useState(null);
 const [nativePush,setNativePush]=useState(null);
 const submitLock = useRef(false), pendingRef = useRef(null), authEpoch = useRef(0), adminLanding=useRef(null), checkoutReturn=useRef(false);
 const applyProfile=useCallback(p=>{if(p.complete){setAddressMode('saved');setCustomer(c=>({...c,...orderContact(p,c.type)}));}},[]);
 const profileState=useCustomerProfile(session?.user?.id,applyProfile);
 const profile=profileState.data;
 const canCheckout = PREVIEW || Boolean(session?.user?.id && !session.user.is_anonymous);
 const store=useStoreStatus(data.storeVersion===58,data.store);
 const storeError=data.storeVersion===58?(store.error||(store.status?.open===false?closedStoreNotice(store.status).message:!store.status?'Consultando el estado de la tienda…':'')):'';
 function openCart() { setView('shop'); setTimeout(()=>{const cartElement=document.getElementById('cart');cartElement?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});cartElement?.focus({preventScroll:true});},0); }
 function chooseCategory(value){setCategory(value);setTimeout(()=>document.getElementById('menu-products')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}),0);}
 function openCheckoutAccount(message) { checkoutReturn.current=true;setSignup(false);setAccountMessage(typeof message==='string'?message:'Ingresá o creá tu cuenta para confirmar. Tu carrito queda guardado.');setView('account'); }
 const reload = useCallback(async () => { setLoading(true); setMessage(''); try { setData(await catalog()); } catch (e) { setMessage(e.message); } finally { setLoading(false); } }, []);
 const loadHistory = useCallback(() => {
  const epoch=authEpoch.current;
  if(historyRequest.current?.epoch===epoch)return historyRequest.current.promise;
  setHistoryBusy(true);
  const promise=(async()=>{try{const h=await withTimeout(rpc(data.loyaltyVersion===80?'v80_history':'v5_history',{p_tokens:tokens()}),'No pudimos actualizar el pedido.');if(epoch!==authEpoch.current)return null;setHistory(h);setHistoryError('');return h;}catch{if(epoch===authEpoch.current)setHistoryError('No pudimos actualizar el estado del pedido.');return null;}finally{if(epoch===authEpoch.current)setHistoryBusy(false);if(historyRequest.current?.epoch===epoch)historyRequest.current=null;}})();
  historyRequest.current={epoch,promise};return promise;
 },[data.loyaltyVersion]);
 useEffect(()=>watchSession(supabase.auth,{
  onSession:next=>{
   authEpoch.current++;
   const owner=next?.user?.id||null;
   if(contactOwner.current!==owner){
    contactOwner.current=owner;setAdmin(false);setHistory({orders:[],legacy:[],ledger:[],balance:0,stampLedger:[],stampBalance:0});setFocusOrder(null);setHistoryError('');
    setCustomer(c=>({...c,name:'',phone:'',address:'',lat:null,lng:null}));setAddressMode('saved');
   }
   if(!next)adminLanding.current=null;
   setSession(next);
  },onReady:()=>setAuthReady(true),onError:setAuthError,onRecovery:id=>{setRecoveryUser(id);setRecovery(true);}
 }),[]);
 useEffect(()=>{
  if(!session?.user?.id||session.user.is_anonymous)return;
  refreshNativePushRegistration().catch(()=>{});
 },[session?.user?.id,session?.user?.is_anonymous]);
 useEffect(() => { let alive = true; const check=()=>getAccess().then(v => { if (alive){setAdmin(isStaff(v)?v:false);const who=PREVIEW?'preview':session?.user?.id;if(isStaff(v)&&who&&adminLanding.current!==who&&!checkoutReturn.current&&!pushLanding){adminLanding.current=who;setView('admin');}} }).catch(() => { if (alive) setAdmin(false); }); check();const poll=setInterval(check,10000);const wake=()=>{if(!document.hidden)check();};document.addEventListener('visibilitychange',wake);const timer=setTimeout(reload,0); return () => { alive = false; clearTimeout(timer); clearInterval(poll);document.removeEventListener('visibilitychange',wake); }; }, [session, reload]);
 useEffect(() => { if (data.ready) { const timer=setTimeout(loadHistory,0); return ()=>clearTimeout(timer); } }, [data.ready, session, loadHistory]);
 useEffect(()=>{
  if(view!=='orders'||admin||!data.ready||(!PREVIEW&&!session?.user?.id))return;
  return watchCustomerOrders({refresh:loadHistory,userId:session?.user?.id,client:supabase,preview:PREVIEW});
 },[view,admin,data.ready,session?.user?.id,loadHistory]);
 useEffect(() => { try { localStorage.setItem(storageKey('cart'), JSON.stringify(cart)); } catch { const timer=setTimeout(()=>setStorageMessage('Este navegador no permite guardar el carrito. Se conservará mientras la página siga abierta.'),0); return ()=>clearTimeout(timer); } }, [cart]);
 useEffect(()=>{
  if(view!=='shop'||typeof IntersectionObserver==='undefined')return undefined;
  const node=document.getElementById('checkout-wizard');if(!node)return undefined;
  const observer=new IntersectionObserver(([entry])=>setCheckoutInView(entry.isIntersecting),{rootMargin:'0px 0px -15% 0px',threshold:0});
  observer.observe(node);return()=>observer.disconnect();
 },[view,data.ready]);
 useEffect(() => {
  const yes = () => setOnline(true), no = () => setOnline(false), install = e => { e.preventDefault(); setInstallPrompt(e); };
  window.addEventListener('online', yes); window.addEventListener('offline', no); window.addEventListener('beforeinstallprompt', install);
  return () => { window.removeEventListener('online', yes); window.removeEventListener('offline', no); window.removeEventListener('beforeinstallprompt', install); };
 }, []);
 useEffect(() => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return undefined;
  let active = true, handle;
  NativeApp.addListener('backButton', () => {
   if (picker) { setPicker(null); return; }
   if (!admin && view !== 'shop') { setView('shop'); window.scrollTo(0, 0); return; }
   if (!submitting) NativeApp.exitApp();
  }).then(next => { if (active) handle = next; else next.remove(); });
  return () => { active = false; handle?.remove(); };
 }, [admin, picker, submitting, view]);
 const change = (field, value) => setCustomer(c => ({ ...c, [field]: value }));
 const schedule=useSchedule(true,customer.type,data.schedules);

 const scheduleError=scheduleSelectionError(schedule,customer.scheduled);
 function add(product,selection) {
  const key=cartKey(product.id,selection.extraIds,selection.variantId,selection.options,selection.notes), original=cart.find(l=>l.key===picker?.editingKey), quantity=Number(selection.quantity)||original?.quantity||1;
  const remaining=original?cart.filter(l=>l.key!==original.key):cart, existing=remaining.find(l=>l.key===key);
  if(remaining.length>=50&&!existing)return setCheckoutMessage('El carrito admite hasta 50 combinaciones.');
  if((existing?.quantity||0)+quantity>99)return setCheckoutMessage('Máximo 99 unidades por combinación.');
  setCart(existing?remaining.map(l=>l.key===key?{...l,quantity:l.quantity+quantity}:l):[...remaining,{...selection,key,productId:String(product.id),quantity}]);
  setPicker(null);setCheckoutMessage('');
 }
 const visibleCategories=data.categories.filter(c=>c.active&&data.products.some(p=>availableFor(p,customer.type)&&String(p.category_id)===String(c.id))).sort((a,b)=>{const left=customerCategoryOrder.indexOf(customerCategoryKind(a.name)),right=customerCategoryOrder.indexOf(customerCategoryKind(b.name));return (left<0?99:left)-(right<0?99:right);});
 const mobileMenuCategories=customerCategoryOrder.map(kind=>({kind,label:{burgers:'BURGERS',starters:'STARTERS',sandwiches:'SANDWICHES',bebidas:'BEBIDAS'}[kind],item:visibleCategories.find(categoryItem=>customerCategoryKind(categoryItem.name)===kind)}));
 const lines = priceCart(cart, data.products.filter(p => !p.dlp_staff_only && data.categories.some(c => c.active && String(c.id) === String(p.category_id))), data.extras, data.links, data, customer.type);
 const subtotal = Math.round(lines.reduce((sum, l) => sum + l.total, 0) * 100) / 100, count = cart.reduce((sum, l) => sum + l.quantity, 0);
 const zone = customer.type === 'delivery' && customer.lat != null ? deliveryZone(customer, data.zones) : null;
 const fee = customer.type === 'delivery' ? Number(zone?.fee || 0) : 0;
 const payments=availablePayments(data.paymentMethods,customer.type), payment=payments.find(p=>p.id===customer.payment);
 const orderItems=cart.map(({productId,extraIds,quantity,variantId,options,notes})=>({productId,extraIds,quantity,variantId,options,notes}));
 const coupon=useCouponQuote(couponCode,orderItems,customer.type,payment?.id,subtotal,lines.length>0&&lines.every(l=>l.valid),data,couponAttempt);
 function applyCoupon(){if(!couponInput.trim()||!lines.length||!payment||coupon.pending)return;setCouponCode(couponInput.trim().toUpperCase());setCouponAttempt(n=>n+1);}
 const stampMode=data.loyaltyVersion===80,redemptionMode=!stampMode&&data.redemptionVersion===60&&payment?.id==='points';
 const reward=useRedemptionQuote({enabled:redemptionMode,items:orderItems,channel:customer.type,code:couponCode,rewardId:customer.reward,canUse:canCheckout,valid:lines.length>0&&lines.every(l=>l.valid)&&!coupon.pending&&!coupon.error,data,attempt:couponAttempt});
 const stampQuote=useStampQuote({enabled:stampMode,reward:customer.stampReward,productId:customer.stampProduct,variantId:customer.stampVariant,items:orderItems,channel:customer.type,code:couponCode,payment:payment?.id,address:customer.address,lat:customer.lat,lng:customer.lng,canUse:canCheckout,valid:lines.length>0&&lines.every(l=>l.valid)&&!coupon.pending&&!coupon.error&&(customer.type!=='delivery'||Boolean(zone)),data,attempt:couponAttempt});
 const redeem=redemptionMode?reward.points:data.redemptionVersion===60?0:session&&data.settings.points_enabled?Number(customer.redeem||0):0;
 const discount=stampMode?stampQuote.discount:redemptionMode?reward.discount:roundMoney(redeem*Number(data.settings.point_value||0));
 const deliveryStampDiscount=stampMode?stampQuote.deliveryDiscount:0;
 const remaining=roundMoney(subtotal-coupon.discount),orderTotalBeforePayment=roundMoney(remaining+fee-discount-deliveryStampDiscount);
 const paymentError=data.commerceVersion===52&&!payment?(payments.length?'Elegí una forma de pago.':'No hay formas de pago habilitadas para esta entrega.') : '';
 const pointsError=redemptionMode?(reward.error||((orderTotalBeforePayment>0&&!payments.some(p=>p.id===customer.remainder&&p.id!=='points'))?'Elegí otro medio para pagar el saldo restante.':'')):!stampMode&&(!Number.isInteger(redeem)||redeem<0||redeem>history.balance||discount>remaining)?'Revisá los puntos: solo podés canjear hasta el importe de productos restante.':'';
 const stampError=stampMode&&customer.stampReward?stampQuote.error:'';
 const deliveryError = customer.type !== 'delivery' ? '' : !data.settings.delivery_enabled ? 'Delivery no está habilitado.' : customer.lat == null ? 'Seleccioná el domicilio de entrega.' : !zone ? 'El domicilio queda fuera de nuestras zonas de reparto.' : subtotal < Number(zone.minimum) ? `El mínimo de ${zone.name} es ${money(zone.minimum)}.` : '';
 const total=roundMoney(remaining+fee-discount-deliveryStampDiscount);
 const stampEligible=roundMoney(Math.max(0,subtotal-coupon.discount-discount));
 const contactError=customer.name.trim().length<2?'Ingresá tu nombre.':customer.phone.trim().length<6?'Ingresá un teléfono válido.':'';
 const cartError=!lines.length?'Agregá al menos un producto al carrito.':lines.some(line=>!line.valid)?'Revisá los productos no disponibles del carrito.':'';
 const accountError=canCheckout&&!PREVIEW&&!profile?.complete?'Completá tus datos en Mi cuenta para continuar.':'';
 const streetsError=crossStreetsError(customer.type,customer.cross_streets);
 const checkoutStepOneError=accountError||cartError||contactError||deliveryError||streetsError||scheduleError;
 const checkoutStepTwoError=paymentError||pointsError||stampError||coupon.error||(coupon.pending||stampQuote.pending?'Esperá la validación del descuento.':'');
 const checkoutStepOneReady=!checkoutStepOneError;
 const checkoutStepTwoReady=checkoutStepOneReady&&!checkoutStepTwoError;
 function goCheckoutStep(next){
  setCheckoutMessage('');setCheckoutStep(next);
  requestAnimationFrame(()=>{const heading=document.getElementById(`checkout-step-${next}-title`);heading?.focus({preventScroll:true});if(window.matchMedia('(max-width: 960px)').matches)heading?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
 }
 const payload = { customer_name: customer.name, customer_phone: customer.phone, fulfillment_type: customer.type, scheduled_at:customer.scheduled||null,payment_method:payment?.id,coupon_code:couponCode||null, notes: customer.notes, address: customer.type === 'delivery' ? customer.address : null, lat: customer.type === 'delivery' ? customer.lat : null, lng: customer.type === 'delivery' ? customer.lng : null, redeem_points: redeem, reward_id:redemptionMode?customer.reward:null,remainder_payment:redemptionMode?customer.remainder:null, stamp_reward:stampMode?customer.stampReward:null,stamp_product_id:stampMode?customer.stampProduct:null,stamp_variant_id:stampMode?customer.stampVariant:null, expected_total: total, items: orderItems };
 payload.cross_streets=customer.type==='delivery'?String(customer.cross_streets||'').trim():null;
 useEffect(()=>{setCustomer(c=>({...c,cross_streets:''}));},[customer.address]);
 const requestSignature=JSON.stringify({payload,user:session?.user?.id||null}),canRetry=Boolean(pendingRetry?.signature&&pendingRetry.signature===requestSignature);
 async function checkout(e,recover=false) {
  e?.preventDefault?.(); if (submitLock.current) return; setCheckoutMessage('');
  if (!PREVIEW&&!authReady) return setCheckoutMessage('Esperá mientras recuperamos tu sesión.');
  if(canCheckout&&!PREVIEW&&!profile?.complete){setAccountMessage('Completá tus datos para confirmar el pedido.');setView('account');return;}
  if (storeError&&!(recover&&canRetry)) return setCheckoutMessage(storeError);
  if (!data.ready || !online) return setCheckoutMessage('Necesitás conexión y la nueva versión habilitada para confirmar.');
  if (!lines.length || lines.some(l => !l.valid)) return setCheckoutMessage('Revisá los productos no disponibles del carrito.');
  if (deliveryError||streetsError) return setCheckoutMessage(deliveryError||streetsError);
  if (scheduleError&&!(recover&&canRetry)) return setCheckoutMessage(scheduleError);
  if(paymentError||pointsError||stampError||coupon.error||coupon.pending||stampQuote.pending)return setCheckoutMessage(paymentError||pointsError||stampError||coupon.error||'Esperá la validación del descuento.');
  submitLock.current = true; setSubmitting(true);
  const checkoutOwner=session?.user?.id||null;
  const whatsapp=!PREVIEW&&whatsappLink(DLP_WHATSAPP)?prepareOrderWhatsapp():null;
  try {
   const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ payload, user: session?.user?.id || null }))))].map(x => x.toString(16).padStart(2, '0')).join('');
   let pending = pendingRef.current;
   try { pending = JSON.parse(localStorage.getItem(storageKey('pending')) || 'null') || pending; } catch { /* memory fallback */ }
   const requestId = pending?.digest === digest ? pending.requestId : crypto.randomUUID();
   const guestToken=pending?.digest===digest&&pending?.guestToken?pending.guestToken:crypto.randomUUID();
   pendingRef.current = { digest, requestId, guestToken, signature:requestSignature };
   try { localStorage.setItem(storageKey('pending'), JSON.stringify(pendingRef.current)); } catch { /* memory fallback */ }
   const checkoutName=stampMode?'v80_checkout':'v5_checkout',checkoutArgs={p_request:requestId,p_data:payload};
   const order = PREVIEW ? await rpc(checkoutName,checkoutArgs) : canCheckout ? await submitCustomerCheckout(supabase,checkoutName,checkoutArgs,checkoutOwner) : await submitGuestCheckout(supabase,{...checkoutArgs,p_guest_token:guestToken});
   if(!PREVIEW&&contactOwner.current!==checkoutOwner){whatsapp?.close();return;}
   try { if(!session) localStorage.setItem(storageKey('receipts'), JSON.stringify([...new Set([order.tracking_token, ...tokens()])].slice(0, 200))); localStorage.removeItem(storageKey('pending')); } catch { setStorageMessage('Guardá el número de pedido: este navegador no permite conservar su historial.'); }
   pendingRef.current = null;setPendingRetry(null); setCheckoutMessage(`${PREVIEW ? '¡Pedido de prueba guardado!' : '¡Pedido confirmado!'} #${order.id.slice(0, 8)} · Total ${money(order.total)}${order.v57_scheduled_at?` · Horario: ${scheduledLabel(order)}`:''}`);
   setFocusOrder(order.guest_order||{...order,summaryPending:true,items:[]});setView('orders');
   try{const url=new URL(window.location.href);url.searchParams.set('screen','orders');url.searchParams.set('order',order.id);window.history.replaceState(null,'',url);}catch{/* The order remains available in Pedidos. */}
    setCart([]);setCouponCode('');setCouponInput('');setCheckoutStep(1); setCustomer(c => ({ ...c, notes: '', redeem: 0, reward:'', remainder:'', stampReward:'',stampProduct:'',stampVariant:'',scheduled:'' }));
   if(order.guest_order){try{await whatsapp?.open(orderWhatsappLink(DLP_WHATSAPP,order.guest_order));}catch{} void loadHistory();return;}
   // Do not reuse a history request that began before this checkout was saved.
   if(historyRequest.current)await historyRequest.current.promise;
   const refreshed=await loadHistory(),saved=refreshed?.orders.find(o=>o.id===order.id);
   if(!PREVIEW&&contactOwner.current!==checkoutOwner){whatsapp?.close();return;}
   if(saved){setFocusOrder(saved);try{await whatsapp?.open(orderWhatsappLink(DLP_WHATSAPP,saved));}catch{/* El pedido ya quedó confirmado y puede enviarse desde su seguimiento. */}}else whatsapp?.close();
  } catch (e) {
   whatsapp?.close();setPendingRetry(pendingRef.current);
   if(e.code==='CHECKOUT_SESSION'){setSession(null);openCheckoutAccount(e.message);}
   else setCheckoutMessage(checkoutFailureMessage(e));
   schedule.refresh();store.refresh();
  }
  finally { submitLock.current = false; setSubmitting(false); }
 }
 useEffect(()=>{const open=e=>{if(e.data?.type==='DLP_PUSH_OPEN'&&Object.hasOwn(PUSH_TARGETS,e.data.view)){adminLanding.current=session?.user?.id||null;setView(e.data.view);}};const openNative=e=>{if(Object.hasOwn(PUSH_TARGETS,e.detail?.view)){adminLanding.current=session?.user?.id||null;setView(e.detail.view);}};const receiveNative=e=>setNativePush(e.detail);navigator.serviceWorker?.addEventListener('message',open);window.addEventListener('dlp:native-push-open',openNative);window.addEventListener('dlp:native-push-received',receiveNative);return ()=>{navigator.serviceWorker?.removeEventListener('message',open);window.removeEventListener('dlp:native-push-open',openNative);window.removeEventListener('dlp:native-push-received',receiveNative);};},[session?.user?.id]);
 useEffect(()=>{if(!nativePush)return;const timer=setTimeout(()=>setNativePush(null),8000);return()=>clearTimeout(timer);},[nativePush]);
 async function authenticate(mode) {
  setAuthBusy(true); setAccountMessage('');
  try {
   if(mode==='signup'){const error=profileError(registration);if(error)throw new Error(error);}
   const phoneLogin=/^[+\d][\d ().-]*$/.test(account.email.trim());
   const credentials=mode==='signup'?account:{email:phoneLogin?'':normalizeLoginIdentifier(account.email),password:account.password};
   const r = mode === 'signup' ? await supabase.auth.signUp({...credentials,options:{emailRedirectTo:ACCOUNT_URL,data:{dlp_profile:registration,dlp_privacy:{version:PRIVACY_VERSION,accepted_at:new Date().toISOString()}}}}) : phoneLogin?await signInWithPhone(account.email,account.password):await supabase.auth.signInWithPassword(credentials);
   if(r.error){if(r.error.code==='phone_not_confirmed')throw new Error('Tu cuenta está pendiente. Enviá la solicitud por WhatsApp para que DLP la habilite.');throw r.error;}
   if(mode==='signup'){setSignup(false);setAccountMessage(r.data.session?'Cuenta creada correctamente.':'Cuenta creada. Revisá tu correo para confirmarla.');}
   else setAccountMessage('Sesión iniciada.');
   setAccount(a=>({...a,password:''}));
   if(r.data.session&&!r.data.session.user.is_anonymous&&checkoutReturn.current){checkoutReturn.current=false;adminLanding.current=r.data.session.user.id;openCart();}
  }
  catch (e) { setAccountMessage(e.message); } finally { setAuthBusy(false); }
 }
 async function adminLogout(){await detachPushOnLogout();const {error}=await signOutThisDevice(supabase.auth);if(error)setMessage(error.message);else{setAdmin(false);setView('shop');setHistory({orders:[],legacy:[],ledger:[],balance:0,stampLedger:[],stampBalance:0});}}
 function endRecovery(){setRecovery(false);setRecoveryUser(null);setView('account');window.history.replaceState(null,'',ACCOUNT_URL);}
 function finishNotificationWelcome(){setNotificationWelcome(false);setView('shop');window.history.replaceState(null,'',window.location.pathname);window.scrollTo(0,0);}
 if(notificationWelcome&&authReady&&session&&!session.user.is_anonymous&&!recovery)return <div className="app-shell customer-view"><main className="account-onboarding"><h1>Tu cuenta está confirmada</h1><PushPreferences userId={session.user.id} onActivated={finishNotificationWelcome}/><button type="button" className="button quiet" onClick={finishNotificationWelcome}>Continuar al inicio</button></main></div>;
 if(recovery)return <RecoveryPage userId={session?.user?.id===recoveryUser?recoveryUser:null} ready={authReady} onDone={endRecovery}/>;
 const nativePushToast=nativePush&&<button type="button" className="native-push-toast" onClick={async()=>{const data=nativePush.data||{};setNativePush(null);await openNativeNotification(data);}}><strong>{nativePush.title}</strong>{nativePush.body&&<span>{nativePush.body}</span>}</button>;
 const temporaryRequest=temporaryPasswordRequest(session?.user);
 if(!PREVIEW&&authReady&&session&&!session.user.is_anonymous&&temporaryRequest)return <TemporaryPasswordPage requestId={temporaryRequest}/>;
 if(admin&&view!=='gaming')return <div className="app-shell admin-shell">{nativePushToast}{PREVIEW&&<div className="preview-banner"><strong>Copia de prueba</strong><span>Los cambios se guardan solo en este navegador.</span></div>}<main className="container">{!online&&<p className="notice" role="status">Sin conexión. Conectate para actualizar los pedidos.</p>}{message&&<p className="notice error" role="alert">{message}</p>}<Admin key={`${session?.user?.id||'preview'}:${admin}`} accessRole={admin} staffUsername={internalStaffUsername(session?.user)} staffEmail={session?.user?.email||''} data={data} reload={reload} history={history} reloadHistory={loadHistory} historyBusy={historyBusy} store={store} owner={session?.user?.id||'preview'} onLogout={PREVIEW?undefined:adminLogout}/></main></div>;
 return <div className={`app-shell view-${view}${view === 'shop' || view === 'gaming' || view === 'account' || ((view === 'orders' || view==='support' || view==='privacy') && !admin) ? ' customer-view' : ''}`}>{nativePushToast}{PREVIEW&&<div className="preview-banner"><strong>Copia de prueba</strong><span>Los pedidos y cambios se guardan solo en este navegador.</span><button className="text-button" onClick={async()=>{if(window.confirm('¿Reiniciar el catálogo y los pedidos de esta prueba?'))(await import('./lib/preview')).resetPreview();}}>Reiniciar prueba</button></div>}<CustomerCampaigns data={data} session={session} channel={customer.type} paused={view!=='shop'||Boolean(picker)||submitting||notificationWelcome||!data.ready} onChooseBurger={product=>setPicker({product})} onNeedAccount={()=>{setAccountMessage('Ingresá o creá tu cuenta para reservar el evento.');setView('account');}}/><header className="topbar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setView('shop'); setCategory('all'); }}><BrandLogo/><span className="brand-caption">Hamburguesas 100% vacío</span></a><nav aria-label="Principal">{[['orders','Pedidos'],['account','Mi cuenta'],['gaming','DLP Gaming'],...(admin ? [['admin','Administración']] : [])].map(([key,label]) => <button key={key} className={key==='gaming'?'header-gaming-button':undefined} aria-current={view === key ? 'page' : undefined} onClick={() => {setView(key);if(key==='gaming')window.scrollTo(0,0);}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{key==='gaming'?<><path d="M7 7h10a4 4 0 0 1 4 4v5a2 2 0 0 1-3.4 1.4L15 15H9l-3.6 2.4A2 2 0 0 1 2 16v-5a4 4 0 0 1 5-4Z"/><path d="M6 10v4M4 12h4M16 11h.01M19 13h.01"/></>:key==='orders'?<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></>:<><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>}</svg><span>{label}</span></button>)}</nav><button className="button header-cart" onClick={openCart}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg>Carrito <span className="cart-count">{count}</span></button></header>
 <WebPages as="main" className={`container ${view === 'shop' ? 'shop-container' : ''}`} pageKey={view} label={{shop:"Menú y pedido",account:"Mi cuenta",orders:"Mis pedidos",gaming:"DLP Gaming",privacy:"Privacidad",support:"Ayuda"}[view]||"DLP"}>{!online && <p className="notice" role="status">Sin conexión. Tu carrito sigue guardado; conectate para actualizar el menú y enviar el pedido.</p>}{storageMessage && <p className="notice">{storageMessage}</p>}{message && <p className="notice error" role="alert">{message} <button className="button quiet" onClick={reload}>Reintentar</button></p>}{!loading && !data.ready && !message && <p className="notice">Menú disponible para consultar. Estamos preparando la nueva versión; la recepción de pedidos todavía no está habilitada.</p>}
 <StoreClosedNotice status={store.status} error={store.error} active={view==='shop'&&data.storeVersion===58&&data.ready}/>
 {view==='gaming'&&<GamingLive onBack={()=>setView('shop')} userId={session&&!session.user.is_anonymous?session.user.id:null} onLogin={()=>setView('account')}/>}
 {view === 'shop' && <>{storeError&&<section className="store-closed" role="status"><h2>{storeError}</h2></section>}<section className="menu-intro" aria-label="DLP Burgers"><div className="menu-intro-photo"><img src={burgerBanner} alt="Cinco hamburguesas de DLP Burgers sobre fondo rojo" width="1600" height="640" fetchPriority="high" /></div></section><div className="menu-service-bar"><div className="menu-service-copy"><p className="muted">Si elegís Take Away, retirá tu pedido en Lincoln 299, esquina Mazzini.</p><p className="service-options-label">Opciones de entrega disponibles:</p><div className="service-note"><span className="badge">TAKE AWAY</span>{data.settings.delivery_enabled && <span className="badge">DELIVERY</span>}</div></div><div className="menu-service-actions"><button className="text-button" disabled={loading} onClick={reload}>{loading ? 'Cargando menú…' : 'Actualizar menú'}</button></div></div>
 <div className="layout"><section><div className="tabs categories" aria-label="Categorías"><button className={category === 'all' ? 'button' : 'button quiet'} onClick={() => chooseCategory('all')}>TOP 6</button>{visibleCategories.map(c => <button className={category === String(c.id) ? 'button' : 'button quiet'} key={c.id} onClick={() => chooseCategory(String(c.id))}>{c.name.toLocaleUpperCase('es-AR')}</button>)}</div>{loading && !data.products.length && <p role="status">Cargando productos…</p>}{!loading && !visibleCategories.length && <div className="card"><h2>El menú se está preparando</h2><p>Volvé a consultar en unos instantes.</p></div>}
 <ProductMenu categories={visibleCategories} products={data.products} bestSellerIds={data.bestSellers} category={category} channel={customer.type} onChoose={product=>setPicker({product})}/>
 {category==='all'&&data.pointsVersion===87&&<PointsAccount compact data={data} history={history} signedIn={Boolean(session&&!session.user.is_anonymous)} onLogin={()=>setView('account')}/>}</section><aside id="cart" className="sidebar" tabIndex={-1} aria-label="Tu carrito"><section className="card"><h2>Tu pedido ({count})</h2>{!lines.length ? <p className="muted">Elegí algo del menú para empezar.</p> : lines.map(l => <div className="cart-item" key={l.key}><strong>{l.product?.name || 'Producto no disponible'}</strong>{l.variant&&<small>Presentación: {l.variant.name}</small>}{l.selected.length>0&&<small>{l.selected.map(x=>`${x.quantity>1?x.quantity+' × ':''}${x.name}`).join(' · ')}</small>}{l.notes&&<small className="line-note">Aclaración: {l.notes}</small>}{!l.valid && <p className="error">{l.issues.join(' ')}</p>}{l.product&&<button className="text-button" disabled={submitting} onClick={()=>setPicker({product:l.product,editingKey:l.key,initial:{variantId:l.variantId,extraIds:l.extraIds,options:l.options,notes:l.notes,quantity:l.quantity}})}>Editar producto</button>}<div className="cart-row"><div className="quantity"><button aria-label="Quitar una unidad" disabled={submitting} onClick={() => setCart(c => c.map(x => x.key === l.key ? { ...x, quantity:x.quantity-1 } : x).filter(x => x.quantity>0))}>−</button><span>{l.quantity}</span><button aria-label="Agregar una unidad" disabled={submitting || l.quantity>=99} onClick={() => setCart(c => c.map(x => x.key === l.key ? { ...x, quantity:x.quantity+1 } : x))}>+</button></div><strong>{money(l.total)}</strong><button className="text-button" disabled={submitting} onClick={() => setCart(c => c.filter(x => x.key !== l.key))}>Quitar</button></div></div>)}<div className="summary"><span>Productos</span><span>{money(subtotal)}</span><span>Envío</span><span>{customer.type==='delivery' && !zone ? 'Por confirmar' : money(fee)}</span>{coupon.discount>0&&<><span>Cupón {couponCode}</span><span>−{money(coupon.discount)}</span></>}{coupon.pending&&<><span>Cupón</span><span>Validando…</span></>}{discount>0 && <><span>{stampMode&&data.pointsVersion!==87?'Canje de sellos':'Puntos'}</span><span>−{money(discount)}</span></>}{deliveryStampDiscount>0&&<><span>Delivery sin cargo</span><span>−{money(deliveryStampDiscount)}</span></>}<strong>Total</strong><strong>{money(Math.max(0,total))}</strong></div></section>
 <section id="checkout-wizard" className="card checkout-card">
 <header className="checkout-wizard-header">
  <div><p className="eyebrow">Finalizar pedido</p><h2>Confirmá tu pedido</h2></div>
  <span>Paso {checkoutStep} de 3</span>
 </header>
 <ol className="checkout-stepper" aria-label="Progreso del pedido">
  {[[1,'Entrega'],[2,'Pago'],[3,'Confirmar']].map(([step,label])=><li key={step} className={checkoutStep===step?'is-current':checkoutStep>step?'is-complete':''}><button type="button" disabled={step>checkoutStep} aria-current={checkoutStep===step?'step':undefined} onClick={()=>goCheckoutStep(step)}><span>{checkoutStep>step?'✓':step}</span><small>{label}</small></button></li>)}
 </ol>
 {!canCheckout&&<div className="notice checkout-account"><p>Podés pedir sin registrarte. Para sumar puntos, creá una cuenta e iniciá sesión antes de confirmar.</p><button type="button" className="button" onClick={openCheckoutAccount}>Ingresar o crear cuenta</button></div>}
 <form onSubmit={e=>{if(checkoutStep===1){e.preventDefault();if(checkoutStepOneReady)goCheckoutStep(2);return;}if(checkoutStep===2){e.preventDefault();if(checkoutStepTwoReady)goCheckoutStep(3);return;}checkout(e);}}>
  {canCheckout&&!PREVIEW&&!profile?.complete&&<div className="notice"><p>{profileState.loading?'Cargando tus datos…':profileState.error||'Completá tus datos en Mi cuenta antes de confirmar.'}</p>{profileState.error?<button type="button" className="button quiet" onClick={profileState.refresh}>Reintentar</button>:<button type="button" className="button quiet" onClick={()=>setView('account')}>Completar mis datos</button>}</div>}
  <fieldset disabled={submitting} className="plain-fieldset">
   {checkoutStep===1&&<section className="checkout-step" aria-labelledby="checkout-step-1-title">
    <h3 id="checkout-step-1-title" tabIndex="-1">Ya casi está.</h3>
    <p className="checkout-step-intro">Completá tus datos y elegí la forma de entrega.</p>
    <div className="checkout-fields">
     <section className="checkout-soft-group" aria-labelledby="checkout-contact-title"><h4 id="checkout-contact-title">01 / Tus datos</h4>
     <Field label="Nombre" required minLength={2} maxLength={120} autoComplete="name" value={customer.name} onChange={e=>change('name',e.target.value)} />
     <Field label="Teléfono" type="tel" required minLength={6} maxLength={30} autoComplete="tel" value={customer.phone} onChange={e=>change('phone',e.target.value)} />
     </section>
     <section className="checkout-soft-group" aria-labelledby="checkout-delivery-title"><h4 id="checkout-delivery-title">02 / Forma de entrega</h4>
     <div className="checkout-delivery-options" role="group" aria-label="Forma de entrega">{[['pickup','Retiro en local'],['delivery','Delivery']].map(([type,label])=><button type="button" key={type} aria-pressed={customer.type===type} disabled={type==='delivery'&&!data.settings.delivery_enabled} onClick={()=>{setAddressMode('saved');setCustomer(c=>({...c,type,payment:'',scheduled:'',stampReward:'',stampProduct:'',stampVariant:'',address:type==='delivery'&&profile?.complete?profile.address:'',lat:type==='delivery'&&profile?.complete?profile.lat:null,lng:type==='delivery'&&profile?.complete?profile.lng:null}));}}>{label}{type==='delivery'&&!data.settings.delivery_enabled&&<small>No disponible</small>}</button>)}</div>
     <SchedulePicker schedule={schedule} selected={customer.scheduled} onChange={value=>change('scheduled',value)} channel={customer.type}/>
     {customer.type==='delivery'&&<>{profile?.complete&&<div className="notice saved-address"><p>{addressMode==='saved'?'Enviaremos a tu dirección habitual.':'Otra dirección, solo para este pedido.'}</p><button type="button" className="button quiet" onClick={()=>{const saved=addressMode!=='saved';setAddressMode(saved?'saved':'other');setCustomer(c=>({...c,address:saved?profile.address:'',lat:saved?profile.lat:null,lng:saved?profile.lng:null}));}}>{addressMode==='saved'?'Usar otro domicilio':'Usar mi dirección habitual'}</button></div>}{(!profile?.complete||addressMode==='other')&&<AddressSearch apiKey={data.settings.maps_key} onSelect={p=>setCustomer(c=>({...c,...p}))}/>} {customer.address&&<p className="notice">{customer.address}{zone&&<><br/>{zone.name} · Envío {money(fee)}</>}</p>}{deliveryError&&<p className="notice error">{deliveryError}</p>}</>}
     {customer.type==='delivery'&&<CrossStreetsField value={customer.cross_streets} onChange={value=>change('cross_streets',value)}/>}
     </section>
    </div>
    <p className="checkout-guidance">Completá nombre, teléfono, entrega y horario para continuar.</p>
    <div className="checkout-step-actions"><button type="button" className="button checkout-next" disabled={!checkoutStepOneReady} onClick={()=>goCheckoutStep(2)}>Continuar al pago</button></div>
   </section>}
   {checkoutStep===2&&<section className="checkout-step" aria-labelledby="checkout-step-2-title">
    <h3 id="checkout-step-2-title" tabIndex="-1">Pago y beneficios</h3>
    <p className="checkout-step-intro">Elegí cómo pagar y aplicá tus beneficios si querés.</p>
    <div className="checkout-fields">
     {data.commerceVersion===52&&<>
      <Field label="Forma de pago"><select required value={payment?.id||''} onChange={e=>change('payment',e.target.value)}><option value="">Elegí cómo pagar</option>{payments.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></Field>
      {!payments.length&&<p className="notice error">{paymentError}</p>}
      {payment?.message&&<p className="notice payment-message" role="status">{payment.message}</p>}
      <div className="coupon-entry"><CouponCodeField value={couponInput} onChange={setCouponInput} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();applyCoupon();}}}/><button type="button" className="button quiet" disabled={!couponInput.trim()||!lines.length||!payment||coupon.pending} onClick={applyCoupon}>Aplicar cupón</button></div>
      <small>El cupón se aplica solo al precio base del producto. Los extras y el envío se cobran completos.</small>
      {couponCode&&<div className="coupon-status" role="status"><p className={coupon.error?'error':''}>{coupon.pending?'Validando cupón…':coupon.error||`Cupón ${couponCode}: −${money(coupon.discount)} en productos.`}</p><button type="button" className="text-button" onClick={()=>{setCouponCode('');setCouponInput('');}}>Quitar cupón {couponCode}</button></div>}
     </>}
     <Field label={customer.type==='delivery'?'Piso, departamento y aclaraciones':'Notas'}><textarea maxLength={1000} value={customer.notes} onChange={e=>change('notes',e.target.value)} /></Field>
     {pointsError&&<p className="notice error">{pointsError}</p>}
     {!canCheckout?<p className="notice">Este pedido como invitado no suma puntos. Creá una cuenta e iniciá sesión para sumarlos.</p>:data.pointsVersion===87?<p className="notice">Este pedido sumará {earnedItemPoints(lines,data,customer.stampReward,customer.stampProduct,customer.stampVariant)} puntos cuando sea entregado.</p>:stampMode&&earnsStamp(stampEligible,data)&&<p className="notice">Este pedido sumará 1 sello cuando sea entregado.</p>}
    </div>
    <div className="checkout-step-actions checkout-step-actions-split"><button type="button" className="button quiet" onClick={()=>goCheckoutStep(1)}>Volver</button><button type="button" className="button checkout-next" disabled={!checkoutStepTwoReady} onClick={()=>goCheckoutStep(3)}>Revisar pedido</button></div>
   </section>}
   {checkoutStep===3&&<section className="checkout-step" aria-labelledby="checkout-step-3-title">
    <h3 id="checkout-step-3-title" tabIndex="-1">Revisá antes de confirmar</h3>
    <p className="checkout-step-intro">Verificá los datos. Podés volver y corregirlos.</p>{!canCheckout&&<p className="notice" role="alert">Podés finalizar tu pedido sin registrarte, pero esta compra no sumará puntos DLP.</p>}
    <div className="checkout-review">
     <div><span>Cliente</span><strong>{customer.name}</strong><small>{customer.phone}</small></div>
     <div><span>Entrega</span><strong>{customer.type==='delivery'?'Delivery':'Take away'}</strong><small>{customer.type==='delivery'?customer.address:'Retiro en Lincoln 299, esquina Mazzini'}</small>{customer.type==='delivery'&&<small>Entrecalles: {customer.cross_streets}</small>}</div>
     <div><span>Horario</span><strong>{customer.scheduled?scheduledLabel({v57_scheduled_at:customer.scheduled}):'Sin seleccionar'}</strong></div>
     <div><span>Pago</span><strong>{payment?.name||'Sin seleccionar'}</strong></div>
     <div><span>Pedido</span><strong>{count} {count===1?'producto':'productos'}</strong></div>
     {customer.notes&&<div><span>{customer.type==='delivery'?'Aclaraciones':'Notas'}</span><strong>{customer.notes}</strong></div>}
    </div>
    <div className="summary checkout-final-summary"><span>Productos</span><span>{money(subtotal)}</span><span>Envío</span><span>{customer.type==='delivery'&&!zone?'Por confirmar':money(fee)}</span>{coupon.discount>0&&<><span>Cupón {couponCode}</span><span>−{money(coupon.discount)}</span></>}{discount>0&&<><span>{stampMode&&data.pointsVersion!==87?'Canje de sellos':'Puntos'}</span><span>−{money(discount)}</span></>}{deliveryStampDiscount>0&&<><span>Delivery sin cargo</span><span>−{money(deliveryStampDiscount)}</span></>}<strong>Total</strong><strong>{money(Math.max(0,total))}</strong></div>
    <div className="checkout-step-actions checkout-step-actions-split"><button type="button" className="button quiet" onClick={()=>goCheckoutStep(2)}>Volver</button><button type="submit" className="button checkout-button" disabled={!checkoutStepTwoReady||Boolean(storeError)||!data.ready||!online}>{submitting?'Confirmando…':`${PREVIEW?'Probar pedido':'Confirmar y abrir WhatsApp'} · ${money(Math.max(0,total))}`}</button></div>
    {!PREVIEW&&whatsappLink(DLP_WHATSAPP)&&<p className="muted checkout-whatsapp-note">Al finalizar se abrirá WhatsApp con una copia para DLP. Tocá Enviar allí para compartirla.</p>}
   </section>}
  </fieldset>
 </form>
 {canRetry&&<button type="button" className="button quiet" disabled={submitting||!online} onClick={e=>checkout(e,true)}>Reintentar el mismo pedido</button>}
 {checkoutMessage&&<p className="notice" role="status">{checkoutMessage}</p>}
</section>
</aside></div></>}
 {view==='support'&&<Support onAccount={()=>setView('account')}/>}
 {view==='privacy'&&<Privacy/>}
 {view==='orders' && (data.ready ? (admin?<Admin key={`${session?.user?.id||'preview'}:${admin}`} accessRole={admin} staffUsername={internalStaffUsername(session?.user)} staffEmail={session?.user?.email||''} data={data} reload={reload} history={history} reloadHistory={loadHistory} historyBusy={historyBusy} store={store} owner={session?.user?.id||'preview'}/>:<Orders history={history} admin={admin} reload={loadHistory} busy={historyBusy} focusOrder={focusOrder||history.orders.find(o=>o.id===landingOrderId)} whatsappPhone={PREVIEW?'':DLP_WHATSAPP} trackingError={historyError}/>) : <p className="notice">El historial estará disponible cuando se active la nueva versión.</p>)}
 {view==='admin' && admin && <Admin key={`${session?.user?.id||'preview'}:${admin}`} accessRole={admin} staffUsername={internalStaffUsername(session?.user)} staffEmail={session?.user?.email||''} data={data} reload={reload} history={history} reloadHistory={loadHistory} historyBusy={historyBusy} store={store} owner={session?.user?.id||'preview'} />}
{view==='account' && PREVIEW && <section className="card"><h1>Cuenta de prueba</h1><p>Podés revisar el menú y la administración sin ingresar una contraseña. El acceso real a la V5 mantiene tu cuenta actual.</p></section>}{view==='account' && !PREVIEW && <section className={`account-layout${!session||session.user.is_anonymous?' account-layout-signed-out':''}`}><div className="card"><h1>Mi cuenta</h1>{!authReady?<p role="status">Recuperando tu sesión…</p>:session&&!session.user.is_anonymous ? <><p>{accountIdentifier(session.user)}</p><p>{admin ? 'Acceso de administrador' : 'Cuenta de cliente'}</p></> : signup&&manualRegistration ? <PhoneRegistration apiKey={data.settings.maps_key} onLogin={phone=>{setSignup(false);setAccount(a=>({...a,email:phone,password:''}));setAccountMessage('');}}/> : <form onSubmit={e=>{e.preventDefault();authenticate(signup?'signup':'login');}}><Field label={signup?'Correo electrónico':'Celular, correo o usuario'} type={signup?'email':'text'} required autoComplete={signup?'email':'username'} value={account.email} onChange={e=>setAccount(a=>({...a,email:e.target.value}))} /><Field label="Contraseña" type="password" required minLength={8} autoComplete="current-password" value={account.password} onChange={e=>setAccount(a=>({...a,password:e.target.value}))} /><p className="muted">Tu sesión queda guardada en este dispositivo para la próxima visita.</p><fieldset className="plain-fieldset" disabled={authBusy}>{signup&&<><ProfileFields value={registration} onChange={setRegistration} apiKey={data.settings.maps_key}/><label className="check-row"><input type="checkbox" required/> <span>Leí y acepto la <a href="?screen=privacy" target="_blank" rel="noopener noreferrer">Política de privacidad</a>.</span></label></>}<div className="actions"><button className="button" disabled={authBusy}>{signup?'Crear mi cuenta':'Ingresar'}</button><button className="button quiet" type="button" disabled={authBusy} onClick={()=>{setSignup(v=>!v);setAccountMessage('');}}>{signup?'Ya tengo cuenta':'Crear cuenta'}</button></div></fieldset></form>}{authReady&&!session&&!signup&&account.email.includes('@')&&<PasswordResetRequest initialEmail={account.email}/>} {authReady&&!session&&!signup&&!account.email.includes('@')&&<p className="muted">Los usuarios internos ingresan con su nombre de usuario. <a href={recoveryWhatsapp()} target="_blank" rel="noopener noreferrer">Recuperar acceso por WhatsApp</a></p>} {authError&&<p className="notice" role="status">{authError}</p>}{accountMessage && <p className="notice" role="status">{accountMessage}</p>}</div>{session&&!session.user.is_anonymous&&<AccountSections raffle={<WeeklyRaffle/>} notifications={<PushPreferences userId={session.user.id}/>} profile={<>{(profileState.loading||profileState.error)&&<section className="card"><p>{profileState.loading?"Cargando tus datos…":profileState.error}</p>{profileState.error&&<button className="button quiet" onClick={profileState.refresh}>Reintentar</button>}</section>}{!profileState.loading&&!profileState.error&&<CustomerProfile key={session.user.id} profile={profile} apiKey={data.settings.maps_key} onSaved={profileState.refresh}/>}<section><h3>Direcciones frecuentes</h3>{[...new Set([profile?.address,...history.orders.filter(o=>o.fulfillment_type==='delivery').map(o=>o.address)].filter(Boolean))].slice(0,8).map(address=><p key={address}>{address}</p>)}{!profile?.address&&!history.orders.some(o=>o.address)&&<p>Tus direcciones aparecerán al completar tus datos y realizar pedidos.</p>}</section></>} points={<><LoyaltyAccount data={data} history={history}/><h3>Canjear puntos en mi próximo pedido</h3>{stampMode&&(canCheckout?<StampRedemptionFields data={data} balance={history.stampBalance} channel={customer.type} lines={lines} reward={customer.stampReward} onReward={value=>setCustomer(c=>({...c,stampReward:value,stampProduct:'',stampVariant:''}))} productId={customer.stampProduct} variantId={customer.stampVariant} onBurger={(productId,variantId)=>{setCustomer(c=>({...c,stampProduct:productId,stampVariant:variantId}));if(data.pointsVersion===87&&!lines.some(l=>String(l.product?.id)===productId&&String(l.variant?.id||'')===variantId)){const product=data.products.find(p=>String(p.id)===productId);if(product)setPicker({product,initial:{variantId,quantity:1,extraIds:[],options:[]}});}}} quote={stampQuote}/>:<p className="muted"><button type="button" className="text-button" onClick={()=>setView('account')}>Ingresá a tu cuenta</button> para sumar y canjear puntos.</p>)}
     {redemptionMode&&<RedemptionFields data={data} channel={customer.type} rewardId={customer.reward} onReward={v=>change('reward',v)} remainder={customer.remainder} onRemainder={v=>change('remainder',v)} total={total} quote={reward}/>} 
     {!stampMode&&data.redemptionVersion!==60&&data.settings.points_enabled&&(session?<Field label={`Canjear puntos · saldo ${history.balance}`} type="number" min="0" step="1" max={Math.max(0,Math.min(history.balance,Math.floor(remaining/Number(data.settings.point_value))))} value={customer.redeem} onChange={e=>change('redeem',e.target.value)} />:<p className="muted"><button type="button" className="text-button" onClick={()=>setView('account')}>Ingresá a tu cuenta</button> para sumar y canjear puntos.</p>)}<button type="button" className="button quiet" onClick={()=>setView('shop')}>Volver al menú</button></>} password={<PasswordChange key={session.user.id}/>} gaming={<GamingAccount key={'gaming-'+session.user.id} userId={session.user.id}/>} footer={<><div className="account-extra"><button className="button quiet" onClick={async()=>{await detachPushOnLogout();const {error}=await signOutThisDevice(supabase.auth);if(error)setAccountMessage(error.message);else{setView('shop');setHistory({orders:[],legacy:[],ledger:[],balance:0,stampLedger:[],stampBalance:0});}}}>Cerrar sesión</button></div><details className="account-extra"><summary>Eliminar mi cuenta</summary><AccountDeletion key={'delete-'+session.user.id}/></details></>}/>} </section>}
 {!PREVIEW&&authReady&&session&&!session.user.is_anonymous&&<PushInstallPrompt key={session.user.id} userId={session.user.id} paused={Boolean(picker)||submitting||notificationWelcome||view==='account'}/>} {picker&&<ProductPicker key={picker.editingKey||picker.product.id} product={picker.product} data={data} channel={customer.type} initial={picker.initial} onAdd={add} onClose={()=>setPicker(null)}/>}<footer className="footer"><div className="actions legal-links"><a className="text-button" href="?screen=support" onClick={e=>{e.preventDefault();setView('support');window.scrollTo(0,0);}}>Ayuda y datos de tu cuenta</a><a className="text-button" href="?screen=privacy" onClick={e=>{e.preventDefault();setView('privacy');window.scrollTo(0,0);}}>Política de privacidad</a></div><div className="footer-brand"><BrandLogo/><span>Hamburguesas 100% vacío</span></div><div className="footer-credit">App creada y diseñada por Carlos Covetta, todos los derechos reservados</div>{!Capacitor.isNativePlatform()&&(installPrompt ? <button className="text-button" onClick={async()=>{await installPrompt.prompt();setInstallPrompt(null);}}>Instalar app</button> : <span className="muted">Agregá la app a tu pantalla de inicio desde el navegador.</span>)}</footer></WebPages>{view==='shop'&&!checkoutInView&&<nav className="mobile-menu-nav" aria-label="Categorías del menú">{mobileMenuCategories.slice(0,2).map(({kind,label,item})=><button key={kind} type="button" className="mobile-menu-category" disabled={!item} aria-current={item&&category===String(item.id)?'page':undefined} onClick={()=>item&&chooseCategory(String(item.id))}><CustomerMenuIcon kind={kind}/><span>{label}</span></button>)}<button type="button" className="mobile-menu-cart" onClick={openCart} aria-label={`Ver carrito, ${count} productos, subtotal ${money(subtotal)}`}><CustomerCartIcon/><span className="mobile-menu-cart-count">{count}</span></button>{mobileMenuCategories.slice(2).map(({kind,label,item})=><button key={kind} type="button" className="mobile-menu-category" disabled={!item} aria-current={item&&category===String(item.id)?'page':undefined} onClick={()=>item&&chooseCategory(String(item.id))}><CustomerMenuIcon kind={kind}/><span>{label}</span></button>)}</nav>}</div>;
}


