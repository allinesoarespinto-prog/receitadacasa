export const todayISO = () => new Date().toISOString().slice(0, 10);
export const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const fmtDate = (iso) => {
  if (!iso) return "-";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};
export const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const onlyDigits = (s) => (s || "").replace(/\D/g, "");
export const inRange = (iso, from, to) => {
  const s = String(iso).slice(0, 10);
  return (!from || s >= from) && (!to || s <= to);
};

// Normaliza telefone brasileiro (55 + DDD + número), mesmo quando o cliente
// digita com ou sem DDD, com ou sem 9, com ou sem 55.
export function normalizePhone(raw, defaultDDD = "14") {
  let d = onlyDigits(raw);
  d = d.replace(/^0+/, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return "55" + d;
  if (d.length === 8 || d.length === 9) return "55" + defaultDDD + d;
  return d.length ? "55" + defaultDDD + d : "";
}

export function displayPhone(raw) {
  let d = onlyDigits(raw);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw || "-";
}

export function waLink(normalizedPhone, message) {
  return `https://wa.me/${normalizedPhone}${message ? "?text=" + encodeURIComponent(message) : ""}`;
}

export function isSameMonth(iso) {
  const now = new Date();
  const d = new Date(String(iso).slice(0, 10) + "T00:00:00");
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function orderTotal(order, productById, sizeById) {
  return order.items.reduce((sum, it) => {
    const p = productById(it.productId);
    const s = sizeById(p, it.sizeId);
    return sum + (s ? s.price * it.qty : 0);
  }, 0);
}
export function orderCost(order, productById, sizeById) {
  return order.items.reduce((sum, it) => {
    const p = productById(it.productId);
    const s = sizeById(p, it.sizeId);
    return sum + (s ? (s.cost || 0) * it.qty : 0);
  }, 0);
}
export function orderItemsLabel(order, productById, sizeById) {
  return order.items
    .map((it) => {
      const p = productById(it.productId);
      const s = sizeById(p, it.sizeId);
      return `${it.qty}x ${p?.name || "?"} (${s?.label || "?"})`;
    })
    .join(", ");
}

export const STATUS_ORDER = ["feito", "aceito", "entregue"];
export const STATUS_LABEL = { feito: "Pedido feito", aceito: "Pedido aceito", entregue: "Entregue" };
export const PAYMENT_LABEL = { retirada: "Paga na retirada", pix_antecipado: "PIX antecipado" };
export const LOYALTY_GOAL = 10;
export const PALETTE = ["#7A2E2E", "#A23B24", "#6B4A2A", "#8B5E1F", "#5C3A3A"];

export function makeProductLookups(products) {
  const productById = (id) => products.find((p) => p.id === id);
  const sizeById = (product, sizeId) => product?.sizes.find((s) => s.id === sizeId);
  return { productById, sizeById };
}
