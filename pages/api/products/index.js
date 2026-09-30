import { sql } from "../../../lib/db";
import { mapProductRow } from "../../../lib/db";
import { requireAdmin } from "../../../lib/auth";
import { PALETTE } from "../../../lib/utils";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { rows } = await sql`SELECT * FROM products ORDER BY created_at ASC`;
    return res.status(200).json(rows.map(mapProductRow));
  }

  if (req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    const { name, description, tag, imageUrl, sizes } = req.body || {};
    if (!name || !Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({ error: "Dados do molho incompletos." });
    }
    const { rows: countRows } = await sql`SELECT COUNT(*) FROM products`;
    const color = PALETTE[Number(countRows[0].count) % PALETTE.length];
    const id = "p_" + Date.now().toString(36);
    const sizesWithIds = sizes.map((s, i) => ({ ...s, id: s.id || `${id}-sz${i}` }));

    const { rows } = await sql`
      INSERT INTO products (id, name, description, tag, active, color, image_url, sizes)
      VALUES (${id}, ${name}, ${description || ""}, ${tag || "PRONTA_ENTREGA"}, true, ${color}, ${imageUrl || ""}, ${JSON.stringify(sizesWithIds)}::jsonb)
      RETURNING *`;
    return res.status(201).json(mapProductRow(rows[0]));
  }

  res.status(405).json({ error: "Método não permitido" });
}
