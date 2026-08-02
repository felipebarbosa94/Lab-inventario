-- Datos de ejemplo, basados en lo que describiste. Ajustá cantidades reales antes de correr esto.
-- Opcional: correr después de schema.sql para arrancar con algo cargado.

insert into items (name, category, project, flavor, unit, quantity, low_stock_threshold) values
  ('Frasco capsulero blanco opaco', 'envase', null, null, 'unidad', 360, 50),
  ('Frasco capsulero ámbar', 'envase', null, null, 'unidad', 0, 50),
  ('Tapa de seguridad negra', 'tapa', null, null, 'unidad', 0, 50),
  ('Envase 1 kg', 'envase', null, null, 'unidad', 0, 20),
  ('Scoop', 'scoop', 'Rafas', null, 'unidad', 0, 30),
  ('Etiquetas proteína', 'etiqueta', 'Daniela', 'chocolate', 'unidad', 0, 100),
  ('Etiquetas proteína', 'etiqueta', 'Daniela', 'vainilla', 'unidad', 0, 100),
  ('Bolsa proteína', 'bolsa_proteina', 'Rafas', 'chocolate', 'unidad', 0, 20),
  ('Bolsa proteína', 'bolsa_proteina', 'Rafas', 'vainilla', 'unidad', 0, 20);
