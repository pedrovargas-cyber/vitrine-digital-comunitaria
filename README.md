# Vitrine Digital Comunitária — Entrega Final (versão web online)

Sistema web para que a associação de feirantes do bairro publique os produtos e
serviços dos seus empreendedores, e para que os moradores encontrem, avaliem e
encomendem direto pelo WhatsApp de quem produz.

**Integrantes:** Pedro Riboura · Levi Clem Brito · Fernando Martins Vitral

**Tecnologias:** Node.js 22 + Express · SQLite nativo (`node:sqlite`) · HTML, CSS e
JavaScript puro · JWT em cookie HTTP-only · senhas com hash BCrypt.

## Perfis e contas de teste

As contas são criadas automaticamente toda vez que o servidor inicia.

| Perfil | Login | Senha | O que pode fazer |
|---|---|---|---|
| Administrador | `testeadmin@teste.com` | `Teste@2029` | Painel completo: feirantes, produtos, categorias, moderação de avaliações, log de ações |
| Usuário comum (morador) | `testecomum@teste.com` | `Teste@2029` | Avaliar produtos/feirantes, ver e excluir as próprias avaliações |
| Visitante (sem login) | — | — | Ver catálogo, buscar, filtrar, ler avaliações, pedir via WhatsApp |

## Casos de uso

| Caso de uso | Ator | Onde |
|---|---|---|
| UC01 — Ver Catálogo (busca + filtro por categoria) | Visitante | `/index.html` |
| UC04 — Pedir via WhatsApp | Visitante | botão no cartão do produto |
| UC05 — Fazer Login | Admin / Comum | `/login.html` |
| UC06 — Gerenciar Feirantes (cadastrar, editar, desativar, reativar) | Admin | Painel › Feirantes |
| UC07 — Gerenciar Produtos (publicar, editar, desativar, reativar) | Admin | Painel › Produtos |
| UC08 — Avaliar Produtos e Feirantes | Comum | catálogo + `/conta.html` |
| UC09 — Criar Conta de Morador | Visitante | `/cadastro.html` |
| UC10 — Gerenciar Categorias | Admin | Painel › Categorias |
| Moderação de avaliações e log de auditoria | Admin | Painel › Avaliações / Resumo |

## Regras de negócio

- Telefone do feirante: DDD + 9 dígitos (aceita com ou sem máscara).
- Produto só é criado com feirante ativo e categoria existente; valor numérico > 0 (aceita vírgula).
- Imagem: somente JPG/PNG/WEBP/GIF e até 5MB.
- Desativar feirante remove os produtos dele do catálogo; produto só pode ser reativado com o feirante ativo.
- Categoria com produtos vinculados não pode ser excluída; nomes de categoria não se repetem.
- Avaliação exige login, nota de 1 a 5 e comentário de 3 a 1000 caracteres; cada usuário avalia o mesmo item uma única vez.
- Usuário comum só exclui as próprias avaliações; o administrador pode excluir qualquer uma.
- Usuário comum não acessa o painel nem as rotas de administração (HTTP 403).

## Rodar localmente

```bash
npm install
npm start          # http://localhost:3000
```

## Publicar online (Render, plano gratuito)

1. Suba esta pasta para um repositório no GitHub (sem a pasta `node_modules`).
2. Em https://render.com, crie uma conta e clique em **New › Blueprint**, escolha o
   repositório. O arquivo `render.yaml` já configura tudo (Node 22, `npm install`,
   `npm start`, variável `JWT_SECRET`).
3. Aguarde o deploy e use o endereço `https://<nome>.onrender.com`.

Observações do plano gratuito: o serviço "dorme" após 15 minutos sem acesso e o
primeiro acesso depois disso leva cerca de 1 minuto. Ao reiniciar, o disco é
recriado: as contas de teste e os dados de demonstração voltam automaticamente,
mas cadastros feitos durante os testes são perdidos.
