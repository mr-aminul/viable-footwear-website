-- Admin analytics aggregates in Postgres (avoid shipping thousands of rows to Node).

create or replace function public.admin_sales_analytics(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.role() is distinct from 'service_role' and not public.is_staff() then
    raise exception 'not authorized';
  end if;

  with bounded as (
    select
      id,
      status,
      payment_method,
      total::numeric as total,
      created_at
    from public.orders
    where created_at >= p_from
      and created_at < p_to
  ),
  gmv as (
    select *
    from bounded
    where status in (
      'paid',
      'awaiting_fulfillment',
      'packed',
      'shipped',
      'delivered',
      'returned'
    )
  ),
  kpis as (
    select jsonb_build_object(
      'orderCount', count(*)::int,
      'gmv', coalesce(sum(total), 0),
      'aov', case
        when count(*) > 0 then coalesce(sum(total), 0) / count(*)
        else 0
      end,
      'paidCount', count(*) filter (where payment_method <> 'cod')::int,
      'codCount', count(*) filter (where payment_method = 'cod')::int,
      'paidGmv', coalesce(sum(total) filter (where payment_method <> 'cod'), 0),
      'codGmv', coalesce(sum(total) filter (where payment_method = 'cod'), 0)
    ) as payload
    from gmv
  ),
  day_series as (
    select d::date as day
    from generate_series(
      (p_from at time zone 'utc')::date,
      ((p_to at time zone 'utc')::date - 1),
      interval '1 day'
    ) as d
  ),
  series as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', to_char(day, 'YYYY-MM-DD'),
          'orders', orders,
          'gmv', gmv
        )
        order by day
      ),
      '[]'::jsonb
    ) as payload
    from (
      select
        ds.day,
        count(g.id)::int as orders,
        coalesce(sum(g.total), 0) as gmv
      from day_series ds
      left join gmv g on (g.created_at at time zone 'utc')::date = ds.day
      group by ds.day
    ) s
  ),
  payment_mix as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'method', payment_method,
          'count', cnt,
          'gmv', gmv_sum
        )
        order by gmv_sum desc
      ),
      '[]'::jsonb
    ) as payload
    from (
      select
        payment_method,
        count(*)::int as cnt,
        coalesce(sum(total), 0) as gmv_sum
      from gmv
      group by payment_method
    ) m
  ),
  status_funnel as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'status', status,
          'count', cnt
        )
        order by cnt desc
      ),
      '[]'::jsonb
    ) as payload
    from (
      select status, count(*)::int as cnt
      from bounded
      group by status
    ) s
  ),
  top_products as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'productName', product_name,
          'quantity', quantity,
          'revenue', revenue
        )
        order by revenue desc
      ),
      '[]'::jsonb
    ) as payload
    from (
      select
        oi.product_name,
        sum(oi.quantity)::int as quantity,
        coalesce(sum(oi.unit_price::numeric * oi.quantity), 0) as revenue
      from public.order_items oi
      inner join gmv g on g.id = oi.order_id
      group by oi.product_name
      order by revenue desc
      limit 8
    ) p
  )
  select jsonb_build_object(
    'kpis', (select payload from kpis),
    'series', (select payload from series),
    'paymentMix', (select payload from payment_mix),
    'statusFunnel', (select payload from status_funnel),
    'topProducts', (select payload from top_products)
  )
  into result;

  return result;
end;
$$;

comment on function public.admin_sales_analytics(timestamptz, timestamptz) is
  'Staff-only sales KPIs, daily series, payment mix, status funnel, and top products.';

