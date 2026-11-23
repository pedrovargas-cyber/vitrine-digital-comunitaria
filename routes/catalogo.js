// routes/catalogo.js
// UC01 - Ver Catálogo da Feira (público, sem login)
// Entrega Final: busca por texto (produto, descrição ou feirante) e filtro por categoria.
const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.get('/', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  const categoria = Number(req.query.categoria) || null;

  const filtros = ['p.ativo = 1', 'e.ativo = 1'];
  const params = [];
  if (q) {
    filtros.push('(p.titulo LIKE ? OR p.descricao LIKE ? OR e.nome LIKE ?)');
    const termo = `%${q}%`;
    params.push(termo, termo, termo);
  }
  if (categoria) {
    filtros.push('p.idCategoria = ?');
    params.push(categoria);
  }

  const produtos = db.prepare(`
    SELECT p.id, p.titulo, p.descricao, p.preco, p.imagemUrl,
      e.id AS idEmpreendedor, e.nome AS nomeFeirante, e.whatsapp, e.bairro,
      c.id AS idCategoria, c.nome AS categoria,
      (SELECT ROUND(AVG(a.nota), 1) FROM avaliacoes a WHERE a.idProduto = p.id) AS mediaProduto,
      (SELECT COUNT(*) FROM avaliacoes a WHERE a.idProduto = p.id) AS qtdAvaliacoesProduto,
      (SELECT ROUND(AVG(a.nota), 1) FROM avaliacoes a WHERE a.idEmpreendedor = e.id) AS mediaFeirante,
      (SELECT COUNT(*) FROM avaliacoes a WHERE a.idEmpreendedor = e.id) AS qtdAvaliacoesFeirante
    FROM produtos p
    JOIN empreendedores e ON e.id = p.idEmpreendedor
    JOIN categorias c ON c.id = p.idCategoria
    WHERE ${filtros.join(' AND ')}
    ORDER BY p.id DESC
  `).all(...params);

  if (!produtos.length) {
    const mensagem = q || categoria
      ? 'Nenhum produto encontrado com esses filtros. Tente outra busca.'
      : 'Nenhum item cadastrado na vitrine por enquanto.';
    return res.json({ produtos: [], mensagem });
  }
  res.json({ produtos });
});

module.exports = router;
