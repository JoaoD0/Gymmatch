exigirLogin();

const usuarioLocal = getUsuario();
const curtiramEl = document.getElementById("curtiram-secao");
const listaEl = document.getElementById("lista");
const erroEl = document.getElementById("erro");

let ultimasCurtidasRecebidas = [];

function iniciais(nome) {
    return (nome || "?").trim().charAt(0).toUpperCase();
}

function avatarHtml(fotoUrl, nome, baseClass) {
    if (fotoUrl) {
        return `<div class="${baseClass}" style="background-image:url('${API_BASE_URL}${fotoUrl}')"></div>`;
    }
    return `<div class="${baseClass} sem-foto">${escapeHtml(iniciais(nome))}</div>`;
}

// ---------- lista de matches ----------
function linhaMatch(m) {
    let linha2Html;
    if (m.ultima_mensagem) {
        const prefixo = m.ultima_mensagem.remetente_id === usuarioLocal.id ? "Você: " : "";
        linha2Html = `<span class="match-item-linha2">${escapeHtml(prefixo + m.ultima_mensagem.texto)}</span>`;
    } else if (m.modalidades_em_comum.length) {
        const primeiras = m.modalidades_em_comum.slice(0, 2).map(escapeHtml).join(" · ");
        const resto = m.modalidades_em_comum.length > 2
            ? `<span class="cinza"> +${m.modalidades_em_comum.length - 2}</span>`
            : "";
        linha2Html = `<span class="match-item-linha2 modalidades">${ICONS.dumbbell}${primeiras}${resto}<span class="cinza"> em comum</span></span>`;
    } else {
        linha2Html = `<span class="match-item-linha2">Manda um oi 👋</span>`;
    }

    return `
        <a href="chat.html?matchId=${m.id}" class="match-item">
            ${avatarHtml(m.outro.foto_url, m.outro.nome, "match-item-avatar")}
            <div class="match-item-corpo">
                <div class="match-item-linha1">
                    <span class="match-item-nome">${escapeHtml(m.outro.nome)}</span>
                    ${m.nova ? `<span class="match-item-novo">NOVO</span>` : ""}
                </div>
                ${linha2Html}
            </div>
        </a>
    `;
}

function renderSkeletonMatches() {
    listaEl.innerHTML = Array.from({ length: 3 })
        .map(
            () => `
        <div class="matches-skeleton-item">
            <span class="skel-block" style="width:56px;height:56px;border-radius:999px"></span>
            <div style="flex:1">
                <span class="skel-block" style="display:block;width:120px;height:14px;border-radius:6px"></span>
                <span class="skel-block" style="display:block;width:180px;height:12px;border-radius:6px;margin-top:6px"></span>
            </div>
        </div>
    `
        )
        .join("");
}

function renderLista(matches) {
    if (matches.length === 0) {
        listaEl.innerHTML = `
            <div class="matches-vazio">
                <h2>Nenhum match ainda</h2>
                <p>Que tal dar alguns likes no <a href="discover.html">Descobrir</a>?</p>
            </div>
        `;
        return;
    }
    listaEl.innerHTML = `<div class="matches-lista">${matches.map(linhaMatch).join("")}</div>`;
}

async function carregarMatches({ silencioso = false } = {}) {
    try {
        const matches = await apiFetch("/matches");

        // match novo (inclusive quando foi a outra pessoa que completou): overlay "É um match!"
        verificarMatchesNovos(matches);

        renderLista(matches);
    } catch (e) {
        if (!silencioso) erroEl.textContent = e.message;
    }
}

// ---------- quem curtiu você ----------
function linhaCurtiu(c) {
    const idade = c.perfil?.idade ? `, ${c.perfil.idade}` : "";
    return `
        <div class="curtiram-item" id="curtiram-item-${c.usuario.id}">
            ${avatarHtml(c.perfil?.foto_url, c.usuario.nome, "curtiram-avatar")}
            <div class="curtiram-item-info">
                <strong>${escapeHtml(c.usuario.nome)}${idade}</strong>
                <span>curtiu seu perfil 💜</span>
            </div>
            <div class="curtiram-item-acoes">
                <button type="button" class="curtiram-btn curtiram-btn-recusar" data-acao="recusar" data-id="${c.usuario.id}" aria-label="Recusar">${ICONS.x}</button>
                <button type="button" class="curtiram-btn curtiram-btn-aceitar" data-acao="aceitar" data-id="${c.usuario.id}" aria-label="Curtir de volta">${ICONS.heart}</button>
            </div>
        </div>
    `;
}

function desativarBotoesDaLinha(usuarioId, desativar) {
    const item = document.getElementById(`curtiram-item-${usuarioId}`);
    if (!item) return;
    item.querySelectorAll("button").forEach((b) => (b.disabled = desativar));
}

