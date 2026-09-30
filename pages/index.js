import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import ClienteView from "../components/ClienteView";
import AdminView from "../components/AdminView";
import { BRAND } from "../components/ui";

async function api(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [adminAuthed, setAdminAuthed] = useState(false);

  const [products, setProducts] = useState([]);
  const [dates, setDates] = useState([]);
  const [settings, setSettings] = useState({ defaultDDD: "14", pixKey: "" });
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);

  const refreshProducts = useCallback(() => api("/api/products").then(setProducts), []);
  const refreshDates = useCallback(() => api("/api/dates").then(setDates), []);
  const refreshSettings = useCallback(() => api("/api/settings").then(setSettings), []);
  const refreshOrders = useCallback(() => api("/api/orders").then(setOrders), []);
  const refreshClients = useCallback(() => api("/api/clients").then(setClients), []);

  useEffect(() => {
    (async () => {
      await Promise.all([refreshProducts(), refreshDates(), refreshSettings()]);
      const { authenticated } = await api("/api/admin/me");
      setAdminAuthed(authenticated);
      if (authenticated) await Promise.all([refreshOrders(), refreshClients()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCheckAdminPhone(phone) {
    return api("/api/admin/check-phone", { method: "POST", body: JSON.stringify({ phone }) });
  }

  async function handleSubmitOrder(draft) {
    const result = await api("/api/orders", { method: "POST", body: JSON.stringify(draft) });
    refreshDates();
    return result;
  }

  async function handleFetchHistory(phone) {
    return api(`/api/orders/by-phone?phone=${encodeURIComponent(phone)}`);
  }

  async function doAdminLogin(phone, password) {
    const { ok } = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ phone, password }) });
    if (ok) {
      setAdminAuthed(true);
      await Promise.all([refreshOrders(), refreshClients()]);
    }
    return ok;
  }

  async function handleLogout() {
    await api("/api/admin/logout", { method: "POST" });
    setAdminAuthed(false);
  }

  // Produtos
  async function handleAddProduct(data) {
    await api("/api/products", { method: "POST", body: JSON.stringify(data) });
    await refreshProducts();
  }
  async function handleEditProduct(id, data) {
    await api(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    await refreshProducts();
  }
  async function handleDeleteProduct(id) {
    await api(`/api/products/${id}`, { method: "DELETE" });
    await refreshProducts();
  }
  async function handleToggleTag(product) {
    const newTag = product.tag === "PRONTA_ENTREGA" ? "ENCOMENDA" : "PRONTA_ENTREGA";
    await api(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ tag: newTag }) });
    await refreshProducts();
  }
  async function handleToggleActive(product) {
    await api(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ active: !product.active }) });
    await refreshProducts();
  }
  async function handleUpdateSizeField(productId, sizeId, field, value) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const newSizes = product.sizes.map((s) => (s.id === sizeId ? { ...s, [field]: value } : s));
    await api(`/api/products/${productId}`, { method: "PATCH", body: JSON.stringify({ sizes: newSizes }) });
    await refreshProducts();
  }

  // Pedidos
  async function handleAdvanceStatus(order) {
    const next = order.status === "feito" ? "aceito" : "entregue";
    await api(`/api/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    await Promise.all([refreshOrders(), refreshProducts()]);
  }
  async function handleTogglePaid(order) {
    await api(`/api/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ paid: !order.paid }) });
    await refreshOrders();
  }

  // Agenda
  async function handleAddDate(date) {
    await api("/api/dates", { method: "POST", body: JSON.stringify({ date }) });
    await refreshDates();
  }
  async function handleRemoveDate(date) {
    await api("/api/dates", { method: "DELETE", body: JSON.stringify({ date }) });
    await refreshDates();
  }

  // Clientes
  async function handleAddManualClient(name, phone) {
    await api("/api/clients", { method: "POST", body: JSON.stringify({ name, phone }) });
    await refreshClients();
  }

  // Configurações
  async function handleSaveSettings(partial) {
    await api("/api/settings", { method: "PATCH", body: JSON.stringify(partial) });
    await refreshSettings();
  }

  async function handleChangeCredentials(currentPassword, newPhone, newPassword) {
    const res = await fetch("/api/admin/change-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPhone: newPhone || undefined, newPassword: newPassword || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.ok) await refreshSettings();
    return data;
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.cream, color: BRAND.green, fontFamily: "Inter, sans-serif" }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ background: BRAND.cream, minHeight: "100vh" }}>
      <Head>
        <title>Receita da Casa - Molhos Artesanais</title>
      </Head>

      <div style={{ background: BRAND.green, color: BRAND.cream, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22 }}>♡</div>
          <div>
            <div className="rdc-serif" style={{ fontSize: 18, lineHeight: 1.1 }}>Receita da Casa</div>
            <div style={{ fontSize: 10.5, letterSpacing: 1, opacity: 0.85 }}>MOLHOS ARTESANAIS</div>
          </div>
        </div>
      </div>

      {adminAuthed ? (
        <AdminView
          products={products}
          orders={orders}
          clients={clients}
          dates={dates}
          settings={settings}
          onAddProduct={handleAddProduct}
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
          onToggleTag={handleToggleTag}
          onToggleActive={handleToggleActive}
          onUpdateSizeField={handleUpdateSizeField}
          onAdvanceStatus={handleAdvanceStatus}
          onTogglePaid={handleTogglePaid}
          onAddDate={handleAddDate}
          onRemoveDate={handleRemoveDate}
          onAddManualClient={handleAddManualClient}
          onSaveSettings={handleSaveSettings}
          onChangeCredentials={handleChangeCredentials}
          onLogout={handleLogout}
        />
      ) : (
        <ClienteView
          products={products}
          dates={dates}
          pixKey={settings.pixKey}
          onSubmitOrder={handleSubmitOrder}
          onCheckAdminPhone={handleCheckAdminPhone}
          onAdminLogin={doAdminLogin}
          onFetchHistory={handleFetchHistory}
        />
      )}
    </div>
  );
}
