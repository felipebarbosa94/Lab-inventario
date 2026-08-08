-- Tablas financieras: costos, precios de venta y gastos fijos.
-- A PROPÓSITO no llevan policy de RLS abierta — quedan con RLS activado y
-- CERO políticas, así que la anon key (la que usa el resto de la app) no
-- puede leerlas ni escribirlas para nada. Solo se acceden desde el servidor
-- con la service role key, nunca desde el navegador.

create table if not exists item_costs (
  item_id uuid primary key references items(id) on delete cascade,
  unit_cost numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists recipe_pricing (
  recipe_id uuid primary key references recipes(id) on delete cascade,
  selling_price numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null check (amount >= 0),
  frequency text not null default 'mensual',
  created_at timestamptz not null default now()
);

alter table item_costs enable row level security;
alter table recipe_pricing enable row level security;
alter table expenses enable row level security;

-- Sin "create policy" — RLS activo + cero políticas = nadie con la anon key
-- puede tocar estas tablas, ni para leer ni para escribir.