async function recusarCurtida(usuarioId) {
    desativarBotoesDaLinha(usuarioId, true);
    try {
        await apiFetch("/discover/recusar", {
            method: "POST",
            body: JSON.stringify({ para_usuario_id: usuarioId }),
        });
        mostrarToast("Solicitação recusada.");
        const item = document.getElementById(`curtiram-item-${usuarioId}`);
        if (item) item.classList.add("saindo");
        setTimeout(() => carregarCurtiram(), 220);
    } catch (e) {
        mostrarToast(e.message, "error");
        desativarBotoesDaLinha(usuarioId, false);
    }
}

async function aceitarCurtida(usuarioId) {
    desativarBotoesDaLinha(usuarioId, true);
    const curtida = ultimasCurtidasRecebidas.find((c) => c.usuario.id === usuarioId);

    try {
        const resultado = await apiFetch("/discover/curtir", {
            method: "POST",
            body: JSON.stringify({ para_usuario_id: usuarioId }),
        });

        if (resultado.match) {
            abrirMatchOverlay({
                matchId: resultado.match_id,
                outroNome: curtida ? curtida.usuario.nome : "essa pessoa",
                outroFoto: curtida?.perfil?.foto_url || null,
            });
        }

        carregarCurtiram();
        carregarMatches();
    } catch (e) {
        if (e.motivo) abrirUpgradeModal(e.motivo);
        else mostrarToast(e.message, "error");
        desativarBotoesDaLinha(usuarioId, false);
    }
}

function ligarBotoesCurtiram() {
    document.querySelectorAll("[data-acao='recusar']").forEach((btn) =>
        btn.addEventListener("click", () => recusarCurtida(Number(btn.dataset.id)))
    );
    document.querySelectorAll("[data-acao='aceitar']").forEach((btn) =>
        btn.addEventListener("click", () => aceitarCurtida(Number(btn.dataset.id)))
    );
}

function renderCurtiram(dados, planoChave) {
    ultimasCurtidasRecebidas = dados.curtidas;

    if (dados.total === 0) {
        curtiramEl.innerHTML = "";
        return;
    }

    let rotuloContagem;
    if (planoChave === "gratis") rotuloContagem = "🔒";
    else if (dados.curtidas.length < dados.total) rotuloContagem = `${dados.curtidas.length}/${dados.total}`;
    else rotuloContagem = `${dados.total}`;

    const linkHtml =
        planoChave === "gratis"
            ? `<a href="premium.html" class="curtiram-link">Desbloquear</a>`
            : planoChave === "gold"
              ? `<a href="premium.html" class="curtiram-link">Ver todos →</a>`
              : "";

    let corpoHtml;
    if (planoChave === "gratis") {
        const pessoas = dados.total === 1 ? "1 pessoa curtiu" : `${dados.total} pessoas curtiram`;
        corpoHtml = `
            <div class="curtiram-bloqueado" id="curtiram-bloqueado-card">
                <div class="curtiram-bloqueado-icone">${ICONS.lock}</div>
                <div class="curtiram-bloqueado-texto">
                    <strong>${pessoas} seu perfil</strong>
                    <span>Assine Gold para ver quem são</span>
                </div>
                ${ICONS.heart}
            </div>
        `;
    } else {
        corpoHtml = `
            <div class="curtiram-lista">${dados.curtidas.map(linhaCurtiu).join("")}</div>
            ${
                dados.total > dados.curtidas.length
                    ? `<a href="premium.html" class="curtiram-mais-bloqueados">${ICONS.lock} +${dados.total - dados.curtidas.length} perfis bloqueados — assine Diamond para ver todos</a>`
                    : ""
            }
        `;
    }

    curtiramEl.innerHTML = `
        <div class="curtiram-secao">
            <div class="curtiram-header">
                <span class="curtiram-rotulo">Quem curtiu você · ${rotuloContagem}</span>
                ${linkHtml}
            </div>
            ${corpoHtml}
        </div>
    `;

    if (planoChave === "gratis") {
        document.getElementById("curtiram-bloqueado-card").addEventListener("click", () => abrirUpgradeModal("curtidas_recebidas"));
    } else {
        ligarBotoesCurtiram();
    }
}

async function carregarCurtiram() {
    try {
        const [dados, meuPlano] = await Promise.all([
            apiFetch("/discover/curtidas-recebidas"),
            apiFetch("/planos/me"),
        ]);
        renderCurtiram(dados, meuPlano.plano.chave);
    } catch (e) {
        // silencioso: não trava a tela de matches
    }
}

// ---------- inicialização + polling ----------
renderSkeletonMatches();
carregarMatches();
carregarCurtiram();
iniciarMovesRow(document.getElementById("moves-row"));

setInterval(() => {
    // os matches seguem em segundo plano para a notificação do sistema; o resto só com a aba visível
    carregarMatches({ silencioso: true });
    if (document.visibilityState === "visible") {
        carregarCurtiram();
        recarregarMovesRow(); // ela mesma ignora essa chamada se o visualizador/criador estiver aberto
    }
}, 10000);
