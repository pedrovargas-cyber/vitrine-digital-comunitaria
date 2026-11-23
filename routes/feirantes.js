// routes/feirantes.js
// UC06 - Gerenciar Feirantes (somente administrador)
// Fluxo principal: preencher Nome, WhatsApp com DDD, Bairro, foto -> Salvar
// Fluxo alternativo 4a: telefone inválido -> "Digite o DDD + 9 dígitos (ex: 24999998888)"
// Desativação é lógica (soft delete) e pode ser revertida (reativar).

const express = require('express');
const db = require('../db/database');
const { exigirAdmin } = require('../middleware/auth');
const { uploadImagem } = require('../middleware/upload');

const router = express.Router();

function telefoneValido(whatsapp) {
  return String(whatsapp || '').replace(/\D/g, '').length === 11; // DDD (2) + 9 dígitos
}

function paraBool(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

router.get('/', exigirAdmin, (req, res) => {
  const feirantes = db.prepare(`
    SELECT e.*, (SELECT COUNT(*) FROM produtos p WHERE p.idEmpreendedor = e.id AND p.ativo = 1) AS qtdProdutosAtivos
    FROM empreendedores e ORDER BY e.ativo DESC, e.nome
  `).all();
  res.json(feirantes);
});

router.post('/', exigirAdmin, uploadImagem('foto'), (req, res) => {
  const nome = String((req.body || {}).nome || '').trim();
  const whatsapp = String((req.body || {}).whatsapp || '');
  const bairro = String((req.body || {}).bairro || '').trim();

  if (!nome || !whatsapp || !bairro) {
    return res.status(400).json({ erro: 'Nome, WhatsApp e Bairro são obrigatórios.' });
  }
  if (!telefoneValido(whatsapp)) {
    return res.status(400).json({ erro: 'Digite o DDD + 9 dígitos (ex: 24999998888).' });
  }

  const fotoUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const info = db
    .prepare('INSERT INTO empreendedores (nome, whatsapp, bairro, fotoUrl, ativo) VALUES (?, ?, ?, ?, 1)')
    .run(nome, whatsapp.replace(/\D/g, ''), bairro, fotoUrl);

  db.registrarLog(`Feirante cadastrado: ${nome}`, req.usuario.id);
  res.status(201).json(db.prepare('SELECT * FROM empreendedores WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', exigirAdmin, uploadImagem('foto'), (req, res) => {
  const existente = db.prepare('SELECT * FROM empreendedores WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Feirante não encontrado.' });

  const { nome, whatsapp, bairro, ativo } = req.body || {};
  if (whatsapp !== undefined && !telefoneValido(whatsapp)) {
    return res.status(400).json({ erro: 'Digite o DDD + 9 dígitos (ex: 24999998888).' });
  }
  if (nome !== undefined && !String(nome).trim()) {
    return res.status(400).json({ erro: 'O nome não pode ficar em branco.' });
  }

  db.prepare(
    'UPDATE empreendedores SET nome = ?, whatsapp = ?, bairro = ?, fotoUrl = ?, ativo = ? WHERE id = ?'
  ).run(
    nome !== undefined ? String(nome).trim() : existente.nome,
    whatsapp !== undefined ? String(whatsapp).replace(/\D/g, '') : existente.whatsapp,
    bairro ? String(bairro).trim() : existente.bairro,
    req.file ? `/uploads/${req.file.filename}` : existente.fotoUrl,
    ativo !== undefined ? (paraBool(ativo) ? 1 : 0) : existente.ativo,
    existente.id
  );

  db.registrarLog(`Feirante atualizado: ${existente.id}`, req.usuario.id);
  res.json(db.prepare('SELECT * FROM empreendedores WHERE id = ?').get(existente.id));
});

router.delete('/:id', exigirAdmin, (req, res) => {
  const existente = db.prepare('SELECT * FROM empreendedores WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Feirante não encontrado.' });
  db.prepare('UPDATE empreendedores SET ativo = 0 WHERE id = ?').run(existente.id);
  db.registrarLog(`Feirante desativado: ${existente.nome}`, req.usuario.id);
  res.json({ sucesso: true });
});

module.exports = router;
