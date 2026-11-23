// routes/categorias.js
// UC10 - Gerenciar Categorias (Entrega Final)
// Leitura pública (filtro do catálogo); criação e exclusão somente pelo administrador.
// Regra: não é possível excluir categoria que ainda tenha produtos vinculados.

const express = require('express');
const db = require('../db/database');
const { exigirAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT c.id, c.nome, c.descricao,
      (SELECT COUNT(*) FROM produtos p WHERE p.idCategoria = c.id) AS qtdProdutos
    FROM categorias c ORDER BY c.nome
  `).all());
});

router.post('/', exigirAdmin, (req, res) => {
  const nome = String((req.body || {}).nome || '').trim();
  const descricao = String((req.body || {}).descricao || '').trim();
  if (nome.length < 3 || nome.length > 40) {
    return res.status(400).json({ erro: 'O nome da categoria deve ter entre 3 e 40 caracteres.' });
  }
  if (db.prepare('SELECT id FROM categorias WHERE nome = ?').get(nome)) {
    return res.status(409).json({ erro: 'Já existe uma categoria com esse nome.' });
  }
  const info = db.prepare('INSERT INTO categorias (nome, descricao) VALUES (?, ?)').run(nome, descricao);
  db.registrarLog(`Categoria criada: ${nome}`, req.usuario.id);
  res.status(201).json(db.prepare('SELECT * FROM categorias WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/:id', exigirAdmin, (req, res) => {
  const cat = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  const qtd = db.prepare('SELECT COUNT(*) AS n FROM produtos WHERE idCategoria = ?').get(cat.id).n;
  if (qtd > 0) {
    return res.status(409).json({
      erro: `Não é possível excluir "${cat.nome}": existem ${qtd} produto(s) nessa categoria. Mova-os para outra categoria primeiro.`,
    });
  }
  db.prepare('DELETE FROM categorias WHERE id = ?').run(cat.id);
  db.registrarLog(`Categoria excluída: ${cat.nome}`, req.usuario.id);
  res.json({ sucesso: true });
});

module.exports = router;
