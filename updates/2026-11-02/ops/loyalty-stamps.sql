begin;
set local lock_timeout='10s';
set local statement_timeout='90s';
select pg_advisory_xact_lock(4715095);
create table public.dlp_stamp_conversion(user_id uuid primary key references auth.users(id) on delete cascade,old_points bigint not null,stamps integer not null,discarded bigint not null,created_at timestamptz not null default now());
alter table public.dlp_stamp_conversion enable row level security;
revoke all on public.dlp_stamp_conversion from public,anon,authenticated;
create table public.dlp_stamp_movements(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,customer_id uuid references public.customers(id) on delete set null,order_id uuid not null references public.orders(id) on delete cascade,kind text not null check(kind in ('earn','redeem','refund','reversal')),reward text,points integer not null check(points<>0),created_at timestamptz not null default now(),unique(order_id,kind));
create index dlp_stamp_user on public.dlp_stamp_movements(user_id,created_at desc);
alter table public.dlp_stamp_movements enable row level security;
revoke all on public.dlp_stamp_movements from public,anon,authenticated;
create table public.dlp_stamp_codes(code uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,reward text not null check(reward in ('delivery_free','starter_free','burger_simple')),cost integer not null check(cost in (5,10,20)),order_id uuid unique references public.orders(id),created_at timestamptz not null default now());
create unique index dlp_stamp_code_pending on public.dlp_stamp_codes(user_id,reward) where order_id is null;
alter table public.dlp_stamp_codes enable row level security;
revoke all on public.dlp_stamp_codes from public,anon,authenticated;
alter table public.orders add column dlp_stamps_program boolean not null default false;
alter table public.orders add column dlp_stamp_code uuid references public.dlp_stamp_codes(code);
-- Preserve previous accounting and immutable point movements. Only opening balances are converted.
lock table public.v87_point_movements in share mode;
insert into public.dlp_stamp_conversion(user_id,old_points,stamps,discarded)
 select user_id,sum(points),floor(greatest(0,sum(points))/1000.0)::integer,greatest(0,sum(points))%1000 from public.v87_point_movements group by user_id;
alter table public.orders drop constraint orders_v87_redeem_points_check;
alter table public.orders add constraint orders_v87_redeem_points_check check(v87_redeem_points in (0,5,10,20,1000,1500,2000,3000));
alter table public.orders drop constraint orders_v87_reward_check;
alter table public.orders add constraint orders_v87_reward_check check(v87_reward in ('delivery_free','starter_free','burger_simple','drink_500','drink_2l'));
create or replace function public.v80_balance(p_user uuid) returns integer language sql stable security definer set search_path='' as $$
 select coalesce((select stamps from public.dlp_stamp_conversion where user_id=p_user),0)+coalesce((select sum(points)::integer from public.dlp_stamp_movements where user_id=p_user),0);
