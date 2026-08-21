// Limpia lo que el usuario escribe en un campo de cantidad. Acepta tanto
// "." como "," como separador decimal — el teclado numérico en español a
// veces ofrece "," en vez de ".", y un <input type="number"> del navegador
// rechaza la coma silenciosamente, dejando el campo vacío o forzando a
// redondear. Con <input type="text" inputMode="decimal"> + este sanitizador
// cualquiera de los dos funciona igual.
export function sanitizeDecimalInput(raw: string): string {
  const normalized = raw.replace(/,/g, ".");
  const cleaned = normalized.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}
