import crypto from "crypto";

const COOKIE_NAME = "rdc_admin";

function getToken() {
  const secret = process.env.SESSION_SECRET || "troque-este-segredo";
  return crypto.createHmac("sha256", secret).update("receita-da-casa-admin").digest("hex");
}

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        const k = c.slice(0, idx).trim();
        const v = c.slice(idx + 1).trim();
        return [k, decodeURIComponent(v)];
      })
  );
}

export function isAdminRequest(req) {
  const cookies = parseCookies(req);
  return cookies[COOKIE_NAME] === getToken();
}

export function setAdminCookie(res) {
  const token = getToken();
  const isProd = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax${isProd ? "; Secure" : ""}`
  );
}

export function clearAdminCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
}

export function requireAdmin(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Não autorizado. Faça login como gestora." });
    return false;
  }
  return true;
}
