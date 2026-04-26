create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_number text,
  ceo_name text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_company_users_user_id on public.company_users(user_id);
create index if not exists idx_company_users_company_id on public.company_users(company_id);

create or replace function public.current_company_id()
returns uuid
language sql
stable
as $$
  select cu.company_id
  from public.company_users cu
  where cu.user_id = auth.uid()
  order by cu.created_at asc
  limit 1
$$;

alter table public.customers add column if not exists company_id uuid;
alter table public.products add column if not exists company_id uuid;
alter table public.customer_prices add column if not exists company_id uuid;
alter table public.sales_daily add column if not exists company_id uuid;
alter table public.delivery_drivers add column if not exists company_id uuid;
alter table public.regions add column if not exists company_id uuid;
alter table public.monthly_settlements add column if not exists company_id uuid;
alter table public.payments add column if not exists company_id uuid;
alter table public.inventory_transactions add column if not exists company_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_company_id_fkey') then
    alter table public.customers
      add constraint customers_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'products_company_id_fkey') then
    alter table public.products
      add constraint products_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'customer_prices_company_id_fkey') then
    alter table public.customer_prices
      add constraint customer_prices_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_daily_company_id_fkey') then
    alter table public.sales_daily
      add constraint sales_daily_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'delivery_drivers_company_id_fkey') then
    alter table public.delivery_drivers
      add constraint delivery_drivers_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'regions_company_id_fkey') then
    alter table public.regions
      add constraint regions_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'monthly_settlements_company_id_fkey') then
    alter table public.monthly_settlements
      add constraint monthly_settlements_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payments_company_id_fkey') then
    alter table public.payments
      add constraint payments_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inventory_transactions_company_id_fkey') then
    alter table public.inventory_transactions
      add constraint inventory_transactions_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;
end $$;

alter table public.customers alter column company_id set default public.current_company_id();
alter table public.products alter column company_id set default public.current_company_id();
alter table public.customer_prices alter column company_id set default public.current_company_id();
alter table public.sales_daily alter column company_id set default public.current_company_id();
alter table public.delivery_drivers alter column company_id set default public.current_company_id();
alter table public.regions alter column company_id set default public.current_company_id();
alter table public.monthly_settlements alter column company_id set default public.current_company_id();
alter table public.payments alter column company_id set default public.current_company_id();
alter table public.inventory_transactions alter column company_id set default public.current_company_id();

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.customer_prices enable row level security;
alter table public.sales_daily enable row level security;
alter table public.delivery_drivers enable row level security;
alter table public.regions enable row level security;
alter table public.monthly_settlements enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_transactions enable row level security;

drop policy if exists companies_select on public.companies;
create policy companies_select
on public.companies
for select
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
  )
);

drop policy if exists companies_insert on public.companies;
create policy companies_insert
on public.companies
for insert
with check (auth.uid() is not null);

drop policy if exists companies_update on public.companies;
create policy companies_update
on public.companies
for update
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
  )
);

drop policy if exists companies_delete on public.companies;
create policy companies_delete
on public.companies
for delete
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
  )
);

drop policy if exists company_users_select on public.company_users;
create policy company_users_select
on public.company_users
for select
using (user_id = auth.uid());

drop policy if exists company_users_insert on public.company_users;
create policy company_users_insert
on public.company_users
for insert
with check (user_id = auth.uid());

drop policy if exists company_users_update on public.company_users;
create policy company_users_update
on public.company_users
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists company_users_delete on public.company_users;
create policy company_users_delete
on public.company_users
for delete
using (user_id = auth.uid());

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
for select using (exists (select 1 from public.company_users cu where cu.company_id = customers.company_id and cu.user_id = auth.uid()));
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
for insert with check (exists (select 1 from public.company_users cu where cu.company_id = customers.company_id and cu.user_id = auth.uid()));
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
for update using (exists (select 1 from public.company_users cu where cu.company_id = customers.company_id and cu.user_id = auth.uid()))
with check (exists (select 1 from public.company_users cu where cu.company_id = customers.company_id and cu.user_id = auth.uid()));
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
for delete using (exists (select 1 from public.company_users cu where cu.company_id = customers.company_id and cu.user_id = auth.uid()));

