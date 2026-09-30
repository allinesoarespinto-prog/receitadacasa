import { sql } from "../../lib/db";
import { mapOrderRow, mapProductRow } from "../../lib/db";
import { requireAdmin } from "../../lib/auth";
import { normalizePhone, orderTotal, makeProductLookups } from "../../lib/utils";

export default async function handler(req, res) {
  if (req.method === "GET") {
    if (!requireAdmin(req, res)) return;
    const { rows: manualRows } = await sql`SELECT * FROM manual_clients`;
    const { rows: orderRows } = await sql`SELECT * FROM orders`;
    const { rows: productRows } = await sql`SELECT * FROM products`;
    const products = productRows.map(mapProductRow);
    const { productById, sizeById } = makeProductLookups(products);
    const orders = orderRows.map(mapOrderRow);

    const map = {};
    manualRows.forEach((c) => { map[c.phone] = { name: c.name, phone: c.phone, orderCount: 0, totalSpent: 0, lastOrder: null }; });
    orders.forEach((o) => {
      if (!map[o.phone]) map[o.phone] = { name: o.customerName, phone: o.phone, orderCount: 0, totalSpent: 0, lastOrder: o.createdAt };
      map[o.phone].name = o.customerName;
      map[o.phone].orderCount += 1;
      map[o.phone].totalSpent += orderTotal(o, productById, sizeById);
      if (!map[o.phone].lastOrder || o.createdAt > map[o.phone].lastOrder) map[o.phone].lastOrder = o.createdAt;
    });
    const clients = Object.values(map).sort((a, b) => {
      if (!a.lastOrder) return 1;
      if (!b.lastOrder) return -1;
      return a.lastOrder < b.lastOrder ? 1 : -1;
    });
    return res.status(200).json(clients);
  }

  if (req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    const { name, phone } = req.body || {};
    if (!name || !phone) return res.status(400).json({ error: "Informe nome e telefone." });
    const { rows: settingsRows } = await sql`SELECT default_ddd FROM settings WHERE id = 1`;
    const normalized = normalizePhone(phone, settingsRows[0]?.default_ddd || "14");
    await sql`
      INSERT INTO manual_clients (phone, name) VALUES (${normalized}, ${name})
      ON CONFLICT (phone) DO UPDATE SET name = ${name}`;
    return res.status(201).json({ ok: true });
  }

  res.status(405).json({ error: "Método não permitido" });
}
