import { sql } from "../../lib/db";
import { requireAdmin } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { rows } = await sql`SELECT default_ddd, pix_key FROM settings WHERE id = 1`;
    const row = rows[0] || { default_ddd: "14", pix_key: "" };
    return res.status(200).json({ defaultDDD: row.default_ddd, pixKey: row.pix_key });
  }

  if (req.method === "PATCH") {
    if (!requireAdmin(req, res)) return;
    const { defaultDDD, pixKey, adminPhone, adminPassword } = req.body || {};
    const fields = [];
    const values = [];
    let i = 1;
    if (defaultDDD !== undefined) { fields.push(`default_ddd = $${i++}`); values.push(defaultDDD); }
    if (pixKey !== undefined) { fields.push(`pix_key = $${i++}`); values.push(pixKey); }
    if (adminPhone !== undefined) { fields.push(`admin_phone = $${i++}`); values.push(adminPhone); }
    if (adminPassword !== undefined) { fields.push(`admin_password = $${i++}`); values.push(adminPassword); }
    if (fields.length === 0) return res.status(400).json({ error: "Nada para atualizar." });
    await sql.query(`UPDATE settings SET ${fields.join(", ")} WHERE id = 1`, values);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "Método não permitido" });
}
