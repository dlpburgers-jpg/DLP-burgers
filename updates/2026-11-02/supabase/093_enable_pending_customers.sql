-- Explicitly authorized by the owner; only matching pending customer registrations.
do $$
declare changed integer;
begin
 update auth.users u set email_confirmed_at=coalesce(u.email_confirmed_at,clock_timestamp()),
  updated_at=clock_timestamp(),raw_app_meta_data=jsonb_set(u.raw_app_meta_data,'{dlp_manual_registration}',
   (u.raw_app_meta_data->'dlp_manual_registration')||'{"approved":true,"method":"automatic"}'::jsonb)
 from public.dlp_registration_requests r,public.profiles p
 where r.user_id=u.id and p.id=u.id and p.role='customer' and r.approved_at is null
  and u.deleted_at is null and not u.is_anonymous
  and u.email='reg-'||r.id::text||'@cuentas.dlpburgers.com'
  and u.raw_app_meta_data->'dlp_manual_registration'->>'request'=r.id::text
  and u.raw_app_meta_data->'dlp_manual_registration'->>'phone'=r.phone;
 get diagnostics changed=row_count;
 raise notice 'Pending customer accounts enabled: %',changed;
end $$;
