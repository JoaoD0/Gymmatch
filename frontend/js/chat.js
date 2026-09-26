exigirLogin();

const usuarioLocal = getUsuario();
const params = new URLSearchParams(window.location.search);
const matchId = params.get("matchId");

if (!matchId) {
    window.location.href = "matches.html";
}

const headerEl = document.getElementById("chat-header");
const mensagensEl = document.getElementById("chat-mensagens");
const barraEl = document.getElementById("chat-barra");
const textoEl = document.getElementById("texto");

let outroInfo = null;
let ativo = true;
let ultimoId = 0;
let pollingId = null;

function iniciais(nome) {
    return (nome || "?").trim().charAt(0).toUpperCase();
}

function renderHeader() {
    headerEl.innerHTML = `
        <button class="chat-back" id="btn-voltar" aria-label="Voltar">${ICONS.arrowLeft}</button>
        ${
            outroInfo.foto_url
                ? `<div class="chat-avatar" style="background-image:url('${API_BASE_URL}${outroInfo.foto_url}')"></div>`
                : `<div class="chat-avatar sem-foto">${escapeHtml(iniciais(outroInfo.nome))}</div>`
        }
        <div class="chat-header-info">
            <div class="chat-header-nome">${escapeHtml(outroInfo.nome)}</div>
            ${!ativo ? `<div class="chat-header-encerrado">Match encerrado</div>` : ""}
        </div>
        <button class="chat-menu-btn" id="btn-menu" aria-label="Menu">${ICONS.moreHorizontal}</button>
    `;
    document.getElementById("btn-voltar").addEventListener("click", () => (window.location.href = "matches.html"));
    document.getElementById("btn-menu").addEventListener("click", abrirMenu);
}

function bolhaHtml(m) {
    const classe = m.remetente_id === usuarioLocal.id ? "chat-bolha-mine" : "chat-bolha-outro";
    return `<div class="chat-bolha ${classe}" data-id="${m.id}">${escapeHtml(m.texto)}</div>`;
}

function renderVazio() {
    mensagensEl.innerHTML = `
        <div class="chat-vazio">
            <p class="chat-vazio-label">Vocês fizeram match! Comece a conversa.</p>
            <div class="chat-vazio-circulos">
                <div class="chat-vazio-circulo sem-foto">${escapeHtml(iniciais(usuarioLocal.nome))}</div>
                ${
                    outroInfo.foto_url
                        ? `<div class="chat-vazio-circulo" style="background-image:url('${API_BASE_URL}${outroInfo.foto_url}')"></div>`
                        : `<div class="chat-vazio-circulo sem-foto">${escapeHtml(iniciais(outroInfo.nome))}</div>`
                }
            </div>
            <p>Nenhuma mensagem ainda. Diga olá!</p>
        </div>
    `;
}

function rolarParaFim(suave) {
    mensagensEl.scrollTo({ top: mensagensEl.scrollHeight, behavior: suave ? "smooth" : "auto" });
}

function pararPolling() {
    if (pollingId) {
        clearInterval(pollingId);
        pollingId = null;
    }
}

async function atualizarCabecalho({ inicial = false } = {}) {
    try {
        const dados = await apiFetch(`/chat/${matchId}`);
        outroInfo = dados.outro;
        ativo = dados.ativo;
        renderHeader();
        barraEl.hidden = !ativo;
        if (!ativo) pararPolling();
        return true;
    } catch (e) {
        if (inicial) {
            mostrarToast("Match não encontrado", "error");
            window.location.href = "matches.html";
        }
        return false;
    }
}

async function carregarMensagensIniciais() {
    try {
        const mensagens = await apiFetch(`/chat/${matchId}/mensagens`);
        if (mensagens.length === 0) {
            renderVazio();
        } else {
            mensagensEl.innerHTML = mensagens.map(bolhaHtml).join("");
            ultimoId = mensagens[mensagens.length - 1].id;
        }
        rolarParaFim(false);
    } catch (e) {
        mostrarToast(e.message, "error");
    }
}

// continua em segundo plano (o navegador espaça os timers) para poder avisar pela notificação do sistema
async function pollMensagens() {
    try {
        const novas = await apiFetch(`/chat/${matchId}/mensagens?apos_id=${ultimoId}`);
        if (novas.length === 0) return;

        const doOutro = novas.filter((m) => m.remetente_id !== usuarioLocal.id);
        if (doOutro.length && outroInfo && window.notificar) {
            notificar(`Nova mensagem de ${outroInfo.nome}`, doOutro[doOutro.length - 1].texto,
                `chat.html?matchId=${encodeURIComponent(matchId)}`, `chat-${matchId}`);
        }

        if (mensagensEl.querySelector(".chat-vazio")) mensagensEl.innerHTML = "";
        mensagensEl.insertAdjacentHTML("beforeend", novas.map(bolhaHtml).join(""));
        ultimoId = novas[novas.length - 1].id;
        rolarParaFim(true);
    } catch (e) {
        // provavelmente o match foi encerrado (bloqueio/denúncia) enquanto o polling rodava
        await atualizarCabecalho();
    }
}