create or replace function public.admin_logistics_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.role() is distinct from 'service_role' and not public.is_staff() then
    raise exception 'not authorized';
  end if;

  with recent as (
    select
      id,
      order_number,
      status,
      payment_method,
      full_name,
      phone,
      city_name,
      total::numeric as total,
      pathao_consignment_id,
      pathao_status,
      pathao_error,
      pathao_cancelled_at,
      created_at,
      case
        when status = 'cancelled'
          and pathao_consignment_id is not null
          and pathao_cancelled_at is null
          then 'stranded'
        when pathao_consignment_id is null
          and status not in ('cancelled', 'pending_payment')
          then 'needs_shipping'
        when pathao_consignment_id is null then null
        when status = 'delivered' then 'delivered'
        when status = 'returned' then 'returned'
        when status = 'cancelled' then 'failed'
        when pathao_status ilike '%deliver%' then 'delivered'
        when pathao_status ilike '%return%' then 'returned'
        when pathao_status ilike '%cancel%' then 'failed'
        when pathao_status ilike '%fail%' or pathao_status ilike '%hold%' then 'failed'
        when pathao_status ilike '%transit%'
          or pathao_status ilike '%picked%'
          or pathao_status ilike '%on_the_way%'
          or pathao_status ilike '%on the way%'
          or pathao_status ilike '%assigned%'
          then 'in_transit'
        when pathao_status ilike '%pending%'
          or pathao_status ilike '%pickup%'
          or coalesce(nullif(trim(pathao_status), ''), '') = ''
          then 'awaiting_pickup'
        when status in ('shipped', 'packed') then 'in_transit'
        else 'awaiting_pickup'
      end as bucket,
      case
        when pathao_consignment_id is null then null
        when coalesce(nullif(trim(pathao_status), ''), '') = '' then 'Submitted'
        when lower(trim(pathao_status)) = 'pending' then 'Awaiting pickup'
        else trim(pathao_status)
      end as pathao_label
    from public.orders
    where status <> 'pending_payment'
    order by created_at desc
    limit 2000
  ),
  bucket_counts as (
    select coalesce(
      jsonb_object_agg(bucket, cnt),
      '{}'::jsonb
    ) as payload
    from (
      select bucket, count(*)::int as cnt
      from recent
      where bucket is not null
      group by bucket
    ) b
  ),
  pathao_breakdown as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('label', pathao_label, 'count', cnt)
        order by cnt desc
      ),
      '[]'::jsonb
    ) as payload
    from (
      select pathao_label, count(*)::int as cnt
      from recent
      where pathao_consignment_id is not null
        and pathao_label is not null
      group by pathao_label
    ) p
  ),
  cod as (
    select jsonb_build_object(
      'outstandingCount', count(*) filter (
        where payment_method = 'cod'
          and status not in ('cancelled', 'returned', 'delivered')
      )::int,
      'outstandingAmount', coalesce(sum(total) filter (
        where payment_method = 'cod'
          and status not in ('cancelled', 'returned', 'delivered')
      ), 0),
      'collectedCount', count(*) filter (
        where payment_method = 'cod' and status = 'delivered'
      )::int,
      'collectedAmount', coalesce(sum(total) filter (
        where payment_method = 'cod' and status = 'delivered'
      ), 0)
    ) as payload
    from recent
  ),
  needs_shipping as (
    select coalesce(
      jsonb_agg(row_payload order by created_at desc),
      '[]'::jsonb
    ) as payload
    from (
      select
        jsonb_build_object(
          'id', id,
          'orderNumber', order_number,
          'fullName', full_name,
          'phone', phone,
          'cityName', city_name,
          'paymentMethod', payment_method,
          'total', total,
          'status', status,
          'createdAt', created_at,
          'pathaoError', pathao_error
        ) as row_payload,
        created_at
      from recent
      where bucket = 'needs_shipping'
      order by created_at desc
      limit 50
    ) n
  ),
  active_shipments as (
    select coalesce(
      jsonb_agg(row_payload order by created_at desc),
      '[]'::jsonb
    ) as payload
    from (
      select
        jsonb_build_object(
          'id', id,
          'orderNumber', order_number,
          'fullName', full_name,
          'phone', phone,
          'cityName', city_name,
          'paymentMethod', payment_method,
          'total', total,
          'status', status,
          'pathaoStatus', pathao_status,
          'pathaoStatusLabel', pathao_label,
          'pathaoConsignmentId', pathao_consignment_id,
          'createdAt', created_at
        ) as row_payload,
        created_at
      from recent
      where pathao_consignment_id is not null
        and status not in ('delivered', 'returned', 'cancelled')
      order by created_at desc
      limit 40
    ) a
  )
  select jsonb_build_object(
    'bucketCounts', (select payload from bucket_counts),
    'pathaoBreakdown', (select payload from pathao_breakdown),
    'cod', (select payload from cod),
    'needsShipping', (select payload from needs_shipping),
    'activeShipments', (select payload from active_shipments)
  )
  into result;

  return result;
end;
$$;

comment on function public.admin_logistics_analytics() is
  'Staff-only live logistics buckets, COD snapshot, and fulfillment queues.';

revoke all on function public.admin_sales_analytics(timestamptz, timestamptz) from public;
revoke all on function public.admin_logistics_analytics() from public;
grant execute on function public.admin_sales_analytics(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_logistics_analytics() to authenticated;
grant execute on function public.admin_sales_analytics(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_logistics_analytics() to service_role;
