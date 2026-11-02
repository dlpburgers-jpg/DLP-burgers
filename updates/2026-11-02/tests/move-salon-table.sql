-- Test fixtures only; always rollback, including successful operations.
begin;
set local lock_timeout='3s';
do $$
declare actor uuid; admin_id uuid; origin uuid:=gen_random_uuid(); dest uuid:=gen_random_uuid(); occupied uuid:=gen_random_uuid(); inactive uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); other_sid uuid:=gen_random_uuid(); before_row jsonb; after_row jsonb; failed boolean;
begin
 select id into actor from auth.users where lower(email)='mostrador@usuarios.dlpburgers.com';
 if actor is null then raise exception 'Missing Mostrador identity';end if;
 select id into admin_id from public.profiles where role='admin' and v5_admin_approved and v69_admin_level='total' limit 1;
 if admin_id is null then raise exception 'Missing full admin identity';end if;
 insert into public.v53_tables(id,name,active) values(origin,'QA origen '||left(sid::text,8),true),(dest,'QA destino '||left(sid::text,8),true),(occupied,'QA ocupada '||left(sid::text,8),true),(inactive,'QA inactiva '||left(sid::text,8),false);
 insert into public.v53_sessions(id,table_id,table_name,opened_by,guest_count,items,notes,subtotal,total)
 values(sid,origin,'QA origen '||left(sid::text,8),actor,2,'[{"id":"qa-item","product_name":"Prueba","quantity":2,"unit_price":5000,"kitchen_sent_at":"2026-11-02T12:00:00Z","service_course":"main"}]','Conservar nota',10000,10000),
 (other_sid,occupied,'QA ocupada '||left(sid::text,8),actor,1,'[]','',0,0);
 select to_jsonb(s) into before_row from public.v53_sessions s where id=sid;
 perform set_config('request.jwt.claim.sub','',true);
 failed:=false;begin perform public.dlp_move_salon_table(sid,1,dest);exception when insufficient_privilege then failed:=true;end;if not failed then raise exception 'Anonymous allowed';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 failed:=false;begin perform public.dlp_move_salon_table(sid,1,dest);exception when insufficient_privilege then failed:=true;end;if not failed then raise exception 'Unknown user allowed';end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 failed:=false;begin perform public.dlp_move_salon_table(sid,1,origin);exception when raise_exception then failed:=true;end;if not failed then raise exception 'Same table allowed';end if;
 failed:=false;begin perform public.dlp_move_salon_table(sid,1,occupied);exception when raise_exception then failed:=true;end;if not failed then raise exception 'Occupied table allowed';end if;
 failed:=false;begin perform public.dlp_move_salon_table(sid,1,inactive);exception when raise_exception then failed:=true;end;if not failed then raise exception 'Inactive table allowed';end if;
 failed:=false;begin perform public.dlp_move_salon_table(sid,99,dest);exception when raise_exception then failed:=true;end;if not failed then raise exception 'Stale version allowed';end if;
 after_row:=public.dlp_move_salon_table(sid,1,dest);
 if after_row->>'table_id'<>dest::text or (after_row->>'version')::integer<>2 then raise exception 'Move target/version mismatch';end if;
 if (after_row-array['table_id','table_name','version']) is distinct from (before_row-array['table_id','table_name','version']) then raise exception 'Account content changed';end if;
 if exists(select 1 from public.v53_sessions where table_id=origin and status='open') then raise exception 'Origin not released';end if;
 if (select count(*) from public.dlp_salon_table_moves where session_id=sid)<>1 then raise exception 'Missing audit';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 after_row:=public.dlp_move_salon_table(sid,2,origin);
 if after_row->>'table_id'<>origin::text then raise exception 'Admin transfer failed';end if;
 update public.v53_sessions set status='cancelled' where id=sid;
 failed:=false;begin perform public.dlp_move_salon_table(sid,3,dest);exception when raise_exception then failed:=true;end;if not failed then raise exception 'Closed account allowed';end if;
 if has_function_privilege('anon','public.dlp_move_salon_table(uuid,integer,uuid)','EXECUTE') then raise exception 'Anonymous RPC permission';end if;
 if not has_function_privilege('authenticated','public.dlp_move_salon_table(uuid,integer,uuid)','EXECUTE') then raise exception 'Authenticated RPC missing';end if;
 if has_table_privilege('authenticated','public.dlp_salon_table_moves','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Audit exposed';end if;
end $$;
select 'PASS: permissions, same/occupied/inactive/stale/closed rejection, Mostrador and admin transfer, exact account preservation, origin released, audit and grants; all fixtures rolled back' as result;
rollback;
