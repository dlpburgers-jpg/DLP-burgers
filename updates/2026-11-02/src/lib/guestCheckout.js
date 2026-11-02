export async function submitGuestCheckout(client,args){
 const session=await client.auth.getSession();
 if(session.error)throw new Error('No pudimos comprobar la sesión. Tu carrito queda guardado.');
 if(session.data?.session)throw new Error('Cerrá sesión o ingresá a tu cuenta para confirmar el pedido.');
 const {data,error}=await client.rpc('dlp_guest_checkout',args);
 if(error)throw Object.assign(new Error(error.message),{code:error.code,status:error.status});
 return data;
}
