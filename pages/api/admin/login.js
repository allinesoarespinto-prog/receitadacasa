import { sql } from "../../../lib/db";
import { normalizePhone } from "../../../lib/utils";
import { setAdminCookie } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  const { phone, password } = req.body || {};
  const { rows } = await sql`SELECT admin_phone, admin_password, default_ddd FROM settings WHERE id = 1`;
  const row = rows[0];
  if (!row) return res.status(200).json({ ok: false });

  const normalized = normalizePhone(phone, row.default_ddd);
  const match = normalized === row.admin_phone && password === row.admin_password;
  if (!match) return res.status(200).json({ ok: false });

  setAdminCookie(res);
  return res.status(200).json({ ok: true });
}
