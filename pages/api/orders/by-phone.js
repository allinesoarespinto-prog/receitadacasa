import { sql } from "../../../lib/db";
import { mapOrderRow } from "../../../lib/db";
import { normalizePhone } from "../../../lib/utils";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Informe o telefone." });

  const { rows: settingsRows } = await sql`SELECT default_ddd FROM settings WHERE id = 1`;
  const defaultDDD = settingsRows[0]?.default_ddd || "14";
  const normalized = normalizePhone(phone, defaultDDD);

  const { rows } = await sql`
    SELECT * FROM orders WHERE phone = ${normalized} ORDER BY created_at DESC`;
  return res.status(200).json(rows.map(mapOrderRow));
}
