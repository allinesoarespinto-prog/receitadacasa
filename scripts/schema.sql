-- Receita da Casa — estrutura do banco de dados
-- Cole este arquivo inteiro no editor de consultas (Query) do seu banco
-- Postgres na Vercel e clique em "Run" / "Executar".

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  default_ddd TEXT NOT NULL DEFAULT '14',
  pix_key TEXT NOT NULL DEFAULT '',
  admin_phone TEXT NOT NULL,
  admin_password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  tag TEXT NOT NULL DEFAULT 'PRONTA_ENTREGA',
  active BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT '#7A2E2E',
  image_url TEXT DEFAULT '',
  sizes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nunca apagamos pedidos: isso é o histórico permanente de compras.
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  items JSONB NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'feito',
  payment_method TEXT NOT NULL DEFAULT 'retirada',
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS manual_clients (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS available_dates (
  date DATE PRIMARY KEY
);

-- Dados iniciais -------------------------------------------------------

-- Telefone da gestora: 51981077705 · senha: 1234
-- (pode trocar os dois depois, direto no painel, aba Clientes)
INSERT INTO settings (id, default_ddd, pix_key, admin_phone, admin_password)
VALUES (1, '51', 'receitadacasa@pix.com', '5551981077705', '1234')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, name, description, tag, active, color, image_url, sizes) VALUES
('p1', 'Molho Sugo Tradicional', 'Tomate, manjericão fresco e um toque de azeite. A receita da vovó.', 'PRONTA_ENTREGA', true, '#7A2E2E', '',
  '[{"id":"p1-200","label":"200ml","price":14,"cost":6,"stock":8},{"id":"p1-500","label":"500ml","price":26,"cost":12,"stock":3}]'),
('p2', 'Molho Arrabbiata', 'Picância na medida certa, com pimenta calabresa artesanal.', 'PRONTA_ENTREGA', true, '#A23B24', '',
  '[{"id":"p2-200","label":"200ml","price":15,"cost":6.5,"stock":0},{"id":"p2-500","label":"500ml","price":28,"cost":13,"stock":5}]'),
('p3', 'Molho Bolonhesa Artesanal', 'Carne moída selecionada, cozimento lento de 4 horas.', 'ENCOMENDA', true, '#7A2E2E', '',
  '[{"id":"p3-500","label":"500ml","price":32,"cost":17,"stock":0}]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO available_dates (date) VALUES
  (CURRENT_DATE + 1), (CURRENT_DATE + 2), (CURRENT_DATE + 3), (CURRENT_DATE + 5), (CURRENT_DATE + 6)
ON CONFLICT (date) DO NOTHING;
