// routes/auth.js
// UC05 - Fazer Login  |  UC09 - Criar Conta de Morador (Entrega Final)
// Perfis: 'admin' (operador/coordenação da associação) e 'comum' (morador/cliente)
// Fluxos alternativos do login:
//   4a) Senha errada / e-mail inexistente -> "E-mail ou senha inválidos"
//   4b) Usuário inativo -> "Cadastro inativo. Fale com a coordenação."

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET, lerUsuario } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function criarSessao(res, usuario) {
  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  res.cookie('sessao', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 2 * 60 * 60 * 1000,
  });
}

function publico(u) {
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel };
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const email = String((req.body || {}).email || '').trim();
  const senha = String((req.body || {}).senha || '');

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

  if (!usuario || !bcrypt.compareSync(senha, usuario.senhaHash)) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }
  if (!usuario.ativo) {
    return res.status(403).json({ erro: 'Cadastro inativo. Fale com a coordenação.' });
  }

  criarSessao(res, usuario);
  db.registrarLog(`Login realizado: ${usuario.email}`, usuario.id);

  return res.json({ sucesso: true, usuario: publico(usuario) });
});

// POST /api/auth/cadastro - morador cria a própria conta (sempre perfil comum)
router.post('/cadastro', (req, res) => {
  const nome = String((req.body || {}).nome || '').trim();
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const senha = String((req.body || {}).senha || '');
  const confirmacao = String((req.body || {}).confirmacao || '');

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Preencha nome, e-mail e senha.' });
  }
  if (nome.length < 3 || nome.length > 80) {
    return res.status(400).json({ erro: 'O nome deve ter entre 3 e 80 caracteres.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ erro: 'Informe um e-mail válido (ex: nome@email.com).' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
  }
  if (senha !== confirmacao) {
    return res.status(400).json({ erro: 'A confirmação de senha não confere.' });
  }
  if (db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email)) {
    return res.status(409).json({ erro: 'Este e-mail já está cadastrado. Faça login.' });
  }

  const info = db
    .prepare("INSERT INTO usuarios (nome, email, senhaHash, papel, ativo) VALUES (?, ?, ?, 'comum', 1)")
    .run(nome, email, bcrypt.hashSync(senha, 10));
  const novo = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(info.lastInsertRowid);

  criarSessao(res, novo);
  db.registrarLog(`Conta criada: ${novo.email}`, novo.id);

  return res.status(201).json({ sucesso: true, mensagem: 'Conta criada com sucesso!', usuario: publico(novo) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('sessao');
  return res.json({ sucesso: true });
});

// GET /api/auth/me - informa quem está logado (usado pelo front-end)
router.get('/me', (req, res) => {
  const usuario = lerUsuario(req);
  if (!usuario) return res.status(401).json({ erro: 'Sem sessão.' });
  return res.json({ usuario: publico(usuario) });
});

module.exports = router;
