"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Project } from "@/lib/types";

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function ProjectsPanel({ onClose }: { onClose: () => void }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("projects")
      .select("*")
      .order("started_at", { ascending: false })
      .then(({ data }) => setProjects((data as Project[]) ?? []));
  }, []);

  async function markCompleted(id: string) {
    setCompleting(id);
    const { data } = await supabase
      .from("projects")
      .update({ status: "completado", completed_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    setCompleting(null);
    if (data) {
      setProjects((prev) => prev?.map((p) => (p.id === id ? (data as Project) : p)) ?? prev);
    }
  }

  const enProgreso = projects?.filter((p) => p.status === "en_progreso") ?? [];
  const completados = projects?.filter((p) => p.status === "completado") ?? [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Proyectos</h3>
          <button onClick={onClose} className="text-neutral-400 text-sm px-2">
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          {projects === null && <p className="text-sm text-neutral-400">Cargando...</p>}
          {projects !== null && projects.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">
              Todavía no hay proyectos. Se crean solos al usar &quot;+ Nuevo proyecto&quot;.
            </p>
          )}

          {enProgreso.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                En progreso
              </h4>
              <div className="space-y-2">
                {enProgreso.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-medium text-neutral-900">{p.name}</p>
                        <p className="text-xs text-neutral-500">
                          {[p.client, p.lot_code].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <span className="text-xs text-amber-700 font-medium shrink-0">
                        lleva {daysBetween(p.started_at, new Date().toISOString())} día
                        {daysBetween(p.started_at, new Date().toISOString()) === 1 ? "" : "s"}
                      </span>
                    </div>
                    <button
                      onClick={() => markCompleted(p.id)}
                      disabled={completing === p.id}
                      className="w-full mt-2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 text-sm font-medium disabled:opacity-40"
                    >
                      {completing === p.id ? "Guardando..." : "Marcar como completado"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completados.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                Completados
              </h4>
              <div className="space-y-1.5">
                {completados.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center text-sm border-b border-neutral-100 pb-1.5"
                  >
                    <div>
                      <span className="text-neutral-700">{p.name}</span>
                      <span className="text-xs text-neutral-400">
                        {" "}
                        · {[p.client, p.lot_code].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500 shrink-0 ml-2">
                      {p.completed_at
                        ? `duró ${daysBetween(p.started_at, p.completed_at)} día${
                            daysBetween(p.started_at, p.completed_at) === 1 ? "" : "s"
                          }`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
