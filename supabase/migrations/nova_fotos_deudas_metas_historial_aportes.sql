-- NOVA: foto en deudas y metas, meta compartida de grupo con aportes, e historial de cambios. Solo agrega; no borra nada.
alter table public.fin_deudas add column if not exists foto_ruta text;
alter table public.fin_metas add column if not exists foto_ruta text;
alter table public.fin_grupos add column if not exists meta_nombre text check (meta_nombre is null or char_length(meta_nombre) <= 60);
alter table public.fin_grupos add column if not exists meta_objetivo numeric check (meta_objetivo is null or meta_objetivo > 0);

create table if not exists public.fin_aportes_grupo (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  grupo_id bigint not null references public.fin_grupos(id) on delete cascade,
  persona text not null check (char_length(persona) between 1 and 60),
  monto numeric not null check (monto > 0),
  fecha date not null default current_date,
  creado_en timestamptz not null default now()
);
create index if not exists fin_aportes_grupo_user_idx on public.fin_aportes_grupo (user_id, grupo_id);
alter table public.fin_aportes_grupo enable row level security;
create policy "propios aportes de grupo" on public.fin_aportes_grupo for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.fin_aportes_grupo from anon;
grant select, insert, update, delete on public.fin_aportes_grupo to authenticated;

create table if not exists public.fin_historial (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  tabla text not null,
  registro_id bigint,
  accion text not null check (accion in ('crear', 'editar', 'borrar')),
  antes jsonb,
  despues jsonb,
  creado_en timestamptz not null default now()
);
create index if not exists fin_historial_user_idx on public.fin_historial (user_id, creado_en desc);
alter table public.fin_historial enable row level security;
create policy "ver propio historial" on public.fin_historial for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.fin_historial from anon;
grant select on public.fin_historial to authenticated;

create or replace function public.fin_registrar_historial() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (TG_OP = 'DELETE') then
    insert into public.fin_historial (user_id, tabla, registro_id, accion, antes) values (OLD.user_id, TG_TABLE_NAME, OLD.id, 'borrar', to_jsonb(OLD));
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    if to_jsonb(OLD) = to_jsonb(NEW) then return NEW; end if;
    insert into public.fin_historial (user_id, tabla, registro_id, accion, antes, despues) values (NEW.user_id, TG_TABLE_NAME, NEW.id, 'editar', to_jsonb(OLD), to_jsonb(NEW));
    return NEW;
  else
    insert into public.fin_historial (user_id, tabla, registro_id, accion, despues) values (NEW.user_id, TG_TABLE_NAME, NEW.id, 'crear', to_jsonb(NEW));
    return NEW;
  end if;
end $$;
revoke all on function public.fin_registrar_historial() from public, anon, authenticated;

create trigger fin_hist_movimientos after insert or update or delete on public.fin_movimientos for each row execute function public.fin_registrar_historial();
create trigger fin_hist_metas after insert or update or delete on public.fin_metas for each row execute function public.fin_registrar_historial();
create trigger fin_hist_deudas after insert or update or delete on public.fin_deudas for each row execute function public.fin_registrar_historial();
create trigger fin_hist_abonos after insert or update or delete on public.fin_abonos for each row execute function public.fin_registrar_historial();
create trigger fin_hist_limites after insert or update or delete on public.fin_limites for each row execute function public.fin_registrar_historial();
create trigger fin_hist_cuentas after insert or update or delete on public.fin_cuentas for each row execute function public.fin_registrar_historial();
