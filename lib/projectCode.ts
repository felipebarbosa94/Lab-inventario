import type { SupabaseClient } from "@supabase/supabase-js";

export async function generateLotCode(
  supabase: SupabaseClient,
  clientName: string | null
): Promise<string> {
  const prefix =
    (clientName || "GEN")
      .normalize("NFD")
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 4)
      .toUpperCase() || "GEN";

  const now = new Date();
  const dateStr = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}`;

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfDay);

  const seq = String((count ?? 0) + 1).padStart(3, "0");
  return `${prefix}-${dateStr}-${seq}`;
}
