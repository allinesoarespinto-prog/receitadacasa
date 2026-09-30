import { sql } from "../../../lib/db";
import { mapOrderRow, mapProductRow } from "../../../lib/db";
import { requireAdmin } from "../../../lib/auth";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PATCH") {
    if (!requireAdmin(req, res)) return;
    const { status, paid } = req.body || {};

    const { rows: currentRows } = await sql`SELECT * FROM orders WHERE id = ${id}`;
    const current = currentRows[0];
    if (!current) return res.status(404).json({ error: "Pedido não encontrado." });

    const fields = [];
    const values = [];
    let i = 1;
    if (status !== undefined) { fields.push(`status = $${i++}`); values.push(status); }
    if (paid !== undefined) { fields.push(`paid = $${i++}`); values.push(paid); }
    if (fields.length === 0) return res.status(400).json({ error: "Nada para atualizar." });
    values.push(id);
    const { rows } = await sql.query(
      `UPDATE orders SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );

    // Dá baixa no estoque só na transição pra "aceito"
    if (status === "aceito" && current.status !== "aceito") {
      const items = current.items || [];
      for (const it of items) {
        const { rows: prodRows } = await sql`SELECT * FROM products WHERE id = ${it.productId}`;
        const product = prodRows[0];
        if (!product) continue;
        const newSizes = (product.sizes || []).map((s) =>
          s.id === it.sizeId ? { ...s, stock: Math.max(0, (s.stock || 0) - it.qty) } : s
        );
        await sql`UPDATE products SET sizes = ${JSON.stringify(newSizes)}::jsonb WHERE id = ${it.productId}`;
      }
    }

    return res.status(200).json(mapOrderRow(rows[0]));
  }

  res.status(405).json({ error: "Método não permitido" });
}
