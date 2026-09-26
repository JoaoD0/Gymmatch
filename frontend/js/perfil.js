exigirLogin();

const root = document.getElementById("perfil-root");
let usuarioLocal = getUsuario();
let perfil = null;
let fotos = [];
let matchesCount = 0;
let abaAtiva = "galeria";
let fotoSelecionadaId = null;
let boostTimerId = null;

const NIVEL_LABEL = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
const PROCURANDO_LABEL = { amizade: "Amizade", parceiro_treino: "Parceiro de treino", romance: "Romance" };
const PERIODO_LABEL = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

function badgePlanoHtml(plano) {
    if (plano === "diamond") {
        return `<span class="badge-plano" style="background:color-mix(in oklch, var(--diamond) 18%, transparent); color:var(--diamond)">${ICONS.gem} Diamond</span>`;
    }
    if (plano === "gold") {
        return `<span class="badge-plano" style="background:color-mix(in oklch, var(--gold) 18%, transparent); color:var(--gold)">${ICONS.crown} Gold</span>`;
    }
    return "";
}

function formatarTempoRestante(msRestante) {
    const totalMin = Math.max(0, Math.floor(msRestante / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}min restantes` : `${m}min restantes`;
}

// ---------- skeleton / erro ----------
function renderSkeleton() {
    root.innerHTML = `
        <div class="container perfil-container">
            <div class="perfil-topbar"><span class="skeleton-block" style="width:36px;height:36px;border-radius:999px"></span></div>
            <span class="skeleton-block skeleton-avatar"></span>
            <span class="skeleton-block skeleton-line" style="width:160px;height:26px"></span>
            <span class="skeleton-block skeleton-line" style="width:200px;height:14px"></span>
            <div class="perfil-actions" style="margin-top:24px">
                <span class="skeleton-block" style="flex:1;height:46px;border-radius:14px"></span>
                <span class="skeleton-block" style="width:46px;height:46px;border-radius:14px"></span>
            </div>
        </div>
    `;
}

function renderErro() {
    root.innerHTML = `
        <div class="container perfil-erro">
            <p class="error" style="margin-bottom:16px">Não foi possível carregar o perfil.</p>
            <button class="btn-secondary" id="btn-sair-erro">Sair</button>
        </div>
    `;
    document.getElementById("btn-sair-erro").addEventListener("click", logout);
}

// ---------- render principal ----------
function render() {
    const nivelLabel = NIVEL_LABEL[perfil.nivel] || "Iniciante";
    const procurandoLabel = perfil.procurando && !perfil.ocultar_objetivo
        ? (PROCURANDO_LABEL[perfil.procurando] || perfil.procurando)
        : null;
    const subtitulo = procurandoLabel ? `${nivelLabel} · ${procurandoLabel}` : nivelLabel;
    const pausado = usuarioLocal.status === "pausado";

    const avatarConteudo = perfil.foto_url
        ? `<img src="${API_BASE_URL}${perfil.foto_url}" alt="" />`
        : `<span class="avatar-icon">${ICONS.camera}</span>`;

    const boostAtivo = perfil.boost_expira_em && new Date(perfil.boost_expira_em) > new Date();

    root.innerHTML = `
        <div class="container perfil-container">
            <div class="perfil-topbar">
                <button class="icon-btn-glass" id="btn-config" aria-label="Configurações">${ICONS.settings}</button>
            </div>

            <div class="perfil-avatar-wrap">
                <div class="perfil-avatar" id="perfil-avatar">
                    ${avatarConteudo}
                    <div class="perfil-avatar-overlay" id="avatar-overlay" hidden>...</div>
                </div>
                <button class="perfil-avatar-edit" id="btn-editar-avatar" aria-label="Trocar foto">${ICONS.pencilLine}</button>
            </div>

            <h1 class="perfil-nome">${escapeHtml(usuarioLocal.nome)}${perfil.idade ? `, <span class="idade">${perfil.idade}</span>` : ""}</h1>
            <p class="perfil-subtitulo">${escapeHtml(subtitulo)}</p>
            ${badgePlanoHtml(perfil.plano)}
            ${pausado ? `<span class="badge-pausado">Conta pausada</span>` : ""}

            <div class="perfil-stats">
                <div class="stat"><strong>${matchesCount}</strong><span>Matches</span></div>
                <div class="stat-divider"></div>
                <div class="stat"><strong>${fotos.length}</strong><span>Fotos</span></div>
                <div class="stat-divider"></div>
                <div class="stat"><strong>${perfil.modalidades.length}</strong><span>Esportes</span></div>
            </div>

            <div class="perfil-actions">
                <button class="btn-primary perfil-btn-editar" id="btn-editar-perfil">${ICONS.pencilLine} Editar perfil</button>
                <button class="perfil-btn-crown" id="btn-crown" aria-label="Planos">${ICONS.crown}</button>
            </div>

            <div id="boost-area">
                ${boostAtivo ? `
                    <div class="boost-card-active">
                        <strong>⚡ Perfil em destaque</strong>
                        <span id="boost-restante">${formatarTempoRestante(new Date(perfil.boost_expira_em) - new Date())}</span>
                    </div>
                ` : `
                    <button class="boost-btn-dashed" id="btn-boost">${ICONS.zap} Turbinar perfil por 1h</button>
                `}
            </div>

            <div class="pill-tabs">
                <button class="pill-tab ${abaAtiva === "galeria" ? "active" : ""}" data-tab="galeria">Galeria</button>
                <button class="pill-tab ${abaAtiva === "info" ? "active" : ""}" data-tab="info">Info</button>
            </div>

            <div id="tab-content"></div>
        </div>
    `;

    renderTabContent();
    ligarEventos();
    if (boostAtivo) iniciarContadorBoost();
    else if (boostTimerId) { clearInterval(boostTimerId); boostTimerId = null; }
}

function ligarEventos() {
    document.getElementById("btn-config").addEventListener("click", () => abrirConfiguracoes({
        getPerfil: () => perfil,
        getUsuario: () => usuarioLocal,
        salvarPerfilParcial,
        aoAtualizar: render,
    }));
    document.getElementById("perfil-avatar").addEventListener("click", () => abrirSeletorFoto("principal"));
    document.getElementById("btn-editar-avatar").addEventListener("click", (e) => {
        e.stopPropagation();
        abrirSeletorFoto("principal");
    });
    document.getElementById("btn-editar-perfil").addEventListener("click", () => (window.location.href = "editar-perfil.html"));
    document.getElementById("btn-crown").addEventListener("click", () => (window.location.href = "premium.html"));

    const btnBoost = document.getElementById("btn-boost");
    if (btnBoost) btnBoost.addEventListener("click", ativarBoost);

    document.querySelectorAll(".pill-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            abaAtiva = tab.dataset.tab;
            fotoSelecionadaId = null;
            document.querySelectorAll(".pill-tab").forEach((t) => t.classList.toggle("active", t === tab));
            renderTabContent();
        });
    });
}

function renderTabContent() {
    if (abaAtiva === "galeria") renderGaleria();
    else renderInfo();
}

// ---------- galeria ----------
function renderGaleria() {
    const el = document.getElementById("tab-content");

    if (fotos.length === 0) {
        el.innerHTML = `
            <div class="galeria-empty" id="galeria-empty-card">
                ${ICONS.image}
                <p style="font-weight:600;margin:0 0 4px">Adicionar fotos</p>
                <p style="font-size:12.5px;margin:0">Mostre como você é na academia</p>
            </div>
        `;
        document.getElementById("galeria-empty-card").addEventListener("click", () => abrirSeletorFoto("galeria"));
        return;
    }

    const hint = fotoSelecionadaId ? `<span class="tab-hint">· toque para mover</span>` : "";
    const slots = [];
    for (let i = 0; i < 6; i++) slots.push(fotos.find((f) => f.posicao === i) || null);

    function slotHtml(foto, extraClass) {
        if (!foto) {
            return `<div class="slot empty ${extraClass}" data-add-slot="1">+</div>`;
        }
        const selecionado = fotoSelecionadaId === foto.id;
        return `
            <div class="slot ${extraClass} ${selecionado ? "selected" : ""}" data-foto-id="${foto.id}">
                <img src="${API_BASE_URL}${foto.url}" alt="" />
                <button class="slot-delete" data-del-foto="${foto.id}" aria-label="Excluir foto">${ICONS.x}</button>
                ${selecionado ? `<span class="slot-badge">Mover aqui?</span>` : ""}
            </div>
        `;
    }

    el.innerHTML = `
        <div class="tab-header">
            <span class="section-label">Fotos</span>
            <span style="display:flex;gap:6px;align-items:center">
                ${hint}
                <span class="section-label">${fotos.length}/6</span>
            </span>
        </div>
        <div class="galeria-top">
            ${slotHtml(slots[0], "slot-big")}
            <div class="slot-stack">
                ${slotHtml(slots[1], "")}
                ${slotHtml(slots[2], "")}
            </div>
        </div>
        <div class="galeria-bottom">
            ${slotHtml(slots[3], "")}
            ${slotHtml(slots[4], "")}
            ${slotHtml(slots[5], "")}
        </div>
        ${fotos.length >= 2 && !fotoSelecionadaId ? `<p class="tab-hint" style="display:block;margin-top:10px;text-align:center">Toque em uma foto para reordenar</p>` : ""}
        <div id="galeria-uploading" class="galeria-uploading" hidden>Enviando foto...</div>
    `;

    el.querySelectorAll("[data-add-slot]").forEach((elm) => elm.addEventListener("click", () => abrirSeletorFoto("galeria")));
    el.querySelectorAll("[data-del-foto]").forEach((elm) =>
        elm.addEventListener("click", (e) => {
            e.stopPropagation();
            deletarFoto(Number(elm.dataset.delFoto));
        })
    );
    el.querySelectorAll(".slot[data-foto-id]").forEach((elm) =>
        elm.addEventListener("click", () => onClickFoto(Number(elm.dataset.fotoId)))
    );
}

function onClickFoto(id) {
    if (fotoSelecionadaId === null) {
        fotoSelecionadaId = id;
        renderGaleria();
    } else if (fotoSelecionadaId === id) {
        fotoSelecionadaId = null;
        renderGaleria();
    } else {
        trocarFotos(fotoSelecionadaId, id);
    }
}

async function trocarFotos(idA, idB) {
    try {
        fotos = await apiFetch("/perfil/me/fotos/trocar", {
            method: "PUT",
            body: JSON.stringify({ foto_a: idA, foto_b: idB }),
        });
        fotoSelecionadaId = null;
        renderGaleria();
    } catch (e) {
        mostrarToast(e.message, "error");
    }
}

async function deletarFoto(id) {
    try {
        await apiFetch(`/perfil/me/fotos/${id}`, { method: "DELETE" });
        fotos = fotos.filter((f) => f.id !== id);
        render();
        mostrarToast("Foto removida");
    } catch (e) {
        mostrarToast(e.message, "error");
    }
}

async function enviarFotoGaleria(arquivo) {
    const uploadingEl = document.getElementById("galeria-uploading");
    if (uploadingEl) uploadingEl.hidden = false;
    try {
        const nova = await apiFetchArquivo("/perfil/me/fotos", "arquivo", arquivo);
        fotos.push(nova);
        render();
        mostrarToast("Foto adicionada");
    } catch (e) {
        mostrarToast(e.message, "error");
        if (uploadingEl) uploadingEl.hidden = true;
    }
}

async function enviarFotoPrincipal(arquivo) {
    const overlay = document.getElementById("avatar-overlay");
    if (overlay) overlay.hidden = false;
    try {
        const resultado = await apiFetchArquivo("/perfil/me/foto", "arquivo", arquivo);
        perfil.foto_url = resultado.foto_url;
        render();
        mostrarToast("Foto de perfil atualizada");
    } catch (e) {
        mostrarToast(e.message, "error");
        if (overlay) overlay.hidden = true;
    }
}

// ---------- info ----------
function renderInfo() {
    const el = document.getElementById("tab-content");
    const temConteudo = perfil.bio || perfil.modalidades.length || perfil.interesses.length;

    if (!temConteudo) {
        el.innerHTML = `
            <div class="perfil-incompleto" id="perfil-incompleto-card">
                <p style="font-weight:600;margin:0 0 4px">Perfil incompleto</p>
                <p style="font-size:12.5px;margin:0">Adicione bio e modalidades</p>
            </div>
        `;
        el.querySelector("#perfil-incompleto-card").addEventListener("click", () => (window.location.href = "editar-perfil.html"));
        return;
    }

    const modalidadesHtml = perfil.modalidades.map((m) => `<span class="info-pill-modalidade">${escapeHtml(m)}</span>`).join("");
    const interessesHtml = perfil.interesses.map((i) => `<span class="info-pill-cinza">${escapeHtml(i)}</span>`).join("");
    const horariosHtml = (perfil.quando_treina || []).map((h) => `<span class="info-pill-cinza">${PERIODO_LABEL[h] || escapeHtml(h)}</span>`).join("");

    el.innerHTML = `
        ${perfil.bio ? `
            <div class="info-section">
                <p class="info-section-title">Sobre</p>
                <p class="info-bio">${escapeHtml(perfil.bio)}</p>
            </div>` : ""}
        ${perfil.modalidades.length ? `
            <div class="info-section">
                <p class="info-section-title">Modalidades</p>
                <div class="info-pills">${modalidadesHtml}</div>
            </div>` : ""}
        ${perfil.interesses.length ? `
            <div class="info-section">
                <p class="info-section-title">Interesses</p>
                <div class="info-pills">${interessesHtml}</div>
            </div>` : ""}
        ${!perfil.ocultar_horarios && perfil.quando_treina.length ? `
            <div class="info-section">
                <p class="info-section-title">Horários disponíveis</p>
                <div class="info-pills">${horariosHtml}</div>
            </div>` : ""}
    `;
}

// ---------- seletor de origem da foto ----------
function abrirSeletorFoto(alvo) {
    const folha = abrirFolha(`
        <p class="sheet-title">Adicionar foto</p>
        <div style="display:flex; gap:12px; margin-bottom:16px;">
            <button class="fonte-card fonte-primaria" id="fonte-camera">
                <span class="fonte-icon">${ICONS.camera}</span>
                <span>Câmera</span>
            </button>
            <button class="fonte-card" id="fonte-galeria">
                <span class="fonte-icon">${ICONS.image}</span>
                <span>Galeria</span>
            </button>
        </div>
        <button class="btn-secondary" id="fonte-cancelar" style="width:100%">Cancelar</button>
        <input type="file" id="input-camera" accept="image/*" capture="environment" hidden />
        <input type="file" id="input-galeria" accept="image/*" hidden />
    `);

    const inputCamera = folha.conteudo.querySelector("#input-camera");
    const inputGaleria = folha.conteudo.querySelector("#input-galeria");

    folha.conteudo.querySelector("#fonte-camera").addEventListener("click", () => inputCamera.click());
    folha.conteudo.querySelector("#fonte-galeria").addEventListener("click", () => inputGaleria.click());
    folha.conteudo.querySelector("#fonte-cancelar").addEventListener("click", folha.fechar);

    async function tratarArquivo(evento) {
        const arquivo = evento.target.files[0];
        if (!arquivo) return;
        folha.fechar();
        if (alvo === "principal") await enviarFotoPrincipal(arquivo);
        else await enviarFotoGaleria(arquivo);
    }

    inputCamera.addEventListener("change", tratarArquivo);
    inputGaleria.addEventListener("change", tratarArquivo);
}

// ---------- boost ----------
async function ativarBoost() {
    try {
        const boost = await apiFetch("/perfil/me/boost", { method: "POST" });
        perfil.boost_expira_em = boost.expira_em;
        render();
        mostrarToast("Boost ativado por 1h!");
    } catch (e) {
        mostrarToast(e.message, "error");
    }
}

function iniciarContadorBoost() {
    if (boostTimerId) clearInterval(boostTimerId);
    boostTimerId = setInterval(() => {
        const restanteMs = new Date(perfil.boost_expira_em) - new Date();
        if (restanteMs <= 0) {
            clearInterval(boostTimerId);
            boostTimerId = null;
            render();
            return;
        }
        const el = document.getElementById("boost-restante");
        if (el) el.textContent = formatarTempoRestante(restanteMs);
    }, 30000);
}

// ---------- salvar campos parciais do perfil sem perder o resto ----------
async function salvarPerfilParcial(overrides) {
    const payload = {
        bio: perfil.bio,
        objetivo: perfil.objetivo,
        nivel: perfil.nivel,
        modalidades: perfil.modalidades,
        idade: perfil.idade,
        telefone: perfil.telefone,
        cpf: perfil.cpf,
        genero: perfil.genero,
        orientacao_sexual: perfil.orientacao_sexual,
        procurando: perfil.procurando,
        aberto_a: perfil.aberto_a,
        mostrar_para: perfil.mostrar_para,
        quando_treina: perfil.quando_treina,
        divisao_treino: perfil.divisao_treino,
        interesses: perfil.interesses,
        aceitar_termos: !!perfil.termos_aceitos_em,
        ocultar_objetivo: perfil.ocultar_objetivo,
        ocultar_orientacao: perfil.ocultar_orientacao,
        ocultar_horarios: perfil.ocultar_horarios,
        pr_supino: perfil.pr_supino,
        pr_agachamento: perfil.pr_agachamento,
        pr_terra: perfil.pr_terra,
        ...overrides,
    };
    const boostAtual = perfil.boost_expira_em;
    perfil = await apiFetch("/perfil/me", { method: "PUT", body: JSON.stringify(payload) });
    perfil.boost_expira_em = boostAtual;
    return perfil;
}

// ---------- carregamento inicial ----------
renderSkeleton();

async function carregar() {
    try {
        const [perfilResp, matches, fotosResp] = await Promise.all([
            apiFetch("/perfil/me"),
            apiFetch("/matches"),
            apiFetch("/perfil/me/fotos"),
        ]);
        if (!perfilResp) {
            window.location.href = "onboarding.html";
            return;
        }
        perfil = perfilResp;
        matchesCount = matches.length;
        fotos = fotosResp;
        render();
    } catch (e) {
        renderErro();
    }
}

carregar();
