"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Item, ItemLot } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import { sortLotsFefo, syncItemHeadlineLot } from "@/lib/lots";
import { sanitizeDecimalInput } from "@/lib/parseDecimal";
import { formatQuantity } from "@/lib/formatQuantity";

export default function ItemLotsModal({
  item,
  workerName,
  onClose,
}: {
  item: Item;
  workerName: string;
  onClose: () => void;
}) {
  const [lots, setLots] = useState<ItemLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLote, setEditLote] = useState("");
  const [editCaducidad, setEditCaducidad] = useState("");
  const [editProveedor, setEditProveedor] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function reload() {
    const { data } = await supabase.from("item_lots").select("*").eq("item_id", item.id);
    setLots(sortLotsFefo((data as ItemLot[]) ?? []));
  }

  useEffect(() => {
    supabase
      .from("item_lots")
      .select("*")
      .eq("item_id", item.id)
      .then(({ data }) => {
        setLots(sortLotsFefo((data as ItemLot[]) ?? []));
        setLoading(false);
      });
  }, [item.id]);

  const active = lots.filter((l) => l.quantity > 0);
  const exhausted = lots.filter((l) => l.quantity <= 0);
  const total = active.reduce((sum, l) => sum + l.quantity, 0);

  function startEdit(lot: ItemLot) {
    setEditingId(lot.id);
    setEditLote(lot.lote ?? "");
    setEditCaducidad(lot.caducidad ?? "");
    setEditProveedor(lot.proveedor ?? "");
    setEditQuantity(String(lot.quantity));
    setRowError(null);
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setRowError(null);
  }

  async function saveEdit(lot: ItemLot) {
    setSaving(true);
    setRowError(null);
    const newQuantity = Number(editQuantity) || 0;
    const loteTrimmed = editLote.trim() || null;
    const { error } = await supabase
      .from("item_lots")
      .update({
        lote: loteTrimmed,
        caducidad: editCaducidad || null,
        proveedor: editProveedor.trim() || null,
        quantity: newQuantity,
      })
      .eq("id", lot.id);
    if (error) {
      setSaving(false);
      setRowError(error.message);
      return;
    }

    // Si la cantidad del lote cambió, se deja un ajuste en el historial con
    // el nuevo total real del ítem — así items.quantity nunca se
    // desincroniza de la suma de sus lotes.
    if (newQuantity !== lot.quantity) {
      const { data: allLots } = await supabase
        .from("item_lots")
        .select("quantity")
        .eq("item_id", item.id);
      const newTotal = (allLots ?? []).reduce((sum, l) => sum + l.quantity, 0);
      await supabase.from("movements").insert({
        item_id: item.id,
        user_name: workerName,
        type: "ajuste",
        quantity: newTotal,
        note: `Corrección de lote${loteTrimmed ? ` ${loteTrimmed}` : ""}`,
        lot_id: lot.id,
        lote: loteTrimmed,
        caducidad: editCaducidad || null,
        proveedor: editProveedor.trim() || null,
      });
    }

    await syncItemHeadlineLot(supabase, item.id);
    await reload();
    setSaving(false);
    setEditingId(null);
  }

  async function deleteLot(lot: ItemLot) {
    setSaving(true);
    setRowError(null);

    // Se verifica explícitamente si el lote ya tiene movimientos antes de
    // dejar borrarlo — así el historial nunca se queda sin poder explicar
    // de dónde salió o entró algo.
    const { count } = await supabase
      .from("movements")
      .select("id", { count: "exact", head: true })
      .eq("lot_id", lot.id);
    if (count && count > 0) {
      setSaving(false);
      setConfirmDeleteId(null);
      setRowError(
        "No se puede borrar — este lote ya tiene movimientos registrados en el historial. Puedes editarlo o dejarlo en 0."
      );
      return;
    }

    const { error } = await supabase.from("item_lots").delete().eq("id", lot.id);
    if (error) {
      setSaving(false);
      setConfirmDeleteId(null);
      setRowError(error.message);
      return;
    }

    // Si el lote borrado todavía tenía cantidad, se ajusta el total del
    // ítem para que refleje lo que en verdad queda.
    if (lot.quantity > 0) {
      const { data: allLots } = await supabase
        .from("item_lots")
        .select("quantity")
        .eq("item_id", item.id);
      const newTotal = (allLots ?? []).reduce((sum, l) => sum + l.quantity, 0);
      await supabase.from("movements").insert({
        item_id: item.id,
        user_name: workerName,
        type: "ajuste",
        quantity: newTotal,
        note: `Se borró el lote${lot.lote ? ` ${lot.lote}` : ""} (tenía ${formatQuantity(lot.quantity, item.unit)})`,
        lot_id: null,
        lote: null,
        caducidad: null,
        proveedor: null,
      });
    }

    await syncItemHeadlineLot(supabase, item.id);
    await reload();
    setSaving(false);
    setConfirmDeleteId(null);
    setEditingId(null);
  }

  function renderLot(lot: ItemLot) {
    const days = lot.caducidad
      ? Math.ceil((new Date(lot.caducidad).getTime() - now) / (1000 * 60 * 60 * 24))
      : null;
    const expired = days !== null && days < 0;
    const soon = days !== null && days >= 0 && days <= 15;
    const isEditing = editingId === lot.id;

    if (isEditing) {
      return (
        <div key={lot.id} className="rounded-lg border border-neutral-300 bg-neutral-50 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Número de lote</label>
              <input
                type="text"
                value={editLote}
                onChange={(e) => setEditLote(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                placeholder="opcional"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Caducidad</label>
              <input
                type="date"
                value={editCaducidad}
                onChange={(e) => setEditCaducidad(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Proveedor</label>
              <input
                type="text"
                value={editProveedor}
                onChange={(e) => setEditProveedor(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                placeholder="opcional"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">
                Cantidad ({UNIT_LABELS[item.unit]})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={editQuantity}
                onChange={(e) => setEditQuantity(sanitizeDecimalInput(e.target.value))}
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          {rowError && <p className="text-xs text-red-600">{rowError}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => saveEdit(lot)}
              disabled={saving}
              className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700"
            >
              Cancelar
            </button>
            <div className="flex-1" />
            {confirmDeleteId === lot.id ? (
              <>
                <span className="text-xs text-neutral-500">
                  {lot.quantity > 0
                    ? `¿Borrar? Se descuentan ${formatQuantity(lot.quantity, item.unit)} del total.`
                    : "¿Borrar este lote?"}
                </span>
                <button
                  onClick={() => deleteLot(lot)}
                  disabled={saving}
                  className="rounded-md bg-red-600 text-white px-2 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  Sí, borrar
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-xs text-neutral-400 px-1"
                >
                  No
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(lot.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Borrar lote
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        key={lot.id}
        onClick={() => startEdit(lot)}
        className={`rounded-lg border px-3 py-2 cursor-pointer hover:border-neutral-400 ${
          lot.quantity <= 0
            ? "border-neutral-200 bg-neutral-50 opacity-60"
            : expired
            ? "border-red-300 bg-red-50"
            : soon
            ? "border-amber-300 bg-amber-50"
            : "border-neutral-200"
        }`}
      >
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {lot.lote ? `Lote ${lot.lote}` : "Sin número de lote"}
            </p>
            <p className="text-xs text-neutral-400">
              {lot.proveedor && `${lot.proveedor} · `}
              recibido {new Date(lot.received_at).toLocaleDateString("es-MX")}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-neutral-900">
              {formatQuantity(lot.quantity, item.unit)}
            </p>
            {lot.caducidad && (
              <p
                className={`text-xs font-medium ${
                  expired ? "text-red-600" : soon ? "text-amber-600" : "text-neutral-400"
                }`}
              >
                cad. {new Date(lot.caducidad).toLocaleDateString("es-MX")}
                {expired && " — caducado"}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-neutral-900">Lotes — {item.name}</h3>
          <button onClick={onClose} className="text-neutral-400 text-sm px-2">
            Cerrar
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-4">
          {formatQuantity(total, item.unit)} en{" "}
          {active.length} lote{active.length === 1 ? "" : "s"} vigente
          {active.length === 1 ? "" : "s"}. Al quitar stock se descuenta primero del que caduca más
          pronto. Toca un lote para corregir su número, fecha, proveedor o cantidad.
        </p>

        <div className="overflow-y-auto flex-1 -mx-5 px-5 space-y-2">
          {loading && <p className="text-sm text-neutral-400 py-8 text-center">Cargando...</p>}
          {!loading && lots.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">
              Este ítem todavía no tiene lotes registrados.
            </p>
          )}
          {active.map(renderLot)}
          {exhausted.length > 0 && (
            <>
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide pt-2">
                Agotados
              </p>
              {exhausted.map(renderLot)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
