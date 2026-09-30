import { Pool, types } from "pg";

// A Vercel/Neon devolve colunas DATE como objeto Date por padrão; aqui a gente
// desliga isso pra continuar recebendo "YYYY-MM-DD" como texto simples, que é
// o formato que o resto do sistema espera (comparações, fmtDate, etc).
types.setTypeParser(1082, (val) => val);

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes("localhost") ? { rejectUnauthorized: false } : undefined,
});

// Pequeno adaptador que imita a API do @vercel/postgres (sql`...` e sql.query)
// usando o pacote "pg" por baixo, já que a Vercel não oferece mais um banco
// Postgres próprio — agora é um banco Neon conectado via integração/marketplace.
function sqlTemplate(strings, ...values) {
  let text = "";
  const params = [];
  strings.forEach((s, i) => {
    text += s;
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  });
  return pool.query(text, params);
}
sqlTemplate.query = (text, params) => pool.query(text, params);

export const sql = sqlTemplate;

export function mapProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    tag: row.tag,
    active: row.active,
    color: row.color,
    imageUrl: row.image_url || "",
    sizes: row.sizes || [],
  };
}

export function mapOrderRow(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    items: row.items || [],
    scheduledDate: row.scheduled_date,
    status: row.status,
    createdAt: row.created_at,
    paymentMethod: row.payment_method,
    paid: row.paid,
  };
}
