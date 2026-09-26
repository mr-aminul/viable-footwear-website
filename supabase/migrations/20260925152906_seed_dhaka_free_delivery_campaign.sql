-- Match storefront header claim: free delivery in Dhaka on orders over ৳3,000.
-- Pathao city_id 1 = Dhaka (api-hermes).

insert into public.campaigns (name, priority, active, rules)
select
  'Free delivery in Dhaka over ৳3,000',
  100,
  true,
  jsonb_build_object(
    'type', 'free_shipping_min_subtotal',
    'min_subtotal', 3000,
    'city_ids_allow', jsonb_build_array(1)
  )
where not exists (
  select 1
  from public.campaigns
  where name = 'Free delivery in Dhaka over ৳3,000'
);
