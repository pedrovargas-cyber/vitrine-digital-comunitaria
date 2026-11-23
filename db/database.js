// db/database.js
// Conexão e schema do banco de dados (SQLite nativo do Node - node:sqlite)
// Tabelas espelham o Diagrama de Classes da Entrega 2, com a evolução da
// Entrega Final: Usuario (perfis admin e comum), Empreendedor, Categoria,
// Produto, Avaliacao e LogAuditoria.

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

// Em produção (Render) o caminho pode ser definido por variável de ambiente.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'vitrine.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senhaHash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'comum' CHECK (papel IN ('admin', 'comum')),
  ativo INTEGER NOT NULL DEFAULT 1,
  criadoEm TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS empreendedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  bairro TEXT NOT NULL,
  fotoUrl TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
  descricao TEXT
);

CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  preco REAL NOT NULL,
  imagemUrl TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  idEmpreendedor INTEGER NOT NULL,
  idCategoria INTEGER NOT NULL,
  FOREIGN KEY (idEmpreendedor) REFERENCES empreendedores(id),
  FOREIGN KEY (idCategoria) REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idUsuario INTEGER NOT NULL,
  idProduto INTEGER,
  idEmpreendedor INTEGER,
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT NOT NULL,
  dataHora TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((idProduto IS NOT NULL AND idEmpreendedor IS NULL) OR
         (idProduto IS NULL AND idEmpreendedor IS NOT NULL)),
  FOREIGN KEY (idUsuario) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (idProduto) REFERENCES produtos(id) ON DELETE CASCADE,
  FOREIGN KEY (idEmpreendedor) REFERENCES empreendedores(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_produto ON avaliacoes(idProduto);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_feirante ON avaliacoes(idEmpreendedor);
-- Regra de negócio: cada usuário avalia um mesmo produto/feirante uma única vez
CREATE UNIQUE INDEX IF NOT EXISTS uq_avaliacao_usuario_produto
  ON avaliacoes(idUsuario, idProduto) WHERE idProduto IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_avaliacao_usuario_feirante
  ON avaliacoes(idUsuario, idEmpreendedor) WHERE idEmpreendedor IS NOT NULL;

CREATE TABLE IF NOT EXISTS logs_auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  acao TEXT NOT NULL,
  dataHora TEXT NOT NULL,
  idUsuario INTEGER
);
`);

function registrarLog(acao, idUsuario) {
  try {
    db.prepare('INSERT INTO logs_auditoria (acao, dataHora, idUsuario) VALUES (?, ?, ?)').run(
      acao,
      new Date().toISOString(),
      idUsuario || null
    );
  } catch (err) {
    console.error('Falha ao registrar log:', err.message);
  }
}

db.registrarLog = registrarLog;

module.exports = db;