$$;
create or replace function public.dlp_issue_stamp_code(p_reward text,p_customer uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=coalesce(p_customer,auth.uid());cost integer;ticket public.dlp_stamp_codes;
begin
 if p_customer is not null and not public.v69_is_staff() then raise exception 'Acceso de personal requerido';end if;
 if auth.uid() is null or uid is null or not exists(select 1 from auth.users where id=uid and not coalesce(is_anonymous,false)) then raise exception 'Ingresá a una cuenta registrada para canjear sellos';end if;
 cost:=case p_reward when 'delivery_free' then 5 when 'starter_free' then 10 when 'burger_simple' then 20 end;
 if cost is null then raise exception 'Premio inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,1));
 if public.v80_balance(uid)<cost then raise exception 'No tenés sellos suficientes';end if;
 select * into ticket from public.dlp_stamp_codes where user_id=uid and reward=p_reward and order_id is null;
 if not found then insert into public.dlp_stamp_codes(user_id,reward,cost) values(uid,p_reward,cost) returning * into ticket;end if;
 return jsonb_build_object('code',ticket.code,'reward',ticket.reward,'cost',ticket.cost);
end $$;
revoke all on function public.dlp_issue_stamp_code(text,uuid) from public,anon;
grant execute on function public.dlp_issue_stamp_code(text,uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.v87_reward_eligible(p_category text, p_name text, p_description text, p_variant text, p_reward text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select case
 when p_reward='starter_free' then lower(p_category) ~ '(starter|entrada)'
 when p_reward='burger_simple' then lower(p_category) ~ '(burger|hamburgues)' and
  case when p_variant is not null then p_variant ~* '\msimple\M' else p_name ~* '\msimple\M' and (p_name||' '||coalesce(p_description,'')) !~* '(doble|double|triple)' end
 when lower(p_category) !~ '(bebida|drink)' then false
 when p_reward='drink_2l' then (p_name||' '||coalesce(p_variant,'')) ~* '(^|[^0-9.,])(2[[:space:]]*(l\M|litros?\M)|2000[[:space:]]*(ml|cc)\M)'
 when p_reward='drink_500' then (p_name||' '||coalesce(p_variant,'')) ~* '(^|[^0-9.,])(500[[:space:]]*(ml|cc)\M|0[.,]5[[:space:]]*(l\M|litros?\M))'
 else false end;
$function$
;
CREATE OR REPLACE FUNCTION public.v80_stamp_quote(p_data jsonb, p_customer uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
<<stamp_quote>> declare
 uid uuid:=coalesce(p_customer,auth.uid());staff boolean:=p_customer is not null;reward text:=coalesce(p_data->>'stamp_reward','');
 channel text:=coalesce(p_data->>'fulfillment_type','');balance integer;sub numeric;coupon jsonb;remaining numeric;
 method public.v52_payment_methods;line jsonb;line_quote jsonb;p public.products;category_name text;variant jsonb;
 lat numeric;lng numeric;z public.delivery_zones;benefit numeric:=0;delivery_benefit numeric:=0;cost integer;label text;base_price numeric;ticket public.dlp_stamp_codes;burger_count integer;
begin
 if staff and not public.v69_is_staff() then raise exception 'Acceso de administrador requerido';end if;
 if uid is null or not exists(select 1 from auth.users u where u.id=uid and not coalesce((to_jsonb(u)->>'is_anonymous')::boolean,false)) then raise exception 'Asociá una cuenta registrada para canjear sellos';end if;
 if reward not in ('delivery_free','burger_simple','starter_free') then raise exception 'Elegí un premio válido del programa de sellos';end if;
 if jsonb_typeof(p_data->'items') is distinct from 'array' or jsonb_array_length(p_data->'items') not between 1 and 50 then raise exception 'Revisá los productos del pedido';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,1));
 balance:=public.v80_balance(uid);
 cost:=case reward when 'delivery_free' then 5 when 'starter_free' then 10 else 20 end;
 if balance<cost then raise exception 'No tenés sellos suficientes para este premio';end if;
 select * into ticket from public.dlp_stamp_codes where user_id=uid and dlp_stamp_codes.reward=stamp_quote.reward and order_id is null for update;
 if not found then raise exception 'Generá el código de canje desde la versión actualizada de DLP';end if;
 method:=public.v52_payment(p_data->>'payment_method',channel);
 sub:=case when staff then public.v64_staff_subtotal(p_data->'items',channel) else public.v52_subtotal(p_data->'items',channel) end;
 coupon:=public.dlp_coupon_for_order(p_data,sub,method.id,staff);
 remaining:=greatest(0,sub-coalesce((coupon->>'discount')::numeric,0));
 if reward='delivery_free' then
  if channel<>'delivery' then raise exception 'El premio de delivery solo puede usarse con entrega a domicilio';end if;
  select coalesce(sum((i->>'quantity')::integer),0)::integer into burger_count from jsonb_array_elements(p_data->'items') i join public.products prod on prod.id::text=i->>'productId' join public.categories c on c.id=prod.category_id where lower(c.name) ~ '(burger|hamburgues)';
  if burger_count<3 then raise exception 'El delivery gratis requiere 3 hamburguesas o más';end if;
  lat:=nullif(p_data->>'lat','')::numeric;lng:=nullif(p_data->>'lng','')::numeric;
  if lat is null or lng is null then raise exception 'Seleccioná el domicilio de entrega';end if;
  select * into z from public.delivery_zones where active and public.v5_contains(lat,lng,polygon) order by fee desc,priority,id limit 1 for share;
  if not found then raise exception 'El domicilio queda fuera de la zona de reparto';end if;
  delivery_benefit:=z.fee;if delivery_benefit<=0 then raise exception 'Esta zona ya tiene delivery sin cargo';end if;label:='Delivery sin cargo';
 else
  select value into line from jsonb_array_elements(p_data->'items')
   where value->>'productId'=p_data->>'stamp_product_id'
   and nullif(value->>'variantId','') is not distinct from nullif(p_data->>'stamp_variant_id','')
   and coalesce((value->>'quantity')::integer,0)>0 limit 1;
  if line is null then raise exception 'Agregá al pedido el producto elegido para el premio';end if;
  select * into p from public.products where id::text=p_data->>'stamp_product_id' and active for share;
  if not found then raise exception 'El producto elegido ya no está disponible';end if;
  select name into category_name from public.categories where id=p.category_id and active for share;
  if not found then raise exception 'La categoría ya no está disponible';end if;
  if jsonb_array_length(coalesce(p.v51_variants,'[]'::jsonb))>0 then
   select value into variant from jsonb_array_elements(p.v51_variants) where value->>'id'=nullif(p_data->>'stamp_variant_id','') and (value->>'active')::boolean;
   if variant is null then raise exception 'Elegí una presentación disponible';end if;
  elsif nullif(p_data->>'stamp_variant_id','') is not null then raise exception 'La presentación ya no está disponible';end if;
  if not public.v87_reward_eligible(category_name,p.name,p.description,variant->>'name',reward) then raise exception 'El producto no corresponde al premio elegido';end if;
  line_quote:=case when staff then public.v64_staff_line(line,channel) else public.v51_quote_line(line,channel) end;
  base_price:=case when variant is null then p.price else (variant->>'price')::numeric end;
  benefit:=least(base_price,(line_quote->>'unit_price')::numeric,remaining);
  if benefit<=0 then raise exception 'El premio no puede aplicarse a este pedido';end if;
  label:=p.name||coalesce(' · '||(variant->>'name'),'')||' sin cargo';
 end if;
 return jsonb_build_object('code',ticket.code,'reward',reward,'stamps',cost,'points',cost,'balance',balance,'discount',round(benefit,2),'delivery_discount',round(delivery_benefit,2),'label',label);
end $function$
;
CREATE OR REPLACE FUNCTION public.v80_apply_stamp(p_order uuid, p_quote jsonb DEFAULT NULL::jsonb)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders;reward text:=nullif(p_quote->>'reward','');cost integer:=coalesce((p_quote->>'stamps')::integer,0);
 discount_value numeric:=coalesce((p_quote->>'discount')::numeric,0);delivery_value numeric:=coalesce((p_quote->>'delivery_discount')::numeric,0);final_total numeric;earned integer:=0;ticket public.dlp_stamp_codes;
begin
 select * into strict o from public.orders where id=p_order for update;
 if o.v87_points_program then return o;end if;
 if cost>0 then
  select * into ticket from public.dlp_stamp_codes where code=nullif(p_quote->>'code','')::uuid and user_id=o.user_id and order_id is null for update;
  if not found or ticket.cost<>cost or ticket.reward<>reward then raise exception 'Código de canje inválido o utilizado';end if;
 end if;
 if o.user_id is not null then
  perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,1));
  if cost>public.v80_balance(o.user_id) then raise exception 'Tu saldo de puntos cambió. Revisá el premio';end if;
  select coalesce(sum(i.quantity*(case when lower(c.name) ~ '(burger|hamburgues)' then 1 else 0 end)),0)::integer into earned
   from public.order_items i join public.products p on p.id=i.product_id join public.categories c on c.id=p.category_id where i.order_id=o.id;
  if reward='burger_simple' then earned:=greatest(0,earned-1);end if;
 end if;
 final_total:=round(o.total-discount_value-delivery_value,2);
 if final_total<0 then raise exception 'El beneficio supera el total del pedido';end if;
 update public.orders set
  v80_stamp_program=true,v80_stamp_reward=null,v80_redeem_stamps=0,v80_earn_stamps=0,v80_stamp_discount=0,v80_stamp_product_id=null,v80_stamp_variant_id=null,
  dlp_stamps_program=true,dlp_stamp_code=ticket.code,v87_points_program=true,v87_reward=reward,v87_redeem_points=cost,v87_earn_points=earned,
  v87_reward_label=p_quote->>'label',v87_reward_product_id=nullif(p_quote->>'product_id','')::uuid,v87_reward_variant_id=nullif(p_quote->>'variant_id','')::uuid,
  discount=round(discount+discount_value,2),delivery_fee=round(greatest(0,delivery_fee-delivery_value),2),total=final_total,earn_points=0,redeemed_points=0
 where id=o.id returning * into o;
 if cost>0 then insert into public.dlp_stamp_movements(user_id,customer_id,order_id,kind,reward,points)
  values(o.user_id,o.customer_id,o.id,'redeem',reward,-cost) on conflict(order_id,kind) do nothing;end if;
 if cost>0 then update public.dlp_stamp_codes set order_id=o.id where code=ticket.code;end if;
 return o;
