// routes/painel.js
// Resumo do painel administrativo e últimas ações registradas no log de auditoria.
const express = require('express');
const db = require('../db/database');
const { exigirAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/resumo', exigirAdmin, (req, res) => {
  const n = (sql) => db.prepare(sql).get().n;
  res.json({
    feirantesAtivos: n('SELECT COUNT(*) AS n FROM empreendedores WHERE ativo = 1'),
    produtosAtivos: n('SELECT COUNT(*) AS n FROM produtos WHERE ativo = 1'),
    categorias: n('SELECT COUNT(*) AS n FROM categorias'),
    avaliacoes: n('SELECT COUNT(*) AS n FROM avaliacoes'),
    moradores: n("SELECT COUNT(*) AS n FROM usuarios WHERE papel = 'comum'"),
    ultimasAcoes: db.prepare(`
      SELECT l.acao, l.dataHora, u.nome AS usuario
      FROM logs_auditoria l LEFT JOIN usuarios u ON u.id = l.idUsuario
      ORDER BY l.id DESC LIMIT 8
    `).all(),
  });
});

module.exports = router;
