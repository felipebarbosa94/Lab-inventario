import { supabase } from "./supabase";

export async function exportFullBackup() {
  const [items, movements, workers, recipes, recipeItems] = await Promise.all([
    supabase.from("items").select("*").range(0, 9999),
    supabase.from("movements").select("*").range(0, 9999),
    supabase.from("workers").select("*").range(0, 9999),
    supabase.from("recipes").select("*").range(0, 9999),
    supabase.from("recipe_items").select("*").range(0, 9999),
  ]);

  const backup = {
    generated_at: new Date().toISOString(),
    items: items.data ?? [],
    movements: movements.data ?? [],
    workers: workers.data ?? [],
    recipes: recipes.data ?? [],
    recipe_items: recipeItems.data ?? [],
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `respaldo-inventario-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
