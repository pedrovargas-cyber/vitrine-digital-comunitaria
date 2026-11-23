// middleware/auth.js
// Autenticação por JWT em cookie HTTP-only e controle de acesso por perfil.
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-vitrine-digital-demo';

function lerUsuario(req) {
  const token = req.cookies && req.cookies.sessao;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Exige qualquer usuário logado (admin ou comum)
function exigirLogin(req, res, next) {
  const usuario = lerUsuario(req);
  if (!usuario) {
    return res.status(401).json({ erro: 'Faça login para continuar.' });
  }
  req.usuario = usuario;
  next();
}

// Exige usuário logado com perfil administrador
function exigirAdmin(req, res, next) {
  const usuario = lerUsuario(req);
  if (!usuario) {
    return res.status(401).json({ erro: 'Faça login para continuar.' });
  }
  if (usuario.papel !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito aos administradores da associação.' });
  }
  req.usuario = usuario;
  next();
}

module.exports = { exigirLogin, exigirAdmin, lerUsuario, JWT_SECRET };
