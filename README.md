# Receita da Casa — CRM de Molhos Artesanais (com banco de dados)

Agora o sistema guarda tudo de verdade: pedidos, clientes, estoque e catálogo
ficam salvos num banco Postgres (o banco integrado da própria Vercel), então
não importa de qual celular o cliente compra — tudo cai no mesmo lugar, pro
painel da gestora, e nada se perde ao atualizar a página.

## Acesso da gestora
- Na página pública, no campo "Já é cliente? Informe seu WhatsApp", digite: **51981077705**
- Vai aparecer um campo de senha. Senha: **1234**
- Dá pra trocar telefone e senha depois, direto na aba **Clientes** do painel (ou editando a tabela `settings` no banco)

---

## Passo a passo — publicar na Vercel com banco de dados

### 1. Criar conta e subir o projeto
1. Extraia este ZIP numa pasta no computador
2. Acesse **https://vercel.com** e crie uma conta (pode ser com o Google)
3. A forma mais simples de manter isso atualizável é subir pro GitHub primeiro:
   - Crie um repositório novo (pode ser privado) em **https://github.com/new**
   - Na pasta do projeto, rode:
     ```
     git init
     git add .
     git commit -m "Receita da Casa CRM"
     git branch -M main
     git remote add origin <link-do-seu-repositorio>
     git push -u origin main
     ```
4. No painel da Vercel, clique em **Add New → Project**
5. Escolha **Import Git Repository** e selecione o repositório que você criou
6. Ainda **NÃO** clique em Deploy — antes vamos criar o banco (próximo passo). Se já tiver clicado, sem problema, é só voltar aqui depois.

### 2. Criar o banco de dados Postgres
1. Dentro do seu projeto na Vercel, vá na aba **Storage** (no menu de cima)
2. Clique em **Create Database**
3. A Vercel vai te mostrar opções do **Marketplace** — escolha **Neon** (é um Postgres sério e tem plano gratuito; é o mesmo banco que a Vercel usava internamente quando tinha um "Postgres" próprio)
4. Dê um nome (ex: `receita-da-casa-db`) e siga os passos de criação
5. Na tela de conexão, selecione o seu projeto "receita-da-casa-crm" para conectar o banco a ele
   - Isso preenche as variáveis de ambiente automaticamente (`DATABASE_URL` e, por compatibilidade, `POSTGRES_URL`) — você não precisa copiar/colar nenhuma senha de banco

### 3. Criar o armazenamento de fotos (Vercel Blob)
1. Ainda na aba **Storage**, clique em **Create Database** de novo
2. Dessa vez escolha **Blob** (é o espaço de arquivos da própria Vercel — é onde as fotos dos molhos ficam guardadas)
3. Dê um nome (ex: `receita-da-casa-fotos`) e siga os passos de criação
4. Conecte esse Blob ao mesmo projeto "receita-da-casa-crm"
   - Isso preenche a variável `BLOB_READ_WRITE_TOKEN` automaticamente — de novo, nada pra copiar/colar

### 4. Criar as tabelas do banco
1. Volte no banco Postgres/Neon que você criou no passo 2
2. Procure a aba **Query** (ou "Data" → "Query") — é um editor de SQL dentro do próprio site da Vercel
3. Abra o arquivo `scripts/schema.sql` (está dentro deste ZIP) no bloco de notas, copie **todo o conteúdo**
4. Cole no editor de consultas da Vercel e clique em **Run** / **Execute**
5. Isso cria todas as tabelas (produtos, pedidos, clientes, agenda, configurações) e já deixa 3 molhos de exemplo, o telefone/senha da gestora e alguns dias de agenda cadastrados

### 5. Configurar o segredo de login
1. No seu projeto na Vercel, vá em **Settings → Environment Variables**
2. Adicione uma variável:
   - Nome: `SESSION_SECRET`
   - Valor: qualquer texto aleatório e único (ex: `rdc-2026-xk92mm-segredo`)
3. Salve

### 6. Publicar
1. Volte na aba **Deployments** do projeto e clique em **Redeploy** (ou finalize o deploy que ficou pendente no passo 1)
2. Aguarde a publicação terminar
3. Você recebe um link tipo `receita-da-casa.vercel.app` — esse é o link pra mandar pros clientes

Pronto! A partir daqui, qualquer atualização que você (ou eu) enviar pro GitHub, a Vercel republica sozinha.

---

## Testando localmente (opcional, avançado)
Se tiver Node.js instalado e quiser rodar no seu computador antes de publicar:
```
npm install
npx vercel link          # conecta a pasta ao projeto criado na Vercel
npx vercel env pull .env.local   # baixa a POSTGRES_URL e o SESSION_SECRET
npm run dev
```
Abre em `http://localhost:3000`

## Estrutura do projeto
```
receita-da-casa-crm/
├── pages/
│   ├── index.js         ← página única (cliente + painel da gestora)
│   ├── _app.js
│   └── api/              ← toda a lógica de banco de dados fica aqui
│       ├── products/
│       ├── orders/
│       ├── admin/
│       ├── clients.js
│       ├── dates.js
│       └── settings.js
├── components/
│   ├── ClienteView.js
│   ├── AdminView.js
│   └── ui.js
├── lib/                   ← funções utilitárias e conexão com o banco
├── scripts/
│   ├── schema.sql         ← cole isso no editor SQL da Vercel
│   └── setup-db.js        ← alternativa via linha de comando
└── styles/globals.css
```

## O que ainda fica de fora desta versão
- Envio 100% automático de WhatsApp (sem a gestora precisar clicar em "Enviar"): isso exige a API oficial do WhatsApp Business, que é uma integração paga à parte
