// routes/avaliacoes.js
// UC08 - Avaliar Produtos e Feirantes
// Entrega Final: leitura pública; envio exige login (perfil comum ou admin),
// cada usuário avalia o mesmo item uma única vez; o autor pode excluir a própria
// avaliação e o administrador pode moderar (excluir) qualquer avaliação.
const express = require('express');
const db = require('../db/database');
const { exigirLogin, exigirAdmin } = require('../middleware/auth');

const router = express.Router();
const LIMITE_COMENTARIO = 1000;

function config(tipo) {
  const produto = tipo === 'produto';
  return {
    produto,
    coluna: produto ? 'idProduto' : 'idEmpreendedor',
    tabela: produto ? 'produtos' : 'empreendedores',
    rotulo: produto ? 'Produto' : 'Feirante',
  };
}

function listar(tipo, req, res) {
  const { coluna, tabela, rotulo } = config(tipo);
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum < 1) return res.status(400).json({ erro: 'Identificador inválido.' });
  if (!db.prepare(`SELECT id FROM ${tabela} WHERE id = ?`).get(idNum)) {
    return res.status(404).json({ erro: `${rotulo} não encontrado.` });
  }
  const avaliacoes = db.prepare(
    `SELECT a.id, a.nota, a.comentario, a.dataHora, a.idUsuario, u.nome AS autor
     FROM avaliacoes a JOIN usuarios u ON u.id = a.idUsuario
     WHERE a.${coluna} = ? ORDER BY a.id DESC LIMIT 100`
  ).all(idNum);
  const resumo = db.prepare(
    `SELECT ROUND(AVG(nota), 1) AS media, COUNT(*) AS quantidade FROM avaliacoes WHERE ${coluna} = ?`
  ).get(idNum);
  res.json({ avaliacoes, media: resumo.media || 0, quantidade: resumo.quantidade || 0 });
}

function criar(tipo, req, res) {
  const { produto, coluna, tabela, rotulo } = config(tipo);
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum < 1) return res.status(400).json({ erro: 'Identificador inválido.' });

  const { nota, comentario } = req.body || {};
  const notaNum = Number(nota);
  if (!Number.isInteger(notaNum) || notaNum < 1 || notaNum > 5) {
    return res.status(400).json({ erro: 'Escolha uma nota de 1 a 5 estrelas.' });
  }
  const texto = typeof comentario === 'string' ? comentario.trim() : '';
  if (texto.length < 3) return res.status(400).json({ erro: 'Escreva um comentário com pelo menos 3 caracteres.' });
  if (texto.length > LIMITE_COMENTARIO) {
    return res.status(400).json({ erro: `O comentário deve ter no máximo ${LIMITE_COMENTARIO} caracteres.` });
  }

  const item = db.prepare(`SELECT id, ativo FROM ${tabela} WHERE id = ?`).get(idNum);
  if (!item || !item.ativo) return res.status(404).json({ erro: `${rotulo} não encontrado ou inativo.` });

  const jaAvaliou = db.prepare(`SELECT id FROM avaliacoes WHERE idUsuario = ? AND ${coluna} = ?`).get(req.usuario.id, idNum);
  if (jaAvaliou) {
    return res.status(409).json({
      erro: `Você já avaliou este ${produto ? 'produto' : 'feirante'}. Exclua sua avaliação em "Minha conta" para enviar outra.`,
    });
  }

  const info = db.prepare(
    'INSERT INTO avaliacoes (idUsuario, idProduto, idEmpreendedor, nota, comentario) VALUES (?, ?, ?, ?, ?)'
  ).run(req.usuario.id, produto ? idNum : null, produto ? null : idNum, notaNum, texto);
  db.registrarLog(`Avaliação criada (${tipo} ${idNum})`, req.usuario.id);
  res.status(201).json({
    mensagem: 'Avaliação enviada com sucesso!',
    avaliacao: db.prepare('SELECT id, nota, comentario, dataHora FROM avaliacoes WHERE id = ?').get(info.lastInsertRowid),
  });
}

// Avaliações do usuário logado (página "Minha conta")
router.get('/minhas', exigirLogin, (req, res) => {
  res.json(db.prepare(`
    SELECT a.id, a.nota, a.comentario, a.dataHora,
      COALESCE(p.titulo, e.nome) AS alvo,
      CASE WHEN a.idProduto IS NOT NULL THEN 'Produto' ELSE 'Feirante' END AS tipo
    FROM avaliacoes a
    LEFT JOIN produtos p ON p.id = a.idProduto
    LEFT JOIN empreendedores e ON e.id = a.idEmpreendedor
    WHERE a.idUsuario = ? ORDER BY a.id DESC
  `).all(req.usuario.id));
});

// Todas as avaliações (moderação pelo administrador)
router.get('/', exigirAdmin, (req, res) => {
  res.json(db.prepare(`
    SELECT a.id, a.nota, a.comentario, a.dataHora, u.nome AS autor, u.email,
      COALESCE(p.titulo, e.nome) AS alvo,
      CASE WHEN a.idProduto IS NOT NULL THEN 'Produto' ELSE 'Feirante' END AS tipo
    FROM avaliacoes a
    JOIN usuarios u ON u.id = a.idUsuario
    LEFT JOIN produtos p ON p.id = a.idProduto
    LEFT JOIN empreendedores e ON e.id = a.idEmpreendedor
    ORDER BY a.id DESC LIMIT 300
  `).all());
});

// Excluir: o próprio autor ou um administrador
router.delete('/:id', exigirLogin, (req, res) => {
  const aval = db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(req.params.id);
  if (!aval) return res.status(404).json({ erro: 'Avaliação não encontrada.' });
  if (aval.idUsuario !== req.usuario.id && req.usuario.papel !== 'admin') {
    return res.status(403).json({ erro: 'Você só pode excluir as suas próprias avaliações.' });
  }
  db.prepare('DELETE FROM avaliacoes WHERE id = ?').run(aval.id);
  db.registrarLog(`Avaliação excluída: ${aval.id}`, req.usuario.id);
  res.json({ sucesso: true, mensagem: 'Avaliação excluída.' });
});

router.get('/produtos/:id', (req, res) => listar('produto', req, res));
router.post('/produtos/:id', exigirLogin, (req, res) => criar('produto', req, res));
router.get('/feirantes/:id', (req, res) => listar('feirante', req, res));
router.post('/feirantes/:id', exigirLogin, (req, res) => criar('feirante', req, res));

module.exports = router;
