import {useRef, useState} from 'react';
import {Columns3, Armchair, Utensils, ChartNoAxesCombined, Gift, UserRound, MoreHorizontal, Power, ChevronDown, Plus, PanelLeftClose, PanelLeftOpen} from 'lucide-react';
import {PageDialog} from './WebPages';
import adminLogo from '../assets/dlp-admin-logo.webp';

// Engranaje dibujado a mano: mantiene el trazo de lucide sin depender de un ícono nuevo del paquete.
function SettingsIcon({size = 20}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Única definición de cómo se agrupan las secciones del panel.
export const navGroups = [
  {id: 'operation', label: 'Operación', Icon: Columns3, keys: ['board', 'counter', 'salon', 'drivers', 'activity', 'courses']},
  {id: 'catalog', label: 'Catálogo', Icon: Utensils, keys: ['product', 'category', 'extra', 'group', 'prices', 'weeklyBurger']},
  {id: 'sales', label: 'Ventas y finanzas', Icon: ChartNoAxesCombined, keys: ['finance', 'reports', 'billing']},
  {id: 'marketing', label: 'Marketing', Icon: Gift, keys: ['coupon', 'promotions', 'events', 'notifications', 'birthdays', 'raffle']},
  {id: 'people', label: 'Clientes y equipo', Icon: UserRound, keys: ['users','activation','online']},
  {id: 'settings', label: 'Configuración', Icon: SettingsIcon, keys: ['schedule', 'payment', 'zone', 'printer', 'settings']},
];

export const navGroupOf = key => navGroups.find(group => group.keys.includes(key)) || null;

// Accesos rápidos de la barra inferior en celulares.
const quickKeys = ['board', 'salon'];
const quickIcons = {board: Columns3, salon: Armchair, counter: Plus};

// Secciones que existen pero no se listan en el menú: el mostrador se abre desde Pedidos.
const menuHidden = new Set(['counter']);
const menuKeyOf = key => (key === 'counter' ? 'board' : key);
const quickLabels = {salon: 'Mesas', counter: 'Nuevo pedido'};

export const sectionLabel = (tabs, key) => (key === 'settings' ? 'Datos del local' : tabs[key]);

export default function AdminNavigation({tabs, active: section, onSelect, roleLabel, onLogout, mobileInbox=false, collapsible=false}) {
  const [folded, setFolded] = useState(false);
  const collapsed = collapsible && folded;
  const dialog = useRef(null);
  const active = mobileInbox ? section : menuKeyOf(section);
  const visible = navGroups
    .map(group => ({...group, keys: group.keys.filter(key => Object.hasOwn(tabs, key) && !menuHidden.has(key))}))
    .filter(group => group.keys.length);
  const activeGroup = visible.find(group => group.keys.includes(active))?.id;
  // El grupo de la sección actual se muestra abierto salvo que la persona lo cierre.
  const [folds, setFolds] = useState({opened: [], closed: []});
  const isExpanded = id => folds.opened.includes(id) || (id === activeGroup && !folds.closed.includes(id));
  const quick = (mobileInbox ? ['board', 'counter', 'salon'] : quickKeys).filter(key => Object.hasOwn(tabs, key));

  function choose(key) {
    dialog.current?.close();
    onSelect(key);
  }

  function toggleGroup(group) {
    // Un grupo con una sola sección funciona como enlace directo.
    if (group.keys.length === 1) return choose(group.keys[0]);
    const id = group.id;
    const without = list => list.filter(item => item !== id);
    setFolds(current => (isExpanded(id)
      ? {opened: without(current.opened), closed: [...without(current.closed), id]}
      : {opened: [...without(current.opened), id], closed: without(current.closed)}));
  }

  return (
    <>
      <aside className={`admin-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Administración">
        {collapsible && <button
          type="button"
          className="admin-sidebar-toggle"
          aria-expanded={!collapsed}
          aria-controls="admin-sidebar-content"
          aria-label={collapsed ? 'Abrir barra lateral' : 'Plegar barra lateral'}
          title={collapsed ? 'Abrir barra lateral' : 'Plegar barra lateral'}
          onClick={() => setFolded(value => !value)}
        >
          {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
          {!collapsed && <span>Plegar barra lateral</span>}
        </button>}
        <div id="admin-sidebar-content" className="admin-sidebar-content" hidden={collapsed}>
        <div className="admin-sidebar-brand">
          <img src={adminLogo} alt="" width="44" height="44" />
          <div>
            <strong>DLP BURGERS</strong>
            <span>Administración</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Secciones del panel">
          {visible.map(group => {
            const single = group.keys.length === 1;
            const expanded = !single && isExpanded(group.id);
            const current = group.keys.includes(active);
            const {Icon} = group;
            return (
              <div key={group.id} className="admin-sidebar-group">
                <button
                  type="button"
                  className={`admin-sidebar-head${current ? ' is-current' : ''}${single && current ? ' is-active' : ''}`}
                  aria-expanded={single ? undefined : expanded}
                  aria-current={single && current ? 'page' : undefined}
                  onClick={() => toggleGroup(group)}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{single ? sectionLabel(tabs, group.keys[0]) : group.label}</span>
                  {!single && <ChevronDown size={16} aria-hidden="true" className="admin-sidebar-chevron" />}
                </button>
                {expanded && (
                  <ul className="admin-sidebar-items">
                    {group.keys.map(key => (
                      <li key={key}>
                        <button type="button" aria-current={active === key ? 'page' : undefined} onClick={() => choose(key)}>
                          {sectionLabel(tabs, key)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="admin-sidebar-user">
          <span>{roleLabel}</span>
          {onLogout && (
            <button type="button" onClick={onLogout}>
              <Power size={16} aria-hidden="true" />
              Cerrar sesión
            </button>
          )}
        </div>
        </div>
      </aside>

      <header className="admin-mobilebar">
        <img src={adminLogo} alt="DLP Burgers" width="36" height="36" />
        <strong>{sectionLabel(tabs, active) || 'Administración'}</strong>
        <span>{roleLabel}</span>
      </header>

      <nav className="admin-bottom" aria-label="Accesos rápidos">
        {quick.map(key => {
          const Icon = quickIcons[key];
          return (
            <button key={key} type="button" className={key === 'counter' ? 'mobile-new-order' : undefined} aria-current={active === key ? 'page' : undefined} onClick={() => choose(key)}>
              <Icon size={22} aria-hidden="true" />
              <span>{quickLabels[key] || sectionLabel(tabs, key)}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-controls="admin-all-sections"
          className={!quick.includes(active) ? 'is-selected' : ''}
          onClick={() => dialog.current?.showModal()}
        >
          <MoreHorizontal size={22} aria-hidden="true" />
          <span>Más</span>
        </button>
      </nav>

      <PageDialog
        ref={dialog}
        id="admin-all-sections"
        className="admin-section-dialog"
        aria-labelledby="admin-sections-title"
        onClick={event => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="admin-dialog-heading">
          <h2 id="admin-sections-title">Secciones</h2>
          <button type="button" onClick={() => dialog.current.close()} autoFocus>Cerrar</button>
        </div>
        <nav aria-label="Todas las secciones">
          {visible.map(group => (
            <section key={group.id}>
              <h3>{group.label}</h3>
              {group.keys.map(key => (
                <button key={key} type="button" aria-current={active === key ? 'page' : undefined} onClick={() => choose(key)}>
                  {sectionLabel(tabs, key)}
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </section>
          ))}
        </nav>
        {onLogout && <button type="button" className="admin-dialog-logout" onClick={onLogout}>Cerrar sesión</button>}
      </PageDialog>
    </>
  );
}
