// public/js/comum.js
// Funções compartilhadas por todas as páginas: sessão, cabeçalho e utilidades.

function escapeHtml(valor) {
  const div = document.createElement('div');
  div.textContent = String(valor ?? '');
  return div.innerHTML;
}

function formatarPreco(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataHora) {
  if (!dataHora) return '';
  const d = new Date(String(dataHora).replace(' ', 'T') + (String(dataHora).includes('Z') ? '' : 'Z'));
  return isNaN(d) ? '' : d.toLocaleDateString('pt-BR');
}

let usuarioAtual = null;

async function obterSessao() {
  try {
    const resp = await fetch('/api/auth/me');
    if (!resp.ok) return null;
    const dados = await resp.json();
    return dados.usuario;
  } catch {
    return null;
  }
}

async function sair() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/index.html';
}

// Monta os links do cabeçalho de acordo com quem está logado
function montarCabecalho(usuario) {
  const nav = document.getElementById('nav-topo');
  if (!nav) return;
  const links = ['<a href="/index.html">Catálogo</a>'];
  if (!usuario) {
    links.push('<a href="/login.html">Entrar</a>');
    links.push('<a href="/cadastro.html" class="link-destaque">Criar conta</a>');
  } else {
    if (usuario.papel === 'admin') links.push('<a href="/dashboard.html">Painel</a>');
    links.push('<a href="/conta.html">Minha conta</a>');
    links.push(`<span class="ola">Olá, ${escapeHtml(usuario.nome.split(' ')[0])}</span>`);
    links.push('<a href="#" id="btn-sair">Sair</a>');
  }
  nav.innerHTML = links.join('');
  const btn = document.getElementById('btn-sair');
  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); sair(); });
}

async function iniciarSessao() {
  usuarioAtual = await obterSessao();
  montarCabecalho(usuarioAtual);
  return usuarioAtual;
}

function mostrarAviso(el, texto, tipo = 'erro', tempo = 5000) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return;
  el.textContent = texto;
  el.className = tipo === 'erro' ? 'erro-msg' : 'sucesso-msg';
  el.style.display = 'block';
  clearTimeout(el._timer);
  if (tempo) el._timer = setTimeout(() => (el.style.display = 'none'), tempo);
}
