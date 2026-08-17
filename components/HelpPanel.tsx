"use client";

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2 mt-2">
      {items.map((text, i) => (
        <li key={i} className="flex gap-3 text-sm text-neutral-700">
          <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-semibold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="pt-0.5">{text}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-md px-3 py-2 mt-3 text-sm text-emerald-800">
      {children}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-md px-3 py-2 mt-3 text-sm text-amber-800">
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-2 pb-1 border-b border-neutral-200">
        {title}
      </h4>
      {children}
    </div>
  );
}

export default function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Ayuda — cómo usar la app</h3>
          <button onClick={onClose} className="text-neutral-400 text-sm px-2">
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          <Section title="Entrar a la app">
            <p className="text-sm text-neutral-600">
              Elige tu nombre de la lista la primera vez. La app lo recuerda en ese dispositivo —
              usa &quot;cambiar&quot; junto a tu nombre para cambiar de usuario.
            </p>
          </Section>

          <Section title="El inventario">
            <p className="text-sm text-neutral-600">
              Dos pestañas: <strong>Materia prima</strong> (ingredientes activos) y{" "}
              <strong>Envases y empaques</strong> (frascos, tapas, scoops, etiquetas). Usa la
              búsqueda o el bloque &quot;⭐ Más usados&quot; para encontrar rápido lo que usas
              seguido. Los filtros de proyecto (ej. &quot;Rafas&quot;) están debajo de las
              pestañas.
            </p>
          </Section>

          <Section title="Agregar y quitar stock">
            <p className="text-sm text-neutral-600">
              Cada ítem tiene botones <strong>Quitar</strong> (cuando usas algo) y{" "}
              <strong>Agregar</strong> (cuando llega o corriges hacia arriba). Escribe cantidad y,
              si quieres, una nota.
            </p>
            <Warn>No puedes quitar más de lo que hay disponible — la app te avisa.</Warn>
          </Section>

          <Section title="Historial de un ítem">
            <p className="text-sm text-neutral-600">
              Toca la cantidad grande de cualquier ítem para ver todos sus movimientos: quién,
              cuándo y cuánto.
            </p>
          </Section>

          <Section title="Recetas y producción">
            <p className="text-sm text-neutral-600">
              Botón &quot;Recetas&quot; para ver, buscar o crear recetas. Al producir:
            </p>
            <Steps
              items={[
                "Abre la receta y toca “Producir”.",
                "Indica cuántos lotes vas a hacer — se calcula automático cuánto necesitas de cada ingrediente.",
                "Si falta algo, se marca en rojo y no te deja confirmar hasta resolverlo.",
                "Ve tachando cada ingrediente conforme lo agregas físicamente.",
                "Con todo marcado, confirma — se descuenta todo el inventario de un jalón.",
              ]}
            />
            <Tip>
              También puedes generar e imprimir la orden de producción en papel con
              &quot;Generar orden de producción&quot;.
            </Tip>
          </Section>

          <Section title="Recibir mercancía">
            <p className="text-sm text-neutral-600">
              Para cuando llega un pedido de un proveedor — captura todo de un jalón en vez de dar
              de alta ítem por ítem.
            </p>
            <Steps
              items={[
                "Botón “Recibir mercancía”.",
                "Escribe el proveedor (aplica a todo el pedido).",
                "Por cada ítem: elígelo, cantidad, lote y caducidad.",
                "“+ Agregar otro ítem” si el pedido trae varias cosas.",
                "“Registrar recepción” — se suma todo al inventario.",
              ]}
            />
          </Section>

          <Section title="Vencimientos">
            <p className="text-sm text-neutral-600">
              Lista de todo lo que tiene fecha de caducidad, ordenado de lo más próximo primero.
              Lo que caduca en 15 días o menos se marca en ámbar; lo ya caducado, en rojo. También
              te llega por correo automáticamente.
            </p>
          </Section>

          <Section title="Hoy">
            <p className="text-sm text-neutral-600">
              Resumen rápido de lo que tú hiciste en el día: cuántas entradas, cuántas salidas, y
              el detalle de cada una.
            </p>
          </Section>

          <Section title="Vista simple">
            <p className="text-sm text-neutral-600">
              Pensada para el celular en el área de producción — quita los botones administrativos
              y agranda los botones de Agregar/Quitar. Actívala y desactívala con el botón arriba
              a la derecha.
            </p>
          </Section>

          <Section title="Exportar y respaldar">
            <p className="text-sm text-neutral-600">
              <strong>Exportar CSV</strong> descarga la lista que estás viendo en Excel.{" "}
              <strong>Respaldo completo</strong> descarga todo el inventario y movimientos.
            </p>
          </Section>

          <Section title="Preguntas frecuentes">
            <p className="text-sm text-neutral-600 mb-2">
              <strong>¿Me equivoqué al registrar algo?</strong> Usa Quitar/Agregar para corregir,
              o pide a Felipe que edite el ítem directamente.
            </p>
            <p className="text-sm text-neutral-600">
              <strong>¿Por qué no veo el precio o el proveedor de un ítem?</strong> Esa
              información es privada — solo Felipe y Ramón la ven, dentro de Finanzas.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
