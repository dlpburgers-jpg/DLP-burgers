begin;
set local lock_timeout='5s';
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{"role":"anon"}',true);
do $$
declare req uuid:=gen_random_uuid(); token uuid:=gen_random_uuid(); payload jsonb; result jsonb; again jsonb; line jsonb; at text; blocked boolean;
begin
 select jsonb_build_object('productId',p.id,'quantity',1) into line from public.products p join public.categories c on c.id=p.category_id and c.active where p.active and not p.dlp_staff_only and jsonb_array_length(p.v51_variants)=0 and p.v51_channels->>'pickup' is distinct from 'false' and not exists(select 1 from public.v51_product_groups l join public.v51_groups g on g.id=l.group_id where l.product_id=p.id and g.active and (g.required or g.min_choices>0)) limit 1;
 at:=public.v57_available('pickup',now())#>>'{slots,0,at}';
 if at is null then raise exception 'No hay horario para ejecutar esta prueba';end if;
 payload:=jsonb_build_object('customer_name','Prueba transaccional DLP','customer_phone','0000000000','fulfillment_type','pickup','payment_method','cash','scheduled_at',at,'items',jsonb_build_array(line),'expected_total',public.v52_subtotal(jsonb_build_array(line),'pickup'));
 result:=public.dlp_guest_checkout(req,token,payload);
 again:=public.dlp_guest_checkout(req,token,payload);
 if result<>again then raise exception 'Reintento distinto';end if;
 if (select count(*) from public.orders where request_id=req)<>1 then raise exception 'Pedido duplicado';end if;
 if exists(select 1 from public.orders where id=(result->>'id')::uuid and (user_id is not null or earn_points<>0)) then raise exception 'Invitado obtuvo puntos';end if;
 if jsonb_array_length(result#>'{guest_order,items}')<>1 or result->>'tracking_token' is null then raise exception 'Falta resumen o seguimiento';end if;
 blocked:=false;begin perform public.dlp_guest_checkout(req,gen_random_uuid(),payload);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Token incorrecto aceptado';end if;
 blocked:=false;begin perform public.dlp_guest_checkout(req,token,payload||'{"notes":"otro"}'::jsonb);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Cambio de payload aceptado';end if;
 blocked:=false;begin perform public.dlp_guest_checkout(gen_random_uuid(),token,payload||'{"redeem_points":1}'::jsonb);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Canje permitido';end if;
 blocked:=false;begin perform public.dlp_guest_checkout(gen_random_uuid(),token,payload||'{"expected_total":1}'::jsonb);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Precio manipulado aceptado';end if;
 if not has_function_privilege('anon','public.dlp_guest_checkout(uuid,uuid,jsonb)','execute') or has_function_privilege('authenticated','public.dlp_guest_checkout(uuid,uuid,jsonb)','execute') then raise exception 'Permisos incorrectos';end if;
 if has_table_privilege('anon','dlp_guest_private.requests','select') then raise exception 'Acceso a recibos privados';end if;
end $$;
rollback;

