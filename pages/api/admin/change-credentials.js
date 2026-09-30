import { sql } from "../../../lib/db";
import { requireAdmin } from "../../../lib/auth";
import { normalizePhone } from "../../../lib/utils";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!requireAdmin(req, res)) return;

  const { currentPassword, newPhone, newPassword } = req.body || {};
  if (!currentPassword) return res.status(400).json({ error: "Informe a senha atual." });
  if (!newPhone && !newPassword) return res.status(400).json({ error: "Informe o novo telefone e/ou a nova senha." });

  const { rows } = await sql`SELECT admin_phone, admin_password, default_ddd FROM settings WHERE id = 1`;
  const row = rows[0];
  if (!row || currentPassword !== row.admin_password) {
    return res.status(200).json({ ok: false, error: "Senha atual incorreta." });
  }

  const fields = [];
  const values = [];
  let i = 1;
  if (newPhone) {
    fields.push(`admin_phone = $${i++}`);
    values.push(normalizePhone(newPhone, row.default_ddd));
  }
  if (newPassword) {
    fields.push(`admin_password = $${i++}`);
    values.push(newPassword);
  }
  await sql.query(`UPDATE settings SET ${fields.join(", ")} WHERE id = 1`, values);
  return res.status(200).json({ ok: true });
}
