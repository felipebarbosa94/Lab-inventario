-- Recetas maestras por proyecto/producto, y sus ingredientes/insumos por lote.
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,                  -- "Proteína Fresa 1kg"
  project text,                        -- "Rafas", "Daniela", etc.
  batch_label text not null default 'unidad', -- qué es "1 lote" (ej. "1 kg", "1 frasco")
  steps text,                          -- instrucciones de producción, texto libre
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  quantity_per_batch numeric not null check (quantity_per_batch > 0)
);

create index if not exists recipe_items_recipe_id_idx on recipe_items(recipe_id);

alter table recipes enable row level security;
alter table recipe_items enable row level security;

drop policy if exists "recipes_all_open" on recipes;
create policy "recipes_all_open" on recipes for all using (true) with check (true);
drop policy if exists "recipe_items_all_open" on recipe_items;
create policy "recipe_items_all_open" on recipe_items for all using (true) with check (true);

alter publication supabase_realtime add table recipes;
alter publication supabase_realtime add table recipe_items;
