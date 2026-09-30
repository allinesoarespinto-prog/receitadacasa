import { sql } from "../../lib/db";
import { requireAdmin } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { rows } = await sql`SELECT date FROM available_dates ORDER BY date ASC`;
    return res.status(200).json(rows.map((r) => String(r.date).slice(0, 10)));
  }

  if (req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    const { date } = req.body || {};
    if (!date) return res.status(400).json({ error: "Informe a data." });
    await sql`INSERT INTO available_dates (date) VALUES (${date}) ON CONFLICT (date) DO NOTHING`;
    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") {
    if (!requireAdmin(req, res)) return;
    const { date } = req.body || {};
    if (!date) return res.status(400).json({ error: "Informe a data." });
    await sql`DELETE FROM available_dates WHERE date = ${date}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "Método não permitido" });
}
