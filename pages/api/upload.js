import { put } from "@vercel/blob";
import { requireAdmin } from "../../lib/auth";

// Recebe o arquivo "cru" (sem o Next.js tentar interpretar como JSON)
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!requireAdmin(req, res)) return;

  const rawName = req.query.filename || `foto-${Date.now()}.jpg`;
  const safeName = String(rawName).replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `molhos/${Date.now()}-${safeName}`;

  try {
    const blob = await put(path, req, { access: "public" });
    return res.status(200).json(blob);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Não foi possível enviar a foto. Tente novamente." });
  }
}
