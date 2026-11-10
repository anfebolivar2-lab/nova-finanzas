-- NOVA: espacios (la plata separada por propósito: Principal, ahorro, viaje, negocio…). Solo agrega; no borra nada.
-- Lo que ya existe queda en Principal (espacio_id vacío). Cada espacio tiene su moneda y su propio presupuesto.
create table if not exists public.fin_espacios (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 40),
  icono text not null default 'ahorro' check (icono in ('ahorro', 'viaje', 'negocio', 'casa', 'estudio', 'salud', 'regalo', 'carro')),
  moneda text not null default 'COP' check (moneda ~ '^[A-Z]{3}$'),
  presupuesto_monto numeric check (presupuesto_monto is null or presupuesto_monto >= 0),
  presupuesto_ciclo text check (presupuesto_ciclo is null or char_length(presupuesto_ciclo) <= 20),
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  unique (id, user_id)
);
create index if not exists fin_espacios_user_idx on public.fin_espacios (user_id, orden, id);
alter table public.fin_espacios enable row level security;
drop policy if exists "propios espacios" on public.fin_espacios;
create policy "propios espacios" on public.fin_espacios for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.fin_espacios from anon;
grant select, insert, update, delete on public.fin_espacios to authenticated;

-- A qué espacio pertenece cada cosa. La llave usa también user_id: nadie puede poner algo suyo en el espacio de otra persona.
-- No se borra nada: la base de datos no deja borrar un espacio que todavía tenga algo adentro (on delete restrict).
alter table public.fin_movimientos
  add column if not exists espacio_id bigint,
  add column if not exists transferencia uuid;   -- une las dos mitades de una transferencia entre espacios
alter table public.fin_cuentas add column if not exists espacio_id bigint;
alter table public.fin_limites add column if not exists espacio_id bigint;
alter table public.fin_programados add column if not exists espacio_id bigint;
alter table public.fin_frecuentes add column if not exists espacio_id bigint;

do $$
declare t text;
begin
  foreach t in array array['fin_movimientos', 'fin_cuentas', 'fin_limites', 'fin_programados', 'fin_frecuentes'] loop
    if not exists (select 1 from pg_constraint where conname = t || '_espacio_fk') then
      execute format('alter table public.%I add constraint %I foreign key (espacio_id, user_id) references public.fin_espacios (id, user_id) on delete restrict', t, t || '_espacio_fk');
    end if;
    execute format('create index if not exists %I on public.%I (espacio_id)', t || '_espacio_idx', t);
  end loop;
end $$;
create index if not exists fin_movimientos_transferencia_idx on public.fin_movimientos (transferencia) where transferencia is not null;
