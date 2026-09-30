import { sql } from "../../../lib/db";
import { mapOrderRow, mapProductRow } from "../../../lib/db";
import { requireAdmin } from "../../../lib/auth";
import { normalizePhone, waLink, fmtMoney, fmtDate, displayPhone, orderItemsLabel, orderTotal, makeProductLookups, PAYMENT_LABEL } from "../../../lib/utils";

export default async function handler(req, res) {
  if (req.method === "GET") {
    if (!requireAdmin(req, res)) return;
    const { rows } = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
    return res.status(200).json(rows.map(mapOrderRow));
  }

  if (req.method === "POST") {
    const { customerName, phone, items, scheduledDate, paymentMethod } = req.body || {};
    if (!customerName || !phone || !Array.isArray(items) || items.length === 0 || !scheduledDate) {
      return res.status(400).json({ error: "Dados do pedido incompletos." });
    }

    const { rows: settingsRows } = await sql`SELECT default_ddd, admin_phone FROM settings WHERE id = 1`;
    const defaultDDD = settingsRows[0]?.default_ddd || "14";
    const adminPhone = settingsRows[0]?.admin_phone;
    const normalizedPhone = normalizePhone(phone, defaultDDD);

    const id = "o_" + Date.now().toString(36);
    const { rows } = await sql`
      INSERT INTO orders (id, customer_name, phone, items, scheduled_date, status, payment_method, paid)
      VALUES (${id}, ${customerName}, ${normalizedPhone}, ${JSON.stringify(items)}::jsonb, ${scheduledDate}, 'feito', ${paymentMethod || "retirada"}, false)
      RETURNING *`;
    const order = mapOrderRow(rows[0]);

    // Monta o link de aviso no WhatsApp da gestora (ela recebe o pedido pronto pra enviar)
    let adminNotifyUrl = null;
    if (adminPhone) {
      const { rows: productRows } = await sql`SELECT * FROM products`;
      const products = productRows.map(mapProductRow);
      const { productById, sizeById } = makeProductLookups(products);
      const msg = `🍅 Novo pedido!\nCliente: ${order.customerName} (${displayPhone(order.phone)})\n${orderItemsLabel(order, productById, sizeById)}\nTotal: ${fmtMoney(orderTotal(order, productById, sizeById))}\nRetirada: ${fmtDate(order.scheduledDate)}\nPagamento: ${PAYMENT_LABEL[order.paymentMethod]}`;
      adminNotifyUrl = waLink(adminPhone, msg);
    }

    return res.status(201).json({ order, adminNotifyUrl });
  }

  res.status(405).json({ error: "Método não permitido" });
}
