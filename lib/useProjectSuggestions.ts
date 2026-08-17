"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clientLabel } from "@/lib/clientLabel";

// Devuelve las etiquetas "Marca (Cliente)" ya dadas de alta en la tabla
// clients — es la lista cerrada que alimenta los selects de Proyecto/marca.
export function useProjectSuggestions(): string[] {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("clients")
      .select("name, brand")
      .order("name")
      .then(({ data }) => {
        setNames((data ?? []).map((c) => clientLabel(c)));
      });
  }, []);

  return names;
}
