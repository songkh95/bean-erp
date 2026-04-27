create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  deposit_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  payment_method text not null default '통장',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_deposits_company_id on public.deposits(company_id);
create index if not exists idx_deposits_customer_id on public.deposits(customer_id);
create index if not exists idx_deposits_deposit_date on public.deposits(deposit_date desc);

alter table public.deposits enable row level security;

drop policy if exists deposits_select on public.deposits;
create policy deposits_select
on public.deposits
for select
using (public.can_access_company(company_id));

drop policy if exists deposits_insert on public.deposits;
create policy deposits_insert
on public.deposits
for insert
with check (public.can_access_company(company_id));

drop policy if exists deposits_update on public.deposits;
create policy deposits_update
on public.deposits
for update
using (public.can_access_company(company_id))
with check (public.can_access_company(company_id));

drop policy if exists deposits_delete on public.deposits;
create policy deposits_delete
on public.deposits
for delete
using (public.can_access_company(company_id));

create or replace view public.customer_balances as
with sales_summary as (
  select
    s.company_id,
    s.customer_id,
    coalesce(sum(s.total_amount), 0)::numeric(14, 2) as total_sales
  from public.sales_daily s
  group by s.company_id, s.customer_id
),
deposit_summary as (
  select
    d.company_id,
    d.customer_id,
    coalesce(sum(d.amount), 0)::numeric(14, 2) as total_deposits
  from public.deposits d
  group by d.company_id, d.customer_id
)
select
  c.company_id,
  c.id as customer_id,
  c.code as customer_code,
  c.name as customer_name,
  coalesce(s.total_sales, 0)::numeric(14, 2) as total_sales,
  coalesce(d.total_deposits, 0)::numeric(14, 2) as total_deposits,
  (coalesce(s.total_sales, 0) - coalesce(d.total_deposits, 0))::numeric(14, 2) as outstanding_amount
from public.customers c
left join sales_summary s
  on s.company_id = c.company_id
 and s.customer_id = c.id
left join deposit_summary d
  on d.company_id = c.company_id
 and d.customer_id = c.id;
