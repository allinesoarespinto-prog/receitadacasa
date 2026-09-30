import { sql } from "../../../lib/db";
import { mapProductRow } from "../../../lib/db";
import { requireAdmin } from "../../../lib/auth";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PATCH") {
    if (!requireAdmin(req, res)) return;
    const { name, description, tag, imageUrl, active, sizes } = req.body || {};
    const fields = [];
    const values = [];
    let i = 1;
    if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
    if (description !== undefined) { fields.push(`description = $${i++}`); values.push(description); }
    if (tag !== undefined) { fields.push(`tag = $${i++}`); values.push(tag); }
    if (imageUrl !== undefined) { fields.push(`image_url = $${i++}`); values.push(imageUrl); }
    if (active !== undefined) { fields.push(`active = $${i++}`); values.push(active); }
    if (sizes !== undefined) {
      const sizesWithIds = sizes.map((s, idx) => ({ ...s, id: s.id || `${id}-sz${Date.now().toString(36)}${idx}` }));
      fields.push(`sizes = $${i++}::jsonb`);
      values.push(JSON.stringify(sizesWithIds));
    }
    if (fields.length === 0) return res.status(400).json({ error: "Nada para atualizar." });
    values.push(id);
    const { rows } = await sql.query(
      `UPDATE products SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: "Molho não encontrado." });
    return res.status(200).json(mapProductRow(rows[0]));
  }

  if (req.method === "DELETE") {
    if (!requireAdmin(req, res)) return;
    await sql`DELETE FROM products WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "Método não permitido" });
}
