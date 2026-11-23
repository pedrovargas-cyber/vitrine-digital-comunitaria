// public/js/dashboard.js
// Painel do administrador: Resumo, UC06 Feirantes, UC07 Produtos,
// UC10 Categorias e moderação de Avaliações (UC08).

let cacheFeirantes = [];
let cacheProdutos = [];

// ---------- Abas ----------
const carregadores = {
  resumo: () => carregarResumo(),
  feirantes: () => carregarFeirantes(),
  produtos: () => Promise.all([carregarOpcoesProduto(), carregarProdutos()]),
  categorias: () => carregarCategorias(),
  avaliacoes: () => carregarAvaliacoes(),
};

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('ativo', b === btn));
    document.querySelectorAll('.aba').forEach((s) => (s.style.display = s.id === 'tab-' + btn.dataset.tab ? 'block' : 'none'));
    carregadores[btn.dataset.tab]();
  });
});

async function api(url, opcoes, avisoId) {
  const resp = await fetch(url, opcoes);
  if (resp.status === 401) { window.location.href = '/login.html'; return null; }
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    if (avisoId) mostrarAviso(avisoId, dados.erro || 'Ocorreu um erro. Tente novamente.', 'erro');
    return null;
  }
  return dados;
}

const status = (ativo) => (ativo ? '<span class="badge-ativo">ativo</span>' : '<span class="badge-inativo">inativo</span>');

// ================= RESUMO =================
async function carregarResumo() {
  const r = await api('/api/painel/resumo');
  if (!r) return;
  const card = (n, rotulo) => `<div class="card-resumo"><strong>${n}</strong><span>${rotulo}</span></div>`;
  document.getElementById('cards-resumo').innerHTML =
    card(r.feirantesAtivos, 'Feirantes ativos') + card(r.produtosAtivos, 'Produtos na vitrine') +
    card(r.categorias, 'Categorias') + card(r.avaliacoes, 'Avaliações') + card(r.moradores, 'Moradores cadastrados');
  document.getElementById('lista-log').innerHTML = r.ultimasAcoes.length
    ? r.ultimasAcoes.map((l) => `<tr><td>${new Date(l.dataHora).toLocaleString('pt-BR')}</td><td>${escapeHtml(l.usuario || '—')}</td><td>${escapeHtml(l.acao)}</td></tr>`).join('')
    : '<tr><td colspan="3">Nenhuma ação registrada ainda.</td></tr>';
}

// ================= FEIRANTES (UC06) =================
async function carregarFeirantes() {
  const feirantes = await api('/api/feirantes');
  if (!feirantes) return;
  cacheFeirantes = feirantes;
  document.getElementById('lista-feirantes').innerHTML = feirantes.map((f) => `
    <tr>
      <td>${escapeHtml(f.nome)}</td>
      <td>${escapeHtml(f.whatsapp)}</td>
      <td>${escapeHtml(f.bairro)}</td>
      <td>${f.qtdProdutosAtivos}</td>
      <td>${status(f.ativo)}</td>
      <td class="acoes">
        <button class="btn btn-secundario" data-acao="editar-feirante" data-id="${f.id}">Editar</button>
        ${f.ativo
          ? `<button class="btn btn-perigo" data-acao="desativar-feirante" data-id="${f.id}">Desativar</button>`
          : `<button class="btn btn-sucesso" data-acao="reativar-feirante" data-id="${f.id}">Reativar</button>`}
      </td>
    </tr>`).join('');
}

function limparFormFeirante() {
  document.getElementById('form-feirante').reset();
  document.getElementById('feirante-id').value = '';
  document.getElementById('titulo-form-feirante').textContent = 'Novo feirante';
  document.getElementById('cancelar-feirante').style.display = 'none';
}

document.getElementById('cancelar-feirante').addEventListener('click', limparFormFeirante);

