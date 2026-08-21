"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Item } from "@/lib/types";
import { formatQuantity } from "@/lib/formatQuantity";
import { computeReorderPredictions, REORDER_URGENT_DAYS } from "@/lib/reorderPrediction";

interface Prediction {
  item: Item;
  daysRemaining: number;
}

// Ítems que, según su ritmo real de consumo, se van a agotar pronto —
// aunque todavía no hayan cruzado su umbral fijo de alerta (o no tengan
// umbral definido). Complementa a KpiAlerts, no lo repite.
export default function ReorderAlerts({ items }: { items: Item[] }) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    const alreadyLowStock = new Set(
      items
        .filter((i) => i.low_stock_threshold !== null && i.quantity <= i.low_stock_threshold)
        .map((i) => i.id)
    );

    computeReorderPredictions(
      supabase,
      items.map((i) => ({ id: i.id, quantity: i.quantity }))
    ).then((preds) => {
      const rows = items
        .filter((item) => !alreadyLowStock.has(item.id))
        .map((item) => {
          const p = preds.get(item.id);
          return p ? { item, daysRemaining: p.daysRemaining } : null;
        })
        .filter((r): r is Prediction => r !== null && r.daysRemaining <= REORDER_URGENT_DAYS)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);
      setPredictions(rows);
    });
  }, [items]);

  if (predictions.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-amber-600 mb-2 uppercase tracking-wide">
        🔮 Se va a agotar pronto (según tu consumo)
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {predictions.map(({ item, daysRemaining }) => (
          <div
            key={item.id}
            className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 shadow-sm"
          >
            <p className="text-sm font-medium text-amber-800">{item.name}</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {formatQuantity(item.quantity, item.unit)}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              A este ritmo se acaba en ~{Math.max(0, Math.round(daysRemaining))} día
              {Math.round(daysRemaining) === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
