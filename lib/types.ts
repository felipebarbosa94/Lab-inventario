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
  created_at: string;
}

export interface MovementWithItem extends Movement {
  items: Pick<Item, "name" | "unit" | "project" | "flavor"> | null;
}
