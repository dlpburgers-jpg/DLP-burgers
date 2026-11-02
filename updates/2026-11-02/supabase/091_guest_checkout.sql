begin;
set local lock_timeout='10s';
create schema if not exists dlp_guest_private;
revoke all on schema dlp_guest_private from public,anon,authenticated;
create table if not exists dlp_guest_private.requests(
 request_id uuid primary key, token_hash text not null, payload_hash text not null,
 order_id uuid references public.orders(id),created_at timestamptz not null default now()
);
alter table dlp_guest_private.requests enable row level security;
revoke all on dlp_guest_private.requests from public,anon,authenticated;
create or replace function public.dlp_guest_checkout(p_request uuid,p_guest_token uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved dlp_guest_private.requests; o public.orders; clean jsonb; result jsonb; slot jsonb; token_hash text; payload_hash text; summary jsonb;
begin
 if auth.uid() is not null then raise exception 'Usá el pedido de tu cuenta o cerrá sesión para pedir como invitado';end if;
 if p_request is null or p_guest_token is null then raise exception 'Falta identificar el pedido de invitado';end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Pedido inválido';end if;
 if p_data->>'payment_method'='points' or coalesce((p_data->>'redeem_points')::integer,0)<>0 or nullif(p_data->>'reward_id','') is not null or nullif(p_data->>'stamp_reward','') is not null then
  raise exception 'Para sumar o canjear puntos, creá una cuenta e iniciá sesión antes de confirmar';
 end if;
 clean:=(p_data-'staff_pricing'-'_v60_discount'-'customer_stamp_balance'-'user_id'-'customer_id'-'reward_id'-'remainder_payment'-'stamp_reward'-'stamp_product_id'-'stamp_variant_id')||jsonb_build_object('redeem_points',0);
 token_hash:=encode(sha256(convert_to(p_guest_token::text,'UTF8')),'hex');
 payload_hash:=encode(sha256(convert_to(clean::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into saved from dlp_guest_private.requests where request_id=p_request;
 if found then
  if saved.token_hash<>token_hash or saved.payload_hash<>payload_hash then raise exception 'No pudimos validar el reintento de este pedido';end if;
  select * into o from public.orders where id=saved.order_id and user_id is null;
  if not found then raise exception 'No pudimos recuperar el pedido';end if;
 else
  if exists(select 1 from public.orders where request_id=p_request) then raise exception 'Identificador de pedido no disponible';end if;
  -- Reutiliza las reglas actuales de la tienda, horarios, catálogo, cupones y zonas.
  perform 1 from public.settings where key='v58_store' for share;
  if not coalesce((public.v58_store_status()->>'open')::boolean,false) then raise exception '%',public.v58_store_status()->>'message';end if;
  perform 1 from public.v57_schedules where channel=clean->>'fulfillment_type' for share;
  slot:=public.v57_validate_slot(clean->>'fulfillment_type',clean->>'scheduled_at',clock_timestamp());
  insert into dlp_guest_private.requests(request_id,token_hash,payload_hash) values(p_request,token_hash,payload_hash);
  result:=public.v57_checkout_base(p_request,clean);
  update public.orders set v57_scheduled_at=(slot->>'at')::timestamptz,v57_slot_message=slot->>'message',earn_points=0
   where id=(result->>'id')::uuid and user_id is null returning * into o;
  if not found then raise exception 'No pudimos guardar el pedido de invitado';end if;
  update dlp_guest_private.requests set order_id=o.id where request_id=p_request;
 end if;
 summary:=(to_jsonb(o)-'tracking_token'-'request_id')||jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('unit_price',i.price)) from public.order_items i where i.order_id=o.id),'[]'::jsonb));
 return jsonb_build_object('id',o.id,'tracking_token',o.tracking_token,'total',o.total,'v57_scheduled_at',o.v57_scheduled_at,'v57_slot_message',o.v57_slot_message,'guest_order',summary);
end $$;
revoke all on function public.dlp_guest_checkout(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.dlp_guest_checkout(uuid,uuid,jsonb) to anon;
commit;
