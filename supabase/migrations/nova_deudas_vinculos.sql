-- NOVA deudas: cada deuda y cada abono recuerdan el movimiento que se anotó con ellos (para corregirlo o borrarlo junto)
-- y la cuenta que se usó. Solo agrega columnas; no borra ni cambia nada de lo que ya existe.
alter table public.fin_deudas add column if not exists movimiento_id bigint;
alter table public.fin_deudas add column if not exists cuenta_id bigint;
alter table public.fin_abonos add column if not exists movimiento_id bigint;
