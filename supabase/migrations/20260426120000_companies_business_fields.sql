-- 거래명세서 등에 사용: 회사(공급자) 정식 정보
alter table public.companies
  add column if not exists business_number text,
  add column if not exists ceo_name text,
  add column if not exists phone text,
  add column if not exists address text;

comment on column public.companies.business_number is '사업자등록번호';
comment on column public.companies.ceo_name is '대표자명';
comment on column public.companies.phone is '전화번호';
comment on column public.companies.address is '주소';
