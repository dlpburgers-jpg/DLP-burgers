begin;
set local lock_timeout='3s';
do $$
declare category uuid:=gen_random_uuid(); eligible uuid:=gen_random_uuid(); excluded uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); method text; code text:='QA_'||upper(replace(gen_random_uuid()::text,'-','')); payload jsonb; q jsonb;
begin
 select id into strict method from public.v52_payment_methods where active and 'pickup'=any(channels) order by id limit 1;
 insert into public.categories(id,name) values(category,'QA coupon exclusion');
 insert into public.products(id,name,category_id,price,dlp_coupon_exempt) values(eligible,'QA eligible',category,5000,false),(excluded,'QA excluded',category,15000,true);
 insert into public.v52_coupons(id,code,kind,amount,minimum,payment_ids) values(c,left(code,32),'percent',10,0,array[method]);
 payload:=jsonb_build_object('coupon_code',left(code,32),'payment_method',method,'fulfillment_type','pickup','items',jsonb_build_array(jsonb_build_object('productId',eligible,'quantity',1),jsonb_build_object('productId',excluded,'quantity',1)));
 q:=public.v52_coupon_quote(payload);
 if (q->>'subtotal')::numeric<>20000 or (q->>'discount')::numeric<>500 then raise exception 'Mixed coupon calculation failed';end if;
 update public.v52_coupons set kind='fixed',amount=10000 where id=c;
 if (public.v52_coupon_quote(payload)->>'discount')::numeric<>5000 then raise exception 'Fixed coupon exceeds eligible products';end if;
 update public.products set dlp_coupon_exempt=true where id=eligible;
 if (public.v52_coupon_quote(payload)->>'discount')::numeric<>0 then raise exception 'All-excluded cart discounted';end if;
end $$;
rollback;
select 'PASS: mixed cart percent, fixed cap, all excluded; no fixtures persisted' as result;

