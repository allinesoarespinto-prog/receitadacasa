import { useMemo, useState } from "react";
import { Plus, X, LogOut, Pencil, Send, KeyRound } from "lucide-react";
import { BRAND, SauceJar, Tag, StatusBadge, PaymentBadge, WhatsAppButton, KpiCard } from "./ui";
import {
  fmtDate, fmtMoney, onlyDigits, orderTotal, orderCost, orderItemsLabel,
  displayPhone, makeProductLookups, isSameMonth, inRange, addDays, todayISO,
  STATUS_ORDER, LOYALTY_GOAL, PAYMENT_LABEL,
} from "../lib/utils";

export default function AdminView({
  products, orders, clients, dates, settings,
  onAddProduct, onEditProduct, onDeleteProduct, onToggleTag, onToggleActive, onUpdateSizeField,
  onAdvanceStatus, onTogglePaid,
  onAddDate, onRemoveDate,
  onAddManualClient,
  onSaveSettings,
  onChangeCredentials,
  onLogout,
}) {
  const [tab, setTab] = useState("pedidos");
  const { productById, sizeById } = makeProductLookups(products);

  const lowStockAlerts = useMemo(() => {
    const alerts = [];
    products.forEach((p) => p.sizes.forEach((s) => {
      if (s.stock === 0) alerts.push({ product: p.name, size: s.label, level: "zerado" });
      else if (s.stock <= 2) alerts.push({ product: p.name, size: s.label, level: "baixo" });
    }));
    return alerts;
  }, [products]);

  const loyaltyByPhone = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (o.status !== "entregue") return;
      if (!map[o.phone]) map[o.phone] = { name: o.customerName, phone: o.phone, count: 0 };
      map[o.phone].count += o.items.reduce((s, i) => s + i.qty, 0);
      map[o.phone].name = o.customerName;
    });
    return map;
  }, [orders]);

  const ranking = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (o.status !== "entregue") return;
      o.items.forEach((it) => {
        if (!map[it.productId]) map[it.productId] = { qty: 0, revenue: 0, cost: 0 };
        const p = productById(it.productId);
        const s = sizeById(p, it.sizeId);
        map[it.productId].qty += it.qty;
        map[it.productId].revenue += (s?.price || 0) * it.qty;
        map[it.productId].cost += (s?.cost || 0) * it.qty;
      });
    });
    return Object.entries(map)
      .map(([productId, data]) => ({ product: productById(productId), ...data, profit: data.revenue - data.cost }))
      .filter((r) => r.product)
      .sort((a, b) => b.qty - a.qty);
  }, [orders, products]);

  const monthly = useMemo(() => {
    const monthOrders = orders.filter((o) => o.status === "entregue" && isSameMonth(o.createdAt));
    const revenue = monthOrders.reduce((s, o) => s + orderTotal(o, productById, sizeById), 0);
    const cost = monthOrders.reduce((s, o) => s + orderCost(o, productById, sizeById), 0);
    return { count: monthOrders.length, revenue, cost, profit: revenue - cost };
  }, [orders, products]);

  const loyaltyKPI = useMemo(() => {
    const totalClients = clients.length;
    const recurring = clients.filter((c) => c.orderCount > 1).length;
    const rate = totalClients ? Math.round((recurring / totalClients) * 100) : 0;
    return { totalClients, recurring, rate };
  }, [clients]);

  const tabs = [
    { id: "pedidos", label: "Pedidos" },
    { id: "clientes", label: "Clientes" },
    { id: "catalogo", label: "Catálogo" },
    { id: "central", label: "Central" },
    { id: "relatorios", label: "Relatórios" },
    { id: "agenda", label: "Agenda" },
    { id: "fidelidade", label: "Fidelidade" },
  ];

  return (
    <div style={{ maxWidth: 1050, margin: "0 auto", padding: "24px 20px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid " + BRAND.creamDark, background: tab === t.id ? BRAND.green : BRAND.paper, color: tab === t.id ? BRAND.cream : BRAND.green, fontSize: 13.5, fontWeight: 600, position: "relative" }}>
              {t.label}
              {t.id === "central" && lowStockAlerts.length > 0 && <span style={{ marginLeft: 6, background: BRAND.wine, color: "#fff", borderRadius: 10, fontSize: 10.5, padding: "1px 6px" }}>{lowStockAlerts.length}</span>}
            </button>
          ))}
        </div>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 20, border: "1px solid " + BRAND.creamDark, background: "transparent", color: BRAND.green, fontSize: 12.5 }}>
          <LogOut size={14} /> Sair
        </button>
      </div>

      {tab === "pedidos" && <PedidosTab orders={orders} onAdvanceStatus={onAdvanceStatus} onTogglePaid={onTogglePaid} productById={productById} sizeById={sizeById} pixKey={settings.pixKey} />}
      {tab === "clientes" && <ClientesTab clients={clients} settings={settings} onSaveSettings={onSaveSettings} onAddManualClient={onAddManualClient} onChangeCredentials={onChangeCredentials} />}
      {tab === "catalogo" && <CatalogoTab products={products} onAddProduct={onAddProduct} onEditProduct={onEditProduct} onDeleteProduct={onDeleteProduct} onToggleTag={onToggleTag} onToggleActive={onToggleActive} />}
      {tab === "central" && <CentralTab products={products} onUpdateSizeField={onUpdateSizeField} lowStockAlerts={lowStockAlerts} ranking={ranking} monthly={monthly} loyaltyKPI={loyaltyKPI} />}
      {tab === "relatorios" && <RelatoriosTab orders={orders} productById={productById} sizeById={sizeById} />}
      {tab === "agenda" && <AgendaTab dates={dates} onAddDate={onAddDate} onRemoveDate={onRemoveDate} />}
      {tab === "fidelidade" && <FidelidadeTab loyaltyByPhone={loyaltyByPhone} />}
    </div>
  );
}

