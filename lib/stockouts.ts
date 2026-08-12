interface MovementLite {
  item_id: string;
  type: string;
  quantity: number;
  created_at: string;
}

export function computeStockoutCounts(movements: MovementLite[]): Map<string, number> {
  const sorted = [...movements].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const balances = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const m of sorted) {
    const before = balances.get(m.item_id) ?? 0;
    let after = before;
    if (m.type === "entrada") after = before + Number(m.quantity);
    else if (m.type === "salida") after = before - Number(m.quantity);
    else continue;

    after = Math.max(0, after);
    if (before > 0 && after === 0) {
      counts.set(m.item_id, (counts.get(m.item_id) ?? 0) + 1);
    }
    balances.set(m.item_id, after);
  }

  return counts;
}
