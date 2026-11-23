// public/js/catalogo.js
// UC01 - Catálogo público (busca + filtro por categoria) e UC08 - Avaliações.

const estado = { q: '', categoria: null };

async function carregarCategorias() {
  const box = document.getElementById('filtro-categorias');
  try {
    const resp = await fetch('/api/categorias');
    const cats = await resp.json();
    const chip = (id, nome) =>
      `<button type="button" class="chip ${String(estado.categoria) === String(id) ? 'ativo' : ''}" data-cat="${id ?? ''}">${escapeHtml(nome)}</button>`;
    box.innerHTML = chip(null, 'Todas') + cats.map((c) => chip(c.id, c.nome)).join('');
  } catch {
    box.innerHTML = '';
  }
}

document.getElementById('filtro-categorias').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  estado.categoria = btn.dataset.cat || null;
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('ativo', c === btn));
  carregarCatalogo();
});

document.getElementById('form-busca').addEventListener('submit', (e) => {
  e.preventDefault();
  estado.q = document.getElementById('busca').value.trim();
  carregarCatalogo();
});

async function carregarCatalogo() {
  const grid = document.getElementById('grid-produtos');
  const vazio = document.getElementById('mensagem-vazia');
  const contador = document.getElementById('contador');
  const params = new URLSearchParams();
  if (estado.q) params.set('q', estado.q);
  if (estado.categoria) params.set('categoria', estado.categoria);
  try {
    const resp = await fetch('/api/catalogo?' + params.toString());
    const dados = await resp.json();
    if (!resp.ok) throw new Error();
    if (!dados.produtos || !dados.produtos.length) {
      grid.innerHTML = '';
      contador.textContent = '';
      vazio.style.display = 'block';
      vazio.textContent = dados.mensagem || 'Nenhum item cadastrado por enquanto.';
      return;
    }
    vazio.style.display = 'none';
    const n = dados.produtos.length;
    contador.textContent = `${n} ${n === 1 ? 'item encontrado' : 'itens encontrados'}`;
    grid.innerHTML = dados.produtos.map(renderCard).join('');
  } catch {
    grid.innerHTML = '';
    contador.textContent = '';
    vazio.style.display = 'block';
    vazio.textContent = 'Não foi possível carregar o catálogo agora. Tente novamente em instantes.';
  }
}

function estrelas(media, quantidade) {
  return `<div class="resumo-avaliacao" aria-label="Média ${media || 0} de 5">⭐ <strong>${media || '—'}</strong>/5 <span>(${quantidade || 0} ${Number(quantidade) === 1 ? 'avaliação' : 'avaliações'})</span></div>`;
}

function formulario(tipo, id, rotulo) {
  if (!usuarioAtual) {
    return `<p class="aviso-login">Para avaliar, <a href="/login.html?voltar=/index.html">entre na sua conta</a> ou <a href="/cadastro.html">crie uma conta grátis</a>.</p>`;
  }
  return `<form class="form-avaliacao" data-tipo="${tipo}" data-id="${id}">
    <label> Sua nota para ${rotulo}
      <select name="nota" aria-label="Nota de 1 a 5 estrelas">
        <option value="">Escolha de 1 a 5 estrelas</option>
        <option value="5">★★★★★ — 5 estrelas</option><option value="4">★★★★☆ — 4 estrelas</option>
        <option value="3">★★★☆☆ — 3 estrelas</option><option value="2">★★☆☆☆ — 2 estrelas</option><option value="1">★☆☆☆☆ — 1 estrela</option>
      </select>
    </label>
    <label>Comentário
      <textarea name="comentario" maxlength="1000" rows="3" placeholder="Conte como foi sua experiência..."></textarea>
    </label>
    <button class="btn btn-primario" type="submit">Enviar avaliação</button>
    <p class="feedback-avaliacao" role="status" aria-live="polite"></p>
  </form>`;
}

