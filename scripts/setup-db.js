// Alternativa em linha de comando ao "colar o schema.sql no editor da Vercel".
// Rode com: npm run db:setup
// Precisa que POSTGRES_URL ou DATABASE_URL estejam disponíveis (ex: depois de
// "vercel env pull .env.local", carregando com dotenv, ou "vercel dev" que já
// injeta as envs automaticamente).
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Nenhuma POSTGRES_URL ou DATABASE_URL encontrada no ambiente.");
    process.exit(1);
  }
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const client = new Client({
    connectionString,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Conectado ao banco. Criando tabelas e dados iniciais...");
  await client.query(schema);
  console.log("Pronto! Tabelas criadas e dados de exemplo inseridos.");
  await client.end();
}

main().catch((err) => {
  console.error("Erro ao configurar o banco:", err);
  process.exit(1);
});
