import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { BRAND, SauceJar, Tag, StatusBadge } from "./ui";
import { fmtDate, fmtMoney, onlyDigits, orderItemsLabel, makeProductLookups, LOYALTY_GOAL, PAYMENT_LABEL } from "../lib/utils";

function AdminGate({ onSubmit }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!password.trim()) return setError("Digite a senha.");
    setBusy(true);
    const ok = await onSubmit(password);
    setBusy(false);
    if (!ok) setError("Senha incorreta.");
  }

  return (
    <div style={{ background: BRAND.green, borderRadius: 14, padding: 18, marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: BRAND.cream }}>
        <Lock size={16} />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Telefone reconhecido como administrativo. Digite a senha do painel:</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "none", fontSize: 14 }} />
        <button disabled={busy} onClick={handleSubmit} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: BRAND.wine, color: "#fff", fontWeight: 700, fontSize: 13.5 }}>Entrar</button>
      </div>
      {error && <div style={{ fontSize: 12.5, color: "#F7C1C1", marginTop: 8 }}>{error}</div>}
    </div>
  );
}

export default function ClienteView({ products, dates, pixKey, onSubmitOrder, onCheckAdminPhone, onAdminLogin, onFetchHistory }) {
  const { productById, sizeById } = makeProductLookups(products);

  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("retirada");
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [cartError, setCartError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [historyPhone, setHistoryPhone] = useState("");
  const [historyOrders, setHistoryOrders] = useState(null);
  const [isAdminPhone, setIsAdminPhone] = useState(false);

  useEffect(() => {
    const digits = onlyDigits(historyPhone);
    if (digits.length < 8) { setHistoryOrders(null); setIsAdminPhone(false); return; }
    const timer = setTimeout(async () => {
      const { isAdmin } = await onCheckAdminPhone(historyPhone);
      setIsAdminPhone(isAdmin);
      if (!isAdmin) {
        const orders = await onFetchHistory(historyPhone);
        setHistoryOrders(orders);
      } else {
        setHistoryOrders(null);
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPhone]);

  const historyLoyalty = useMemo(() => {
    if (!historyOrders) return null;
    const delivered = historyOrders.filter((o) => o.status === "entregue");
    if (!delivered.length) return null;
    const count = delivered.reduce((s, o) => s + o.items.reduce((s2, it) => s2 + it.qty, 0), 0);
    return { count };
  }, [historyOrders]);

  function addToCart(productId, sizeId) {
    setCartError("");
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId && i.sizeId === sizeId);
      if (existing) return prev.map((i) => (i.productId === productId && i.sizeId === sizeId ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { productId, sizeId, qty: 1 }];
    });
  }
  function changeCartQty(productId, sizeId, delta) {
    setCart((prev) => prev.map((i) => (i.productId === productId && i.sizeId === sizeId ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0));
  }
  const cartTotal = cart.reduce((sum, item) => {
    const product = productById(item.productId);
    const size = sizeById(product, item.sizeId);
    return sum + (size ? size.price * item.qty : 0);
  }, 0);

  async function submitOrder() {
    setCartError("");
    if (cart.length === 0) return setCartError("Adicione pelo menos um molho ao pedido.");
    if (!customerName.trim()) return setCartError("Informe seu nome.");
    if (onlyDigits(customerPhone).length < 8) return setCartError("Informe um telefone/WhatsApp válido.");
    if (!scheduledDate) return setCartError("Escolha um dia para retirada.");
    setSubmitting(true);
    try {
      const { order, adminNotifyUrl } = await onSubmitOrder({
        customerName: customerName.trim(),
        phone: customerPhone,
        items: cart,
        scheduledDate,
        paymentMethod,
      });
      setOrderPlaced(order);
      if (adminNotifyUrl) { try { window.open(adminNotifyUrl, "_blank"); } catch (e) {} }
      setCart([]); setCustomerName(""); setScheduledDate(""); setPaymentMethod("retirada");
    } catch (e) {
      setCartError("Não deu pra enviar o pedido agora. Tenta de novo em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (orderPlaced) {
    return (
      <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>♡</div>
        <h2 className="rdc-serif" style={{ color: BRAND.green, fontSize: 26 }}>Pedido feito com carinho!</h2>
        <p style={{ color: "#5F5E5A", fontSize: 14.5, lineHeight: 1.6 }}>Recebemos seu pedido. Assim que a gestora confirmar, você recebe aviso no WhatsApp.</p>
        <div style={{ display: "inline-block", textAlign: "left", background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 12, padding: 14, marginTop: 6, fontSize: 13.5 }}>
          <div style={{ marginBottom: 4 }}><strong>Pedido:</strong> #{orderPlaced.id}</div>
          <div style={{ marginBottom: 4 }}><strong>Feito em:</strong> {fmtDate(orderPlaced.createdAt)}</div>
          <div style={{ marginBottom: 4 }}><strong>Retirada agendada para:</strong> {fmtDate(orderPlaced.scheduledDate)}</div>
          <div style={{ marginBottom: 4 }}><strong>Pagamento:</strong> {PAYMENT_LABEL[orderPlaced.paymentMethod]}</div>
          <div><strong>Status atual:</strong> <StatusBadge status={orderPlaced.status} /></div>
          {orderPlaced.paymentMethod === "pix_antecipado" && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: BRAND.cream, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: BRAND.green }}>Chave PIX (Receita da Casa):</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.wine }}>{pixKey}</div>
            </div>
          )}
        </div>
        <div><button onClick={() => setOrderPlaced(null)} style={{ marginTop: 16, padding: "10px 22px", borderRadius: 24, border: "none", background: BRAND.wine, color: "#fff", fontSize: 14, fontWeight: 600 }}>Voltar ao cardápio</button></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 className="rdc-serif" style={{ color: BRAND.green, fontSize: 30, margin: "0 0 6px" }}>Sabor que conecta.</h1>
        <p style={{ color: BRAND.wine, fontStyle: "italic", fontSize: 15, margin: 0 }}>Escolha seus molhos e agende a retirada</p>
      </div>

      <div style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 14, padding: 16, marginBottom: 26 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.green, marginBottom: 8 }}>Já é cliente? Informe seu WhatsApp para ver seu histórico e fidelidade</div>
        <input value={historyPhone} onChange={(e) => setHistoryPhone(e.target.value)} placeholder="(14) 99999-9999" style={{ width: "100%", maxWidth: 320, padding: "9px 12px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 14, color: BRAND.green }} />

        {isAdminPhone ? (
          <AdminGate onSubmit={(password) => onAdminLogin(historyPhone, password)} />
        ) : (
          historyOrders && (historyOrders.length === 0 ? (
            <p style={{ fontSize: 13, color: "#5F5E5A", marginTop: 10 }}>Nenhum pedido encontrado com esse telefone ainda.</p>
          ) : (
            <div style={{ marginTop: 14 }}>
              {historyLoyalty && (
                <div style={{ marginBottom: 12, padding: "10px 12px", background: BRAND.cream, borderRadius: 10, fontSize: 13, color: BRAND.green }}>
                  <strong>Cartão fidelidade:</strong> {historyLoyalty.count % LOYALTY_GOAL}/{LOYALTY_GOAL} molhos — {Math.floor(historyLoyalty.count / LOYALTY_GOAL)} molho(s) grátis já conquistado(s)
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {historyOrders.map((o) => (
                  <div key={o.id} style={{ borderBottom: "1px solid " + BRAND.creamDark, paddingBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 13, gap: 8 }}>
                      <span>{orderItemsLabel(o, productById, sizeById)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div style={{ fontSize: 11.5, color: "#5F5E5A", marginTop: 3 }}>Pedido feito em {fmtDate(o.createdAt)} · Retirada em {fmtDate(o.scheduledDate)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18, marginBottom: 30 }}>
        {products.filter((p) => p.active).map((p) => (
          <div key={p.id} style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 16, padding: 16, display: "flex", gap: 12 }}>
            <SauceJar color={p.color} size={54} imageUrl={p.imageUrl} />
            <div style={{ flex: 1 }}>
              <div className="rdc-serif" style={{ fontSize: 16, color: BRAND.green }}>{p.name}</div>
              <Tag tag={p.tag} />
              <p style={{ fontSize: 12.5, color: "#5F5E5A", margin: "6px 0 10px", lineHeight: 1.4 }}>{p.description}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {p.sizes.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: BRAND.wine, display: "inline-block", flexShrink: 0 }} />
                      {s.label} — <strong>{fmtMoney(s.price)}</strong>
                    </span>
                    {s.stock === 0 && p.tag !== "ENCOMENDA" ? (
                      <span style={{ fontSize: 11.5, color: BRAND.wine, fontWeight: 600 }}>Sem estoque</span>
                    ) : (
                      <button onClick={() => addToCart(p.id, s.id)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "1px solid " + BRAND.wine, color: BRAND.wine, background: "transparent", fontWeight: 600 }}>Adicionar</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div style={{ background: BRAND.green, color: BRAND.cream, borderRadius: 16, padding: 20 }}>
          <div className="rdc-serif" style={{ fontSize: 17, marginBottom: 10 }}>Seu pedido</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {cart.map((item) => {
              const p = productById(item.productId);
              const s = sizeById(p, item.sizeId);
              return (
                <div key={item.productId + item.sizeId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
                  <span>{p.name} ({s.label})</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => changeCartQty(item.productId, item.sizeId, -1)} style={{ background: "transparent", border: "1px solid " + BRAND.cream, color: BRAND.cream, borderRadius: 6, width: 24, height: 24 }}>-</button>
                    <span>{item.qty}</span>
                    <button onClick={() => changeCartQty(item.productId, item.sizeId, 1)} style={{ background: "transparent", border: "1px solid " + BRAND.cream, color: BRAND.cream, borderRadius: 6, width: 24, height: 24 }}>+</button>
                    <span style={{ width: 70, textAlign: "right" }}>{fmtMoney(s.price * item.qty)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 10, marginBottom: 16 }}>
            <span>Total</span><span>{fmtMoney(cartTotal)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu nome" style={{ padding: "9px 12px", borderRadius: 8, border: "none", fontSize: 14, color: BRAND.green }} />
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Seu WhatsApp" style={{ padding: "9px 12px", borderRadius: 8, border: "none", fontSize: 14, color: BRAND.green }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, marginBottom: 6, opacity: 0.9 }}>Escolha o dia de retirada</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {dates.map((d) => (
                <button key={d} onClick={() => setScheduledDate(d)} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "1px solid " + BRAND.cream, background: scheduledDate === d ? BRAND.cream : "transparent", color: scheduledDate === d ? BRAND.green : BRAND.cream, fontWeight: 600 }}>{fmtDate(d)}</button>
              ))}
              {dates.length === 0 && <span style={{ fontSize: 12.5, opacity: 0.8 }}>Nenhum dia disponível no momento.</span>}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, marginBottom: 6, opacity: 0.9 }}>Como prefere pagar?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPaymentMethod("retirada")} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12.5, border: "1px solid " + BRAND.cream, background: paymentMethod === "retirada" ? BRAND.cream : "transparent", color: paymentMethod === "retirada" ? BRAND.green : BRAND.cream, fontWeight: 600 }}>Pagar na retirada</button>
              <button onClick={() => setPaymentMethod("pix_antecipado")} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12.5, border: "1px solid " + BRAND.cream, background: paymentMethod === "pix_antecipado" ? BRAND.cream : "transparent", color: paymentMethod === "pix_antecipado" ? BRAND.green : BRAND.cream, fontWeight: 600 }}>PIX antecipado</button>
            </div>
            {paymentMethod === "pix_antecipado" && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>Você recebe a chave PIX na confirmação do pedido.</div>}
          </div>

          {cartError && <div style={{ background: "rgba(255,255,255,0.15)", color: "#F7C1C1", fontSize: 12.5, padding: "8px 10px", borderRadius: 8, marginBottom: 10 }}>{cartError}</div>}
          <button disabled={submitting} onClick={submitOrder} style={{ width: "100%", padding: "12px", borderRadius: 24, border: "none", background: BRAND.wine, color: "#fff", fontWeight: 700, fontSize: 14.5, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enviando..." : "Confirmar pedido"}
          </button>
        </div>
      )}
    </div>
  );
}
