create table if not exists alert_log (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  sent_at timestamptz not null default now()
);

create index if not exists alert_log_item_id_idx on alert_log(item_id);
create index if not exists alert_log_sent_at_idx on alert_log(sent_at);

alter table alert_log enable row level security;

drop policy if exists "alert_log_all_open" on alert_log;
create policy "alert_log_all_open" on alert_log for all using (true) with check (true);
