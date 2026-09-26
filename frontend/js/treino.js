const INTERVALO_ATUALIZACAO_MS = 30000;
const INTERVALO_CHECKIN_MS = 60000;
const CHAVE_MARCADOS_ABERTO = "gymmatch_treino_marcados_aberto";
const MAXIMO_GRUPO = 4;

let dados = null;              // resposta de GET /treino
let primeiraCarga = true;
let diaEmEdicao = null;
let pendentesConhecidos = null; // ids "c<id>" / "s<id>" já vistos, para o aviso de novidade
let academias = null;
let publicarNoFeed = false;

const $ = (id) => document.getElementById(id);

// ---------- utilidades ----------
function formatarDataHora(texto) {
    // o back-end manda hora local sem fuso ("2026-09-25T18:30:00"): new Date() lê como hora local
    const d = new Date(texto);
    const data = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${data} às ${hora}`;
}

function avatarHtml(pessoa, classes = "", semFoto = "gradiente", titulo = "") {
    // escapeHtml não escapa aspas; dentro de atributo elas também precisam virar entidade
    const attrTitulo = titulo ? ` title="${escapeHtml(titulo).replace(/"/g, "&quot;")}"` : "";
    if (pessoa && pessoa.foto_url) {
        return `<div class="treino-avatar ${classes}"${attrTitulo}><img src="${API_BASE_URL}${pessoa.foto_url}" alt="" loading="lazy" /></div>`;
    }
    if (semFoto === "dumbbell-coral") return `<div class="treino-avatar coral ${classes}"${attrTitulo}>${ICONS.dumbbell}</div>`;
    if (semFoto === "dumbbell") return `<div class="treino-avatar neutro ${classes}"${attrTitulo}>${ICONS.dumbbell}</div>`;
    return `<div class="treino-avatar gradiente ${classes}"${attrTitulo}></div>`;
}

function entrada(atrasoMs) {
    return primeiraCarga ? { classe: "entrada", estilo: `style="animation-delay:${atrasoMs}ms"` } : { classe: "", estilo: "" };
}

function algumaFolhaAberta() {
    return document.querySelector(".sheet-overlay") !== null;
}

function hojeLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dataNoPassado(data, hora) {
    return new Date(`${data}T${hora}`) < new Date();
}

function confirmar({ titulo, texto, botao }) {
    return new Promise((resolve) => {
        const folha = abrirFolha(`
            <p class="sheet-title">${titulo}</p>
            <p class="treino-confirma-texto">${texto}</p>
            <div class="treino-confirma-acoes">
                <button type="button" class="nao" data-acao="nao">Voltar</button>
                <button type="button" class="sim" data-acao="sim">${botao}</button>
            </div>
        `, { podeFechar: () => { resolve(false); return true; } });
        folha.conteudo.addEventListener("click", (e) => {
            const alvo = e.target.closest("[data-acao]");
            if (!alvo) return;
            folha.fechar();
            resolve(alvo.dataset.acao === "sim");
        });
    });
}

function diaDoPlano(chave) {
    return dados.plano.find((d) => d.dia === chave);
}

// ---------- cabeçalho ----------
function renderizarCabecalho() {
    const n = dados.pendentes_recebidos;
    $("treino-header").innerHTML = `
        <h1 class="treino-titulo">Treino</h1>
        <button type="button" class="treino-btn-convidar" id="btn-convidar">
            ${ICONS.userPlus}Convidar${n > 0 ? `<span class="treino-contador">${n}</span>` : ""}
        </button>`;
    $("btn-convidar").addEventListener("click", abrirFolhaConvite);
    if (window.mostrarPontoTreino) window.mostrarPontoTreino(n);
}

// ---------- 4.1 check-in ----------
function checkinAtivo() {
    return dados.checkin && new Date(dados.checkin.expira_em) > new Date();
}

