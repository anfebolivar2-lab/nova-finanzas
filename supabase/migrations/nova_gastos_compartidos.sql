-- NOVA gastos compartidos: grupos con nombres de personas y sus gastos/pagos. Solo agrega; no borra nada.
create table if not exists public.fin_grupos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 60),
  miembros jsonb not null default '["Yo"]'::jsonb,
  creado_en timestamptz not null default now()
);
create index if not exists fin_grupos_user_idx on public.fin_grupos (user_id);
alter table public.fin_grupos enable row level security;
create policy "propios grupos" on public.fin_grupos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.fin_grupos from anon;
grant select, insert, update, delete on public.fin_grupos to authenticated;

create table if not exists public.fin_gastos_grupo (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  grupo_id bigint not null references public.fin_grupos(id) on delete cascade,
  tipo text not null default 'gasto' check (tipo in ('gasto', 'pago')),
  descripcion text not null check (char_length(descripcion) between 1 and 100),
  monto numeric not null check (monto > 0),
  pagador text not null check (char_length(pagador) between 1 and 60),
  repartido jsonb not null default '[]'::jsonb,
  fecha date not null default current_date,
  creado_en timestamptz not null default now()
);
create index if not exists fin_gastos_grupo_user_idx on public.fin_gastos_grupo (user_id, grupo_id);
alter table public.fin_gastos_grupo enable row level security;
create policy "propios gastos de grupo" on public.fin_gastos_grupo for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.fin_gastos_grupo from anon;
grant select, insert, update, delete on public.fin_gastos_grupo to authenticated;
