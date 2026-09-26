const DURACAO_MOVE_MS = 5000;

let _movesRowEl = null;
let _movesDados = null;
let _visualizadorAberto = false;
let _criadorAberto = false;

function movesIniciais(nome) {
    return (nome || "?").trim().charAt(0).toUpperCase();
}

function movesPrimeiroNome(nome) {
    return (nome || "").trim().split(/\s+/)[0] || "?";
}

// ---------- fileira ----------
function renderMovesRow() {
    if (!_movesRowEl || !_movesDados) return;

    const usuarioLocal = getUsuario();
    const temMeus = _movesDados.meus.length > 0;

    const itemProprio = `
        <button type="button" class="moves-item" id="moves-item-proprio">
            <div class="moves-avatar-wrap">
                <div class="moves-avatar-anel ${temMeus ? "" : "pulsando"}">
                    <div class="moves-avatar-interno">
                        <div class="moves-avatar-foto" id="moves-avatar-proprio"></div>
                    </div>
                </div>
                ${!temMeus ? `<span class="moves-btn-add">${ICONS.plus}</span>` : ""}
            </div>
            <span class="moves-rotulo ${temMeus ? "tempo" : "proprio"}">
                ${temMeus ? escapeHtml(_movesDados.meus[_movesDados.meus.length - 1].tempo) : "SEU MOVE"}
            </span>
        </button>
    `;

    const itensGrupos = _movesDados.grupos
        .map(
            (g, idx) => `
        <button type="button" class="moves-item" data-grupo-idx="${idx}">
            <div class="moves-avatar-wrap">
                <div class="moves-avatar-anel">
                    <div class="moves-avatar-interno">
                        <div class="moves-avatar-foto" style="${g.usuario.foto_url ? `background-image:url('${API_BASE_URL}${g.usuario.foto_url}')` : ""}">
                            ${!g.usuario.foto_url ? ICONS.dumbbell.replace("<svg ", '<svg class="outro" ') : ""}
                        </div>
                    </div>
                </div>
            </div>
            <span class="moves-rotulo">${escapeHtml(movesPrimeiroNome(g.usuario.nome))}</span>
        </button>
    `
        )
        .join("");

    _movesRowEl.innerHTML = `<div class="moves-row-wrap"><div class="moves-row">${itemProprio}${itensGrupos}</div></div>`;

    const avatarProprioEl = document.getElementById("moves-avatar-proprio");
    if (usuarioLocal) {
        avatarProprioEl.innerHTML = ICONS.dumbbell;
    }
    // tenta usar a foto de perfil, sem travar se falhar
    apiFetch("/perfil/me")
        .then((perfil) => {
            if (perfil?.foto_url && avatarProprioEl) {
                avatarProprioEl.style.backgroundImage = `url('${API_BASE_URL}${perfil.foto_url}')`;
                avatarProprioEl.innerHTML = "";
            }
        })
        .catch(() => {});

    document.getElementById("moves-item-proprio").addEventListener("click", () => {
        if (temMeus) abrirVisualizador(_movesDados.meus, { proprio: true });
        else abrirCriador();
    });

    _movesRowEl.querySelectorAll("[data-grupo-idx]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const grupo = _movesDados.grupos[Number(btn.dataset.grupoIdx)];
            abrirVisualizador(grupo.moves, { proprio: false, autor: grupo.usuario });
        });
    });
}

async function recarregarMovesRow() {
    if (!_movesRowEl || _visualizadorAberto || _criadorAberto) return;
    try {
        _movesDados = await apiFetch("/moves");
        renderMovesRow();
    } catch (e) {
        // silencioso: a fileira simplesmente não aparece
    }
}

function iniciarMovesRow(elemento) {
    _movesRowEl = elemento;
    recarregarMovesRow();
}