drop policy if exists products_select on public.products;
create policy products_select on public.products
for select using (exists (select 1 from public.company_users cu where cu.company_id = products.company_id and cu.user_id = auth.uid()));
drop policy if exists products_insert on public.products;
create policy products_insert on public.products
for insert with check (exists (select 1 from public.company_users cu where cu.company_id = products.company_id and cu.user_id = auth.uid()));
drop policy if exists products_update on public.products;
create policy products_update on public.products
for update using (exists (select 1 from public.company_users cu where cu.company_id = products.company_id and cu.user_id = auth.uid()))
with check (exists (select 1 from public.company_users cu where cu.company_id = products.company_id and cu.user_id = auth.uid()));
drop policy if exists products_delete on public.products;
create policy products_delete on public.products
for delete using (exists (select 1 from public.company_users cu where cu.company_id = products.company_id and cu.user_id = auth.uid()));

drop policy if exists customer_prices_select on public.customer_prices;
create policy customer_prices_select on public.customer_prices
for select using (exists (select 1 from public.company_users cu where cu.company_id = customer_prices.company_id and cu.user_id = auth.uid()));
drop policy if exists customer_prices_insert on public.customer_prices;
create policy customer_prices_insert on public.customer_prices
for insert with check (exists (select 1 from public.company_users cu where cu.company_id = customer_prices.company_id and cu.user_id = auth.uid()));
drop policy if exists customer_prices_update on public.customer_prices;
create policy customer_prices_update on public.customer_prices
for update using (exists (select 1 from public.company_users cu where cu.company_id = customer_prices.company_id and cu.user_id = auth.uid()))
with check (exists (select 1 from public.company_users cu where cu.company_id = customer_prices.company_id and cu.user_id = auth.uid()));
drop policy if exists customer_prices_delete on public.customer_prices;
create policy customer_prices_delete on public.customer_prices
for delete using (exists (select 1 from public.company_users cu where cu.company_id = customer_prices.company_id and cu.user_id = auth.uid()));

drop policy if exists sales_daily_select on public.sales_daily;
create policy sales_daily_select on public.sales_daily
for select using (exists (select 1 from public.company_users cu where cu.company_id = sales_daily.company_id and cu.user_id = auth.uid()));
drop policy if exists sales_daily_insert on public.sales_daily;
create policy sales_daily_insert on public.sales_daily
for insert with check (exists (select 1 from public.company_users cu where cu.company_id = sales_daily.company_id and cu.user_id = auth.uid()));
drop policy if exists sales_daily_update on public.sales_daily;
create policy sales_daily_update on public.sales_daily
for update using (exists (select 1 from public.company_users cu where cu.company_id = sales_daily.company_id and cu.user_id = auth.uid()))
with check (exists (select 1 from public.company_users cu where cu.company_id = sales_daily.company_id and cu.user_id = auth.uid()));
drop policy if exists sales_daily_delete on public.sales_daily;
create policy sales_daily_delete on public.sales_daily
for delete using (exists (select 1 from public.company_users cu where cu.company_id = sales_daily.company_id and cu.user_id = auth.uid()));

drop policy if exists delivery_drivers_select on public.delivery_drivers;
create policy delivery_drivers_select on public.delivery_drivers
for select using (exists (select 1 from public.company_users cu where cu.company_id = delivery_drivers.company_id and cu.user_id = auth.uid()));
drop policy if exists delivery_drivers_insert on public.delivery_drivers;
create policy delivery_drivers_insert on public.delivery_drivers
for insert with check (exists (select 1 from public.company_users cu where cu.company_id = delivery_drivers.company_id and cu.user_id = auth.uid()));
drop policy if exists delivery_drivers_update on public.delivery_drivers;
create policy delivery_drivers_update on public.delivery_drivers
for update using (exists (select 1 from public.company_users cu where cu.company_id = delivery_drivers.company_id and cu.user_id = auth.uid()))
with check (exists (select 1 from public.company_users cu where cu.company_id = delivery_drivers.company_id and cu.user_id = auth.uid()));
drop policy if exists delivery_drivers_delete on public.delivery_drivers;
create policy delivery_drivers_delete on public.delivery_drivers
for delete using (exists (select 1 from public.company_users cu where cu.company_id = delivery_drivers.company_id and cu.user_id = auth.uid()));

