-- Optional contact fields for delivery drivers (Excel import / listing)
alter table public.delivery_drivers add column if not exists phone text;
alter table public.delivery_drivers add column if not exists note text;

comment on column public.delivery_drivers.phone is '연락처';
comment on column public.delivery_drivers.note is '비고';