document.getElementById('lista-feirantes').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-acao]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const f = cacheFeirantes.find((x) => x.id === id);
  if (btn.dataset.acao === 'editar-feirante') {
    document.getElementById('feirante-id').value = f.id;
    document.getElementById('feirante-nome').value = f.nome;
    document.getElementById('feirante-whatsapp').value = f.whatsapp;
    document.getElementById('feirante-bairro').value = f.bairro;
    document.getElementById('titulo-form-feirante').textContent = `Editando: ${f.nome}`;
    document.getElementById('cancelar-feirante').style.display = 'inline-flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (btn.dataset.acao === 'desativar-feirante') {
    if (!confirm(`Desativar ${f.nome}? Os produtos dele deixarão de aparecer no catálogo.`)) return;
    if (await api(`/api/feirantes/${id}`, { method: 'DELETE' }, 'aviso-feirante')) {
      mostrarAviso('aviso-feirante', 'Feirante desativado. Os produtos dele saíram do catálogo.', 'sucesso');
      carregarFeirantes();
    }
  } else if (btn.dataset.acao === 'reativar-feirante') {
    const ok = await api(`/api/feirantes/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: true }),
    }, 'aviso-feirante');
    if (ok) { mostrarAviso('aviso-feirante', 'Feirante reativado.', 'sucesso'); carregarFeirantes(); }
  }
});

document.getElementById('form-feirante').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('feirante-id').value;
  const fd = new FormData();
  fd.append('nome', document.getElementById('feirante-nome').value);
  fd.append('whatsapp', document.getElementById('feirante-whatsapp').value);
  fd.append('bairro', document.getElementById('feirante-bairro').value);
  const foto = document.getElementById('feirante-foto').files[0];
  if (foto) fd.append('foto', foto);

  const dados = await api(id ? `/api/feirantes/${id}` : '/api/feirantes', { method: id ? 'PUT' : 'POST', body: fd }, 'aviso-feirante');
  if (dados) {
    mostrarAviso('aviso-feirante', id ? 'Feirante atualizado com sucesso.' : 'Feirante cadastrado com sucesso.', 'sucesso');
    limparFormFeirante();
    carregarFeirantes();
  }
});

// ================= PRODUTOS (UC07) =================
async function carregarOpcoesProduto() {
  const op = await api('/api/produtos/opcoes');
  if (!op) return;
  const selF = document.getElementById('produto-feirante');
  const selC = document.getElementById('produto-categoria');
  selF.innerHTML = op.feirantes.length
    ? op.feirantes.map((f) => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('')
    : '<option value="">Cadastre um feirante primeiro</option>';
  selC.innerHTML = op.categorias.length
    ? op.categorias.map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('')
    : '<option value="">Nenhuma categoria cadastrada</option>';
}

async function carregarProdutos() {
  const produtos = await api('/api/produtos');
  if (!produtos) return;
  cacheProdutos = produtos;
  document.getElementById('lista-produtos').innerHTML = produtos.map((p) => `
    <tr>
      <td>${escapeHtml(p.titulo)}</td>
      <td>${escapeHtml(p.nomeEmpreendedor)}</td>
      <td>${escapeHtml(p.nomeCategoria)}</td>
      <td>${formatarPreco(p.preco)}</td>
      <td>${status(p.ativo)}</td>
      <td class="acoes">
        <button class="btn btn-secundario" data-acao="editar-produto" data-id="${p.id}">Editar</button>
        ${p.ativo
          ? `<button class="btn btn-perigo" data-acao="desativar-produto" data-id="${p.id}">Desativar</button>`
          : `<button class="btn btn-sucesso" data-acao="reativar-produto" data-id="${p.id}">Reativar</button>`}
      </td>
    </tr>`).join('');
}

function limparFormProduto() {
  document.getElementById('form-produto').reset();
  document.getElementById('produto-id').value = '';
  document.getElementById('titulo-form-produto').textContent = 'Novo produto';
  document.querySelector('#form-produto button[type="submit"]').textContent = 'Publicar produto';
  document.getElementById('cancelar-produto').style.display = 'none';
}

document.getElementById('cancelar-produto').addEventListener('click', limparFormProduto);

document.getElementById('lista-produtos').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-acao]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const p = cacheProdutos.find((x) => x.id === id);
  if (btn.dataset.acao === 'editar-produto') {
    document.getElementById('produto-id').value = p.id;
    document.getElementById('produto-titulo').value = p.titulo;
    document.getElementById('produto-descricao').value = p.descricao || '';
    document.getElementById('produto-preco').value = String(p.preco).replace('.', ',');
    const selF = document.getElementById('produto-feirante');
    if (![...selF.options].some((o) => Number(o.value) === p.idEmpreendedor)) {
      selF.insertAdjacentHTML('beforeend', `<option value="${p.idEmpreendedor}">${escapeHtml(p.nomeEmpreendedor)} (inativo)</option>`);
    }
    selF.value = p.idEmpreendedor;
    document.getElementById('produto-categoria').value = p.idCategoria;
    document.getElementById('titulo-form-produto').textContent = `Editando: ${p.titulo}`;
    document.querySelector('#form-produto button[type="submit"]').textContent = 'Salvar alterações';
    document.getElementById('cancelar-produto').style.display = 'inline-flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (btn.dataset.acao === 'desativar-produto') {
    if (!confirm(`Desativar "${p.titulo}"? Ele deixará de aparecer no catálogo.`)) return;
    if (await api(`/api/produtos/${id}`, { method: 'DELETE' }, 'aviso-produto')) {
      mostrarAviso('aviso-produto', 'Produto desativado e removido do catálogo.', 'sucesso');
      carregarProdutos();
    }
  } else if (btn.dataset.acao === 'reativar-produto') {
    const ok = await api(`/api/produtos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: true }),
    }, 'aviso-produto');
    if (ok) { mostrarAviso('aviso-produto', 'Produto reativado e de volta ao catálogo.', 'sucesso'); carregarProdutos(); }
  }
});

