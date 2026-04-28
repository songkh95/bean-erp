-- 거래명세서/내설정 확장 필드
alter table public.companies
  add column if not exists bank_accounts jsonb not null default '[]'::jsonb;

comment on column public.companies.bank_accounts is '입금 계좌 목록(JSON 배열): [{bank_name, account_number, account_holder}]';

alter table public.customers
  add column if not exists business_number text,
  add column if not exists note text;

comment on column public.customers.business_number is '사업자등록번호';
comment on column public.customers.note is '비고';