end $function$
;
create or replace function public.v80_stamp_order_status() returns trigger language plpgsql security definer set search_path='' as $$
declare earned integer:=0;refund integer:=0;
begin
 if new.v87_points_program and new.user_id is not null and new.status is distinct from old.status then
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,1));
  if new.status='completed' and not exists(select 1 from public.dlp_stamp_movements where order_id=new.id and kind in ('refund','reversal')) then
   if new.dlp_stamps_program then earned:=new.v87_earn_points;
   else
    select coalesce(sum(i.quantity),0)::integer into earned from public.order_items i join public.products p on p.id=i.product_id join public.categories c on c.id=p.category_id where i.order_id=new.id and lower(c.name) ~ '(burger|hamburgues)';
    if new.v87_reward='burger_simple' then earned:=greatest(0,earned-1);end if;
    -- A historical completed order must never earn again after conversion.
    if exists(select 1 from public.v87_point_movements where order_id=new.id and kind in ('earn','refund','reversal')) then earned:=0;end if;
   end if;
   if earned>0 then insert into public.dlp_stamp_movements(user_id,customer_id,order_id,kind,points) values(new.user_id,new.customer_id,new.id,'earn',earned) on conflict(order_id,kind) do nothing;end if;
  elsif new.status='cancelled' then
   refund:=case when new.dlp_stamps_program then new.v87_redeem_points else floor(new.v87_redeem_points/1000.0)::integer end;
   if not new.dlp_stamps_program and exists(select 1 from public.v87_point_movements where order_id=new.id and kind='refund') then refund:=0;end if;
   if refund>0 then insert into public.dlp_stamp_movements(user_id,customer_id,order_id,kind,reward,points) values(new.user_id,new.customer_id,new.id,'refund',new.v87_reward,refund) on conflict(order_id,kind) do nothing;end if;
   insert into public.dlp_stamp_movements(user_id,customer_id,order_id,kind,points) select new.user_id,new.customer_id,new.id,'reversal',-points from public.dlp_stamp_movements where order_id=new.id and kind='earn' on conflict(order_id,kind) do nothing;
  end if;
 end if;
 return new;
end $$;
CREATE OR REPLACE FUNCTION public.v80_history(p_tokens jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select public.v5_history(p_tokens)||jsonb_build_object(
 'stampProgramVersion',95,'balance',public.v80_balance(auth.uid()),'ledger','[]'::jsonb,
 'stampBalance',public.v80_balance(auth.uid()),
 'stampLedger',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('amount',m.points) order by m.created_at desc) from (select * from public.dlp_stamp_movements where user_id=auth.uid() order by created_at desc limit 100) m),'[]'::jsonb));
$function$
;
CREATE OR REPLACE FUNCTION public.v87_catalog()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select public.v86_catalog()||jsonb_build_object('finalVersion',87,'pointsVersion',87,'stampProgramVersion',95,
 'pointRules',jsonb_build_object('burger',1,'starter',0,'delivery_free',5,'starter_free',10,'burger_simple',20,'delivery_min_burgers',3));
$function$
;
notify pgrst,'reload schema';
commit;
