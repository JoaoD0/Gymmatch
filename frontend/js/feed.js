const LIMITE_TEXTO_CURTO = 280;
const MAX_CARACTERES = 500;
const MAX_FOTO_BYTES = 10 * 1024 * 1024;
const INTERVALO_NOVOS_MS = 15000;

const elLista = document.getElementById("feed-lista");
const elEstado = document.getElementById("feed-estado");
const elRodape = document.getElementById("feed-rodape");
const elSentinela = document.getElementById("feed-sentinela");
const elPilula = document.getElementById("pilula-novos");
const btnPublicar = document.getElementById("btn-publicar");
const inputArquivo = document.getElementById("feed-arquivo");

const posts = new Map();       // id -> post (dados da API)
const curtindo = new Set();    // ids com requisição de curtida em andamento
let temMais = false;
let carregandoPagina = false;
let meuPerfil = null;

// ---------- utilidades ----------
function menorId() {
    return posts.size ? Math.min(...posts.keys()) : null;
}

function maiorId() {
    return posts.size ? Math.max(...posts.keys()) : 0;
}

function inicial(nome) {
    return escapeHtml((nome || "M").trim().charAt(0).toUpperCase() || "M");
}

function avatarHtml(fotoUrl, nome) {
    return fotoUrl
        ? `<img src="${API_BASE_URL}${fotoUrl}" alt="" loading="lazy" />`
        : `<div class="feed-avatar-inicial">${inicial(nome)}</div>`;
}

function mensagemDeErro(dados, padrao) {
    const detail = dados && dados.detail;
    if (typeof detail === "string") return detail;
    if (detail && detail.mensagem) return detail.mensagem;
    return padrao;
}

// ---------- estados da tela ----------
function mostrarEsqueleto() {
    const card = `
        <div class="feed-skel-card">
            <div class="feed-skel-topo">
                <div class="feed-skel avatar"></div>
                <div class="feed-skel-linhas">
                    <div class="feed-skel nome"></div>
                    <div class="feed-skel tempo"></div>
                </div>
            </div>
            <div class="feed-skel texto"></div>
            <div class="feed-skel texto curta"></div>
        </div>`;
    elEstado.innerHTML = `<div class="feed-skeletons">${card}${card}${card}</div>`;
}

function mostrarSemAcademia() {
    btnPublicar.hidden = true;
    elEstado.innerHTML = `
        <div class="feed-vazio">
            <div class="feed-vazio-icone">${ICONS.dumbbell}</div>
            <p class="feed-vazio-titulo">Nenhuma academia</p>
            <p class="feed-vazio-texto">Adicione uma academia no perfil para ver o feed.</p>
            <a class="feed-vazio-link" href="editar-perfil.html">Escolher academia</a>
        </div>`;
}

function atualizarEstadoVazio() {
    if (posts.size === 0) {
        elEstado.innerHTML = `
            <div class="feed-vazio">
                <div class="feed-vazio-icone">${ICONS.heart}</div>
                <p class="feed-vazio-titulo">Feed vazio</p>
                <p class="feed-vazio-texto">Seja o primeiro a publicar algo na academia!</p>
            </div>`;
    } else {
        elEstado.innerHTML = "";
    }
    atualizarRodape();
}

function atualizarRodape() {
    if (carregandoPagina) {
        elRodape.className = "feed-rodape";
        elRodape.innerHTML = `<div class="feed-spinner"></div>`;
    } else if (!temMais && posts.size > 0) {
        elRodape.className = "feed-rodape";
        elRodape.innerHTML = `<p class="feed-fim">Você viu tudo por aqui ✨</p>`;
    } else {
        elRodape.className = "";
        elRodape.innerHTML = "";
    }
}

// ---------- card ----------
function textoHtml(texto) {
    if (!texto) return "";
    const longo = texto.length > LIMITE_TEXTO_CURTO;
    return `
        <div class="feed-texto${longo ? " truncado" : ""}">
            <div class="feed-texto-corpo">${escapeHtml(texto)}</div>
            ${longo ? `<button type="button" class="feed-ver-mais" data-acao="ver-mais">ver mais</button>` : ""}
        </div>`;
}