function tempoRestante() {
    const ms = new Date(dados.checkin.expira_em) - new Date();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}min restantes` : `${m}min restantes`;
}

function renderizarCheckin() {
    const { classe, estilo } = entrada(0);
    const sec = $("sec-checkin");

    if (checkinAtivo()) {
        sec.innerHTML = `
            <div class="treino-checkin ativo ${classe}" ${estilo}>
                <div class="treino-linha-flex">
                    <div class="treino-ponto-vivo"><span class="ping"></span><span class="ponto"></span></div>
                    <div class="treino-textos">
                        <p class="treino-t14 treino-verde">Na academia agora</p>
                        <p class="treino-t12" id="checkin-restante">${tempoRestante()} · Visível no Descobrir</p>
                    </div>
                    <button type="button" class="treino-btn-sair" id="btn-checkout">Sair</button>
                </div>
            </div>`;
        $("btn-checkout").addEventListener("click", fazerCheckout);
        return;
    }

    sec.innerHTML = `
        <div class="treino-checkin ${classe}" ${estilo} role="button" tabindex="0" id="btn-checkin">
            <div class="treino-linha-flex">
                <div class="treino-quadrado">${ICONS.mapPin}</div>
                <div class="treino-textos">
                    <p class="treino-t14">Estou na academia agora</p>
                    <p class="treino-t12">Apareça em destaque no Descobrir por 3h</p>
                </div>
                <span class="treino-pilula coral">Check-in</span>
            </div>
            <label class="treino-checkin-feed" id="checkin-feed">
                <span>Avisar no feed</span>
                <span class="treino-switch">
                    <input type="checkbox" id="checkin-publicar" ${publicarNoFeed ? "checked" : ""} />
                    <span class="trilho"><span class="bolinha"></span></span>
                </span>
            </label>
        </div>`;

    const card = $("btn-checkin");
    // o interruptor fica dentro do card, mas tocar nele não pode disparar o check-in
    $("checkin-feed").addEventListener("click", (e) => e.stopPropagation());
    $("checkin-publicar").addEventListener("change", (e) => { publicarNoFeed = e.target.checked; });
    card.addEventListener("click", fazerCheckin);
    card.addEventListener("keydown", (e) => {
        if (e.target === card && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            fazerCheckin();
        }
    });
}

let fazendoCheckin = false;
async function fazerCheckin() {
    if (fazendoCheckin) return;
    fazendoCheckin = true;
    try {
        dados.checkin = await apiFetch("/treino/checkin", {
            method: "POST",
            body: JSON.stringify({ publicar_no_feed: publicarNoFeed }),
        });
        renderizarCheckin();
        mostrarToast("Check-in feito! Você aparece em destaque no Descobrir 🟢", "success");
    } catch (e) {
        mostrarToast(e.message, "error");
    } finally {
        fazendoCheckin = false;
    }
}

async function fazerCheckout() {
    try {
        await apiFetch("/treino/checkin", { method: "DELETE" });
        dados.checkin = null;
        renderizarCheckin();
        mostrarToast("Check-out feito.");
    } catch (e) {
        mostrarToast(e.message, "error");
    }
}

function tickCheckin() {
    if (!dados || !dados.checkin) return;
    if (!checkinAtivo()) {
        dados.checkin = null;
        renderizarCheckin();
        return;
    }
    const el = $("checkin-restante");
    if (el) el.textContent = `${tempoRestante()} · Visível no Descobrir`;
}

// ---------- 4.2 grupos ----------
function renderizarGrupos() {
    const { classe, estilo } = entrada(60);
    const pendentes = dados.sessoes.filter((s) => s.meu_status === "pendente");
    const confirmadas = dados.sessoes.filter((s) => s.sou_criador || s.meu_status === "aceito");
    const temConteudo = pendentes.length > 0 || confirmadas.length > 0;
    const temMatches = dados.matches.length > 0;
    const eu = getUsuario();

    let corpo = "";
    if (temMatches && !temConteudo) {
        corpo += `
            <button type="button" class="treino-cta-grupo" data-acao="novo-grupo">
                <div class="treino-linha-flex">
                    <div class="treino-quadrado">${ICONS.users}</div>
                    <div class="treino-textos">
                        <p class="treino-t14">Criar grupo de treino</p>
                        <p class="treino-t12">Chame seus matches para treinar juntos</p>
                    </div>
                    <span class="mais">${ICONS.plus}</span>
                </div>
            </button>`;
    }
    if (!temMatches && dados.sessoes.length === 0) {
        corpo += `<p class="treino-texto-vazio">Faça matches para criar um grupo de treino.</p>`;
    }

    if (pendentes.length) {
        corpo += `<div class="treino-lista" style="margin-bottom:8px">${pendentes.map((s) => {
            const outros = [s.criador, ...s.membros].filter((p) => !eu || p.id !== eu.id).slice(0, 4);
            return `
                <div class="treino-card-coral" data-sessao="${s.id}">
                    <div class="treino-card-topo">
                        ${avatarHtml(s.criador)}
                        <div class="treino-textos">
                            <p class="treino-t14 treino-trunc">${escapeHtml(s.criador.nome)} criou um grupo</p>
                            <p class="treino-meta">${ICONS.clock}<span>${formatarDataHora(s.agendada_para)}</span></p>
                            <p class="treino-meta">${ICONS.mapPin}<span>${escapeHtml(s.academia.nome)}</span></p>
                        </div>
                    </div>
                    <div class="treino-grupo-pessoas">
                        ${ICONS.users}
                        <div class="treino-pilha p24">${outros.map((p) => avatarHtml(p)).join("")}</div>
                        <span class="treino-t11">${s.total_pessoas} pessoas</span>
                    </div>
                    <div class="treino-dois-botoes">
                        <button type="button" class="treino-btn borda" data-acao="recusar-sessao" data-id="${s.id}">Recusar</button>
                        <button type="button" class="treino-btn gradiente" data-acao="aceitar-sessao" data-id="${s.id}">Confirmar</button>
                    </div>
                </div>`;
        }).join("")}</div>`;
    }

    if (confirmadas.length) {
        corpo += `<div class="treino-lista">${confirmadas.map((s) => `
            <div class="treino-card-neutro" data-sessao="${s.id}">
                <div class="treino-sessao-linha">
                    <div class="treino-quadrado q40">${ICONS.users}</div>
                    <div class="treino-textos">
                        <p class="treino-t14 treino-trunc" style="font-size:13px">${escapeHtml(s.academia.nome)}</p>
                        <p class="treino-t12">${formatarDataHora(s.agendada_para)}</p>
                        ${s.descricao ? `<p class="treino-sessao-desc treino-trunc">${escapeHtml(s.descricao)}</p>` : ""}
                        <div class="treino-sessao-pessoas">
                            <div class="treino-pilha p20">${s.membros.slice(0, 4)
                                .map((m) => avatarHtml(m, m.status === "aceito" ? "" : "pendente", "gradiente", m.nome)).join("")}</div>
                            <span class="treino-t11">${s.confirmados}/${s.membros.length} confirmados</span>
                        </div>
                    </div>
                    ${s.sou_criador ? `<button type="button" class="treino-lixeira" data-acao="cancelar-sessao" data-id="${s.id}" aria-label="Cancelar sessão">${ICONS.trash2}</button>` : ""}
                </div>
            </div>`).join("")}</div>`;
    }

    $("sec-grupos").innerHTML = `
        <div class="${classe}" ${estilo}>
            <div class="treino-rotulo-linha">
                <p class="treino-rotulo">Grupos de treino</p>
                ${temMatches && temConteudo ? `<button type="button" class="treino-link-novo" data-acao="novo-grupo">${ICONS.plus}Novo</button>` : ""}
            </div>
            ${corpo}
        </div>`;
}

$("sec-grupos").addEventListener("click", async (e) => {
    const alvo = e.target.closest("[data-acao]");
    if (!alvo) return;
    const id = Number(alvo.dataset.id);

    if (alvo.dataset.acao === "novo-grupo") abrirFolhaGrupo();

    if (alvo.dataset.acao === "aceitar-sessao" || alvo.dataset.acao === "recusar-sessao") {
        const aceitar = alvo.dataset.acao === "aceitar-sessao";
        alvo.disabled = true;
        try {
            await apiFetch(`/treino/sessoes/${id}/${aceitar ? "aceitar" : "recusar"}`, { method: "POST" });
            mostrarToast(aceitar ? "Confirmado!" : "Recusado.", aceitar ? "success" : "info");
            await sairEAtualizar(alvo.closest("[data-sessao]"));
        } catch (err) {
            alvo.disabled = false;
            mostrarToast(err.message, "error");
        }
    }

    if (alvo.dataset.acao === "cancelar-sessao") {
        const ok = await confirmar({ titulo: "Cancelar sessão?", texto: "Todos os convidados deixam de ver este grupo.", botao: "Cancelar sessão" });
        if (!ok) return;
        try {
            await apiFetch(`/treino/sessoes/${id}`, { method: "DELETE" });
            mostrarToast("Sessão cancelada.");
            await sairEAtualizar(alvo.closest("[data-sessao]"));
        } catch (err) {
            mostrarToast(err.message, "error");
        }
    }
});

// ---------- 4.3 desafios ----------
function renderizarDesafios() {
    const { classe, estilo } = entrada(80);
    $("sec-desafios").innerHTML = `
        <a href="desafios.html" class="treino-desafios ${classe}" ${estilo}>
            <div class="treino-linha-flex">
                <div class="treino-quadrado">${ICONS.flame}</div>
                <div class="treino-textos">
                    <p class="treino-t14">Desafios</p>
                    <p class="treino-t12">Desafie seus matches e compita</p>
                </div>
                <span class="seta">${ICONS.chevronRight}</span>
            </div>
        </a>`;
}

// ---------- 4.4 convites recebidos ----------
function convitesRecebidosPendentes() {
    return dados.convites.filter((c) => c.status === "pendente" && !c.sou_remetente && !c.passado);
}

function renderizarConvites() {
    const recebidos = convitesRecebidosPendentes();
    if (!recebidos.length) {
        $("sec-convites").innerHTML = "";
        return;
    }
    const { classe, estilo } = entrada(0);
    $("sec-convites").innerHTML = `
        <div class="${classe}" ${estilo}>
            <p class="treino-rotulo" style="margin-bottom:10px">Convites recebidos</p>
            <div class="treino-lista">${recebidos.map((c, i) => {
                const anim = entrada(i * 60);
                return `
                <div class="treino-card-coral ${anim.classe}" ${anim.estilo} data-convite="${c.id}">
                    <div class="treino-card-topo">
                        ${avatarHtml(c.outro, "anel", "dumbbell-coral")}
                        <div class="treino-textos">
                            <p class="treino-t14 treino-trunc">${escapeHtml(c.outro.nome)} te convidou</p>
                            <p class="treino-meta">${ICONS.clock}<span>${formatarDataHora(c.agendado_para)}</span></p>
                            <p class="treino-meta">${ICONS.mapPin}<span>${escapeHtml(c.academia.nome)}</span></p>
                        </div>
                    </div>
                    <div class="treino-dois-botoes">
                        <button type="button" class="treino-btn pilula-coral" data-acao="aceitar" data-id="${c.id}">Aceitar</button>
                        <button type="button" class="treino-btn pilula-borda" data-acao="recusar" data-id="${c.id}">Recusar</button>
                    </div>
                </div>`;
            }).join("")}</div>
        </div>`;
}

$("sec-convites").addEventListener("click", async (e) => {
    const alvo = e.target.closest("[data-acao]");
    if (!alvo) return;
    const aceitar = alvo.dataset.acao === "aceitar";
    const card = alvo.closest("[data-convite]");
    card.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
        await apiFetch(`/treino/convites/${alvo.dataset.id}/${aceitar ? "aceitar" : "recusar"}`, { method: "POST" });
        mostrarToast(aceitar ? "Convite aceito!" : "Convite recusado", aceitar ? "success" : "info");
        await sairEAtualizar(card);
    } catch (err) {
        card.querySelectorAll("button").forEach((b) => (b.disabled = false));
        mostrarToast(err.message, "error");
    }
});

async function sairEAtualizar(elemento) {
    if (elemento) {
        elemento.classList.add("saindo");
        await new Promise((r) => setTimeout(r, 250));
    }
    await atualizarDoServidor();
}

// ---------- 4.5 plano da semana ----------
function linhaPlanoHtml(dia, indice) {
    const hoje = dia.dia === dados.hoje;
    const editando = diaEmEdicao === dia.dia;
    const qtd = dia.exercicios.length;
    const anim = entrada(indice * 40);

    const coluna = hoje
        ? `<p class="treino-dia-hoje">Hoje</p><p class="treino-dia-curto-hoje">${dia.curto}</p>`
        : `<p class="treino-dia-curto">${dia.curto}</p>`;

    const conteudo = editando
        ? `<input class="treino-dia-input" id="input-dia" maxlength="60" placeholder="Treino de ${dia.nome.toLowerCase()}..." />`
        : `<p class="treino-dia-desc ${dia.descricao ? "" : "descanso"}">${dia.descricao ? escapeHtml(dia.descricao) : "Descanso"}</p>
           ${qtd > 0 ? `<p class="treino-dia-qtd">${qtd} exercício${qtd > 1 ? "s" : ""}</p>` : ""}`;

    const acoes = editando
        ? `<button type="button" class="treino-circulo ok" data-acao="salvar" aria-label="Salvar">${ICONS.check}</button>
           <button type="button" class="treino-circulo nao" data-acao="cancelar" aria-label="Cancelar">${ICONS.x}</button>`
        : `<button type="button" class="treino-circulo lapis" data-acao="editar" aria-label="Editar ${dia.nome}">${ICONS.pencil}</button>`;

    return `
        <div class="treino-dia ${hoje ? "hoje" : ""} ${anim.classe}" ${anim.estilo} data-dia="${dia.dia}">
            <div class="treino-dia-col">${coluna}</div>
            <div class="treino-dia-conteudo">${conteudo}</div>
            <div class="treino-dia-acoes">${acoes}</div>
        </div>`;
}

function renderizarPlano() {
    $("sec-plano").innerHTML = `
        <p class="treino-rotulo" style="margin-bottom:12px">Plano da semana</p>
        <div class="treino-plano" id="plano-lista">${dados.plano.map(linhaPlanoHtml).join("")}</div>`;
}

function renderizarLinhaPlano(chave) {
    const indice = dados.plano.findIndex((d) => d.dia === chave);
    const antiga = document.querySelector(`.treino-dia[data-dia="${chave}"]`);
    if (!antiga) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = linhaPlanoHtml(dados.plano[indice], indice);
    const nova = tmp.firstElementChild;
    nova.classList.remove("entrada");
    antiga.replaceWith(nova);

    if (diaEmEdicao === chave) {
        const input = $("input-dia");
        input.value = dados.plano[indice].descricao;
        input.focus();
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") salvarDia(chave);
            if (e.key === "Escape") cancelarEdicao();
        });
    }
}

function editarDia(chave) {
    const anterior = diaEmEdicao;
    diaEmEdicao = chave;
    if (anterior && anterior !== chave) renderizarLinhaPlano(anterior);
    renderizarLinhaPlano(chave);
}

function cancelarEdicao() {
    const chave = diaEmEdicao;
    diaEmEdicao = null;
    if (chave) renderizarLinhaPlano(chave);
}

let salvandoDia = false;
async function salvarDia(chave) {
    if (salvandoDia) return;
    salvandoDia = true;
    const texto = $("input-dia").value;
    try {
        const dia = await apiFetch(`/treino/plano/${chave}`, { method: "PUT", body: JSON.stringify({ descricao: texto }) });
        diaDoPlano(chave).descricao = dia.descricao;
        diaEmEdicao = null;
        renderizarLinhaPlano(chave);
    } catch (e) {
        mostrarToast(e.message, "error");
    } finally {
        salvandoDia = false;
    }
}

$("sec-plano").addEventListener("click", (e) => {
    const alvo = e.target.closest("[data-acao]");
    if (!alvo) return;
    const chave = alvo.closest("[data-dia]").dataset.dia;
    if (alvo.dataset.acao === "editar") editarDia(chave);
    if (alvo.dataset.acao === "salvar") salvarDia(chave);
    if (alvo.dataset.acao === "cancelar") cancelarEdicao();
});

// ---------- 4.6 meus exercícios ----------
function renderizarExercicios() {
    const diasComEx = dados.plano.filter((d) => d.exercicios.length > 0);
    const card = entrada(320);

    $("sec-exercicios").innerHTML = `
        <button type="button" class="treino-ex-card ${card.classe}" ${card.estilo} data-acao="abrir">
            <div class="treino-quadrado q40">${ICONS.listChecks}</div>
            <div class="treino-textos">
                <p class="treino-ex-titulo">Meus Exercícios</p>
                <p class="treino-ex-sub">${diasComEx.length ? diasComEx.map((d) => d.curto).join(" · ") : "Adicione exercícios por dia da semana"}</p>
            </div>
            <span class="seta">${ICONS.chevronRight}</span>
        </button>
        ${diasComEx.length ? `<div class="treino-resumo">${diasComEx.map((d, i) => {
            const anim = entrada(400 + i * 60);
            return `
            <div class="treino-resumo-dia ${anim.classe}" ${anim.estilo}>
                <div class="treino-resumo-topo">
                    <p class="treino-resumo-nome ${d.dia === dados.hoje ? "hoje" : ""}">${d.nome}</p>
                    <button type="button" class="treino-link-editar" data-acao="editar-dia" data-dia="${d.dia}">Editar</button>
                </div>
                ${d.exercicios.map((ex) => `
                    <div class="treino-resumo-item">
                        <span class="treino-bolinha"></span>
                        <p class="nome">${escapeHtml(ex.nome)}</p>
                        ${ex.resumo ? `<span class="treino-series">${ex.resumo}</span>` : ""}
                    </div>`).join("")}
            </div>`;
        }).join("")}</div>` : ""}`;
}

$("sec-exercicios").addEventListener("click", (e) => {
    const alvo = e.target.closest("[data-acao]");
    if (!alvo) return;
    abrirFolhaExercicios(alvo.dataset.acao === "editar-dia" ? alvo.dataset.dia : null);
});

function aoMudarExercicios(chave) {
    renderizarExercicios();
    if (diaEmEdicao !== chave) renderizarLinhaPlano(chave);
}

function abrirFolhaExercicios(diaInicial) {
    let diaAtual = diaInicial;
    let adicionando = false;
    let enviando = false;

    const folha = abrirFolha(`<div id="ex-folha"></div>`);
    const raiz = folha.conteudo.querySelector("#ex-folha");

    function etapa1() {
        raiz.innerHTML = `
            <div class="treino-folha-cabeca">
                <p class="treino-folha-titulo">Meus Exercícios</p>
                <p class="treino-folha-sub">Selecione o dia para editar</p>
            </div>
            <div class="treino-grade-dias">${dados.plano.map((d, i) => {
                const n = d.exercicios.length;
                return `
                <button type="button" class="treino-dia-btn entrada ${d.dia === dados.hoje ? "hoje" : ""}" style="animation-delay:${i * 35}ms" data-acao="dia" data-dia="${d.dia}">
                    <div>
                        <p class="nome">${d.nome}</p>
                        <p class="qtd">${n > 0 ? `${n} exercício${n > 1 ? "s" : ""}` : "Vazio"}</p>
                    </div>
                    ${n > 0 ? `<span class="treino-badge-num">${n}</span>` : ""}
                </button>`;
            }).join("")}</div>
            <button type="button" class="treino-fechar-folha" data-acao="fechar">Fechar</button>`;
    }

    function listaHtml(dia) {
        if (!dia.exercicios.length) {
            return adicionando ? "" : `<p class="treino-vazio-italico">Nenhum exercício ainda.</p>`;
        }
        return dia.exercicios.map((ex) => `
            <div class="treino-ex-item">
                <span class="treino-bolinha"></span>
                <div class="treino-textos">
                    <p class="nome">${escapeHtml(ex.nome)}</p>
                    ${ex.series || ex.reps ? `<p class="detalhe">${ex.series ?? "—"} séries × ${ex.reps ?? "—"} reps</p>` : ""}
                </div>
                <button type="button" class="treino-ex-apagar" data-acao="apagar" data-id="${ex.id}" aria-label="Apagar exercício">${ICONS.trash2}</button>
            </div>`).join("");
    }

    function atualizarLista() {
        const dia = diaDoPlano(diaAtual);
        raiz.querySelector("#ex-lista").innerHTML = listaHtml(dia);
        raiz.querySelector("#ex-qtd").textContent = `${dia.exercicios.length} exercício(s)`;
    }

    function formHtml() {
        if (!adicionando) {
            return `<button type="button" class="treino-btn-add-ex" data-acao="mostrar-form">${ICONS.plus}Adicionar exercício</button>`;
        }
        return `
            <div class="treino-form-ex entrada">
                <input class="nome" id="ex-nome" maxlength="60" placeholder="Nome do exercício..." />
                <div class="linha">
                    <input type="number" id="ex-series" min="1" max="20" placeholder="Séries" />
                    <input type="number" id="ex-reps" min="1" max="100" placeholder="Reps" />
                </div>
                <div class="linha">
                    <button type="button" class="treino-btn-solido" data-acao="adicionar" id="ex-adicionar" disabled>Adicionar</button>
                    <button type="button" class="treino-btn-contorno" data-acao="esconder-form">Cancelar</button>
                </div>
            </div>`;
    }

    function atualizarForm() {
        raiz.querySelector("#ex-form").innerHTML = formHtml();
        if (!adicionando) return;
        const nome = raiz.querySelector("#ex-nome");
        nome.addEventListener("input", () => { raiz.querySelector("#ex-adicionar").disabled = !nome.value.trim(); });
        raiz.querySelectorAll("#ex-form input").forEach((input) => {
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") adicionar();
                if (e.key === "Escape") { e.stopPropagation(); adicionando = false; atualizarForm(); atualizarLista(); }
            });
        });
        setTimeout(() => nome.focus(), 50);
    }

    function etapa2() {
        const dia = diaDoPlano(diaAtual);
        raiz.innerHTML = `
            <div class="treino-folha-cabeca-flex">
                <button type="button" class="treino-voltar" data-acao="voltar" aria-label="Voltar">${ICONS.chevronDown}</button>
                <div>
                    <p class="treino-folha-titulo">${dia.nome}</p>
                    <p class="treino-folha-sub" id="ex-qtd"></p>
                </div>
            </div>
            <div class="treino-ex-lista" id="ex-lista"></div>
            <div id="ex-form"></div>
            <button type="button" class="treino-fechar-folha" data-acao="fechar">Fechar</button>`;
        atualizarLista();
        atualizarForm();
    }

    function numeroOuNulo(valor) {
        return valor === "" ? null : Number(valor);
    }

    async function adicionar() {
        const nome = raiz.querySelector("#ex-nome");
        if (enviando || !nome.value.trim()) return;
        enviando = true;
        try {
            const ex = await apiFetch("/treino/exercicios", {
                method: "POST",
                body: JSON.stringify({
                    dia: diaAtual,
                    nome: nome.value,
                    series: numeroOuNulo(raiz.querySelector("#ex-series").value),
                    reps: numeroOuNulo(raiz.querySelector("#ex-reps").value),
                }),
            });
            diaDoPlano(diaAtual).exercicios.push(ex);
            atualizarLista();
            nome.value = "";
            raiz.querySelector("#ex-series").value = "";
            raiz.querySelector("#ex-reps").value = "";
            raiz.querySelector("#ex-adicionar").disabled = true;
            nome.focus();
            aoMudarExercicios(diaAtual);
        } catch (e) {
            mostrarToast(e.message, "error");
        } finally {
            enviando = false;
        }
    }

    async function apagar(id) {
        try {
            await apiFetch(`/treino/exercicios/${id}`, { method: "DELETE" });
            const dia = diaDoPlano(diaAtual);
            dia.exercicios = dia.exercicios.filter((ex) => ex.id !== id);
            atualizarLista();
            aoMudarExercicios(diaAtual);
        } catch (e) {
            mostrarToast(e.message, "error");
        }
    }

    raiz.addEventListener("click", (e) => {
        const alvo = e.target.closest("[data-acao]");
        if (!alvo) return;
        switch (alvo.dataset.acao) {
            case "dia": diaAtual = alvo.dataset.dia; adicionando = false; etapa2(); break;
            case "voltar": diaAtual = null; adicionando = false; etapa1(); break;
            case "fechar": folha.fechar(); break;
            case "mostrar-form": adicionando = true; atualizarForm(); atualizarLista(); break;
            case "esconder-form": adicionando = false; atualizarForm(); atualizarLista(); break;
            case "adicionar": adicionar(); break;
            case "apagar": apagar(Number(alvo.dataset.id)); break;
        }
    });

    if (diaAtual) etapa2(); else etapa1();
}

// ---------- 4.7 treinos marcados ----------
const ROTULO_STATUS = { pendente: "Aguardando", aceito: "Confirmado", recusado: "Recusado", cancelado: "Cancelado" };

function marcadoHtml(c, comAcoes) {
    return `
        <div class="treino-marcado" data-convite="${c.id}">
            <div class="treino-linha-flex" style="gap:12px">
                ${avatarHtml(c.outro, "", "dumbbell")}
                <div class="treino-textos">
                    <p class="treino-t14 treino-trunc">${escapeHtml(c.outro.nome)}</p>
                    <p class="treino-meta">${ICONS.clock}<span>${formatarDataHora(c.agendado_para)}</span></p>
                    <p class="treino-meta">${ICONS.mapPin}<span>${escapeHtml(c.academia.nome)}</span></p>
                </div>
                <div class="treino-marcado-dir">
                    <span class="treino-status ${c.status}">${ROTULO_STATUS[c.status]}</span>
                    ${comAcoes && c.sou_remetente && c.status === "pendente"
                        ? `<button type="button" class="treino-link-cancelar" data-acao="cancelar-convite" data-id="${c.id}">Cancelar</button>` : ""}
                </div>
            </div>
        </div>`;
}

function marcadosAberto() {
    try {
        return localStorage.getItem(CHAVE_MARCADOS_ABERTO) !== "0";
    } catch {
        return true;
    }
}

function renderizarMarcados() {
    const recebidosIds = new Set(convitesRecebidosPendentes().map((c) => c.id));
    const meus = dados.convites.filter((c) => !recebidosIds.has(c.id));
    if (!meus.length) {
        $("sec-marcados").innerHTML = "";
        return;
    }
    const proximos = meus.filter((c) => !c.passado).sort((a, b) => a.agendado_para.localeCompare(b.agendado_para));
    const passados = meus.filter((c) => c.passado).sort((a, b) => b.agendado_para.localeCompare(a.agendado_para));
    const aberto = marcadosAberto();
    const { classe, estilo } = entrada(500);

    $("sec-marcados").innerHTML = `
        <div class="${classe}" ${estilo}>
            <button type="button" class="treino-marcados-toggle ${aberto ? "aberto" : ""}" data-acao="alternar" aria-expanded="${aberto}">
                <p class="treino-rotulo">Treinos marcados</p>
                ${ICONS.chevronDown}
            </button>
            <div class="treino-marcados-corpo" ${aberto ? "" : "hidden"}>
                ${proximos.length ? `
                    <div>
                        <p class="treino-subrotulo">Próximos</p>
                        <div class="treino-lista">${proximos.map((c) => marcadoHtml(c, true)).join("")}</div>
                    </div>` : ""}
                ${passados.length ? `
                    <div>
                        <p class="treino-subrotulo passados">Passados</p>
                        <div class="treino-lista treino-passados">${passados.map((c) => marcadoHtml(c, false)).join("")}</div>
                    </div>` : ""}
            </div>
        </div>`;
}

$("sec-marcados").addEventListener("click", async (e) => {
    const alvo = e.target.closest("[data-acao]");
    if (!alvo) return;

    if (alvo.dataset.acao === "alternar") {
        const abrir = !marcadosAberto();
        try { localStorage.setItem(CHAVE_MARCADOS_ABERTO, abrir ? "1" : "0"); } catch { /* sem storage: só não lembra */ }
        alvo.classList.toggle("aberto", abrir);
        alvo.setAttribute("aria-expanded", abrir);
        alvo.nextElementSibling.hidden = !abrir;
    }

    if (alvo.dataset.acao === "cancelar-convite") {
        const ok = await confirmar({ titulo: "Cancelar convite?", texto: "A outra pessoa verá o convite como cancelado.", botao: "Cancelar convite" });
        if (!ok) return;
        try {
            await apiFetch(`/treino/convites/${alvo.dataset.id}/cancelar`, { method: "POST" });
            mostrarToast("Convite cancelado", "success");
            await atualizarDoServidor();
        } catch (err) {
            mostrarToast(err.message, "error");
        }
    }
});

// ---------- 5. modais de agendamento ----------
async function carregarAcademias() {
    if (!academias) academias = await apiFetch("/academias");
    return academias;
}

function opcoesAcademias(selecionada) {
    return academias.map((a) => `<option value="${a.id}" ${a.id === selecionada ? "selected" : ""}>${escapeHtml(a.nome)}</option>`).join("");
}

function minhaAcademiaId() {
    const u = getUsuario();
    return u ? u.academia_id : null;
}

async function abrirFolhaConvite() {
    try {
        await carregarAcademias();
    } catch (e) {
        mostrarToast(e.message, "error");
        return;
    }
    let enviando = false;
    const folha = abrirFolha(`<div id="conv-folha"></div>`, { podeFechar: () => !enviando });
    const raiz = folha.conteudo.querySelector("#conv-folha");

    function etapa1() {
        const lista = dados.matches.length
            ? `<div class="treino-matches-lista">${dados.matches.map((m, i) => `
                <button type="button" class="treino-match-btn entrada" style="animation-delay:${i * 40}ms" data-acao="escolher" data-id="${m.id}">
                    ${avatarHtml(m, "a44 anel", "dumbbell-coral")}
                    <div class="treino-textos">
                        <p class="treino-t14">${escapeHtml(m.nome)}</p>
                        ${m.academia ? `<p class="treino-meta">${ICONS.mapPin}<span>${escapeHtml(m.academia.nome)}</span></p>` : ""}
                    </div>
                    <span class="seta">${ICONS.chevronRight}</span>
                </button>`).join("")}</div>`
            : `<div class="treino-sem-matches">${ICONS.dumbbell}<p>Você ainda não tem matches.</p><a href="discover.html">Ir para Descobrir</a></div>`;
        raiz.innerHTML = `
            <div class="treino-folha-cabeca">
                <p class="treino-folha-titulo">Convidar para treinar</p>
                <p class="treino-folha-sub">Escolha um dos seus matches</p>
            </div>
            ${lista}
            <button type="button" class="treino-fechar-folha" data-acao="fechar">Cancelar</button>`;
    }

    function etapa2(match) {
        raiz.innerHTML = `
            <div class="treino-folha-cabeca-flex" style="margin-bottom:20px">
                <button type="button" class="treino-voltar" data-acao="voltar" aria-label="Voltar">${ICONS.chevronDown}</button>
                ${avatarHtml(match, "anel", "dumbbell-coral")}
                <div class="treino-textos">
                    <p class="treino-folha-titulo treino-trunc">Treino com ${escapeHtml(match.nome)}</p>
                    <p class="treino-folha-sub">Defina data, hora e local</p>
                </div>
            </div>
            <div class="treino-form">
                <div class="grade2">
                    <div><label class="treino-label" for="conv-data">Data</label><input type="date" id="conv-data" min="${hojeLocal()}" /></div>
                    <div><label class="treino-label" for="conv-hora">Horário</label><input type="time" id="conv-hora" /></div>
                </div>
                <div>
                    <label class="treino-label" for="conv-academia">Academia</label>
                    <select id="conv-academia"><option value="">Escolha a academia</option>${opcoesAcademias(minhaAcademiaId())}</select>
                    <button type="button" class="treino-link-academia" id="conv-usar-match" hidden></button>
                </div>
                <p class="treino-erro-inline" id="conv-erro" hidden>Esse horário já passou. Escolha uma data futura.</p>
                <button type="button" class="treino-btn-largo" id="conv-enviar" disabled>Enviar convite</button>
            </div>
            <button type="button" class="treino-fechar-folha" data-acao="fechar">Cancelar</button>`;

        const data = raiz.querySelector("#conv-data");
        const hora = raiz.querySelector("#conv-hora");
        const academia = raiz.querySelector("#conv-academia");
        const usarMatch = raiz.querySelector("#conv-usar-match");
        const erro = raiz.querySelector("#conv-erro");
        const enviar = raiz.querySelector("#conv-enviar");

        function validar() {
            const passado = data.value && hora.value && dataNoPassado(data.value, hora.value);
            erro.hidden = !passado;
            enviar.disabled = enviando || !data.value || !hora.value || !academia.value || passado;
            enviar.textContent = enviando ? "Enviando..." : "Enviar convite";
            const outra = match.academia && String(match.academia.id) !== academia.value;
            usarMatch.hidden = !outra;
            if (outra) usarMatch.textContent = `📍 Usar academia do match: ${match.academia.nome}`;
        }

        [data, hora, academia].forEach((el) => { el.addEventListener("input", validar); el.addEventListener("change", validar); });
        usarMatch.addEventListener("click", () => { academia.value = String(match.academia.id); validar(); });

        enviar.addEventListener("click", async () => {
            validar();
            if (enviar.disabled) return;
            enviando = true;
            validar();
            try {
                await apiFetch("/treino/convites", {
                    method: "POST",
                    body: JSON.stringify({
                        destinatario_id: match.id,
                        agendado_para: `${data.value}T${hora.value}`,
                        academia_id: Number(academia.value),
                    }),
                });
                enviando = false;
                folha.fechar();
                mostrarToast("Convite enviado!", "success");
                await atualizarDoServidor();
            } catch (e) {
                enviando = false;
                validar();
                mostrarToast(e.message, "error");
            }
        });
        validar();
    }

    raiz.addEventListener("click", (e) => {
        const alvo = e.target.closest("[data-acao]");
        if (!alvo || enviando) return;
        if (alvo.dataset.acao === "escolher") etapa2(dados.matches.find((m) => m.id === Number(alvo.dataset.id)));
        if (alvo.dataset.acao === "voltar") etapa1();
        if (alvo.dataset.acao === "fechar") folha.fechar();
    });

    etapa1();
}

async function abrirFolhaGrupo() {
    try {
        await carregarAcademias();
    } catch (e) {
        mostrarToast(e.message, "error");
        return;
    }
    let criando = false;
    const selecionados = [];
    const rascunho = { data: "", hora: "", academia: String(minhaAcademiaId() || ""), descricao: "" };

    const folha = abrirFolha(`<div id="grupo-folha"></div>`, { classe: "treino-folha-grupo", podeFechar: () => !criando });
    const raiz = folha.conteudo.querySelector("#grupo-folha");

    function etapa1() {
        const cheio = selecionados.length >= MAXIMO_GRUPO;
        const n = selecionados.length;
        raiz.innerHTML = `
            <p class="treino-folha-titulo" style="margin-bottom:4px">Quem vai treinar?</p>
            <p class="treino-folha-sub" style="margin-bottom:16px">Selecione até 4 pessoas dos seus matches.</p>
            <div class="treino-lista" style="margin-bottom:24px">
                ${dados.matches.length ? dados.matches.map((m) => {
                    const sel = selecionados.includes(m.id);
                    return `
                    <button type="button" class="treino-grupo-match ${sel ? "sel" : ""} ${cheio && !sel ? "bloqueado" : ""}" data-acao="alternar" data-id="${m.id}">
                        ${avatarHtml(m)}
                        <p class="nome">${escapeHtml(m.nome)}</p>
                        <span class="treino-check">${sel ? ICONS.check : ""}</span>
                    </button>`;
                }).join("") : `<p class="treino-texto-vazio" style="text-align:center;padding:16px 0">Você ainda não tem matches.</p>`}
            </div>
            <button type="button" class="treino-btn-largo gradiente" data-acao="continuar" ${n === 0 ? "disabled" : ""}>
                Continuar (${n} selecionado${n !== 1 ? "s" : ""})
            </button>`;
    }

    function etapa2() {
        raiz.innerHTML = `
            <button type="button" class="treino-voltar-texto" data-acao="voltar">${ICONS.chevronDown}Voltar</button>
            <p class="treino-folha-titulo" style="margin-bottom:16px">Detalhes da sessão</p>
            <div class="treino-form" style="margin-bottom:24px">
                <div class="grade2">
                    <div><p class="treino-label-grupo">Data</p><input type="date" id="grupo-data" min="${hojeLocal()}" /></div>
                    <div><p class="treino-label-grupo">Hora</p><input type="time" id="grupo-hora" /></div>
                </div>
                <div>
                    <p class="treino-label-grupo">Academia</p>
                    <select id="grupo-academia"><option value="">Escolha a academia</option>${opcoesAcademias(Number(rascunho.academia) || null)}</select>
                </div>
                <div>
                    <p class="treino-label-grupo">Descrição (opcional)</p>
                    <input type="text" id="grupo-desc" maxlength="120" placeholder="Ex: Dia de pernas, venha agasalhado" />
                </div>
                <p class="treino-erro-inline" id="grupo-erro" hidden>Esse horário já passou. Escolha uma data futura.</p>
            </div>
            <button type="button" class="treino-btn-largo gradiente" id="grupo-criar" disabled>Criar sessão</button>`;

        const campos = {
            data: raiz.querySelector("#grupo-data"),
            hora: raiz.querySelector("#grupo-hora"),
            academia: raiz.querySelector("#grupo-academia"),
            descricao: raiz.querySelector("#grupo-desc"),
        };
        const erro = raiz.querySelector("#grupo-erro");
        const criar = raiz.querySelector("#grupo-criar");
        Object.entries(campos).forEach(([k, el]) => { el.value = rascunho[k]; });

        function validar() {
            Object.entries(campos).forEach(([k, el]) => { rascunho[k] = el.value; });
            const passado = rascunho.data && rascunho.hora && dataNoPassado(rascunho.data, rascunho.hora);
            erro.hidden = !passado;
            criar.disabled = criando || !rascunho.data || !rascunho.hora || !rascunho.academia || passado;
            criar.textContent = criando ? "Criando…" : "Criar sessão";
        }

        Object.values(campos).forEach((el) => { el.addEventListener("input", validar); el.addEventListener("change", validar); });

        criar.addEventListener("click", async () => {
            validar();
            if (criar.disabled) return;
            criando = true;
            validar();
            try {
                await apiFetch("/treino/sessoes", {
                    method: "POST",
                    body: JSON.stringify({
                        membros_ids: selecionados,
                        agendada_para: `${rascunho.data}T${rascunho.hora}`,
                        academia_id: Number(rascunho.academia),
                        descricao: rascunho.descricao.trim() || null,
                    }),
                });
                criando = false;
                folha.fechar();
                mostrarToast("Sessão criada!", "success");
                await atualizarDoServidor();
            } catch (e) {
                criando = false;
                validar();
                mostrarToast(e.message, "error");
            }
        });
        validar();
    }

    raiz.addEventListener("click", (e) => {
        const alvo = e.target.closest("[data-acao]");
        if (!alvo || criando) return;
        if (alvo.dataset.acao === "alternar") {
            const id = Number(alvo.dataset.id);
            const i = selecionados.indexOf(id);
            if (i >= 0) selecionados.splice(i, 1);
            else if (selecionados.length >= MAXIMO_GRUPO) { mostrarToast("Máximo de 4 pessoas", "error"); return; }
            else selecionados.push(id);
            etapa1();
        }
        if (alvo.dataset.acao === "continuar" && selecionados.length) etapa2();
        if (alvo.dataset.acao === "voltar") etapa1();
    });

    etapa1();
}

// ---------- carga e atualização ----------
function idsPendentesRecebidos() {
    return new Set([
        ...convitesRecebidosPendentes().map((c) => `c${c.id}`),
        ...dados.sessoes.filter((s) => s.meu_status === "pendente").map((s) => `s${s.id}`),
    ]);
}

function renderizarTudo() {
    renderizarCabecalho();
    renderizarCheckin();
    renderizarGrupos();
    renderizarDesafios();
    renderizarConvites();
    renderizarPlano();
    renderizarExercicios();
    renderizarMarcados();
}

async function atualizarDoServidor({ avisarNovidades = false } = {}) {
    const novos = await apiFetch("/treino");
    // o plano e os exercícios só mudam por esta tela; mantê-los evita atrapalhar uma edição em andamento
    novos.plano = dados.plano;
    dados = novos;

    const pendentes = idsPendentesRecebidos();
    if (avisarNovidades && pendentesConhecidos && [...pendentes].some((id) => !pendentesConhecidos.has(id))) {
        mostrarToast("Novo convite de treino!", "success");
    }
    pendentesConhecidos = pendentes;

    renderizarCabecalho();
    renderizarCheckin();
    renderizarGrupos();
    renderizarConvites();
    renderizarMarcados();
}

async function iniciar() {
    try {
        dados = await apiFetch("/treino");
    } catch (e) {
        $("treino-carregando").innerHTML = "";
        mostrarToast(e.message, "error");
        return;
    }
    pendentesConhecidos = idsPendentesRecebidos();
    $("treino-carregando").remove();
    $("treino-secoes").hidden = false;
    renderizarTudo();
    primeiraCarga = false;

    setInterval(tickCheckin, INTERVALO_CHECKIN_MS);
    setInterval(() => {
        if (document.visibilityState !== "visible" || algumaFolhaAberta()) return;
        atualizarDoServidor({ avisarNovidades: true }).catch(() => {});
    }, INTERVALO_ATUALIZACAO_MS);
}

iniciar();
