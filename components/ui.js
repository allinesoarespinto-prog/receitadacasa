import { MessageCircle } from "lucide-react";
import { waLink, STATUS_LABEL, PAYMENT_LABEL } from "../lib/utils";

export const BRAND = {
  cream: "#F3ECDF",
  creamDark: "#EAE0CC",
  green: "#26362A",
  greenLight: "#3C5240",
  wine: "#7A2E2E",
  wineLight: "#9B3F3F",
  gold: "#B8922F",
  paper: "#FFFDF8",
};

export function SauceJar({ color = BRAND.wine, size = 56, imageUrl }) {
  if (imageUrl) {
    return <img src={imageUrl} alt="" style={{ width: size, height: size, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />;
  }
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 64 74" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="20" y="4" width="24" height="8" rx="2" fill={BRAND.gold} />
      <rect x="22" y="0" width="20" height="6" rx="2" fill="#D6B45A" />
      <path d="M14 16c0-2 2-4 4-4h28c2 0 4 2 4 4v46c0 6-4 10-10 10H24c-6 0-10-4-10-10V16z" fill={BRAND.paper} stroke={BRAND.green} strokeWidth="1.5" />
      <path d="M16 30c0-1 1-2 2-2h28c1 0 2 1 2 2v30c0 5-3 8-8 8H24c-5 0-8-3-8-8V30z" fill={color} />
      <ellipse cx="32" cy="30" rx="16" ry="3" fill={color} opacity="0.85" />
      <rect x="14" y="42" width="36" height="16" rx="2" fill={BRAND.cream} stroke={BRAND.green} strokeWidth="1" />
      <text x="32" y="52" textAnchor="middle" fontSize="7" fill={BRAND.green} fontFamily="Georgia, serif">Receita da Casa</text>
    </svg>
  );
}

export function Tag({ tag }) {
  const isReady = tag === "PRONTA_ENTREGA";
  return (
    <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, padding: "3px 9px", borderRadius: 20, background: isReady ? "#E4EEE0" : "#F3E4D6", color: isReady ? "#3B6D11" : "#854F0B" }}>
      {isReady ? "PRONTA ENTREGA" : "ENCOMENDA"}
    </span>
  );
}

export function StatusBadge({ status }) {
  const colors = { feito: { bg: "#F3E4D6", fg: "#854F0B" }, aceito: { bg: "#DCE7FA", fg: "#0C447C" }, entregue: { bg: "#E4EEE0", fg: "#3B6D11" } };
  const c = colors[status] || colors.feito;
  return <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: c.bg, color: c.fg }}>{STATUS_LABEL[status]}</span>;
}

export function PaymentBadge({ method, paid }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: paid ? "#E4EEE0" : "#F3E4D6", color: paid ? "#3B6D11" : "#854F0B" }}>
      {PAYMENT_LABEL[method]}{paid ? " · pago" : " · pendente"}
    </span>
  );
}

export function WhatsAppButton({ phone, message, small, label = "WhatsApp", icon }) {
  return (
    <a href={waLink(phone, message)} target="_blank" rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none", padding: small ? "4px 8px" : "6px 12px", borderRadius: 8, background: "#E4EEE0", color: "#3B6D11", fontSize: small ? 11 : 12.5, fontWeight: 600 }}>
      {icon || <MessageCircle size={small ? 12 : 14} />} {label}
    </a>
  );
}

export function KpiCard({ label, value, highlight, small }) {
  return (
    <div style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11.5, color: "#5F5E5A" }}>{label}</div>
      <div className="rdc-serif" style={{ fontSize: small ? 15 : 20, color: highlight ? BRAND.wine : BRAND.green }}>{value}</div>
    </div>
  );
}