function PedidosTab({ orders, onAdvanceStatus, onTogglePaid, productById, sizeById, pixKey }) {
  const columns = STATUS_ORDER.map((s) => ({ status: s, orders: orders.filter((o) => o.status === s).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) }));

  function statusMessage(o, targetStatus) {
    if (targetStatus === "aceito") return `Olá ${o.customerName}! Seu pedido foi aceito 🍅 Retirada agendada para ${fmtDate(o.scheduledDate)}. Total: ${fmtMoney(orderTotal(o, productById, sizeById))}.`;
    if (targetStatus === "entregue") return `Olá ${o.customerName}! Seu pedido está pronto/entregue. Obrigado pela preferência! ❤️`;
    return `Olá ${o.customerName}!`;
  }
  function pixMessage(o) {
    return `Olá ${o.customerName}! Para confirmar seu pedido antecipado, segue a chave PIX da Receita da Casa: ${pixKey}. Valor: ${fmtMoney(orderTotal(o, productById, sizeById))}. Assim que o pagamento cair te aviso por aqui! ❤️`;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      {columns.map((col) => (
        <div key={col.status} style={{ background: BRAND.paper, borderRadius: 14, padding: 12, border: "1px solid " + BRAND.creamDark, minHeight: 200 }}>
          <div style={{ marginBottom: 10 }}><StatusBadge status={col.status} /><span style={{ marginLeft: 8, fontSize: 12, color: "#5F5E5A" }}>({col.orders.length})</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {col.orders.map((o) => (
              <div key={o.id} style={{ background: BRAND.cream, borderRadius: 10, padding: 10, fontSize: 12.5 }}>
                <div style={{ fontWeight: 700, color: BRAND.green }}>{o.customerName}</div>
                <div style={{ color: "#5F5E5A", marginBottom: 4 }}>{displayPhone(o.phone)}</div>
                <div style={{ color: "#5F5E5A", marginBottom: 4 }}>{orderItemsLabel(o, productById, sizeById)}</div>
                <div style={{ color: BRAND.wine, marginBottom: 6 }}>Retirada: {fmtDate(o.scheduledDate)}</div>
                <div style={{ marginBottom: 8 }}>
                  <button onClick={() => onTogglePaid(o)} style={{ border: "none", background: "transparent", padding: 0 }} title="Clique para marcar pago/pendente">
                    <PaymentBadge method={o.paymentMethod} paid={o.paid} />
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <WhatsAppButton phone={o.phone} message={statusMessage(o, col.status === "feito" ? "aceito" : "entregue")} small label="Avisar cliente" />
                  {o.paymentMethod === "pix_antecipado" && !o.paid && (
                    <WhatsAppButton phone={o.phone} message={pixMessage(o)} small label="Enviar PIX" icon={<Send size={11} />} />
                  )}
                  {col.status !== "entregue" && (
                    <button onClick={() => onAdvanceStatus(o)} style={{ flex: 1, padding: "6px 8px", borderRadius: 8, border: "none", background: BRAND.green, color: BRAND.cream, fontSize: 11.5, fontWeight: 600 }}>
                      {col.status === "feito" ? "Aceitar →" : "Entregue →"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {col.orders.length === 0 && <div style={{ fontSize: 12, color: "#B4B2A9", textAlign: "center", padding: "16px 0" }}>Sem pedidos aqui</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientesTab({ clients, settings, onSaveSettings, onAddManualClient, onChangeCredentials }) {
  const [defaultDDD, setDefaultDDD] = useState(settings.defaultDDD);
  const [pixKey, setPixKey] = useState(settings.pixKey);
  const [showAdd, setShowAdd] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: BRAND.green }}>DDD padrão (telefone sem DDD):</span>
            <input value={defaultDDD} onChange={(e) => setDefaultDDD(onlyDigits(e.target.value).slice(0, 2))} onBlur={() => onSaveSettings({ defaultDDD })} style={{ width: 50, padding: "6px 8px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: BRAND.green }}>Chave PIX da loja:</span>
            <input value={pixKey} onChange={(e) => setPixKey(e.target.value)} onBlur={() => onSaveSettings({ pixKey })} style={{ width: 200, padding: "6px 8px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
          </div>
          <button onClick={() => setShowCredentials((v) => !v)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, background: "transparent", color: BRAND.green }}>
            <KeyRound size={13} /> Trocar telefone/senha de acesso
          </button>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 20, border: "none", background: BRAND.wine, color: "#fff", fontSize: 13, fontWeight: 700 }}>
          <Plus size={15} /> Adicionar cliente
        </button>
      </div>

      {showCredentials && <ChangeCredentialsForm onCancel={() => setShowCredentials(false)} onSave={onChangeCredentials} />}


      {showAdd && (
        <AddClientForm
          onCancel={() => setShowAdd(false)}
          onSave={async (name, phone) => { await onAddManualClient(name, phone); setShowAdd(false); }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {clients.map((c) => (
          <div key={c.phone} style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 12, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14 }}>{c.name}</div>
              <div style={{ fontSize: 12.5, color: "#5F5E5A" }}>{displayPhone(c.phone)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12.5, color: BRAND.green }}>{c.orderCount} pedido(s)</div>
                <div style={{ fontSize: 12.5, color: "#5F5E5A" }}>{fmtMoney(c.totalSpent)} em compras</div>
              </div>
              <WhatsAppButton phone={c.phone} message={`Olá ${c.name}, aqui é da Receita da Casa!`} />
            </div>
          </div>
        ))}
        {clients.length === 0 && <span style={{ fontSize: 13, color: "#888780" }}>Nenhum cliente cadastrado ainda.</span>}
      </div>
    </div>
  );
}

function AddClientForm({ onCancel, onSave }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  async function handleSave() {
    if (!name.trim()) return setError("Informe o nome do cliente.");
    if (onlyDigits(phone).length < 8) return setError("Informe um telefone válido.");
    await onSave(name, phone);
  }
  return (
    <div style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14.5 }}>Novo cliente</div>
        <button onClick={onCancel} style={{ border: "none", background: "transparent", color: "#888780" }}><X size={16} /></button>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" style={{ flex: 1, minWidth: 160, padding: "9px 12px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13.5 }} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp" style={{ flex: 1, minWidth: 160, padding: "9px 12px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13.5 }} />
      </div>
      {error && <div style={{ fontSize: 12.5, color: BRAND.wine, marginTop: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={handleSave} style={{ padding: "9px 18px", borderRadius: 20, border: "none", background: BRAND.wine, color: "#fff", fontWeight: 700, fontSize: 13.5 }}>Salvar cliente</button>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 20, border: "1px solid " + BRAND.creamDark, background: "transparent", color: BRAND.green, fontSize: 13.5 }}>Cancelar</button>
      </div>
    </div>
  );
}

function ChangeCredentialsForm({ onCancel, onSave }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(""); setSuccess(false);
    if (!currentPassword.trim()) return setError("Informe a senha atual.");
    if (!newPhone.trim() && !newPassword.trim()) return setError("Preencha o novo telefone e/ou a nova senha.");
    if (newPassword && newPassword !== confirmPassword) return setError("A confirmação não bate com a nova senha.");
    setSaving(true);
    const result = await onSave(currentPassword, newPhone.trim(), newPassword.trim());
    setSaving(false);
    if (!result?.ok) {
      setError(result?.error || "Não foi possível trocar. Confira a senha atual.");
      return;
    }
    setSuccess(true);
    setCurrentPassword(""); setNewPhone(""); setNewPassword(""); setConfirmPassword("");
  }

  return (
    <div style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 14, padding: 16, marginBottom: 16, maxWidth: 420 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14.5 }}>Trocar telefone/senha de acesso</div>
        <button onClick={onCancel} style={{ border: "none", background: "transparent", color: "#888780" }}><X size={16} /></button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Senha atual" style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13.5 }} />
        <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Novo telefone (deixe em branco pra manter)" style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13.5 }} />
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha (deixe em branco pra manter)" style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13.5 }} />
        {newPassword && (
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirme a nova senha" style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13.5 }} />
        )}
        {error && <div style={{ fontSize: 12.5, color: BRAND.wine }}>{error}</div>}
        {success && <div style={{ fontSize: 12.5, color: "#3B6D11" }}>Atualizado! Use os novos dados no próximo login.</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={saving} onClick={handleSave} style={{ padding: "9px 18px", borderRadius: 20, border: "none", background: BRAND.wine, color: "#fff", fontWeight: 700, fontSize: 13.5, opacity: saving ? 0.7 : 1 }}>{saving ? "Salvando..." : "Salvar"}</button>
          <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 20, border: "1px solid " + BRAND.creamDark, background: "transparent", color: BRAND.green, fontSize: 13.5 }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

function CatalogoTab({ products, onAddProduct, onEditProduct, onDeleteProduct, onToggleTag, onToggleActive }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button onClick={() => setShowAdd(true)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 20, border: "none", background: BRAND.wine, color: "#fff", fontSize: 13, fontWeight: 700 }}>
        <Plus size={15} /> Cadastrar novo molho
      </button>

      {showAdd && <ProductForm title="Novo molho" onCancel={() => setShowAdd(false)} onSave={async (data) => { await onAddProduct(data); setShowAdd(false); }} />}
      {editing && <ProductForm title={`Editar ${editing.name}`} initial={editing} onCancel={() => setEditing(null)} onSave={async (data) => { await onEditProduct(editing.id, data); setEditing(null); }} />}

      {products.map((p) => (
        <div key={p.id} style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 14, padding: 14, display: "flex", gap: 14, alignItems: "center", opacity: p.active ? 1 : 0.5 }}>
          <SauceJar color={p.color} size={48} imageUrl={p.imageUrl} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14.5 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: "#5F5E5A", margin: "3px 0 8px" }}>{p.description}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {p.sizes.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: BRAND.green }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: BRAND.wine, display: "inline-block", flexShrink: 0 }} />
                  {s.label} · venda {fmtMoney(s.price)} · custo {fmtMoney(s.cost)} · estoque {s.stock}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <button onClick={() => onToggleTag(p)} style={{ border: "none", background: "transparent", padding: 0 }} title="Clique para alternar a tag"><Tag tag={p.tag} /></button>
            <button onClick={() => setEditing(p)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, padding: "5px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, background: "transparent", color: BRAND.green }}><Pencil size={12} /> Editar</button>
            <button onClick={() => onToggleActive(p)} style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, background: "transparent", color: BRAND.green }}>{p.active ? "Pausar produto" : "Ativar produto"}</button>
            <button onClick={() => onDeleteProduct(p.id)} style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 8, border: "1px solid #F0B0B0", background: "transparent", color: "#791F1F" }}>Excluir</button>
          </div>
        </div>
      ))}
      <p style={{ fontSize: 12, color: "#888780" }}>Ao editar ou cadastrar um molho, envie a foto direto do celular ou computador pra trocar o ícone ilustrativo pela foto real.</p>
    </div>
  );
}

