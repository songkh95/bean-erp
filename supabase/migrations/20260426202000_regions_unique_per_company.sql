-- 멀티테넌시: regions.code 전역 유니크 -> 회사 단위 유니크로 전환
-- 기존 에러: duplicate key value violates unique constraint "regions_code_key"

do $$
begin
  -- 기존 전역 유니크 제약 제거
  if exists (
    select 1
    from pg_constraint
    where conname = 'regions_code_key'
      and conrelid = 'public.regions'::regclass
  ) then
    alter table public.regions drop constraint regions_code_key;
  end if;

  -- 회사별 코드 유니크 보장 (company_id + code)
  if not exists (
    select 1
    from pg_constraint
    where conname = 'regions_company_id_code_key'
      and conrelid = 'public.regions'::regclass
  ) then
    alter table public.regions
      add constraint regions_company_id_code_key unique (company_id, code);
  end if;
end $$;