function curtirConteudo(post) {
    return `${ICONS.heart}${post.curtidas_total > 0 ? `<span class="feed-curtidas-total">${post.curtidas_total}</span>` : ""}`;
}

function criarCard(post, atrasoMs) {
    const card = document.createElement("article");
    card.className = "feed-post";
    card.dataset.id = post.id;
    if (atrasoMs !== null) {
        card.classList.add("entrando");
        card.style.animationDelay = `${atrasoMs}ms`;
    }

    const botaoCanto = post.pode_excluir
        ? `<button type="button" class="feed-acao-canto lixeira" data-acao="apagar" aria-label="Apagar post">${ICONS.trash2}</button>`
        : `<button type="button" class="feed-acao-canto bandeira" data-acao="denunciar" aria-label="Denunciar post">${ICONS.flag}</button>`;

    card.innerHTML = `
        <div class="feed-autor">
            <div class="feed-avatar">${avatarHtml(post.autor.foto_url, post.autor.nome)}</div>
            <div class="feed-autor-info">
                <p class="feed-autor-nome">${escapeHtml(post.autor.nome || "Membro")}</p>
                <div class="feed-autor-meta">
                    ${post.rotulo ? `<span class="feed-rotulo">${escapeHtml(post.rotulo)}</span><span class="feed-ponto">·</span>` : ""}
                    <span class="feed-tempo">${escapeHtml(post.tempo)}</span>
                </div>
            </div>
            ${botaoCanto}
        </div>
        ${textoHtml(post.texto)}
        ${post.foto_url ? `
            <div class="feed-foto-wrap" data-acao="foto">
                <img class="feed-foto" src="${API_BASE_URL}${post.foto_url}" alt="" loading="lazy" draggable="false" />
            </div>` : ""}
        <div class="feed-curtir-linha">
            <button type="button" class="feed-curtir${post.curtido_por_mim ? " curtido" : ""}" data-acao="curtir" aria-label="Curtir">
                ${curtirConteudo(post)}
            </button>
        </div>`;

    card.addEventListener("animationend", (e) => {
        if (e.target === card) {
            card.classList.remove("entrando");
            card.style.animationDelay = "";
        }
    });
    return card;
}

function renderizarCurtida(id, animar) {
    const post = posts.get(id);
    const card = elLista.querySelector(`.feed-post[data-id="${id}"]`);
    if (!post || !card) return;
    const botao = card.querySelector(".feed-curtir");
    botao.classList.toggle("curtido", post.curtido_por_mim);
    botao.innerHTML = curtirConteudo(post);
    if (animar) botao.querySelector("svg").classList.add("pop");
}

// ---------- carregamento ----------
async function buscarPagina(antesDeId) {
    return apiFetch(`/feed${antesDeId ? `?antes_de_id=${antesDeId}` : ""}`);
}

async function carregarPrimeiraPagina({ animar }) {
    const resposta = await buscarPagina(null);
    posts.clear();
    elLista.innerHTML = "";
    temMais = resposta.tem_mais;
    resposta.posts.forEach((post, i) => {
        posts.set(post.id, post);
        elLista.appendChild(criarCard(post, animar ? i * 40 : null));
    });
    atualizarEstadoVazio();
}

async function carregarProximaPagina() {
    if (carregandoPagina || !temMais) return;
    carregandoPagina = true;
    atualizarRodape();
    try {
        const resposta = await buscarPagina(menorId());
        temMais = resposta.tem_mais;
        for (const post of resposta.posts) {
            if (posts.has(post.id)) continue;
            posts.set(post.id, post);
            elLista.appendChild(criarCard(post, 0));
        }
    } catch (e) {
        mostrarToast(e.message, "error");
    } finally {
        carregandoPagina = false;
        atualizarRodape();
    }
}

const observador = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) carregarProximaPagina();
}, { rootMargin: "400px 0px" });

// ---------- novas publicações (polling) ----------
let esconderPilula = true;

async function verificarNovos() {
    if (document.visibilityState !== "visible") return;
    try {
        const { quantidade } = await apiFetch(`/feed/novos?depois_de_id=${maiorId()}`);
        if (quantidade > 0) {
            elPilula.innerHTML = `${ICONS.arrowUp}${quantidade} ${quantidade === 1 ? "nova publicação" : "novas publicações"}`;
            elPilula.hidden = false;
            esconderPilula = false;
        } else if (!esconderPilula) {
            elPilula.hidden = true;
            esconderPilula = true;
        }
    } catch {
        // polling silencioso: a próxima tentativa corrige
    }
}

