// middleware/upload.js
// Upload de imagens com limite de 5MB (RF08 / RNF02) e somente arquivos de imagem.
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const PASTA = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(PASTA, { recursive: true });

const LIMITE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: PASTA,
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const multerImg = multer({
  storage,
  limits: { fileSize: LIMITE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      const err = new Error('TIPO_INVALIDO');
      err.code = 'TIPO_INVALIDO';
      return cb(err);
    }
    cb(null, true);
  },
});

function uploadImagem(campo) {
  return (req, res, next) => {
    multerImg.single(campo)(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ erro: 'A imagem é muito grande. Escolha uma foto menor que 5MB.' });
      }
      if (err.code === 'TIPO_INVALIDO') {
        return res.status(400).json({ erro: 'Formato não aceito. Envie uma imagem JPG, PNG, WEBP ou GIF.' });
      }
      return res.status(400).json({ erro: 'Falha no upload da imagem.' });
    });
  };
}

module.exports = { uploadImagem };
