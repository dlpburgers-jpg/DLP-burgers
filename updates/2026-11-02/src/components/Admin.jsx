import OnlineVisitors from './OnlineVisitors';
import CreatedAccounts from './CreatedAccounts';
import WebPages from './WebPages';
import CounterNavigation from './CounterNavigation';
import WeeklyBurgerAdmin from './WeeklyBurgerAdmin';
import WeeklyRaffle from './WeeklyRaffle';
import ReportAccess,{ReportAccessProvider} from './ReportAccess';
import { useEffect, useMemo, useRef, useState } from 'react';
import { rpc } from '../lib/api';
import ProductAdmin from './ProductAdmin';
import KitchenControls from './KitchenControls';
import {productEditPayload} from '../lib/catalogEdit';
import {GroupsAdmin} from './CatalogAdmin';
import {PREVIEW,storageKey} from '../lib/mode';
import {startCounterDraft} from '../lib/counterDrafts';
import useMobileStaff from '../lib/useMobileStaff';
import { money } from '../lib/domain';
import { AddressSearch, ZoneMap } from './Maps';
import CommerceAdmin from './CommerceAdmin';
import Salon from './Salon';
import Reports from './Reports';
import OrderBoard from './OrderBoard';
import OrderActivity from './OrderActivity';
import ServiceCourses from './ServiceCourses';
import Orders from './Orders';
import AdminNavigation,{navGroupOf,sectionLabel} from './AdminNavigation';
import ScheduleAdmin from './ScheduleAdmin';
import StoreControl from './StoreControl';
import CounterOrder from './CounterWorkspace';
import './AdminNavigation.css';
import './AdminFocused.css';
import './AdminOperational.css';
import './AdminTheme.css';
import './OrderBoardTheme.css';
import './CounterTheme.css';
import './SalonTheme.css';
import './MobileStaff.css';
import {PausedOrders} from './OperationalOverview';
import PushAdmin from './PushAdmin';
import BirthdaysAdmin from './BirthdaysAdmin';
import useBirthdays from '../lib/useBirthdays';
import PrintSettings from './PrintSettings';
import UsersAdmin from './UsersAdmin';
import PaymentNotices from './PaymentNotices';
import {accessLabels,canUseTab} from '../lib/staffAccess';
import MarketingAdmin from './MarketingAdmin';
import DriversAdmin from './DriversAdmin';
import PrintStation from './PrintStation';
import BillingAdmin from './BillingAdmin';
import PriceUpdatesAdmin from './PriceUpdatesAdmin';
import FinanceDashboard from './FinanceDashboard';
import KitchenCallChannel,{kitchenCallUsernameFor} from './KitchenCallChannel';
// Secciones que ya muestran su propio título grande: no se repite el encabezado.
const ownTitleTabs=new Set(['board','counter','salon','product','group']);
export default function Admin(props){return <ReportAccessProvider owner={props.owner}><AdminContent {...props}/></ReportAccessProvider>;}
export function Field({ label, children, ...props }) { return <label className="field"><span>{label}</span>{children || <input {...props} />}</label>; }
const empty = {
 product: { name: '', description: '', price: '', category_id: '', active: true, image_url: '', extra_ids: [], v51_variants: [], v51_channels: {pickup:true,delivery:true,onsite:true,resto:true}, group_ids: [] },
 category: { name: '', sort_order: 0, active: true }, extra: { name: '', price: '', active: true },
 zone: { name: '', fee: '', minimum: 0, priority: 0, active: true, polygon: [] },
};
function AdminContent({ data, reload, history, reloadHistory, historyBusy, store, owner, onLogout, accessRole, staffUsername='', staffEmail='' }) {
 const callUsername=kitchenCallUsernameFor(staffEmail);
 const counterUser=staffUsername==='mostrador'||callUsername==='mostrador';
 const mobileOwner=!counterUser&&(PREVIEW||staffUsername==='celular');
 const cellularUser=staffUsername==='celular'||callUsername==='celular';
 const mobileInbox=useMobileStaff(cellularUser);
 const [tab, setTab] = useState(mobileOwner&&!cellularUser?'counter':'board'), [search,setSearch] = useState('');
 const [draft, setDraft] = useState({ ...empty.product });
 const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
 const mobileLanding=useRef(false);
 const productGuard=useRef({dirty:false,busy:false});
 const counterGuard=useRef({busy:false,blocked:false});
 const [initialTableId,setInitialTableId]=useState(null);
 const [counterSession,setCounterSession]=useState(0);
 useEffect(()=>{document.body.classList.add('admin-operative-active');return()=>document.body.classList.remove('admin-operative-active');},[]);
 const full=accessRole==='total';
 const birthdays=useBirthdays(full);
 const birthdayCount=birthdays.data.customers.filter(c=>c.birthday===birthdays.data.date).length;
 const allTabs = { online:'Usuarios en línea', ...(counterUser?{activation:'Cuentas creadas'}:{}), weeklyBurger:'Burger de la semana', raffle:'Sorteo semanal', users:'Usuarios', printer:'Impresora', birthdays:'Cumpleaños', notifications:'Notificaciones', board:'Pedidos', activity:'Pedidos y mesas', courses:'Salidas de cocina', ...(data.counterVersion===59?{counter:'Mostrador'}:{}), ...(data.finalVersion>=72?{drivers:'Repartidores',promotions:'Promociones',events:'Eventos'}:{}), ...(data.scheduleVersion===57?{schedule:'Días y horarios'}:{}), ...(mobileOwner&&data.financeVersion>=86?{finance:'Gastos y ganancias'}:{}), ...(data.reportsVersion===54?{reports:'Reportes'}:{}), ...(data.billingVersion===84?{billing:'Facturación ARCA'}:{}), ...(data.salonVersion===53?{salon:'Salón'}:{}), prices:'Precios en bloque', product: 'Productos', category: 'Categorías', extra: 'Extras', ...(data.catalogVersion===51?{group:'Grupos de opciones'}:{}), zone: 'Zonas de reparto', ...(data.commerceVersion===52?{coupon:'Cupones',payment:'Formas de pago'}:{}), settings: 'Configuración' };
 const tabs=Object.fromEntries(Object.entries(allTabs).filter(([key])=>key==='finance'?staffUsername==='celular':key==='activation'?counterUser:canUseTab(accessRole,key)));
 useEffect(()=>{if(mobileOwner&&!cellularUser&&data.counterVersion===59&&!mobileLanding.current){mobileLanding.current=true;setTab('counter');}},[mobileOwner,cellularUser,data.counterVersion]);
 const update = (key, value) => setDraft(d => ({ ...d, [key]: value }));
 function changeTab(key) {
  if(tab==='counter'&&key!==tab&&(counterGuard.current.busy||counterGuard.current.blocked))return;
  if((tab==='product'||tab==='group')&&key!==tab&&(productGuard.current.busy||(productGuard.current.dirty&&!window.confirm('Hay cambios sin guardar. ¿Descartarlos y continuar?'))))return;
  if(counterUser&&key==='sales'){
   if(!Object.hasOwn(tabs,'board')||!canUseTab(accessRole,'board'))return;
   setTab('board');setMessage('');
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const panel=document.querySelector('.counter-workspace .board-finance-access');
    if(panel){panel.open=true;panel.scrollIntoView({block:'start',behavior:'smooth'});panel.querySelector('input,button')?.focus({preventScroll:true});}
   }));
   return;
  }
  if(!Object.hasOwn(tabs,key)||(key!=='finance'&&!(counterUser&&key==='activation')&&!canUseTab(accessRole,key)))return;setInitialTableId(null);setTab(key); setDraft(key === 'settings' ? { ...data.settings,wheel_enabled:false } : { ...empty[key] }); setMessage('');
 }
 // Mostrador no es una sección del menú: se abre desde Pedidos con un pedido nuevo o retomando uno minimizado.
 function openCounter(fresh){
  if(!Object.hasOwn(tabs,'counter'))return;
  if(tab==='counter'&&(counterGuard.current.busy||counterGuard.current.blocked))return;
  if(fresh){try{startCounterDraft(localStorage,storageKey(`counter-drafts.${owner||'preview'}`));}catch{/* El mostrador informa el problema de almacenamiento al abrirse. */}}
  setCounterSession(n=>n+1);changeTab('counter');
 }
 function selectTab(key){if(key==='counter')openCounter(true);else changeTab(key);}
 function edit(row) { setDraft(productEditPayload(row,data)); setMessage(''); }
 async function save(e) {
  e.preventDefault(); setBusy(true); setMessage('');
  try {
   if (tab === 'zone' && draft.polygon.length < 3) throw new Error('Marcá al menos tres puntos para formar una zona.');
   const payload = { ...draft };
   if(PREVIEW&&tab==='settings'){payload.delivery_enabled=false;}
   if (tab === 'settings') { payload.wheel_enabled=false; payload.store_lat = payload.store_lat === '' ? null : payload.store_lat; payload.store_lng = payload.store_lng === '' ? null : payload.store_lng; }
   await rpc(data.catalogVersion===51?'v51_save':'v5_save', { p_kind: tab, p_data: payload });
   await reload(); setMessage('Cambios guardados.');
   if (tab !== 'settings') setDraft({ ...empty[tab] });
  } catch (e) { setMessage(e.message); } finally { setBusy(false); }
 }
 const items = tab === 'category' ? data.categories : tab === 'extra' ? data.extras : tab === 'zone' ? data.zones : [];
 const center = useMemo(() => data.settings.store_lat != null && data.settings.store_lng != null ? { lat: Number(data.settings.store_lat), lng: Number(data.settings.store_lng) } : undefined, [data.settings.store_lat,data.settings.store_lng]);
 return <section className={`admin-workspace admin-operative ${counterUser?'counter-workspace':''} ${mobileInbox?'mobile-staff':''}`}>{counterUser?<CounterNavigation tabs={tabs} active={tab} onSelect={selectTab} onLogout={onLogout}/>:<AdminNavigation tabs={tabs} active={tab} onSelect={changeTab} roleLabel={mobileInbox?'celular':accessLabels[accessRole]} onLogout={onLogout} mobileInbox={mobileInbox} collapsible={staffUsername==='cocina'||callUsername==='cocina'}/>}<WebPages as="section" disabled className="admin-content" label={tabs[tab]||"Administración"} pageKey={tab} aria-label={tabs[tab]}><header hidden={counterUser||ownTitleTabs.has(tab)} className="admin-page-head"><span>{navGroupOf(tab)?.label||'Administración'}</span><h1>{sectionLabel(tabs,tab)||'Administración'}</h1></header>
 {!PREVIEW&&callUsername&&<KitchenCallChannel key={owner} owner={owner} username={callUsername}/>}
 <KitchenControls collapsed={!counterUser} storeStatus={store?.status} storeError={store?.error}>{staffUsername==='cocina'&&<ServiceCourses notify/>}
 <PrintStation quiet={counterUser} enabled={data.printingVersion>=81} staffUsername={callUsername||staffUsername}/><PaymentNotices key={`${owner}:${accessRole}`} owner={owner} role={accessRole} staffUsername={staffUsername||callUsername}/>{!counterUser&&full&&data.storeVersion===58&&store&&<StoreControl store={store}/>}</KitchenControls>
 {!counterUser&&full&&birthdayCount>0&&tab!=='birthdays'&&<div className="notice" role="status"><strong>Hoy {birthdayCount===1?'cumple años 1 cliente':'cumplen años '+birthdayCount+' clientes'}</strong> <button className="button quiet" onClick={()=>changeTab('birthdays')}>Ver cumpleaños y preparar saludo</button></div>}
 {tab==='online'?<OnlineVisitors/>:tab==='activation'?<CreatedAccounts/>:tab==='weeklyBurger'?<WeeklyBurgerAdmin data={data} reload={reload}/>:tab==='raffle'?<WeeklyRaffle admin/>:tab==='courses'?<ServiceCourses board/>:tab==='users'?<UsersAdmin apiKey={data.settings.maps_key}/>:tab==='printer'?<PrintSettings printingVersion={data.printingVersion} staffUsername={callUsername||staffUsername}/>:tab==='birthdays'?<BirthdaysAdmin birthdays={birthdays}/>:tab==='notifications'?<PushAdmin owner={owner}/>:tab==='drivers'?<DriversAdmin data={data} reload={reload}/>:tab==='promotions'||tab==='events'?<MarketingAdmin key={tab} kind={tab==='promotions'?'promotion':'event'} data={data} reload={reload}/>:tab==='activity'?<OrderActivity/>:tab==='board'?(data.boardVersion===55?<OrderBoard beforeColumns={tabs.counter&&staffUsername!=='cocina'?<PausedOrders owner={owner} compact={mobileInbox} onResume={()=>openCounter(false)}/>:null} compact={counterUser} mobileInbox={mobileInbox} data={data} accessRole={accessRole} staffUsername={staffUsername} onFinance={mobileOwner&&data.financeVersion>=86?()=>changeTab('finance'):undefined} onPrintSettings={full?()=>changeTab('printer'):undefined} onCounter={data.counterVersion===59?()=>openCounter(true):undefined}/>:<Orders history={history} admin reload={reloadHistory} busy={historyBusy}/>):tab==='counter'?<CounterOrder key={counterSession} data={data} reload={reload} owner={owner} mobileInbox={mobileInbox} guardRef={counterGuard} onBoard={()=>changeTab('board')}/>:tab==='schedule'?<ScheduleAdmin data={data} reload={reload}/>:tab==='finance'&&staffUsername==='celular'?<ReportAccess title="Gastos y ganancias"><FinanceDashboard/></ReportAccess>:tab==='reports'?<ReportAccess title="Reportes"><Reports data={data}/></ReportAccess>:tab==='billing'?<ReportAccess title="Facturación"><BillingAdmin paymentMethods={data.paymentMethods}/></ReportAccess>:tab==='prices'?<PriceUpdatesAdmin data={data} reload={reload}/>:tab==='salon'?<Salon data={data} reload={reload} full={full} staffUsername={staffUsername} initialTableId={initialTableId}/>:tab==='coupon'||tab==='payment'?<CommerceAdmin key={tab} kind={tab} data={data} reload={reload}/>:tab==='product'?<ProductAdmin data={data} reload={reload} guardRef={productGuard}/>:tab==='group'?<GroupsAdmin data={data} reload={reload} guardRef={productGuard}/>:<div className="admin-layout"><section className="card"><h2>{tab === 'settings' ? 'Configuración del local' : draft.id ? `Editar: ${draft.name}` : `Agregar ${tabs[tab].toLowerCase()}`}</h2>
 <form onSubmit={save} key={tab}>
 {tab !== 'settings' && <Field label="Nombre" required maxLength={150} value={draft.name} onChange={e => update('name', e.target.value)} />}
 {tab === 'extra' && <Field label="Precio ($)" type="number" min="0" max="100000000" step="0.01" required value={draft.price} onChange={e => update('price', e.target.value)} />}
 {tab === 'category' && <Field label="Orden de aparición" type="number" step="1" required value={draft.sort_order} onChange={e => update('sort_order', e.target.value)} />}
 {tab === 'zone' && <>
  <p className="notice">Si una dirección pertenece a varias zonas activas, se cobra el envío más caro. Si las tarifas son iguales, se usa la prioridad menor.</p>
  <div className="form-grid"><Field label="Envío ($)" type="number" min="0" step="0.01" required value={draft.fee} onChange={e => update('fee', e.target.value)} /><Field label="Compra mínima ($)" type="number" min="0" step="0.01" required value={draft.minimum} onChange={e => update('minimum', e.target.value)} /><Field label="Prioridad entre tarifas iguales (menor primero)" type="number" step="1" required value={draft.priority} onChange={e => update('priority', e.target.value)} /></div>
  {data.settings.maps_key ? <ZoneMap apiKey={data.settings.maps_key} center={center} points={draft.polygon || []} onChange={points => update('polygon', points)} /> : <p className="notice">Guardá la clave de Google Maps en Configuración para dibujar las zonas.</p>}
  <p>{draft.polygon?.length || 0} vértices</p><button type="button" className="button quiet" disabled={!draft.polygon?.length} onClick={() => update('polygon', draft.polygon.slice(0, -1))}>Deshacer último punto</button>
 </>}
 {tab === 'settings' && <>
  <Field label="Google Maps API key" autoComplete="off" value={draft.maps_key || ''} onChange={e => update('maps_key', e.target.value.trim())} />
  <p className="muted">Usá una clave para sitios web restringida al dominio de la app, con Maps JavaScript API y Places API (New). Después de cambiarla, recargá la página.</p>
  {data.settings.maps_key && <AddressSearch apiKey={data.settings.maps_key} onSelect={p => setDraft(d => ({ ...d, store_address: p.address, store_lat: p.lat, store_lng: p.lng }))} />}
  <Field label="Dirección del local" value={draft.store_address || ''} onChange={e => update('store_address', e.target.value)} />
  <div className="form-grid"><Field label="Latitud del local" type="number" min="-90" max="90" step="any" value={draft.store_lat ?? ''} onChange={e => update('store_lat', e.target.value)} /><Field label="Longitud del local" type="number" min="-180" max="180" step="any" value={draft.store_lng ?? ''} onChange={e => update('store_lng', e.target.value)} /></div>
  <button type="button" className="button quiet" onClick={() => { if (!navigator.geolocation) return setMessage('Este dispositivo no permite obtener la ubicación.'); navigator.geolocation.getCurrentPosition(p => setDraft(d => ({ ...d, store_lat: p.coords.latitude, store_lng: p.coords.longitude })), () => setMessage('No se pudo obtener la ubicación. Podés buscar el domicilio o ingresar las coordenadas.')); }}>Usar mi ubicación como local</button>
  <label className="check"><input type="checkbox" disabled={PREVIEW} checked={draft.delivery_enabled || false} onChange={e => update('delivery_enabled', e.target.checked)} />Habilitar Delivery</label>
  {data.loyaltyVersion===80?<div className="notice"><strong>Programa de sellos activo</strong><p>1 sello por cada $20.000 en productos de un pedido entregado, sin incluir el envío. El cliente puede canjear 5 por delivery sin cargo o 30 por una hamburguesa doble.</p></div>:<><label className="check"><input type="checkbox" checked={draft.points_enabled || false} onChange={e => update('points_enabled', e.target.checked)} />Habilitar puntos</label><div className="form-grid"><Field label="Pesos de compra por cada punto" type="number" min="0.01" step="0.01" required value={draft.earn_every ?? 1000} onChange={e => update('earn_every', e.target.value)} />{data.redemptionVersion!==60&&<Field label="Valor de cada punto al canjear ($)" type="number" min="0.01" step="0.01" required value={draft.point_value ?? 10} onChange={e => update('point_value', e.target.value)} />}</div><p className="muted">Los puntos se acreditan al entregar el pedido. Se calculan sobre productos y extras después del descuento, sin envío.</p></>}
 </>}
 {tab !== 'settings' && <label className="check"><input type="checkbox" checked={draft.active ?? true} onChange={e => update('active', e.target.checked)} />Activo</label>}
 <div className="actions"><button className="button" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>{draft.id && <button type="button" className="button quiet" onClick={() => setDraft({ ...empty[tab] })}>Cancelar edición</button>}</div>
 {message && <p className="notice" role="status">{message}</p>}
 </form></section>
 {tab !== 'settings' && <section className="card"><h2>{tabs[tab]}</h2><Field label="Buscar por nombre" type="search" value={search} onChange={e=>setSearch(e.target.value)}/>{!items.length && <p className="muted">Todavía no hay registros.</p>}{items.filter(item=>item.name.toLowerCase().includes(search.toLowerCase())).map(item => <div key={item.id} className="admin-row"><div><strong>{item.name}</strong><p className="muted">{item.active ? 'Activo' : 'Inactivo'}{item.price != null ? ` · ${money(item.price)}` : ''}{item.fee != null ? ` · Envío ${money(item.fee)}` : ''}</p></div><div className="product-row-actions"><button className="button quiet" disabled={busy} onClick={() => edit(item)}>Editar</button></div></div>)}</section>}
 </div>}</WebPages></section>;
}