elPilula.addEventListener("click", async () => {
    elPilula.hidden = true;
    esconderPilula = true;
    try {
        await carregarPrimeiraPagina({ animar: false });
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
        mostrarToast(e.message, "error");
    }
});

// ---------- curtir ----------
async function alternarCurtida(id, { somenteCurtir = false } = {}) {
    const post = posts.get(id);
    if (!post || curtindo.has(id)) return;
    if (somenteCurtir && post.curtido_por_mim) return;

    const anterior = { curtido_por_mim: post.curtido_por_mim, curtidas_total: post.curtidas_total };
    const vaiCurtir = !post.curtido_por_mim;
    post.curtido_por_mim = vaiCurtir;
    post.curtidas_total = Math.max(0, post.curtidas_total + (vaiCurtir ? 1 : -1));
    renderizarCurtida(id, vaiCurtir);

    curtindo.add(id);
    try {
        const resposta = await apiFetch(`/feed/${id}/curtir`, { method: vaiCurtir ? "POST" : "DELETE" });
        if (resposta.curtido_por_mim !== post.curtido_por_mim || resposta.curtidas_total !== post.curtidas_total) {
            post.curtido_por_mim = resposta.curtido_por_mim;
            post.curtidas_total = resposta.curtidas_total;
            renderizarCurtida(id, false);
        }
    } catch (e) {
        Object.assign(post, anterior);
        renderizarCurtida(id, false);
        mostrarToast(e.message || "Não foi possível curtir", "error");
    } finally {
        curtindo.delete(id);
    }
}

function mostrarCoracaoGrande(wrap) {
    const coracao = document.createElement("div");
    coracao.className = "feed-coracao-grande";
    coracao.innerHTML = ICONS.heart;
    wrap.appendChild(coracao);
    coracao.addEventListener("animationend", () => coracao.remove());
}

// ---------- apagar / denunciar ----------
function confirmarApagar(id) {
    const folha = abrirFolha(`
        <p class="sheet-title">Apagar publicação?</p>
        <p class="feed-confirma-texto">Esta ação não pode ser desfeita.</p>
        <div class="feed-confirma-acoes">
            <button type="button" class="feed-confirma-cancelar" data-acao="cancelar">Cancelar</button>
            <button type="button" class="feed-confirma-apagar" data-acao="confirmar">Apagar</button>
        </div>
    `);
    folha.conteudo.querySelector('[data-acao="cancelar"]').addEventListener("click", folha.fechar);
    const confirmar = folha.conteudo.querySelector('[data-acao="confirmar"]');
    confirmar.addEventListener("click", async () => {
        confirmar.disabled = true;
        try {
            await apiFetch(`/feed/${id}`, { method: "DELETE" });
            folha.fechar();
            posts.delete(id);
            const card = elLista.querySelector(`.feed-post[data-id="${id}"]`);
            if (card) {
                card.classList.add("saindo");
                setTimeout(() => {
                    card.remove();
                    atualizarEstadoVazio();
                }, 250);
            }
            mostrarToast("Post removido.");
        } catch (e) {
            confirmar.disabled = false;
            mostrarToast(e.message, "error");
        }
    });
}

function confirmarDenuncia(id, botaoBandeira) {
    const folha = abrirFolha(`
        <p class="sheet-title">Denunciar publicação?</p>
        <p class="feed-confirma-texto">Nossa equipe vai revisar este conteúdo.</p>
        <div class="feed-confirma-acoes">
            <button type="button" class="feed-confirma-cancelar" data-acao="cancelar">Cancelar</button>
            <button type="button" class="feed-confirma-denunciar" data-acao="confirmar">Denunciar</button>
        </div>
    `);
    folha.conteudo.querySelector('[data-acao="cancelar"]').addEventListener("click", folha.fechar);
    const confirmar = folha.conteudo.querySelector('[data-acao="confirmar"]');
    confirmar.addEventListener("click", async () => {
        confirmar.disabled = true;
        try {
            await apiFetch(`/feed/${id}/denunciar`, { method: "POST" });
            folha.fechar();
            botaoBandeira.disabled = true;
            mostrarToast("Denúncia enviada. Nossa equipe vai revisar.", "success");
        } catch (e) {
            confirmar.disabled = false;
            mostrarToast(e.message, "error");
        }
    });
}

