-- One-shot wipe of tenant business data for the current user's primary company.
-- Keeps companies row, company_users, and auth user; clears masters/transactions and optional company profile fields.

create or replace function public.reset_my_company_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select cu.company_id into cid
  from public.company_users cu
  where cu.user_id = auth.uid()
  order by cu.created_at asc
  limit 1;

  if cid is null then
    raise exception 'No company membership';
  end if;

  delete from public.customer_price_history where company_id = cid;
  delete from public.sales_daily where company_id = cid;
  delete from public.customer_prices where company_id = cid;
  delete from public.deposits where company_id = cid;
  delete from public.payments where company_id = cid;
  delete from public.monthly_settlements where company_id = cid;
  delete from public.inventory_transactions where company_id = cid;
  delete from public.delivery_drivers where company_id = cid;
  delete from public.customers where company_id = cid;
  delete from public.products where company_id = cid;
  delete from public.regions where company_id = cid;

  update public.companies
  set
    bank_accounts = '[]'::jsonb,
    business_number = null,
    ceo_name = null,
    phone = null,
    address = null
  where id = cid;
end;
$$;

revoke all on function public.reset_my_company_data() from public;
grant execute on function public.reset_my_company_data() to authenticated;

comment on function public.reset_my_company_data() is 'Deletes all operational data for the caller''s company and clears optional company profile fields; keeps company shell and memberships.';
