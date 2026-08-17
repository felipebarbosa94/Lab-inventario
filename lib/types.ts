export type Unit = "kg" | "g" | "unidad";
export type MovementType = "entrada" | "salida" | "ajuste";

export interface Item {
  id: string;
  name: string;
  category: string;
  project: string | null;
  flavor: string | null;
  unit: Unit;
  quantity: number;
  low_stock_threshold: number | null;
  lote: string | null;
  caducidad: string | null;
  proveedor: string | null;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: string;
  item_id: string;
  user_name: string;
  type: MovementType;
  quantity: number;
  note: string | null;
  lote: string | null;
  caducidad: string | null;
  proveedor: string | null;
  created_at: string;
}

export interface MovementWithItem extends Movement {
  items: Pick<Item, "name" | "unit" | "project" | "flavor"> | null;
}

export interface Recipe {
  id: string;
  name: string;
  project: string | null;
  batch_label: string;
  product_type: string | null;
  batch_quantity: number | null;
  batch_unit: string | null;
  steps: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  item_id: string;
  quantity_per_batch: number;
}

export interface RecipeItemWithItem extends RecipeItem {
  items: Pick<Item, "name" | "unit" | "quantity" | "lote" | "caducidad"> | null;
}

export interface RecipeWithItems extends Recipe {
  recipe_items: RecipeItemWithItem[];
}
