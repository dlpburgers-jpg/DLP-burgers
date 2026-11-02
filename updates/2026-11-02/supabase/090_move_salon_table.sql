-- Traslada la misma cuenta abierta; no copia ni recrea productos o ventas.
begin;
set local lock_timeout='10s';
create table if not exists public.dlp_salon_table_moves (
 id bigint generated always as identity primary key,
 session_id uuid not null references public.v53_sessions(id),
 from_table_id uuid not null references public.v53_tables(id),
 to_table_id uuid not null references public.v53_tables(id),
 from_name text not null,to_name text not null,
 moved_by uuid not null,moved_at timestamptz not null default clock_timestamp(),
 previous_version integer not null
);
alter table public.dlp_salon_table_moves enable row level security;
revoke all on public.dlp_salon_table_moves from public,anon,authenticated;

create or replace function public.dlp_move_salon_table(p_session uuid,p_version integer,p_target_table uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.v53_sessions; origin_id uuid; target public.v53_tables;
begin
 if auth.uid() is null or not coalesce(public.dlp_course_counter(),false) then
  raise exception 'Solo Mostrador o un administrador total pueden trasladar mesas' using errcode='42501';
 end if;
 if p_session is null or p_target_table is null or p_version is null then raise exception 'Falta identificar la cuenta o la mesa de destino';end if;
 select table_id into origin_id from public.v53_sessions where id=p_session and status='open';
 if not found then raise exception 'La cuenta ya no está abierta. Actualizá el salón';end if;
 if origin_id=p_target_table then raise exception 'Elegí otra mesa de destino';end if;
 -- Orden estable y compatible con apertura de mesas (mesa antes de cuenta).
 perform id from public.v53_tables where id in (origin_id,p_target_table) order by id for update;
 select * into target from public.v53_tables where id=p_target_table;
 if not found or not target.active then raise exception 'La mesa de destino no está disponible';end if;
 select * into s from public.v53_sessions where id=p_session for update;
 if not found or s.status<>'open' or s.version<>p_version or s.table_id<>origin_id then
  raise exception 'La cuenta cambió. Actualizá el salón antes de trasladarla';
 end if;
 if exists(select 1 from public.v53_sessions where table_id=p_target_table and status='open') then
  raise exception 'La mesa de destino está ocupada. Elegí otra mesa libre';
 end if;
 insert into public.dlp_salon_table_moves(session_id,from_table_id,to_table_id,from_name,to_name,moved_by,previous_version)
 values(s.id,s.table_id,target.id,s.table_name,target.name,auth.uid(),s.version);
 update public.v53_sessions set table_id=target.id,table_name=target.name,version=version+1 where id=s.id returning * into s;
 return to_jsonb(s);
end $$;
revoke all on function public.dlp_move_salon_table(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.dlp_move_salon_table(uuid,integer,uuid) to authenticated;
commit;
