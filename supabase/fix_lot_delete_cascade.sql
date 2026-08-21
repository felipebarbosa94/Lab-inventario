-- Al borrar un ítem completo (Editar ítem → Borrar este ítem), Postgres
-- necesita borrar en cascada tanto sus movimientos (movements.item_id) como
-- sus lotes (item_lots.item_id). Pero movements.lot_id también apunta a
-- item_lots — con esa llave en modo RESTRICT (el valor por defecto), ese
-- borrado en cascada podía chocar consigo mismo y fallar.
--
-- La protección de "no dejar borrar un lote que ya tiene movimientos" se
-- movió a la app (revisa primero si hay movimientos antes de borrar un
-- lote suelto), así que aquí ya no hace falta que la base de datos la
-- imponga — se cambia a SET NULL para que borrar un ítem completo siempre
-- funcione limpio.
alter table movements drop constraint if exists movements_lot_id_fkey;
alter table movements add constraint movements_lot_id_fkey
  foreign key (lot_id) references item_lots(id) on delete set null;
