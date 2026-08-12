alter table movements add column if not exists lote text;
alter table movements add column if not exists caducidad date;
alter table movements add column if not exists proveedor text;

alter table alert_log add column if not exists alert_type text not null default 'low_stock';
