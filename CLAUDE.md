# GymMatch — guia para o Claude

Trabalho acadêmico de **Programação Orientada a Objetos** do João Vitor. É uma reescrita em Python do app GymMatch: back-end **FastAPI + MySQL** e front-end **HTML/CSS/JS puro**, sem framework. Converse com ele em **português**. Ele prefere que tarefas grandes sejam feitas de uma vez, na ordem pedida, testando antes de entregar.

Repositório: https://github.com/JoaoD0/Gymmatch (branch `main`). O README tem o passo a passo completo para quem vai usar o projeto; este arquivo é o resumo para você.

---

## Tarefa mais provável: "recria o banco todo" numa máquina nova

Objetivo: deixar o app rodando com a demo populada, para a apresentação e para a professora ver o banco no **MySQL Workbench**.

1. **MySQL 8 instalado e rodando.** Confira com `Get-NetTCPConnection -LocalPort 3306 -State Listen` (PowerShell).
   - Se não estiver instalado: `winget install Oracle.MySQL`. Peça ao usuário a senha de root que ele quer usar.
   - Se estiver instalado mas parado e sem serviço do Windows (sem permissão de admin), dá para subir manualmente em segundo plano com o `mysqld.exe` e o `my.ini` da instalação. Avise que isso não sobrevive a reiniciar o PC.
2. **Recriar o banco do zero** (confirme com o usuário antes de apagar um banco `gymmatch` existente):
   ```
   mysql -u root -p -e "DROP DATABASE IF EXISTS gymmatch"
   mysql -u root -p < backend/schema.sql
   ```
   O `schema.sql` cria todas as tabelas e duas academias de exemplo. Não existe dump com dados; eles vêm do script da etapa 5.
3. **Back-end:**
   ```
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   ```
   Preencha `DB_USER` e `DB_PASSWORD` no `.env` com os dados do MySQL desta máquina. A `GROQ_API_KEY` é opcional: pergunte ao usuário se ele quer colar a chave dele. Sem ela, a Lucia responde por regras locais e funciona normalmente. **Nunca** escreva a chave em arquivos versionados nem em logs.
   Suba com `uvicorn app.main:app --port 8000` (a partir de `backend/`).
4. **Front-end:** a partir de `frontend/`, rode `python serve_no_cache.py 5500` e abra `http://localhost:5500`.
   - Não use `python -m http.server`: ele não revalida o cache e, no Windows, fica lento (atraso de IPv6 de ~200 ms por arquivo).
   - Rode os dois servidores em segundo plano.
5. **Popular a demo** (com o back-end rodando):
   ```
   cd backend
   venv\Scripts\python.exe scripts/seed_demo.py
   ```
   Cria a academia "Iron Club Paulista" com 13 pessoas fictícias (fotos em `backend/scripts/demo_fotos/`), matches, conversas, Feed, Moves, check-in, boost e treino, tudo pela API.
   - Pode rodar de novo: ele apaga só a demo anterior.
   - Rode perto da apresentação: os Moves duram 24h, o check-in 3h e o boost 1h.
6. **Conferir:**
   - entrar no app com `lucas.andrade@gymmatch.app` / `demo1234` (as outras contas usam a mesma senha, no formato `nome.sobrenome@gymmatch.app`);
   - no Workbench, abrir o schema `gymmatch` e rodar as consultas de exemplo do README (seção "Ver o banco no MySQL Workbench").

---

## Regras do projeto

- **Git:** a cada mudança concluída, faça commit (mensagem em português explicando o porquê) e `git push` para `JoaoD0/Gymmatch`.
  - **Nunca** coloque atribuição ao Claude (`Co-Authored-By` etc.) em commits ou PRs.
  - Nunca use push forçado.
  - Se o push der 403 porque o Windows está logado em outra conta do GitHub (ex.: `JoaoVD001`), use `git remote set-url origin https://JoaoD0@github.com/JoaoD0/Gymmatch.git` e peça ao usuário para fazer o login da `JoaoD0` quando o navegador abrir.
- **Nunca versionar** (já está no `.gitignore`; confira o `git status` antes de commitar):
  - `backend/.env`;
  - `backend/uploads/`;
  - `backend/venv/`;
  - `__pycache__/`;
  - dumps do banco com dados reais.
- **Camadas do back-end** (`backend/app/`):
  - `models`: domínio, com atributos privados + `@property` validando;
  - `repositories`: só SQL parametrizado;
  - `services`: regras de negócio;
  - `schemas`: Pydantic;
  - `routers`: só traduzem HTTP.
  - Sem SQL nem regra de negócio nos routers.
  - Consultas de listagem sem N+1.
- **Front-end** (`frontend/`):
  - uma página HTML por tela;
  - utilitários prontos em `js/api.js`: `apiFetch`, `escapeHtml`, `mostrarToast`;
  - ícones SVG inline em `js/icons.js`, copiados do Lucide;
  - folha inferior em `js/sheet.js`, barra inferior em `js/navbar.js`;
  - cores em OKLCH, nas variáveis de `css/style.css`;
  - **todo texto de usuário inserido via `innerHTML` passa por `escapeHtml()`**.
- **Mudança no banco:** atualize o `backend/schema.sql` (tabelas na ordem certa das FKs) e aplique no MySQL local.

## Armadilhas já conhecidas

- **`bcrypt` no Windows:** o `bcrypt` precisa ficar na versão `4.0.1` (já está fixado no `requirements.txt`). Versões novas quebram o `passlib` e o login dá erro 500.
- **Endereço da API:** o front chama a API em `127.0.0.1:8000`, não em `localhost` (ver `js/api.js`), por causa do atraso de IPv6 no Windows.
- **Elemento com `[hidden]` que continua aparecendo:** um `display: flex/grid` na classe anula o atributo `hidden`. Adicione a regra `.classe[hidden] { display: none; }`.
- **Edição por script no Windows:** o Python grava com CRLF. Em arquivos que precisam de LF, abra com `newline="\n"`.
- **Modelo da Lucia:** o modelo padrão é `openai/gpt-oss-20b`, porque o `llama-3.1-8b-instant` foi aposentado pela Groq. Dá para trocar com `GROQ_MODEL` no `.env`.
- **Transições entre telas:** usam View Transitions e só animam no Chrome e no Edge.