async function enviar() {
    const texto = textoEl.value.trim();
    if (!texto) return;
    textoEl.value = "";

    try {
        const mensagem = await apiFetch(`/chat/${matchId}/mensagens`, {
            method: "POST",
            body: JSON.stringify({ texto }),
        });
        if (mensagensEl.querySelector(".chat-vazio")) mensagensEl.innerHTML = "";
        mensagensEl.insertAdjacentHTML("beforeend", bolhaHtml(mensagem));
        ultimoId = mensagem.id;
        rolarParaFim(true);
    } catch (e) {
        textoEl.value = texto;
        mostrarToast(e.message, "error");
        await atualizarCabecalho();
    }
}

document.getElementById("btn-enviar").addEventListener("click", enviar);
document.getElementById("btn-enviar").innerHTML = ICONS.send;
textoEl.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") enviar();
});

// ---------- menu ----------
function abrirMenu() {
    const folha = abrirFolha(`
        <p class="sheet-title">${escapeHtml(outroInfo.nome)}</p>
        <button type="button" class="sheet-row chat-menu-row" id="menu-denunciar">
            <span class="sheet-row-label">Denunciar</span>
            ${ICONS.flag}
        </button>
        <button type="button" class="sheet-row chat-menu-row" id="menu-bloquear">
            <span class="sheet-row-label" style="color:var(--destructive)">Bloquear</span>
            <span style="color:var(--destructive)">${ICONS.ban}</span>
        </button>
        <button type="button" class="btn-secondary" id="menu-cancelar" style="width:100%;margin-top:8px">Cancelar</button>
    `);

    folha.conteudo.querySelector("#menu-cancelar").addEventListener("click", folha.fechar);
    folha.conteudo.querySelector("#menu-denunciar").addEventListener("click", () => {
        folha.fechar();
        abrirFolhaDenuncia();
    });
    folha.conteudo.querySelector("#menu-bloquear").addEventListener("click", () => {
        folha.fechar();
        confirmarBloqueio();
    });
}

function confirmarBloqueio() {
    const folha = abrirFolha(`
        <p class="sheet-title">Bloquear ${escapeHtml(outroInfo.nome)}?</p>
        <p style="color:var(--muted-foreground);font-size:14px;margin-bottom:20px">Vocês não vão mais se ver no app, e o match será encerrado.</p>
        <button type="button" class="btn-primary" id="confirmar-bloqueio" style="background-image:none;background:var(--destructive)">Bloquear</button>
        <button type="button" class="btn-secondary" id="cancelar-bloqueio" style="width:100%;margin-top:8px">Cancelar</button>
    `);

    folha.conteudo.querySelector("#cancelar-bloqueio").addEventListener("click", folha.fechar);
    folha.conteudo.querySelector("#confirmar-bloqueio").addEventListener("click", async () => {
        try {
            await apiFetch(`/matches/${matchId}/bloquear`, { method: "POST" });
            folha.fechar();
            mostrarToast("Bloqueado");
            window.location.href = "matches.html";
        } catch (e) {
            mostrarToast(e.message, "error");
        }
    });
}

const MOTIVOS_DENUNCIA = [
    { valor: "assedio", rotulo: "Assédio" },
    { valor: "linguagem_ofensiva", rotulo: "Linguagem ofensiva ou ameaças" },
    { valor: "comportamento_inadequado", rotulo: "Comportamento inadequado" },
    { valor: "perfil_falso", rotulo: "Perfil falso ou golpe" },
    { valor: "spam", rotulo: "Spam" },
    { valor: "racismo", rotulo: "Racismo ou discriminação" },
];

function abrirFolhaDenuncia() {
    const folha = abrirFolha(`
        <p class="sheet-title">Por que quer denunciar?</p>
        <p style="color:var(--muted-foreground);font-size:13.5px;margin-bottom:16px">O usuário será bloqueado e o match encerrado.</p>
        <div id="lista-motivos">
            ${MOTIVOS_DENUNCIA.map(
                (m) => `
                <button type="button" class="sheet-row" data-motivo="${m.valor}">
                    <span class="sheet-row-label">${m.rotulo}</span>
                    ${ICONS.chevronRight}
                </button>
            `
            ).join("")}
        </div>
        <button type="button" class="btn-secondary" id="cancelar-denuncia" style="width:100%;margin-top:16px">Cancelar</button>
    `);

    folha.conteudo.querySelector("#cancelar-denuncia").addEventListener("click", folha.fechar);
    folha.conteudo.querySelectorAll("[data-motivo]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            folha.conteudo.querySelectorAll("[data-motivo]").forEach((b) => (b.disabled = true));
            try {
                await apiFetch(`/matches/${matchId}/denunciar`, {
                    method: "POST",
                    body: JSON.stringify({ motivo: btn.dataset.motivo }),
                });
                folha.fechar();
                mostrarToast("Denúncia enviada.");
                window.location.href = "matches.html";
            } catch (e) {
                mostrarToast(e.message, "error");
                folha.conteudo.querySelectorAll("[data-motivo]").forEach((b) => (b.disabled = false));
            }
        });
    });
}

// ---------- inicialização ----------
async function iniciar() {
    const ok = await atualizarCabecalho({ inicial: true });
    if (!ok) return;
    await carregarMensagensIniciais();
    if (ativo) {
        pollingId = setInterval(pollMensagens, 3000);
    }
}

iniciar();
