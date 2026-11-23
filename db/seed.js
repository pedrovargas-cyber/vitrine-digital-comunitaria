// db/seed.js
// Garante os dados mínimos para o sistema funcionar e ser avaliado:
//  - contas de teste (administrador e usuário comum) exigidas na entrega final
//  - categorias, feirantes e produtos de demonstração (somente se o banco estiver vazio)
// É executado automaticamente toda vez que o servidor inicia (server.js) e
// também pode ser rodado manualmente com: npm run seed
const bcrypt = require('bcryptjs');
const db = require('./database');

const CONTAS = [
  { nome: 'Administrador de Teste', email: 'testeadmin@teste.com', senha: 'Teste@2029', papel: 'admin' },
  { nome: 'Usuário Comum de Teste', email: 'testecomum@teste.com', senha: 'Teste@2029', papel: 'comum' },
  { nome: 'Coordenação da Associação', email: 'admin@vitrine.com', senha: 'admin123', papel: 'admin' },
];

const CATEGORIAS = [
  ['Artesanato', 'Peças feitas à mão por artesãos do bairro'],
  ['Comida Caseira', 'Bolos, doces, salgados e refeições caseiras'],
  ['Costura', 'Roupas, consertos e peças de costura'],
  ['Serviços Gerais', 'Pequenos serviços oferecidos pelos moradores'],
];

const FEIRANTES = [
  { nome: 'Dona Maria das Graças', whatsapp: '24999990001', bairro: 'Centro' },
  { nome: 'Seu João Batista', whatsapp: '24999990002', bairro: 'Vila Nova' },
  { nome: 'Ana Costura Criativa', whatsapp: '24999990003', bairro: 'Jardim Primavera' },
  { nome: 'Carlos Faz-Tudo', whatsapp: '24999990004', bairro: 'Centro' },
];

// [titulo, descricao, preco, feirante (índice), categoria, imagem]
const PRODUTOS = [
  ['Bolo de Fubá', 'Bolo de fubá cremoso, receita de família. Forma média.', 25.0, 0, 'Comida Caseira', 'bolo.svg'],
  ['Pão Caseiro', 'Pão de fermentação natural, assado no dia.', 12.0, 0, 'Comida Caseira', 'pao.svg'],
  ['Doce de Leite', 'Pote de 500g, feito no tacho.', 18.5, 1, 'Comida Caseira', 'doce.svg'],
  ['Cesto de Palha', 'Cesto trançado à mão, ideal para pães e frutas.', 45.0, 1, 'Artesanato', 'cesto.svg'],
  ['Vaso de Cerâmica', 'Vaso pintado à mão, 20 cm de altura.', 60.0, 1, 'Artesanato', 'vaso.svg'],
  ['Ajuste de Barra', 'Ajuste de barra de calça ou saia, entrega em 2 dias.', 15.0, 2, 'Costura', 'costura.svg'],
  ['Bolsa de Tecido', 'Bolsa ecológica de algodão com estampa exclusiva.', 35.0, 2, 'Costura', 'bolsa.svg'],
  ['Pequenos Reparos', 'Troca de tomada, chuveiro e pequenos consertos. Valor por visita.', 50.0, 3, 'Serviços Gerais', 'reparos.svg'],
];

function seed({ silencioso = false } = {}) {
  const log = (...args) => { if (!silencioso) console.log(...args); };

  // 1) Contas de teste: cria se não existir; se existir, garante senha, perfil e status
  for (const c of CONTAS) {
    const hash = bcrypt.hashSync(c.senha, 10);
    const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(c.email);
    if (existente) {
      db.prepare('UPDATE usuarios SET senhaHash = ?, papel = ?, ativo = 1 WHERE id = ?').run(hash, c.papel, existente.id);
    } else {
      db.prepare('INSERT INTO usuarios (nome, email, senhaHash, papel, ativo) VALUES (?, ?, ?, ?, 1)')
        .run(c.nome, c.email, hash, c.papel);
    }
    log(`Conta garantida (${c.papel}): ${c.email}`);
  }

  // 2) Categorias
  const insertCat = db.prepare('INSERT OR IGNORE INTO categorias (nome, descricao) VALUES (?, ?)');
  for (const [nome, descricao] of CATEGORIAS) insertCat.run(nome, descricao);

  // 3) Dados de demonstração — só quando ainda não há feirantes cadastrados
  const qtdFeirantes = db.prepare('SELECT COUNT(*) AS n FROM empreendedores').get().n;
  if (qtdFeirantes === 0) {
    const idsFeirantes = FEIRANTES.map((f) =>
      Number(db.prepare('INSERT INTO empreendedores (nome, whatsapp, bairro, ativo) VALUES (?, ?, ?, 1)')
        .run(f.nome, f.whatsapp, f.bairro).lastInsertRowid)
    );
    const idCategoria = (nome) => db.prepare('SELECT id FROM categorias WHERE nome = ?').get(nome).id;
    const idsProdutos = PRODUTOS.map(([titulo, descricao, preco, iFeirante, cat, img]) =>
      Number(db.prepare(
        `INSERT INTO produtos (titulo, descricao, preco, imagemUrl, ativo, idEmpreendedor, idCategoria)
         VALUES (?, ?, ?, ?, 1, ?, ?)`
      ).run(titulo, descricao, preco, `/img/produtos/${img}`, idsFeirantes[iFeirante], idCategoria(cat)).lastInsertRowid)
    );

    // Algumas avaliações de exemplo feitas pela coordenação (não usa a conta comum,
    // para que o avaliador consiga testar a avaliação com ela)
    const idCoord = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@vitrine.com').id;
    const insAval = db.prepare(
      'INSERT INTO avaliacoes (idUsuario, idProduto, idEmpreendedor, nota, comentario) VALUES (?, ?, ?, ?, ?)'
    );
    insAval.run(idCoord, idsProdutos[0], null, 5, 'Bolo maravilhoso, chegou ainda morno!');
    insAval.run(idCoord, idsProdutos[3], null, 4, 'Cesto muito bem acabado.');
    insAval.run(idCoord, null, idsFeirantes[0], 5, 'Dona Maria é super atenciosa e pontual.');

    log(`Dados de demonstração criados: ${idsFeirantes.length} feirantes e ${idsProdutos.length} produtos.`);
  }
}

module.exports = seed;

if (require.main === module) seed();
