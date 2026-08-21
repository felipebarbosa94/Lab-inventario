// Quita acentos y pasa a minusculas, para que buscar "cafeina" encuentre
// "Cafeina" sin que haga falta escribir el acento.
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
