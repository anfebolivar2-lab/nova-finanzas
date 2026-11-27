-- Respaldos de la base de NOVA hechos desde el panel del dueño (solo agrega; no cambia nada existente).
-- Los archivos quedan en un espacio PRIVADO de Storage ("respaldos") y nunca se envían al navegador:
-- el panel solo muestra la fecha, el tamaño y cuántas filas tiene cada tabla.
-- Solo la función nova-dueno (service_role) puede leer o escribir aquí.
create table if not exists public.fin_respaldos (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  creado_por uuid,
  ruta text not null,
  bytes bigint not null default 0,
  filas jsonb not null default '{}'::jsonb
);
alter table public.fin_respaldos enable row level security;
revoke all on public.fin_respaldos from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('respaldos', 'respaldos', false, 52428800, array['application/json'])
on conflict (id) do nothing;