// ---------- visualizador ----------
function abrirVisualizador(moves, { proprio, autor }) {
    _visualizadorAberto = true;
    const usuarioLocal = getUsuario();

    let indice = 0;
    let pausado = false;
    let tempoDecorridoMs = 0;
    let ultimoFrame = null;
    let rafId = null;
    let confirmando = null; // "excluir" | "denunciar" | null

    const overlay = document.createElement("div");
    overlay.className = "moves-viewer";
    overlay.innerHTML = `
        <div class="moves-viewer-foto" id="mv-foto"></div>
        <div class="moves-viewer-gradiente"></div>
        <div class="moves-progresso" id="mv-progresso"></div>
        <div class="moves-viewer-header">
            <div class="moves-viewer-avatar" id="mv-avatar"></div>
            <div class="moves-viewer-info">
                <div class="moves-viewer-nome" id="mv-nome"></div>
                <div class="moves-viewer-tempo">${ICONS.zap}<span id="mv-tempo"></span></div>
            </div>
            <div class="moves-viewer-acoes" id="mv-acoes"></div>
        </div>
        <div class="moves-viewer-corpo">
            <div class="moves-viewer-zona" id="mv-esquerda"></div>
            <div class="moves-viewer-zona" id="mv-direita"></div>
        </div>
        <div class="moves-viewer-rodape">${ICONS.zap} MOVES · GYMMATCH</div>
        <div id="mv-confirma-area"></div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const nome = proprio ? usuarioLocal?.nome || "Você" : autor.nome;
    const fotoAutor = proprio ? null : autor.foto_url;

    const progressoEl = document.getElementById("mv-progresso");
    progressoEl.innerHTML = moves
        .map((_, i) => `<div class="moves-progresso-trilho" data-idx="${i}"><div class="moves-progresso-fill"></div></div>`)
        .join("");

    const avatarEl = document.getElementById("mv-avatar");
    if (fotoAutor) {
        avatarEl.style.backgroundImage = `url('${API_BASE_URL}${fotoAutor}')`;
    } else {
        avatarEl.textContent = movesIniciais(nome);
    }
    document.getElementById("mv-nome").textContent = nome;

    function fechar() {
        cancelAnimationFrame(rafId);
        overlay.remove();
        document.body.style.overflow = "";
        _visualizadorAberto = false;
        recarregarMovesRow();
    }

    function renderAcoes() {
        const acoesEl = document.getElementById("mv-acoes");
        acoesEl.innerHTML = `
            ${proprio ? `<button type="button" class="moves-icon-btn excluir" id="mv-excluir" aria-label="Apagar">${ICONS.trash2}</button>` : ""}
            ${!proprio ? `<button type="button" class="moves-icon-btn" id="mv-denunciar" aria-label="Denunciar">${ICONS.flag}</button>` : ""}
            <button type="button" class="moves-icon-btn" id="mv-fechar" aria-label="Fechar">${ICONS.x}</button>
        `;
        document.getElementById("mv-fechar").addEventListener("click", fechar);
        if (proprio) {
            document.getElementById("mv-excluir").addEventListener("click", () => abrirConfirmacao("excluir"));
        } else {
            document.getElementById("mv-denunciar").addEventListener("click", () => abrirConfirmacao("denunciar"));
        }
    }
    renderAcoes();

    function atualizarTrilhos() {
        progressoEl.querySelectorAll(".moves-progresso-trilho").forEach((trilho, i) => {
            trilho.classList.toggle("atual", i === indice);
            const fill = trilho.querySelector(".moves-progresso-fill");
            if (i < indice) fill.style.width = "100%";
            else if (i > indice) fill.style.width = "0%";
        });
    }

    function mostrarMoveAtual() {
        const move = moves[indice];
        document.getElementById("mv-foto").style.backgroundImage = `url('${API_BASE_URL}${move.foto_url}')`;
        document.getElementById("mv-tempo").textContent = move.tempo;
        tempoDecorridoMs = 0;
        ultimoFrame = null;
        atualizarTrilhos();
    }

    function irPara(novoIndice) {
        if (novoIndice < 0) return; // já está no primeiro, ignora
        if (novoIndice >= moves.length) {
            fechar();
            return;
        }
        indice = novoIndice;
        mostrarMoveAtual();
    }

    function loop(agora) {
        if (confirmando) {
            ultimoFrame = agora;
            rafId = requestAnimationFrame(loop);
            return;
        }
        if (!pausado) {
            if (ultimoFrame === null) ultimoFrame = agora;
            tempoDecorridoMs += agora - ultimoFrame;
        }
        ultimoFrame = agora;

        const fill = progressoEl.querySelectorAll(".moves-progresso-fill")[indice];
        const pct = Math.min(100, (tempoDecorridoMs / DURACAO_MOVE_MS) * 100);
        if (fill) fill.style.width = `${pct}%`;

        if (tempoDecorridoMs >= DURACAO_MOVE_MS) {
            irPara(indice + 1);
        }
        rafId = requestAnimationFrame(loop);
    }

    mostrarMoveAtual();
    rafId = requestAnimationFrame(loop);

    // ---------- navegação por toque ----------
    let segurando = false;
    function iniciarPausa() {
        segurando = true;
        pausado = true;
    }
    function pararPausa() {
        if (segurando) {
            segurando = false;
            pausado = false;
        }
    }

    const esquerdaEl = document.getElementById("mv-esquerda");
    const direitaEl = document.getElementById("mv-direita");

    [esquerdaEl, direitaEl].forEach((zona) => {
        zona.addEventListener("pointerdown", iniciarPausa);
        zona.addEventListener("pointerup", pararPausa);
        zona.addEventListener("pointerleave", pararPausa);
        zona.addEventListener("pointercancel", pararPausa);
    });

    esquerdaEl.addEventListener("click", () => {
        if (!confirmando) irPara(indice - 1);
    });
    direitaEl.addEventListener("click", () => {
        if (!confirmando) irPara(indice + 1);
    });

    function teclado(evento) {
        if (evento.key === "ArrowLeft") irPara(indice - 1);
        else if (evento.key === "ArrowRight") irPara(indice + 1);
        else if (evento.key === "Escape") fechar();
        else if (evento.key === " ") {
            evento.preventDefault();
            pausado = !pausado;
        }
    }
    document.addEventListener("keydown", teclado);

    const fecharOriginal = fechar;
    // garante que o listener de teclado saia junto quando a folha fechar
    overlay.addEventListener("remove", () => document.removeEventListener("keydown", teclado));

    // ---------- confirmação de exclusão / denúncia ----------
    function abrirConfirmacao(tipo) {
        confirmando = tipo;
        const area = document.getElementById("mv-confirma-area");

        if (tipo === "excluir") {
            area.innerHTML = `
                <div class="moves-confirma">
                    <div class="moves-confirma-icone excluir">${ICONS.trash2}</div>
                    <h3>Apagar move?</h3>
                    <p>Esta ação não pode ser desfeita.</p>
                    <div class="moves-confirma-acoes">
                        <button type="button" class="moves-confirma-btn cancelar" id="mv-conf-cancelar">Cancelar</button>
                        <button type="button" class="moves-confirma-btn excluir" id="mv-conf-confirmar">Apagar</button>
                    </div>
                </div>
            `;
            document.getElementById("mv-conf-cancelar").addEventListener("click", fecharConfirmacao);
            document.getElementById("mv-conf-confirmar").addEventListener("click", confirmarExclusao);
        } else {
            area.innerHTML = `
                <div class="moves-confirma">
                    <div class="moves-confirma-icone denunciar">${ICONS.flag}</div>
                    <h3>Denunciar move?</h3>
                    <p>Conteúdo impróprio será revisado pela nossa equipe.</p>
                    <div class="moves-confirma-acoes">
                        <button type="button" class="moves-confirma-btn cancelar" id="mv-conf-cancelar">Cancelar</button>
                        <button type="button" class="moves-confirma-btn denunciar" id="mv-conf-confirmar">Denunciar</button>
                    </div>
                </div>
            `;
            document.getElementById("mv-conf-cancelar").addEventListener("click", fecharConfirmacao);
            document.getElementById("mv-conf-confirmar").addEventListener("click", confirmarDenuncia);
        }
    }

    function fecharConfirmacao() {
        confirmando = null;
        document.getElementById("mv-confirma-area").innerHTML = "";
    }

    async function confirmarExclusao() {
        const btn = document.getElementById("mv-conf-confirmar");
        btn.disabled = true;
        btn.textContent = "Apagando...";
        try {
            await apiFetch(`/moves/${moves[indice].id}`, { method: "DELETE" });
            mostrarToast("Move apagado");
            moves.splice(indice, 1);
            fecharConfirmacao();

            if (moves.length === 0) {
                fechar();
                return;
            }
            // remonta as barras de progresso pro novo tamanho da lista
            progressoEl.innerHTML = moves
                .map((_, i) => `<div class="moves-progresso-trilho" data-idx="${i}"><div class="moves-progresso-fill"></div></div>`)
                .join("");
            if (indice >= moves.length) indice = moves.length - 1;
            mostrarMoveAtual();
        } catch (e) {
            mostrarToast(e.message, "error");
            btn.disabled = false;
            btn.textContent = "Apagar";
        }
    }

    async function confirmarDenuncia() {
        const btn = document.getElementById("mv-conf-confirmar");
        btn.disabled = true;
        try {
            await apiFetch(`/moves/${moves[indice].id}/denunciar`, { method: "POST" });
            document.getElementById("mv-confirma-area").innerHTML = `
                <div class="moves-confirma">
                    <div class="moves-confirma-icone denunciar">${ICONS.flag}</div>
                    <h3>Denúncia enviada</h3>
                    <p>Nossa equipe vai revisar este conteúdo.</p>
                    <div class="moves-confirma-acoes">
                        <button type="button" class="moves-confirma-btn fechar" id="mv-conf-ok">Fechar</button>
                    </div>
                </div>
            `;
            document.getElementById("mv-conf-ok").addEventListener("click", fecharConfirmacao);
        } catch (e) {
            mostrarToast(e.message, "error");
            btn.disabled = false;
        }
    }
}
