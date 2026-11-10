-- NOVA modo conductor (Didi, Uber, inDrive…): viajes, vencimientos del vehículo y meta diaria. Solo agrega; no borra nada.
alter table public.fin_movimientos
  add column if not exists viajes integer check (viajes is null or viajes between 0 and 1000);

alter table public.fin_perfiles
  add column if not exists modo_conductor boolean not null default false,
  add column if not exists vehiculo text check (vehiculo is null or char_length(vehiculo) <= 60),
  add column if not exists meta_diaria numeric check (meta_diaria is null or meta_diaria > 0);
grant insert (modo_conductor, vehiculo, meta_diaria), update (modo_conductor, vehiculo, meta_diaria) on public.fin_perfiles to authenticated;

create table if not exists public.fin_documentos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('soat', 'tecnomecanica', 'impuesto', 'licencia', 'seguro', 'aceite', 'revision', 'otro')),
  nombre text not null check (char_length(nombre) between 1 and 60),
  vence date not null,
  costo numeric check (costo is null or costo > 0),
  aviso_dias integer not null default 30 check (aviso_dias between 0 and 365),
  repetir_meses integer not null default 12 check (repetir_meses between 1 and 120),
  creado_en timestamptz not null default now()
);
create index if not exists fin_documentos_user_idx on public.fin_documentos (user_id, vence);
alter table public.fin_documentos enable row level security;
create policy "propios documentos" on public.fin_documentos for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.fin_documentos from anon;
grant select, insert, update, delete on public.fin_documentos to authenticated;