document.getElementById('form-produto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('produto-id').value;
  const fd = new FormData();
  fd.append('titulo', document.getElementById('produto-titulo').value);
  fd.append('descricao', document.getElementById('produto-descricao').value);
  fd.append('preco', document.getElementById('produto-preco').value);
  fd.append('idEmpreendedor', document.getElementById('produto-feirante').value);
  fd.append('idCategoria', document.getElementById('produto-categoria').value);
  const foto = document.getElementById('produto-foto').files[0];
  if (foto) fd.append('foto', foto);

  const dados = await api(id ? `/api/produtos/${id}` : '/api/produtos', { method: id ? 'PUT' : 'POST', body: fd }, 'aviso-produto');
  if (dados) {
    mostrarAviso('aviso-produto', id ? 'Produto atualizado com sucesso.' : 'Produto publicado com sucesso! Já aparece no catálogo.', 'sucesso');
    limparFormProduto();
    carregarProdutos();
  }
});

// ================= CATEGORIAS (UC10) =================
async function carregarCategorias() {
  const cats = await api('/api/categorias');
  if (!cats) return;
  document.getElementById('lista-categorias').innerHTML = cats.map((c) => `
    <tr>
      <td>${escapeHtml(c.nome)}</td>
      <td>${escapeHtml(c.descricao || '')}</td>
      <td>${c.qtdProdutos}</td>
      <td><button class="btn btn-perigo" data-excluir-cat="${c.id}" data-nome="${escapeHtml(c.nome)}">Excluir</button></td>
    </tr>`).join('');
}

document.getElementById('lista-categorias').addEventListener('click', async (e) => {
  const id = e.target.dataset.excluirCat;
  if (!id || !confirm(`Excluir a categoria "${e.target.dataset.nome}"?`)) return;
  if (await api(`/api/categorias/${id}`, { method: 'DELETE' }, 'aviso-categoria')) {
    mostrarAviso('aviso-categoria', 'Categoria excluída.', 'sucesso');
    carregarCategorias();
  }
});

document.getElementById('form-categoria').addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = await api('/api/categorias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: document.getElementById('categoria-nome').value,
      descricao: document.getElementById('categoria-descricao').value,
    }),
  }, 'aviso-categoria');
  if (dados) {
    mostrarAviso('aviso-categoria', `Categoria "${dados.nome}" criada com sucesso.`, 'sucesso');
    e.target.reset();
    carregarCategorias();
  }
});

// ================= AVALIAÇÕES (moderação) =================
async function carregarAvaliacoes() {
  const lista = await api('/api/avaliacoes');
  if (!lista) return;
  document.getElementById('lista-avaliacoes').innerHTML = lista.length
    ? lista.map((a) => `
      <tr>
        <td>${escapeHtml(formatarData(a.dataHora))}</td>
        <td>${escapeHtml(a.autor)}<br><small>${escapeHtml(a.email)}</small></td>
        <td>${a.tipo}: ${escapeHtml(a.alvo)}</td>
        <td class="estrelas">${'★'.repeat(a.nota)}${'☆'.repeat(5 - a.nota)}</td>
        <td>${escapeHtml(a.comentario)}</td>
        <td><button class="btn btn-perigo" data-excluir-aval="${a.id}">Excluir</button></td>
      </tr>`).join('')
    : '<tr><td colspan="6">Nenhuma avaliação até o momento.</td></tr>';
}

document.getElementById('lista-avaliacoes').addEventListener('click', async (e) => {
  const id = e.target.dataset.excluirAval;
  if (!id || !confirm('Excluir esta avaliação? A média do item será recalculada.')) return;
  if (await api(`/api/avaliacoes/${id}`, { method: 'DELETE' }, 'aviso-avaliacao')) {
    mostrarAviso('aviso-avaliacao', 'Avaliação excluída.', 'sucesso');
    carregarAvaliacoes();
  }
});

// ---------- Inicialização: só administradores ----------
(async function init() {
  const u = await iniciarSessao();
  if (!u) return (window.location.href = '/login.html?voltar=/dashboard.html');
  if (u.papel !== 'admin') {
    document.getElementById('acesso-negado').style.display = 'block';
    return;
  }
  document.getElementById('painel').style.display = 'block';
  carregarResumo();
})();
