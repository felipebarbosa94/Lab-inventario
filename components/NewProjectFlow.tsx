"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Item, RecipeWithItems } from "@/lib/types";
import RecipeFormModal from "./RecipeFormModal";
import ProduceModal from "./ProduceModal";

export default function NewProjectFlow({
  items,
  workerName,
  onClose,
}: {
  items: Item[];
  workerName: string;
  onClose: () => void;
}) {
  const [createdRecipe, setCreatedRecipe] = useState<RecipeWithItems | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  async function handleCreated(recipeId: string) {
    setLoadingRecipe(true);
    const { data } = await supabase
      .from("recipes")
      .select("*, recipe_items(*, items(name, unit, quantity, lote, caducidad))")
      .eq("id", recipeId)
      .single();
    setLoadingRecipe(false);
    if (data) {
      setCreatedRecipe(data as unknown as RecipeWithItems);
    } else {
      onClose();
    }
  }

  if (createdRecipe) {
    return <ProduceModal recipe={createdRecipe} workerName={workerName} onClose={onClose} />;
  }

  if (loadingRecipe) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl p-5">
          <p className="text-sm text-neutral-500">Preparando el desglose...</p>
        </div>
      </div>
    );
  }

  return <RecipeFormModal items={items} onClose={onClose} onCreated={handleCreated} />;
}
