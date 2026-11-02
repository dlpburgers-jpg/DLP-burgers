-- Only server-owned app metadata can authorize automatic registration.
create or replace function public.dlp_sync_registration()
returns trigger language plpgsql security definer set search_path='' as $$
declare marker jsonb:=new.raw_app_meta_data->'dlp_manual_registration'; request uuid; actor uuid; automatic boolean;
begin
 if marker is null then return new; end if;
 request:=(marker->>'request')::uuid;
 automatic:=coalesce(marker->>'method'='automatic' and (marker->>'approved')::boolean,false);
 if tg_op='INSERT' or old.raw_app_meta_data->'dlp_manual_registration' is null then
  if new.email is distinct from 'reg-'||request::text||'@cuentas.dlpburgers.com'
   -- Auth attaches app metadata before confirming email in the same transaction.
   or (not automatic and (new.email_confirmed_at is not null or coalesce((marker->>'approved')::boolean,false)))
  then raise exception 'Registro inválido'; end if;
  update public.dlp_registration_requests set user_id=new.id,
   approved_at=case when automatic then clock_timestamp() else null end
   where id=request and phone=marker->>'phone' and user_id is null;
  if not found then raise exception 'Solicitud de registro no disponible'; end if;
 elsif marker is distinct from old.raw_app_meta_data->'dlp_manual_registration' then
  if marker->>'request' is distinct from old.raw_app_meta_data->'dlp_manual_registration'->>'request'
   or marker->>'phone' is distinct from old.raw_app_meta_data->'dlp_manual_registration'->>'phone'
  then raise exception 'Solicitud inmutable'; end if;
  if coalesce((marker->>'approved')::boolean,false) then
   if not automatic then
    actor:=(marker->>'by')::uuid;
    if not exists(select 1 from public.profiles where id=actor and role='admin' and v5_admin_approved)
    then raise exception 'Administrador requerido'; end if;
   end if;
   if new.email_confirmed_at is null then raise exception 'Falta confirmar el acceso'; end if;
   update public.dlp_registration_requests set approved_at=coalesce(approved_at,clock_timestamp()),approved_by=coalesce(approved_by,actor)
    where id=request and user_id=new.id and phone=marker->>'phone';
   if not found then raise exception 'Solicitud no encontrada'; end if;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.dlp_sync_registration() from public,anon,authenticated;

create or replace function public.dlp_created_accounts(p_date date,p_page integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_at timestamptz; end_at timestamptz; result jsonb;
begin
 if auth.uid() is null or not coalesce(public.v87_can_activate_accounts(),false) then
  raise exception 'Acceso de administrador o mostrador requerido' using errcode='42501';
 end if;
 if p_date is null or not isfinite(p_date) or p_page is null or p_page<0 or p_page>100000 then
  raise exception 'Fecha o página inválida' using errcode='22023';
 end if;
 start_at:=p_date::timestamp at time zone 'America/Argentina/Buenos_Aires';
 end_at:=(p_date+1)::timestamp at time zone 'America/Argentina/Buenos_Aires';
 with accounts as (
  select u.id,u.created_at,coalesce(nullif(concat_ws(' ',c.first_name,c.last_name),''),'Sin nombre') as name,
   coalesce(nullif(c.phone,''),r.phone,'') as phone
  from auth.users u join public.profiles p on p.id=u.id and p.role='customer'
  left join public.v62_customer_profiles c on c.user_id=u.id
  left join public.dlp_registration_requests r on r.user_id=u.id
  where not u.is_anonymous and u.deleted_at is null and u.created_at>=start_at and u.created_at<end_at
 ), page as (select * from accounts order by created_at desc,id limit 100 offset p_page*100)
 select jsonb_build_object('date',p_date,'total',(select count(*) from accounts),'page',p_page,
  'accounts',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id) from page),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.dlp_created_accounts(date,integer) from public,anon,authenticated;
grant execute on function public.dlp_created_accounts(date,integer) to authenticated;