drop policy if exists regions_select on public.regions;
create policy regions_select on public.regions
for select using (exists (select 1 from public.company_users cu where cu.company_id = regions.company_id and cu.user_id = auth.uid()));
drop policy if exists regions_insert on public.regions;
create policy regions_insert on public.regions
for insert with check (exists (select 1 from public.company_users cu where cu.company_id = regions.company_id and cu.user_id = auth.uid()));
drop policy if exists regions_update on public.regions;
create policy regions_update on public.regions
for update using (exists (select 1 from public.company_users cu where cu.company_id = regions.company_id and cu.user_id = auth.uid()))
with check (exists (select 1 from public.company_users cu where cu.company_id = regions.company_id and cu.user_id = auth.uid()));
drop policy if exists regions_delete on public.regions;
create policy regions_delete on public.regions
for delete using (exists (select 1 from public.company_users cu where cu.company_id = regions.company_id and cu.user_id = auth.uid()));

drop policy if exists monthly_settlements_select on public.monthly_settlements;
create policy monthly_settlements_select on public.monthly_settlements
for select using (exists (select 1 from public.company_users cu where cu.company_id = monthly_settlements.company_id and cu.user_id = auth.uid()));
drop policy if exists monthly_settlements_insert on public.monthly_settlements;
create policy monthly_settlements_insert on public.monthly_settlements
for insert with check (exists (select 1 from public.company_users cu where cu.company_id = monthly_settlements.company_id and cu.user_id = auth.uid()));
drop policy if exists monthly_settlements_update on public.monthly_settlements;
create policy monthly_settlements_update on public.monthly_settlements
for update using (exists (select 1 from public.company_users cu where cu.company_id = monthly_settlements.company_id and cu.user_id = auth.uid()))
with check (exists (select 1 from public.company_users cu where cu.company_id = monthly_settlements.company_id and cu.user_id = auth.uid()));
drop policy if exists monthly_settlements_delete on public.monthly_settlements;
create policy monthly_settlements_delete on public.monthly_settlements
for delete using (exists (select 1 from public.company_users cu where cu.company_id = monthly_settlements.company_id and cu.user_id = auth.uid()));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
for select using (exists (select 1 from public.company_users cu where cu.company_id = payments.company_id and cu.user_id = auth.uid()));
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments
for insert with check (exists (select 1 from public.company_users cu where cu.company_id = payments.company_id and cu.user_id = auth.uid()));
drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments
for update using (exists (select 1 from public.company_users cu where cu.company_id = payments.company_id and cu.user_id = auth.uid()))
with check (exists (select 1 from public.company_users cu where cu.company_id = payments.company_id and cu.user_id = auth.uid()));
drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments
for delete using (exists (select 1 from public.company_users cu where cu.company_id = payments.company_id and cu.user_id = auth.uid()));

drop policy if exists inventory_transactions_select on public.inventory_transactions;
create policy inventory_transactions_select on public.inventory_transactions
for select using (exists (select 1 from public.company_users cu where cu.company_id = inventory_transactions.company_id and cu.user_id = auth.uid()));
drop policy if exists inventory_transactions_insert on public.inventory_transactions;
create policy inventory_transactions_insert on public.inventory_transactions
for insert with check (exists (select 1 from public.company_users cu where cu.company_id = inventory_transactions.company_id and cu.user_id = auth.uid()));
drop policy if exists inventory_transactions_update on public.inventory_transactions;
create policy inventory_transactions_update on public.inventory_transactions
for update using (exists (select 1 from public.company_users cu where cu.company_id = inventory_transactions.company_id and cu.user_id = auth.uid()))
with check (exists (select 1 from public.company_users cu where cu.company_id = inventory_transactions.company_id and cu.user_id = auth.uid()));
drop policy if exists inventory_transactions_delete on public.inventory_transactions;
create policy inventory_transactions_delete on public.inventory_transactions
for delete using (exists (select 1 from public.company_users cu where cu.company_id = inventory_transactions.company_id and cu.user_id = auth.uid()));
