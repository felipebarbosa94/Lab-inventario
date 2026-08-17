import { Client } from "./types";

export function clientLabel(c: Pick<Client, "name" | "brand">): string {
  return c.brand ? `${c.brand} (${c.name})` : c.name;
}
