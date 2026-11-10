-- NOVA deudas: lo que la persona debe ("debo") y lo que le deben ("me_deben"), con abonos. Solo agrega; no borra nada.
create table if not exists public.fin_deudas (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('debo', 'me_deben')),
  persona text not null check (char_length(persona) between 1 and 60),
  concepto text check (concepto is null or char_length(concepto) <= 100),
  monto numeric not null check (monto > 0),
  fecha date not null default current_date,
  vence date,
  nota text check (nota is null or char_length(nota) <= 300),
  creado_en timestamptz not null default now()
);
create index if not exists fin_deudas_user_idx on public.fin_deudas (user_id, fecha);
alter table public.fin_deudas enable row level security;
create policy "propias deudas" on public.fin_deudas for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.fin_deudas from anon;
grant select, insert, update, delete on public.fin_deudas to authenticated;

create table if not exists public.fin_abonos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  deuda_id bigint not null references public.fin_deudas(id) on delete cascade,
  monto numeric not null check (monto > 0),
  fecha date not null default current_date,
  nota text check (nota is null or char_length(nota) <= 200),
  creado_en timestamptz not null default now()
);
create index if not exists fin_abonos_user_idx on public.fin_abonos (user_id, deuda_id);
alter table public.fin_abonos enable row level security;
create policy "propios abonos" on public.fin_abonos for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.fin_abonos from anon;
grant select, insert, update, delete on public.fin_abonos to authenticated;
