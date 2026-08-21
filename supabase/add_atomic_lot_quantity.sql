-- Ajusta la cantidad de un lote de forma atómica en la base de datos, en
-- vez de leer el valor en el navegador y escribir "viejo - descuento".
-- Con varias personas usando la app al mismo tiempo, dos "Quitar" casi
-- simultáneos del mismo lote podían pisarse entre sí (el segundo guardaba
-- sobre un valor que ya estaba desactualizado) y el lote quedaba con más
-- cantidad de la real, aunque el total del ítem sí quedaba correcto por el
-- trigger de movimientos. Esta función hace el resta/suma directamente en
-- Postgres, que sí procesa cada llamada de una en una.

create or replace function adjust_lot_quantity(p_lot_id uuid, p_delta numeric)
returns void as $$
begin
  update item_lots
  set quantity = greatest(quantity + p_delta, 0)
  where id = p_lot_id;
end;
$$ language plpgsql;
