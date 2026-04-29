-- Keep historical sales immutable even when product price/spec changes.

alter table public.sales_daily
  add column if not exists recorded_unit_price numeric,
  add column if not exists recorded_unit text;

-- Backfill snapshot columns for old rows.
update public.sales_daily s
set
  recorded_unit_price = coalesce(s.recorded_unit_price, s.unit_price),
  recorded_unit = coalesce(s.recorded_unit, p.specification)
from public.products p
where s.product_id = p.id
  and (s.recorded_unit_price is null or s.recorded_unit is null);

update public.sales_daily
set recorded_unit_price = unit_price
where recorded_unit_price is null;

-- Price history table (append-only style) for customer/product price changes.
create table if not exists public.customer_price_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric not null,
  is_active boolean not null default true,
  effective_from date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists customer_price_history_company_customer_idx
  on public.customer_price_history(company_id, customer_id, product_id, effective_from desc, created_at desc);

alter table public.customer_price_history enable row level security;

drop policy if exists customer_price_history_select on public.customer_price_history;
create policy customer_price_history_select
on public.customer_price_history
for select
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = customer_price_history.company_id
      and cu.user_id = auth.uid()
  )
);

drop policy if exists customer_price_history_insert on public.customer_price_history;
create policy customer_price_history_insert
on public.customer_price_history
for insert
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = customer_price_history.company_id
      and cu.user_id = auth.uid()
  )
);
