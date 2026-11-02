// One unpredictable token per tab/auth identity. Never transmit a claimed user id.
export function presencePlatform(browser){
 const native=browser.Capacitor?.getPlatform?.();
 if(native==='ios'||native==='android')return native;
 const ua=browser.navigator?.userAgent||'';
 if(/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&browser.navigator?.maxTouchPoints>1))return 'ios';
 return /Android/.test(ua)?'android':'web';
}
export function startPresence(client,browser=window,page=document){
 let token=browser.crypto.randomUUID(),identity,stopped=false,busy=false,queued=false;
 const platform=presencePlatform(browser);
 async function send(){
  if(stopped)return;
  if(busy){queued=true;return;}
  busy=true;
  try{await client.rpc('dlp_presence_ping',{p_session:token,p_platform:platform,p_active:!page.hidden});}
  catch{/* Presence must never interrupt orders or login. */}
  finally{busy=false;if(queued&&!stopped){queued=false;void send();}}
 }
 const {data}=client.auth.onAuthStateChange((_event,session)=>{
  const next=session?.user?.id||null;
  if(next===identity)return;
  identity=next;token=browser.crypto.randomUUID();
  // Do not call Supabase from inside its auth callback (auth lock).
  browser.setTimeout(()=>void send(),0);
 });
 const timer=browser.setInterval(()=>void send(),30000);
 const visibility=()=>void send();
 page.addEventListener('visibilitychange',visibility);
 browser.addEventListener('online',visibility);
 // INITIAL_SESSION schedules the first ping after the identity is known.
 return ()=>{stopped=true;browser.clearInterval(timer);data?.subscription?.unsubscribe();page.removeEventListener('visibilitychange',visibility);browser.removeEventListener('online',visibility);};
}
