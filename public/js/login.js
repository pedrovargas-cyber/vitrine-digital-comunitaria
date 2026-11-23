// public/js/login.js
// UC05 - Fazer Login (admin vai para o painel; usuário comum volta ao catálogo)

function destinoSeguro() {
  const voltar = new URLSearchParams(location.search).get('voltar');
  return voltar && voltar.startsWith('/') && !voltar.startsWith('//') ? voltar : null;
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  const erroBox = document.getElementById('erro');
  erroBox.style.display = 'none';

  if (!email || !senha) {
    return mostrarAviso(erroBox, 'Informe e-mail e senha.', 'erro', 0);
  }

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const dados = await resp.json();
    if (!resp.ok) {
      mostrarAviso(erroBox, dados.erro || 'Não foi possível entrar.', 'erro', 0);
      document.getElementById('senha').value = '';
      return;
    }
    const destino = dados.usuario.papel === 'admin' ? '/dashboard.html' : destinoSeguro() || '/index.html';
    window.location.href = destino;
  } catch {
    mostrarAviso(erroBox, 'Erro de conexão com o servidor. Tente novamente.', 'erro', 0);
  }
});

(async function () {
  const u = await iniciarSessao();
  if (u) window.location.href = u.papel === 'admin' ? '/dashboard.html' : '/index.html';
})();
