// routes/produtos.js
// UC07 - Gerenciar Produtos da Vitrine (somente administrador)
// Pré-condição: feirante ativo e categoria existentes
// Regras: valor numérico > 0; imagem até 5MB; desativar/reativar (soft delete)

const express = require('express');
const db = require('../db/database');
const { exigirAdmin } = require('../middleware/auth');
const { uploadImagem } = require('../middleware/upload');

const router = express.Router();

function paraBool(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

function validarPreco(preco) {
  const n = Number(String(preco).replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= 100000 ? Math.round(n * 100) / 100 : null;
}

router.get('/', exigirAdmin, (req, res) => {
  res.json(db.prepare(
    `SELECT p.*, e.nome AS nomeEmpreendedor, c.nome AS nomeCategoria
     FROM produtos p
     JOIN empreendedores e ON e.id = p.idEmpreendedor
     JOIN categorias c ON c.id = p.idCategoria
     ORDER BY p.ativo DESC, p.id DESC`
  ).all());
});

router.get('/opcoes', exigirAdmin, (req, res) => {
  res.json({
    feirantes: db.prepare('SELECT id, nome FROM empreendedores WHERE ativo = 1 ORDER BY nome').all(),
    categorias: db.prepare('SELECT id, nome FROM categorias ORDER BY nome').all(),
  });
});

router.post('/', exigirAdmin, uploadImagem('foto'), (req, res) => {
  const titulo = String((req.body || {}).titulo || '').trim();
  const descricao = String((req.body || {}).descricao || '').trim();
  const { preco, idEmpreendedor, idCategoria } = req.body || {};

  if (!titulo || preco === undefined || preco === '' || !idEmpreendedor || !idCategoria) {
    return res.status(400).json({ erro: 'Título, valor, feirante e categoria são obrigatórios.' });
  }
  const precoNum = validarPreco(preco);
  if (precoNum === null) {
    return res.status(400).json({ erro: 'Informe um valor numérico válido e maior que zero.' });
  }
  if (!db.prepare('SELECT id FROM empreendedores WHERE id = ? AND ativo = 1').get(idEmpreendedor)) {
    return res.status(400).json({ erro: 'Feirante inválido ou inativo. Cadastre/ative o feirante antes de criar o produto.' });
  }
  if (!db.prepare('SELECT id FROM categorias WHERE id = ?').get(idCategoria)) {
    return res.status(400).json({ erro: 'Categoria inválida. Cadastre a categoria antes de criar o produto.' });
  }

  const info = db.prepare(
    `INSERT INTO produtos (titulo, descricao, preco, imagemUrl, ativo, idEmpreendedor, idCategoria)
     VALUES (?, ?, ?, ?, 1, ?, ?)`
  ).run(titulo, descricao, precoNum, req.file ? `/uploads/${req.file.filename}` : null, idEmpreendedor, idCategoria);

  db.registrarLog(`Produto cadastrado: ${titulo}`, req.usuario.id);
  res.status(201).json(db.prepare('SELECT * FROM produtos WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', exigirAdmin, uploadImagem('foto'), (req, res) => {
  const existente = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Produto não encontrado.' });

  const { titulo, descricao, preco, ativo, idEmpreendedor, idCategoria } = req.body || {};

  if (titulo !== undefined && !String(titulo).trim()) {
    return res.status(400).json({ erro: 'O título não pode ficar em branco.' });
  }
  let precoNum = existente.preco;
  if (preco !== undefined) {
    precoNum = validarPreco(preco);
    if (precoNum === null) return res.status(400).json({ erro: 'Informe um valor numérico válido e maior que zero.' });
  }
  const idFeirante = idEmpreendedor || existente.idEmpreendedor;
  const feirante = db.prepare('SELECT id, ativo FROM empreendedores WHERE id = ?').get(idFeirante);
  if (!feirante) return res.status(400).json({ erro: 'Feirante inválido.' });
  if (idCategoria && !db.prepare('SELECT id FROM categorias WHERE id = ?').get(idCategoria)) {
    return res.status(400).json({ erro: 'Categoria inválida.' });
  }
  const novoAtivo = ativo !== undefined ? (paraBool(ativo) ? 1 : 0) : existente.ativo;
  if (novoAtivo && !feirante.ativo) {
    return res.status(400).json({ erro: 'Reative o feirante antes de reativar este produto.' });
  }

  db.prepare(
    `UPDATE produtos SET titulo = ?, descricao = ?, preco = ?, imagemUrl = ?, ativo = ?, idEmpreendedor = ?, idCategoria = ?
     WHERE id = ?`
  ).run(
    titulo !== undefined ? String(titulo).trim() : existente.titulo,
    descricao !== undefined ? String(descricao).trim() : existente.descricao,
    precoNum,
    req.file ? `/uploads/${req.file.filename}` : existente.imagemUrl,
    novoAtivo,
    idFeirante,
    idCategoria || existente.idCategoria,
    existente.id
  );

  db.registrarLog(`Produto atualizado: ${existente.id}`, req.usuario.id);
  res.json(db.prepare('SELECT * FROM produtos WHERE id = ?').get(existente.id));
});

router.delete('/:id', exigirAdmin, (req, res) => {
  const existente = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Produto não encontrado.' });
  db.prepare('UPDATE produtos SET ativo = 0 WHERE id = ?').run(existente.id);
  db.registrarLog(`Produto desativado: ${existente.titulo}`, req.usuario.id);
  res.json({ sucesso: true });
});

module.exports = router;
