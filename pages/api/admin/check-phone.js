import { sql } from "../../../lib/db";
import { normalizePhone } from "../../../lib/utils";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  const { phone } = req.body || {};
  const { rows } = await sql`SELECT admin_phone, default_ddd FROM settings WHERE id = 1`;
  if (!rows[0]) return res.status(200).json({ isAdmin: false });
  const normalized = normalizePhone(phone, rows[0].default_ddd);
  return res.status(200).json({ isAdmin: normalized === rows[0].admin_phone });
}
