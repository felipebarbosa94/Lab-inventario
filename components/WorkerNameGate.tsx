"use client";

import { useState } from "react";

export default function WorkerNameGate({ onSave }: { onSave: (name: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 className="text-lg font-semibold mb-1">¿Quién sos?</h3>
        <p className="text-sm text-neutral-500 mb-4">
          Tu nombre queda registrado en cada movimiento que hagas.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onSave(value.trim());
          }}
          className="space-y-3"
        >
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-lg"
            placeholder="Tu nombre"
          />
          <button
            type="submit"
            className="w-full rounded-md py-2 text-white font-medium bg-neutral-900"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
