alter table public.fin_movimientos add column if not exists foto_ruta text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recibos', 'recibos', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "recibos_ver_propios" on storage.objects for select to authenticated
  using (bucket_id = 'recibos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recibos_subir_propios" on storage.objects for insert to authenticated
  with check (bucket_id = 'recibos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recibos_borrar_propios" on storage.objects for delete to authenticated
  using (bucket_id = 'recibos' and (storage.foldername(name))[1] = auth.uid()::text);
