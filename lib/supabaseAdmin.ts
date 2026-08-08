import { createClient } from "@supabase/supabase-js";

// Cliente con la service role key: SOLO se usa en código de servidor
// (API routes). Nunca debe importarse desde un componente "use client".
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan variables de entorno de Supabase (service role)");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
