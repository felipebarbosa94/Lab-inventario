-- Corre esto una sola vez si ya ejecutaste schema.sql antes y te tiró el error
-- de "policy already exists". Deja todo en el estado correcto sin duplicar nada.

drop policy if exists "items_all_open" on items;
drop policy if exists "movements_all_open" on movements;

create policy "items_all_open" on items for all using (true) with check (true);
create policy "movements_all_open" on movements for all using (true) with check (true);

-- Si estas dos líneas también tiran error de "already member of publication", ignoralas: ya estaba hecho.
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table movements;
