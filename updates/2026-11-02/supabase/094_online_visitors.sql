create schema if not exists dlp_presence_private;
revoke all on schema dlp_presence_private from public,anon,authenticated;
create table dlp_presence_private.sessions (
 session_id uuid primary key,
 user_id uuid references auth.users(id) on delete cascade,
 platform text not null check(platform in ('ios','android','web')),
 last_seen timestamptz not null default clock_timestamp()
);
alter table dlp_presence_private.sessions enable row level security;
revoke all on dlp_presence_private.sessions from public,anon,authenticated;
create index presence_last_seen on dlp_presence_private.sessions(last_seen);

create function public.dlp_presence_ping(p_session uuid,p_platform text,p_active boolean default true)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); existing dlp_presence_private.sessions%rowtype;
begin
 if p_session is null or p_platform is null or p_platform not in ('ios','android','web') or p_active is null then
  raise exception 'Presencia inválida' using errcode='22023'; end if;
 if actor is not null and not exists(select 1 from auth.users where id=actor and deleted_at is null) then
  raise exception 'Sesión inválida' using errcode='42501'; end if;
 select * into existing from dlp_presence_private.sessions where session_id=p_session;
 if found then
  if existing.user_id is distinct from actor then raise exception 'Sesión inválida' using errcode='42501'; end if;
  if not p_active then delete from dlp_presence_private.sessions where session_id=p_session; return; end if;
  -- Bound writes even if a client sends excessive heartbeats.
  if existing.last_seen>clock_timestamp()-interval '10 seconds' then return; end if;
  update dlp_presence_private.sessions set last_seen=clock_timestamp(),platform=p_platform where session_id=p_session;
  return;
 end if;
 if not p_active then return; end if;
 perform pg_advisory_xact_lock(941002);
 delete from dlp_presence_private.sessions where last_seen<clock_timestamp()-interval '2 minutes';
 if (select count(*) from dlp_presence_private.sessions)>=5000 then return; end if;
 insert into dlp_presence_private.sessions(session_id,user_id,platform) values(p_session,actor,p_platform)
 on conflict(session_id) do nothing;
end $$;
revoke all on function public.dlp_presence_ping(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.dlp_presence_ping(uuid,text,boolean) to anon,authenticated;

create function public.dlp_online_visitors()
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not coalesce(public.v5_is_admin(),false) then
  raise exception 'Administrador total requerido' using errcode='42501'; end if;
 delete from dlp_presence_private.sessions where last_seen<clock_timestamp()-interval '2 minutes';
 with current_sessions as (
  select s.*,case when u.is_anonymous then null else u.id end as account_id
  from dlp_presence_private.sessions s left join auth.users u on u.id=s.user_id
 ), visitors as (
  select coalesce(s.account_id::text,s.session_id::text) as id,
   case when s.account_id is null then 'guest' when p.role='admin' then 'staff' else 'customer' end as kind,
   case when s.account_id is null then 'Invitado' else coalesce(nullif(trim(concat_ws(' ',c.first_name,c.last_name)),''),case when p.role='admin' then 'Equipo DLP' else 'Cliente registrado' end) end as name,
   array_agg(distinct s.platform order by s.platform) as platforms,count(*) as connections,max(s.last_seen) as last_seen
  from current_sessions s left join public.profiles p on p.id=s.account_id
  left join public.v62_customer_profiles c on c.user_id=s.account_id
  group by coalesce(s.account_id::text,s.session_id::text),s.account_id,p.role,c.first_name,c.last_name
 ) select jsonb_build_object('as_of',clock_timestamp(),'total',count(*),'guests',count(*) filter(where kind='guest'),
  'connections',coalesce(sum(connections),0),'visitors',coalesce(jsonb_agg(to_jsonb(visitors) order by last_seen desc,id),'[]'::jsonb)) into result from visitors;
 return result;
end $$;
revoke all on function public.dlp_online_visitors() from public,anon,authenticated;
grant execute on function public.dlp_online_visitors() to authenticated;