function renderCard(p) {
  const foto = p.imagemUrl
    ? `<img src="${escapeHtml(p.imagemUrl)}" alt="${escapeHtml(p.titulo)}" loading="lazy">`
    : '<div class="sem-foto">sem foto</div>';
  const mensagem = encodeURIComponent(`Olá! Vi o produto ${p.titulo} na Vitrine Digital Comunitária e quero encomendar.`);
  const linkWhats = p.whatsapp ? `https://wa.me/55${encodeURIComponent(p.whatsapp)}?text=${mensagem}` : null;
  return `<article class="card-produto" data-produto="${p.id}">
    ${foto}<div class="info">
      <span class="tag-categoria">${escapeHtml(p.categoria)}</span>
      <span class="titulo">${escapeHtml(p.titulo)}</span>
      ${p.descricao ? `<span class="descricao">${escapeHtml(p.descricao)}</span>` : ''}
      <span class="produtor">por ${escapeHtml(p.nomeFeirante)} · ${escapeHtml(p.bairro)}</span>
      <span class="preco">${formatarPreco(p.preco)}</span>
      ${estrelas(p.mediaProduto, p.qtdAvaliacoesProduto)}
    </div>
    ${linkWhats ? `<a class="btn btn-whatsapp" href="${linkWhats}" target="_blank" rel="noopener">📱 Pedir via WhatsApp</a>` : '<div class="btn btn-secundario contato-indisponivel">Contato indisponível</div>'}
    <details class="bloco-avaliacao"><summary>Avaliar produto / ver comentários</summary>${formulario('produtos', p.id, 'este produto')}<div class="lista-avaliacoes" data-lista="produtos" data-id="${p.id}">Carregando comentários...</div></details>
    <details class="bloco-avaliacao"><summary>Avaliar feirante / ver comentários</summary>
      <p class="nome-avaliado">Avaliação de ${escapeHtml(p.nomeFeirante)}</p>${estrelas(p.mediaFeirante, p.qtdAvaliacoesFeirante)}
      ${formulario('feirantes', p.idEmpreendedor, 'este feirante')}<div class="lista-avaliacoes" data-lista="feirantes" data-id="${p.idEmpreendedor}">Carregando comentários...</div>
    </details>
  </article>`;
}

async function carregarAvaliacoes(tipo, id, container) {
  try {
    const resp = await fetch(`/api/avaliacoes/${tipo}/${id}`);
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro || 'Não foi possível carregar avaliações.');
    container.innerHTML = dados.avaliacoes.length
      ? dados.avaliacoes.map((a) =>
          `<article class="comentario"><div>${'★'.repeat(a.nota)}${'☆'.repeat(5 - a.nota)} <strong class="autor">${escapeHtml(a.autor)}</strong> <small>${escapeHtml(formatarData(a.dataHora))}</small></div><p>${escapeHtml(a.comentario)}</p></article>`
        ).join('')
      : '<p class="sem-comentarios">Ainda não há avaliações. Seja o primeiro!</p>';
  } catch (err) {
    container.textContent = err.message;
  }
}

document.addEventListener('toggle', (event) => {
  const details = event.target;
  if (details.tagName !== 'DETAILS' || !details.open) return;
  const lista = details.querySelector('.lista-avaliacoes');
  if (lista && !lista.dataset.carregado) {
    lista.dataset.carregado = 'sim';
    carregarAvaliacoes(lista.dataset.lista, lista.dataset.id, lista);
  }
}, true);

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('.form-avaliacao');
  if (!form) return;
  event.preventDefault();
  const feedback = form.querySelector('.feedback-avaliacao');
  const botao = form.querySelector('button[type="submit"]');
  feedback.textContent = 'Enviando...';
  feedback.className = 'feedback-avaliacao';
  botao.disabled = true;
  try {
    const resp = await fetch(`/api/avaliacoes/${form.dataset.tipo}/${form.dataset.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nota: form.elements.nota.value, comentario: form.elements.comentario.value }),
    });
    const dados = await resp.json();
    if (resp.status === 401) throw new Error('Sua sessão expirou. Entre novamente para avaliar.');
    if (!resp.ok) throw new Error(dados.erro || 'Não foi possível enviar sua avaliação.');
    feedback.textContent = dados.mensagem;
    feedback.classList.add('sucesso-avaliacao');
    form.reset();
    const lista = form.parentElement.querySelector('.lista-avaliacoes');
    if (lista) await carregarAvaliacoes(form.dataset.tipo, form.dataset.id, lista);
  } catch (err) {
    feedback.textContent = err.message;
    feedback.classList.add('erro-avaliacao');
  } finally {
    botao.disabled = false;
  }
});

(async function init() {
  await iniciarSessao();
  await carregarCategorias();
  await carregarCatalogo();
})();
