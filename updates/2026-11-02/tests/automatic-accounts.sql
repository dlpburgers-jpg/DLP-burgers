-- Run after migration 092 inside BEGIN ... ROLLBACK; no test data survives.
do $$
declare uid uuid:=gen_random_uuid(); pending_uid uuid:=gen_random_uuid(); rid uuid:=gen_random_uuid(); pending_rid uuid:=gen_random_uuid(); admin_id uuid; counter_id uuid;
 total_before integer; result jsonb; test_phone text:='+5491100000001'; pending_phone text:='+5491100000002';
begin
 if has_function_privilege('anon','public.dlp_created_accounts(date,integer)','execute') then raise exception 'Anon can read accounts'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.dlp_created_accounts('2001-01-01',0); raise exception 'Anonymous accepted'; exception when insufficient_privilege then null; end;
 select p.id into admin_id from public.profiles p where p.role='admin' and p.v5_admin_approved limit 1;
 if admin_id is null then raise exception 'Missing admin fixture'; end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 total_before:=(public.dlp_created_accounts('2001-01-01',0)->>'total')::integer;
 insert into public.dlp_registration_requests(id,phone,ip_hash) values(rid,test_phone,repeat('a',64)),(pending_rid,pending_phone,repeat('b',64));
 -- Match Auth's create transaction: insert, attach app metadata, confirm.
 insert into auth.users(id,email,created_at,raw_app_meta_data,raw_user_meta_data)
 values(uid,'reg-'||rid::text||'@cuentas.dlpburgers.com','2001-01-01 03:00:00+00','{}','{}');
 update auth.users set raw_app_meta_data=jsonb_build_object('dlp_manual_registration',jsonb_build_object('request',rid,'phone',test_phone,'approved',true,'method','automatic')) where id=uid;
 update auth.users set email_confirmed_at=now() where id=uid;
 if not exists(select 1 from public.dlp_registration_requests where id=rid and user_id=uid and approved_at is not null) then raise exception 'New registration not enabled'; end if;
 insert into auth.users(id,email,created_at,raw_app_meta_data,raw_user_meta_data)
 values(pending_uid,'reg-'||pending_rid::text||'@cuentas.dlpburgers.com','2001-01-01 02:59:59+00',
  jsonb_build_object('dlp_manual_registration',jsonb_build_object('request',pending_rid,'phone',pending_phone,'approved',false)),'{}');
 update auth.users set email_confirmed_at=now(),raw_app_meta_data=jsonb_set(raw_app_meta_data,'{dlp_manual_registration}',
  (raw_app_meta_data->'dlp_manual_registration')||'{"approved":true,"method":"automatic"}'::jsonb) where id=pending_uid;
 if not exists(select 1 from public.dlp_registration_requests where id=pending_rid and approved_at is not null) then raise exception 'Pending registration not enabled'; end if;
 result:=public.dlp_created_accounts('2001-01-01',0);
 if (result->>'total')::integer<>total_before+1 then raise exception 'Incorrect local day boundaries: %',result->>'total'; end if;
 if not exists(select 1 from jsonb_array_elements(result->'accounts') a where a->>'id'=uid::text) then raise exception 'Missing new account'; end if;
 if exists(select 1 from jsonb_array_elements(result->'accounts') a where a->>'id'=pending_uid::text) then raise exception 'Previous local day leaked'; end if;
 if jsonb_array_length(public.dlp_created_accounts('2001-01-01',1)->'accounts')<>0 then raise exception 'Wrong pagination'; end if;
 begin perform public.dlp_created_accounts(null,0); raise exception 'Null date accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.dlp_created_accounts('2001-01-01',-1); raise exception 'Negative page accepted'; exception when invalid_parameter_value then null; end;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 begin perform public.dlp_created_accounts('2001-01-01',0); raise exception 'Customer accepted'; exception when insufficient_privilege then null; end;
 -- Customer metadata cannot mark a pending account as approved.
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 begin
  update auth.users set raw_app_meta_data=jsonb_set(raw_app_meta_data,'{dlp_manual_registration,phone}','"+5491100000003"') where id=uid;
  raise exception 'Mutable phone accepted';
 exception when raise_exception then if sqlerrm<>'Solicitud inmutable' then raise; end if; end;
 select id into counter_id from auth.users where lower(email)='mostrador@usuarios.dlpburgers.com';
 if counter_id is null then raise exception 'Missing counter fixture'; end if;
 perform set_config('request.jwt.claim.sub',counter_id::text,true);
 result:=public.dlp_created_accounts('2001-01-01',0);
 if (result->>'total')::integer<>total_before+1 then raise exception 'Counter cannot read correct accounts'; end if;
end $$;