// ---------- cliques na lista (delegação) ----------
const ultimoToqueFoto = new Map();

elLista.addEventListener("click", (evento) => {
    const alvo = evento.target.closest("[data-acao]");
    const card = evento.target.closest(".feed-post");
    if (!alvo || !card) return;
    const id = Number(card.dataset.id);

    switch (alvo.dataset.acao) {
        case "curtir":
            alternarCurtida(id);
            break;
        case "apagar":
            confirmarApagar(id);
            break;
        case "denunciar":
            if (!alvo.disabled) confirmarDenuncia(id, alvo);
            break;
        case "ver-mais":
            alvo.parentElement.classList.remove("truncado");
            alvo.remove();
            break;
        case "foto": {
            const agora = Date.now();
            if (agora - (ultimoToqueFoto.get(id) || 0) < 300) {
                ultimoToqueFoto.delete(id);
                mostrarCoracaoGrande(alvo);
                alternarCurtida(id, { somenteCurtir: true });
            } else {
                ultimoToqueFoto.set(id, agora);
            }
            break;
        }
    }
});

// ---------- folha "Nova publicação" ----------
let compose = null;

function abrirCompose() {
    if (compose) return;

    const usuario = getUsuario();
    const estado = { arquivo: null, previaUrl: null, enviando: false };

    const folha = abrirFolha(`
        <div class="feed-compose-topo">
            <p class="feed-compose-titulo">Nova publicação</p>
            <button type="button" class="feed-compose-fechar" data-acao="fechar" aria-label="Fechar">${ICONS.x}</button>
        </div>
        <div class="feed-compose-corpo">
            <div class="feed-avatar">${avatarHtml(meuPerfil && meuPerfil.foto_url, usuario && usuario.nome)}</div>
            <div class="feed-compose-campo">
                <textarea class="feed-compose-textarea" rows="4" maxlength="${MAX_CARACTERES}"
                    placeholder="Compartilhe algo com a galera da academia…"></textarea>
                <span class="feed-compose-contador" hidden></span>
            </div>
        </div>
        <div class="feed-compose-previa" hidden>
            <img alt="" />
            <button type="button" class="feed-compose-remover" data-acao="remover-foto" aria-label="Remover foto">${ICONS.x}</button>
        </div>
        <div class="feed-compose-rodape">
            <button type="button" class="feed-compose-foto" data-acao="foto">${ICONS.imagePlus}Foto</button>
            <button type="button" class="feed-compose-enviar" data-acao="publicar" disabled>${ICONS.send}<span>Publicar</span></button>
        </div>
    `, { classe: "feed-compose-overlay", podeFechar: () => tentarFechar() });

    const c = folha.conteudo;
    const textarea = c.querySelector("textarea");
    const contador = c.querySelector(".feed-compose-contador");
    const previa = c.querySelector(".feed-compose-previa");
    const previaImg = previa.querySelector("img");
    const btnEnviar = c.querySelector('[data-acao="publicar"]');
    const btnEnviarTexto = btnEnviar.querySelector("span");

    function temConteudo() {
        return textarea.value.trim().length > 0 || estado.arquivo !== null;
    }

    function atualizar() {
        const n = textarea.value.length;
        contador.hidden = n < 400;
        contador.textContent = `${n}/${MAX_CARACTERES}`;
        contador.classList.toggle("alerta", n >= 480);
        btnEnviar.disabled = estado.enviando || !temConteudo();
        btnEnviarTexto.textContent = estado.enviando ? "Enviando…" : "Publicar";
    }

    function removerFoto() {
        if (estado.previaUrl) URL.revokeObjectURL(estado.previaUrl);
        estado.arquivo = null;
        estado.previaUrl = null;
        previaImg.removeAttribute("src");
        previa.hidden = true;
        inputArquivo.value = "";
        atualizar();
    }

    function definirFoto(arquivo) {
        if (!arquivo.type.startsWith("image/")) {
            mostrarToast("Escolha um arquivo de imagem", "error");
            return;
        }
        if (arquivo.size > MAX_FOTO_BYTES) {
            mostrarToast("A imagem deve ter no máximo 10MB", "error");
            return;
        }
        if (estado.previaUrl) URL.revokeObjectURL(estado.previaUrl);
        estado.arquivo = arquivo;
        estado.previaUrl = URL.createObjectURL(arquivo);
        previaImg.src = estado.previaUrl;
        previa.hidden = false;
        atualizar();
    }

    function fecharDeVez() {
        if (estado.previaUrl) URL.revokeObjectURL(estado.previaUrl);
        inputArquivo.value = "";
        inputArquivo.onchange = null;
        folha.fechar();
        compose = null;
    }

    function tentarFechar() {
        if (estado.enviando) return false;
        if (temConteudo()) {
            confirmarDescarte(fecharDeVez);
            return false;
        }
        fecharDeVez();
        return false;
    }

    async function publicar() {
        if (estado.enviando || !temConteudo()) return;
        estado.enviando = true;
        atualizar();

        const formData = new FormData();
        formData.append("texto", textarea.value);
        if (estado.arquivo) formData.append("arquivo", estado.arquivo);

        try {
            const resposta = await fetch(`${API_BASE_URL}/feed`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getToken()}` },
                body: formData,
            });
            const dados = await resposta.json().catch(() => null);
            if (!resposta.ok) throw new Error(mensagemDeErro(dados, "Não foi possível publicar"));

            estado.enviando = false;
            fecharDeVez();
            inserirNoTopo(dados);
            mostrarToast("Publicado!", "success");
        } catch (e) {
            estado.enviando = false;
            atualizar();
            mostrarToast(e.message, "error");
        }
    }

    inputArquivo.onchange = () => {
        const arquivo = inputArquivo.files && inputArquivo.files[0];
        if (arquivo) definirFoto(arquivo);
        inputArquivo.value = "";
    };

    textarea.addEventListener("input", atualizar);
    c.addEventListener("click", (evento) => {
        const alvo = evento.target.closest("[data-acao]");
        if (!alvo) return;
        if (alvo.dataset.acao === "fechar") tentarFechar();
        else if (alvo.dataset.acao === "foto") inputArquivo.click();
        else if (alvo.dataset.acao === "remover-foto") removerFoto();
        else if (alvo.dataset.acao === "publicar") publicar();
    });

    compose = folha;
    setTimeout(() => textarea.focus(), 50);
}

function confirmarDescarte(aoDescartar) {
    const folha = abrirFolha(`
        <p class="sheet-title">Descartar publicação?</p>
        <p class="feed-confirma-texto">O texto e a foto não serão salvos.</p>
        <div class="feed-confirma-acoes">
            <button type="button" class="feed-confirma-cancelar" data-acao="cancelar">Continuar editando</button>
            <button type="button" class="feed-confirma-apagar" data-acao="confirmar">Descartar</button>
        </div>
    `);
    folha.conteudo.querySelector('[data-acao="cancelar"]').addEventListener("click", folha.fechar);
    folha.conteudo.querySelector('[data-acao="confirmar"]').addEventListener("click", () => {
        folha.fechar();
        aoDescartar();
    });
}

function inserirNoTopo(post) {
    if (posts.has(post.id)) return;
    posts.set(post.id, post);
    elLista.prepend(criarCard(post, 0));
    atualizarEstadoVazio();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

btnPublicar.addEventListener("click", abrirCompose);

// ---------- início ----------
async function iniciar() {
    mostrarEsqueleto();
    apiFetch("/perfil/me").then((p) => (meuPerfil = p)).catch(() => {});

    try {
        await carregarPrimeiraPagina({ animar: true });
    } catch (e) {
        if (e.motivo === "sem_academia") {
            mostrarSemAcademia();
            return;
        }
        elEstado.innerHTML = "";
        mostrarToast(e.message, "error");
        return;
    }

    btnPublicar.hidden = false;
    observador.observe(elSentinela);
    setInterval(verificarNovos, INTERVALO_NOVOS_MS);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") verificarNovos();
    });
}

iniciar();
