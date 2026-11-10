-- NOVA: funciones tipo Lukas. Solo agrega columnas y tablas; no borra nada.

-- Categorías con color y grupo (Comida y Bebida, Hogar y Servicios, …)
alter table public.fin_categorias
  add column if not exists color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists grupo text check (grupo is null or char_length(grupo) <= 40);

-- Movimientos programados (pagos e ingresos que se repiten solos)
create table if not exists public.fin_programados (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cuenta_id bigint not null references public.fin_cuentas(id) on delete cascade,
  categoria_id bigint references public.fin_categorias(id) on delete set null,
  tipo text not null check (tipo in ('gasto', 'ingreso')),
  monto numeric not null check (monto > 0),
  descripcion text not null check (char_length(descripcion) between 1 and 120),
  etiquetas text[] not null default '{}',
  frecuencia text not null check (frecuencia in ('diaria', 'semanal', 'quincenal', 'mensual', 'anual')),
  proxima date not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index if not exists fin_programados_user_idx on public.fin_programados (user_id);
alter table public.fin_programados enable row level security;
create policy "propios programados" on public.fin_programados for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and cuenta_id in (select id from public.fin_cuentas where user_id = (select auth.uid()))
    and (categoria_id is null or categoria_id in (select id from public.fin_categorias where user_id = (select auth.uid()))));

-- Movimientos: nota, estado (pagado o pendiente) y de qué programación salió
alter table public.fin_movimientos
  add column if not exists nota text check (nota is null or char_length(nota) <= 500),
  add column if not exists estado text not null default 'pagado' check (estado in ('pagado', 'pendiente')),
  add column if not exists programado_id bigint references public.fin_programados(id) on delete set null;

-- Límites de gasto (planes) por categoría o para todo
create table if not exists public.fin_limites (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  categoria_id bigint references public.fin_categorias(id) on delete cascade,
  monto numeric not null check (monto > 0),
  ciclo text not null default 'mensual' check (ciclo in ('semanal', 'quincenal', 'mensual', 'trimestral', 'semestral', 'anual')),
  recurrente boolean not null default true,
  creado_en timestamptz not null default now()
);
create index if not exists fin_limites_user_idx on public.fin_limites (user_id);
alter table public.fin_limites enable row level security;
create policy "propios limites" on public.fin_limites for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and (categoria_id is null or categoria_id in (select id from public.fin_categorias where user_id = (select auth.uid()))));

revoke all on public.fin_programados, public.fin_limites from anon;
grant select, insert, update, delete on public.fin_programados, public.fin_limites to authenticated;

-- Perfil: mostrar "Seguro para gastar" en el inicio
alter table public.fin_perfiles add column if not exists mostrar_seguro boolean not null default true;
grant insert (mostrar_seguro), update (mostrar_seguro) on public.fin_perfiles to authenticated;
