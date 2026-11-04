import {startPresence} from './lib/presence';
import {supabase} from './lib/supabaseClient';
import {PREVIEW} from './lib/mode';
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./AppV5";
import "./v5.css";
import "./catalog.css";
import "./brand.css";
import "./customer.css";
import "./red-theme.css";
import "./checkout-soft.css";
import "./header-refined.css";
import "./components/PopularMosaic.css";
import {registerAppWorker} from './lib/pwa';
import {initializeNativePush} from './lib/push';
import MobileUpdateGate from './components/MobileUpdateGate';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MobileUpdateGate><App /></MobileUpdateGate>
  </React.StrictMode>
);

initializeNativePush();
if(!PREVIEW)startPresence(supabase);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // No esperar las imágenes del menú para preparar el servicio en una primera visita.
  registerAppWorker().catch(() => {});
}
