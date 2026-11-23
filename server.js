// server.js
// Vitrine Digital Comunitária - Entrega Final (versão web online)
//   UC01 - Ver Catálogo da Feira        -> /api/catalogo
//   UC05 - Fazer Login / UC09 Criar Conta -> /api/auth
//   UC06 - Gerenciar Feirantes          -> /api/feirantes
//   UC07 - Gerenciar Produtos           -> /api/produtos
//   UC08 - Avaliar Produtos e Feirantes -> /api/avaliacoes
//   UC10 - Gerenciar Categorias         -> /api/categorias

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const seed = require('./db/seed');
const authRoutes = require('./routes/auth');
const feirantesRoutes = require('./routes/feirantes');
const produtosRoutes = require('./routes/produtos');
const catalogoRoutes = require('./routes/catalogo');
const avaliacoesRoutes = require('./routes/avaliacoes');
const categoriasRoutes = require('./routes/categorias');
const painelRoutes = require('./routes/painel');

// Garante contas de teste e dados de demonstração a cada inicialização
seed();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // necessário atrás do proxy HTTPS do Render
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/saude', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/feirantes', feirantesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/avaliacoes', avaliacoesRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/painel', painelRoutes);

// Rota de API inexistente
app.use('/api', (req, res) => res.status(404).json({ erro: 'Recurso não encontrado.' }));

// Página inexistente -> página amigável
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// Tratamento de erro genérico (garante que nunca "quebra" sem resposta)
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Dados enviados em formato inválido.' });
  }
  res.status(500).json({ erro: 'Erro interno no servidor. Tente novamente.' });
});

app.listen(PORT, () => {
  console.log(`Vitrine Digital Comunitária rodando em http://localhost:${PORT}`);
});
