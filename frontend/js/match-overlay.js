let _minhaFotoCache = undefined; // undefined = ainda não buscou; null = sem foto

// ---------- matches já vistos (por conta, no localStorage) ----------
function _chaveMatchesVistos() {
    const u = getUsuario();
    return u ? `gm:${u.id}:matches_vistos` : null;
}

function _lerMatchesVistos() {
    try {
        const bruto = localStorage.getItem(_chaveMatchesVistos());
        return bruto === null ? null : new Set(JSON.parse(bruto));
    } catch {
        return null;
    }
}

function _salvarMatchesVistos(ids) {
    try {
        localStorage.setItem(_chaveMatchesVistos(), JSON.stringify([...ids]));
    } catch { /* sem storage: o overlay só não é lembrado */ }
}

function marcarMatchVisto(matchId) {
    const vistos = _lerMatchesVistos() || new Set();
    vistos.add(Number(matchId));
    _salvarMatchesVistos(vistos);
}

/**
 * Mostra "É um match!" quando surge um match que esta conta ainda não viu — inclusive quando
 * foi a outra pessoa que completou (curtiu de volta). Na primeira vez só registra os que já existem.
 * Recebe a lista de /matches quando a tela já a buscou; senão busca.
 */
async function verificarMatchesNovos(matches) {
    if (!_chaveMatchesVistos()) return [];
    let lista = matches;
    if (!lista) {
        try {
            lista = await apiFetch("/matches");
        } catch {
            return [];
        }
    }
    const vistos = _lerMatchesVistos();
    const ids = lista.map((m) => m.id);
    if (vistos === null) {
        _salvarMatchesVistos(ids);
        return [];
    }
    const novos = lista.filter((m) => !vistos.has(m.id));
    if (!novos.length) return [];

    _salvarMatchesVistos(new Set([...vistos, ...ids]));
    if (window.notificar) notificar("É um match!", `Você e ${novos[0].outro.nome} se curtiram.`, "matches.html", "match");
    if (!document.querySelector(".match-overlay")) {
        abrirMatchOverlay({ matchId: novos[0].id, outroNome: novos[0].outro.nome, outroFoto: novos[0].outro.foto_url });
    }
    return novos;
}

function iniciaisDe(nome) {
    return (nome || "?").trim().charAt(0).toUpperCase();
}

function fotoCirculoHtml(fotoUrl, nome, classeExtra) {
    if (fotoUrl) {
        return `<div class="match-foto ${classeExtra}" style="background-image:url('${fotoUrl}')"></div>`;
    }
    return `<div class="match-foto sem-foto ${classeExtra}">${escapeHtml(iniciaisDe(nome))}</div>`;
}

async function abrirMatchOverlay({ matchId, outroNome, outroFoto }) {
    marcarMatchVisto(matchId);
    const noDescobrir = (location.pathname.split("/").pop() || "") === "discover.html";
    if (_minhaFotoCache === undefined) {
        try {
            const perfil = await apiFetch("/perfil/me");
            _minhaFotoCache = perfil?.foto_url ? `${API_BASE_URL}${perfil.foto_url}` : null;
        } catch (e) {
            _minhaFotoCache = null;
        }
    }

    const usuarioLocal = getUsuario();
    const overlay = document.createElement("div");
    overlay.className = "match-overlay";
    overlay.innerHTML = `
        <h1 class="match-titulo">É um match!</h1>
        <p class="match-subtitulo">Você e <strong>${escapeHtml(outroNome)}</strong> se curtiram</p>
        <div class="match-fotos">
            ${fotoCirculoHtml(_minhaFotoCache, usuarioLocal?.nome, "match-foto-usuario")}
            ${fotoCirculoHtml(outroFoto ? `${API_BASE_URL}${outroFoto}` : null, outroNome, "match-foto-outro")}
        </div>
        <div class="match-acoes">
            <a href="chat.html?matchId=${matchId}" class="match-btn match-btn-primario">${ICONS.messageCircle} Enviar mensagem</a>
            <button type="button" class="match-btn match-btn-secundario" id="match-continuar">${noDescobrir ? `${ICONS.shuffle} Continuar descobrindo` : "Agora não"}</button>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    overlay.querySelector("#match-continuar").addEventListener("click", () => {
        overlay.remove();
        document.body.style.overflow = "";
    });
}