function ProductForm({ title, initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || "");
  const [tag, setTag] = useState(initial?.tag || "PRONTA_ENTREGA");
  const [sizes, setSizes] = useState(
    initial?.sizes?.map((s) => ({ id: s.id, label: s.label, price: String(s.price), cost: String(s.cost ?? ""), stock: String(s.stock) }))
    || [{ label: "200ml", price: "", cost: "", stock: "" }]
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
      });
      if (!res.ok) throw new Error("upload falhou");
      const data = await res.json();
      setImageUrl(data.url);
    } catch (err) {
      setUploadError("Não deu pra enviar a foto agora. Tenta de novo.");
    } finally {
      setUploading(false);
    }
  }

  function updateSize(i, field, value) { setSizes((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s))); }
  function addSizeRow() { setSizes((prev) => [...prev, { label: "", price: "", cost: "", stock: "" }]); }
  function removeSizeRow(i) { setSizes((prev) => prev.filter((_, idx) => idx !== i)); }

  async function handleSave() {
    if (!name.trim()) return setError("Dê um nome ao molho.");
    const validSizes = sizes.filter((s) => s.label.trim() && s.price !== "");
    if (validSizes.length === 0) return setError("Cadastre pelo menos um tamanho/peso com preço.");
    setSaving(true);
    await onSave({
      name: name.trim(),
      description: description.trim(),
      tag,
      imageUrl: imageUrl.trim(),
      sizes: validSizes.map((s) => ({ id: s.id, label: s.label.trim(), price: parseFloat(s.price) || 0, cost: parseFloat(s.cost) || 0, stock: parseInt(s.stock, 10) || 0 })),
    });
    setSaving(false);
  }

  return (
    <div style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14.5 }}>{title}</div>
        <button onClick={onCancel} style={{ border: "none", background: "transparent", color: "#888780" }}><X size={16} /></button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do molho" style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13.5 }} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" rows={2} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13.5, resize: "vertical" }} />
        <div>
          <div style={{ fontSize: 12.5, color: BRAND.green, fontWeight: 600, marginBottom: 6 }}>Foto do molho</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {imageUrl ? (
              <img src={imageUrl} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, border: "1px solid " + BRAND.creamDark }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 10, border: "1px dashed " + BRAND.creamDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#B4B2A9", textAlign: "center" }}>sem foto</div>
            )}
            <div style={{ flex: 1 }}>
              <input type="file" accept="image/*" onChange={handleFileSelect} style={{ fontSize: 12.5 }} />
              {uploading && <div style={{ fontSize: 11.5, color: BRAND.green, marginTop: 4 }}>Enviando foto...</div>}
              {uploadError && <div style={{ fontSize: 11.5, color: BRAND.wine, marginTop: 4 }}>{uploadError}</div>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><input type="radio" checked={tag === "PRONTA_ENTREGA"} onChange={() => setTag("PRONTA_ENTREGA")} /> Pronta entrega</label>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><input type="radio" checked={tag === "ENCOMENDA"} onChange={() => setTag("ENCOMENDA")} /> Encomenda</label>
        </div>
        <div style={{ fontSize: 12.5, color: BRAND.green, fontWeight: 600 }}>Tamanhos/pesos, preço de venda e custo</div>
        {sizes.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={s.label} onChange={(e) => updateSize(i, "label", e.target.value)} placeholder="Tamanho/peso (ex: 200ml)" style={{ flex: 1, minWidth: 120, padding: "8px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
            <input value={s.price} onChange={(e) => updateSize(i, "price", e.target.value)} placeholder="Preço venda" type="number" style={{ width: 90, padding: "8px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
            <input value={s.cost} onChange={(e) => updateSize(i, "cost", e.target.value)} placeholder="Custo" type="number" style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
            <input value={s.stock} onChange={(e) => updateSize(i, "stock", e.target.value)} placeholder="Estoque" type="number" style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
            {sizes.length > 1 && <button onClick={() => removeSizeRow(i)} style={{ border: "none", background: "transparent", color: BRAND.wine }}><X size={16} /></button>}
          </div>
        ))}
        <button onClick={addSizeRow} style={{ alignSelf: "flex-start", fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, background: "transparent", color: BRAND.green }}>+ Adicionar tamanho</button>
        {error && <div style={{ fontSize: 12.5, color: BRAND.wine }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={saving} onClick={handleSave} style={{ flex: 1, padding: "10px", borderRadius: 20, border: "none", background: BRAND.wine, color: "#fff", fontWeight: 700, fontSize: 13.5, opacity: saving ? 0.7 : 1 }}>{saving ? "Salvando..." : "Salvar molho"}</button>
          <button onClick={onCancel} style={{ padding: "10px 16px", borderRadius: 20, border: "1px solid " + BRAND.creamDark, background: "transparent", color: BRAND.green, fontSize: 13.5 }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function CentralTab({ products, onUpdateSizeField, lowStockAlerts, ranking, monthly, loyaltyKPI }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Faturamento no mês" value={fmtMoney(monthly.revenue)} />
        <KpiCard label="Custo no mês" value={fmtMoney(monthly.cost)} />
        <KpiCard label="Lucro no mês" value={fmtMoney(monthly.profit)} highlight />
        <KpiCard label="Pedidos entregues" value={monthly.count} />
        <KpiCard label="Molho mais vendido" value={ranking[0]?.product?.name || "-"} small />
        <KpiCard label="Fidelidade de clientes" value={`${loyaltyKPI.rate}% recorrentes`} />
      </div>

      {ranking.length > 0 && (
        <div style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 14, padding: 16, marginBottom: 18, overflowX: "auto" }}>
          <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14.5, marginBottom: 10 }}>Ranking de mais vendidos</div>
          {ranking.map((r, i) => (
            <div key={r.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < ranking.length - 1 ? "1px solid " + BRAND.creamDark : "none", fontSize: 13, gap: 10 }}>
              <span><strong>{i + 1}.</strong> {r.product.name}</span>
              <span style={{ color: "#5F5E5A", whiteSpace: "nowrap" }}>{r.qty} un. · venda {fmtMoney(r.revenue)} · custo {fmtMoney(r.cost)} · lucro <strong style={{ color: BRAND.green }}>{fmtMoney(r.profit)}</strong></span>
            </div>
          ))}
        </div>
      )}

      {lowStockAlerts.length > 0 && (
        <div style={{ background: "#FCEBEB", border: "1px solid #F0B0B0", borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, color: "#791F1F", fontSize: 13.5, marginBottom: 6 }}>Atenção ao estoque</div>
          {lowStockAlerts.map((a, i) => (<div key={i} style={{ fontSize: 12.5, color: "#791F1F" }}>{a.product} ({a.size}) — {a.level === "zerado" ? "estoque zerado" : "estoque baixo"}</div>))}
        </div>
      )}

      <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14.5, marginBottom: 10 }}>Estoque, preço de venda e custo</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 14, padding: 14 }}>
            <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14, marginBottom: 8 }}>{p.name}</div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {p.sizes.map((s) => (
                <SizeFieldsRow key={s.id} product={p} size={s} onUpdateSizeField={onUpdateSizeField} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SizeFieldsRow({ product, size, onUpdateSizeField }) {
  const [price, setPrice] = useState(size.price);
  const [cost, setCost] = useState(size.cost);
  const [stock, setStock] = useState(size.stock);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{size.label}</span>
      <span style={{ fontSize: 11, color: "#888780" }}>venda</span>
      <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => onUpdateSizeField(product.id, size.id, "price", parseFloat(price) || 0)} style={{ width: 68, padding: "6px 8px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
      <span style={{ fontSize: 11, color: "#888780" }}>custo</span>
      <input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} onBlur={() => onUpdateSizeField(product.id, size.id, "cost", parseFloat(cost) || 0)} style={{ width: 68, padding: "6px 8px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
      <span style={{ fontSize: 11, color: "#888780" }}>estoque</span>
      <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} onBlur={() => onUpdateSizeField(product.id, size.id, "stock", parseInt(stock, 10) || 0)} style={{ width: 58, padding: "6px 8px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
      {Number(stock) === 0 && <span style={{ fontSize: 11, color: BRAND.wine }}>zerado</span>}
    </div>
  );
}

function RelatoriosTab({ orders, productById, sizeById }) {
  const [from, setFrom] = useState(addDays(-30));
  const [to, setTo] = useState(todayISO());

  const filtered = useMemo(() => orders.filter((o) => inRange(o.createdAt, from, to)), [orders, from, to]);
  const delivered = filtered.filter((o) => o.status === "entregue");
  const revenue = delivered.reduce((s, o) => s + orderTotal(o, productById, sizeById), 0);
  const cost = delivered.reduce((s, o) => s + orderCost(o, productById, sizeById), 0);
  const profit = revenue - cost;
  const avgTicket = delivered.length ? revenue / delivered.length : 0;
  const uniqueClients = new Set(filtered.map((o) => o.phone)).size;

  return (
    <div>
      <div style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 12, padding: 14, marginBottom: 18, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: BRAND.green }}>De</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: BRAND.green }}>Até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Pedidos no período" value={filtered.length} />
        <KpiCard label="Entregues no período" value={delivered.length} />
        <KpiCard label="Faturamento" value={fmtMoney(revenue)} />
        <KpiCard label="Custo" value={fmtMoney(cost)} />
        <KpiCard label="Lucro" value={fmtMoney(profit)} highlight />
        <KpiCard label="Ticket médio" value={fmtMoney(avgTicket)} />
        <KpiCard label="Clientes únicos" value={uniqueClients} />
      </div>

      <div style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 14, padding: 16, overflowX: "auto" }}>
        <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14.5, marginBottom: 10 }}>Pedidos no período</div>
        {filtered.length === 0 && <span style={{ fontSize: 13, color: "#888780" }}>Nenhum pedido nesse período.</span>}
        {[...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((o) => (
          <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid " + BRAND.creamDark, fontSize: 12.5, gap: 10 }}>
            <span>{fmtDate(o.createdAt)} · {o.customerName} — {orderItemsLabel(o, productById, sizeById)}</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}><StatusBadge status={o.status} /> {fmtMoney(orderTotal(o, productById, sizeById))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaTab({ dates, onAddDate, onRemoveDate }) {
  const [newDate, setNewDate] = useState("");
  return (
    <div style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 14, padding: 18, maxWidth: 460 }}>
      <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14.5, marginBottom: 4 }}>Dias disponíveis para retirada</div>
      <p style={{ fontSize: 12, color: "#5F5E5A", marginBottom: 14 }}>Só esses dias aparecem para o cliente escolher — você marca data por data, então dá pra abrir só um fim de semana sim e outro não.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid " + BRAND.creamDark, fontSize: 13 }} />
        <button onClick={async () => { if (!newDate) return; await onAddDate(newDate); setNewDate(""); }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: BRAND.green, color: BRAND.cream, fontSize: 13, fontWeight: 600 }}>Adicionar</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {dates.length === 0 && <span style={{ fontSize: 12.5, color: "#888780" }}>Nenhum dia cadastrado.</span>}
        {dates.map((d) => (
          <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: BRAND.cream, borderRadius: 8, padding: "8px 12px" }}>
            <span style={{ fontSize: 13 }}>{fmtDate(d)}</span>
            <button onClick={() => onRemoveDate(d)} style={{ border: "none", background: "transparent", color: BRAND.wine, fontSize: 12, fontWeight: 600 }}>Remover</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FidelidadeTab({ loyaltyByPhone }) {
  const entries = Object.values(loyaltyByPhone);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 12.5, color: "#5F5E5A", marginBottom: 6 }}>A cada {LOYALTY_GOAL} molhos comprados (contados quando o pedido é marcado como entregue), o cliente ganha 1 grátis.</p>
      {entries.length === 0 && <span style={{ fontSize: 13, color: "#888780" }}>Ainda não há compras entregues.</span>}
      {entries.map((data) => {
        const progress = data.count % LOYALTY_GOAL;
        const free = Math.floor(data.count / LOYALTY_GOAL);
        return (
          <div key={data.phone} style={{ background: BRAND.paper, border: "1px solid " + BRAND.creamDark, borderRadius: 12, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, color: BRAND.green, fontSize: 14 }}>{data.name}</div>
              <div style={{ fontSize: 12, color: "#5F5E5A" }}>{displayPhone(data.phone)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.wine }}>{progress}/{LOYALTY_GOAL} molhos</div>
                <div style={{ fontSize: 11.5, color: "#5F5E5A" }}>{free} grátis conquistado(s)</div>
              </div>
              <WhatsAppButton phone={data.phone} message={`Olá ${data.name}, aqui é da Receita da Casa!`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
