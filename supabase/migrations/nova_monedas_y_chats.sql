-- NOVA: monedas extranjeras y conversaciones con la IA. Solo agrega; no borra nada.
alter table public.fin_movimientos
  add column if not exists moneda text not null default 'COP' check (moneda ~ '^[A-Z]{3}$'),
  add column if not exists monto_original numeric check (monto_original is null or monto_original > 0),
  add column if not exists tasa numeric check (tasa is null or tasa > 0);

create table if not exists public.fin_conversaciones (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 80),
  mensajes jsonb not null default '[]'::jsonb check (jsonb_typeof(mensajes) = 'array' and pg_column_size(mensajes) < 200000),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists fin_conversaciones_user_idx on public.fin_conversaciones (user_id, actualizado_en desc);
alter table public.fin_conversaciones enable row level security;
create policy "propias conversaciones" on public.fin_conversaciones for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.fin_conversaciones from anon;
grant select, insert, update, delete on public.fin_conversaciones to authenticated;
