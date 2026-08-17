"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Client } from "@/lib/types";
import { clientLabel } from "@/lib/clientLabel";

export default function ClientsPanel({ onClose }: { onClose: () => void }) {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    supabase
      .from("clients")
      .select("*")
      .order("name")
      .then(({ data }) => setClients((data as Client[]) ?? []));
  }

  useEffect(() => {
    supabase
      .from("clients")
      .select("*")
      .order("name")
      .then(({ data }) => setClients((data as Client[]) ?? []));
  }, []);

  async function handleAdd() {
    if (!name.trim()) {
      setError("Ponele un nombre al cliente/doctora");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("clients").insert({
      name: name.trim(),
      brand: brand.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError(
        insertError.message.includes("duplicate")
          ? "Ese cliente/marca ya existe"
          : insertError.message
      );
      return;
    }
    setName("");
    setBrand("");
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("clients").delete().eq("id", id);
    load();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-neutral-900">Clientes / marcas</h3>
          <button onClick={onClose} className="text-neutral-400 text-sm px-2">
            Cerrar
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-4">
          Esta es la lista cerrada que aparece en &quot;Proyecto/marca&quot; al crear ítems y
          recetas — evita que se mezclen marcas por error.
        </p>

        <div className="border border-neutral-200 rounded-lg p-3 mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cliente/doctora (ej. Daniela)"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Marca (opcional, ej. NOU)"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full rounded-md bg-neutral-900 text-white py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Guardando..." : "+ Agregar"}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          {clients === null && <p className="text-sm text-neutral-400">Cargando...</p>}
          {clients !== null && clients.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">
              Todavía no hay clientes/marcas dadas de alta. Agrega los que ya usas (Rafas, SHQ,
              NOU, etc.) para que aparezcan en los formularios.
            </p>
          )}
          <div className="space-y-1.5">
            {clients?.map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-center text-sm border-b border-neutral-100 pb-1.5"
              >
                <span className="text-neutral-700">{clientLabel(c)}</span>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-neutral-400 hover:text-red-600 text-xs"
                >
                  Borrar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
