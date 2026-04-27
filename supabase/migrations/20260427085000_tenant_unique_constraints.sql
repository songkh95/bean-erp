-- Ensure code uniqueness is scoped per company (tenant)
-- so different companies can use the same code values safely.

-- products.code: global unique -> (company_id, code)
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'products_code_key'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      drop constraint products_code_key;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_company_id_code_key'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_company_id_code_key unique (company_id, code);
  end if;
end $$;

-- customers.code: global unique -> (company_id, code)
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'customers_code_key'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      drop constraint customers_code_key;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_company_id_code_key'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_company_id_code_key unique (company_id, code);
  end if;
end $$;

-- delivery_drivers.vehicle_number: global unique -> (company_id, vehicle_number)
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'delivery_drivers_vehicle_number_key'
      and conrelid = 'public.delivery_drivers'::regclass
  ) then
    alter table public.delivery_drivers
      drop constraint delivery_drivers_vehicle_number_key;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'delivery_drivers_company_id_vehicle_number_key'
      and conrelid = 'public.delivery_drivers'::regclass
  ) then
    alter table public.delivery_drivers
      add constraint delivery_drivers_company_id_vehicle_number_key unique (company_id, vehicle_number);
  end if;
end $$;

-- Optional hardening: ensure company_id is always present for tenant tables.
update public.products
set company_id = public.current_company_id()
where company_id is null;

update public.customers
set company_id = public.current_company_id()
where company_id is null;

update public.delivery_drivers
set company_id = public.current_company_id()
where company_id is null;
