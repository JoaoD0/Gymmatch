exigirLogin();

document.getElementById("btn-logout").addEventListener("click", logout);

const deckEl = document.getElementById("deck");
const erroEl = document.getElementById("erro");

const NIVEL_LABEL = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
const PROCURANDO_LABEL = { amizade: "Amizade", parceiro_treino: "Treino", romance: "Romance" };

let itens = [];
let indice = 0;
const historico = []; // { indice, tipo: "pass" | "curtir", usuarioId }

function iniciais(nome) {
    return (nome || "?").trim().charAt(0).toUpperCase();
}

// ---------- gesto de arrastar o card ----------
const LIMITE_ARRASTE = 90;          // px: passou disso e soltou, conta como curtir/passar
const VELOCIDADE_PUXADA = 0.55;     // px/ms: uma puxada rápida conta mesmo curta...
const MINIMO_PUXADA = 30;           // ...desde que tenha andado pelo menos isso
const ROTACAO_MAX = 22;             // graus
const EASE_SAIDA = "cubic-bezier(0.25, 1, 0.5, 1)";   // ease-out-quart
const EASE_VOLTA = "cubic-bezier(0.16, 1, 0.3, 1)";   // ease-out-expo, sem quique
const SEM_MOVIMENTO = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let ocupado = false;          // card voando ou curtida sendo enviada
let entradaComPop = true;     // só o primeiro card (ou o que volta no desfazer) entra com o "pop"
let vemDeLance = false;       // depois de um lance, o novo card de trás desliza para o lugar

function badgeDoPerfil(perfil) {
    const procurandoLabel = perfil.procurando ? PROCURANDO_LABEL[perfil.procurando] || perfil.procurando : null;
    const abertoA = (perfil.aberto_a || []).filter((v) => v !== perfil.procurando);
    if (!procurandoLabel) return { badge: "Novo por aqui", procurandoLabel };
    return {
        badge: abertoA.length ? `${procurandoLabel} + ${PROCURANDO_LABEL[abertoA[0]] || abertoA[0]}` : procurandoLabel,
        procurandoLabel,
    };
}

/** Conteúdo visual do card. Botões, selos, brilho e bio só existem no card do topo. */
function conteudoCardHtml(item, topo) {
    const perfil = item.perfil || {};
    const nivelLabel = NIVEL_LABEL[perfil.nivel] || "Iniciante";
    const { badge, procurandoLabel } = badgeDoPerfil(perfil);
    const tags = (perfil.modalidades || []).slice(0, 4).map((m) => `<span class="tag">${escapeHtml(m)}</span>`).join("");
    const foto = perfil.foto_url
        ? `<div class="card-photo" style="background-image:url('${API_BASE_URL}${perfil.foto_url}')"></div>`
        : `<div class="card-photo no-photo"><span class="initials">${escapeHtml(iniciais(item.usuario.nome))}</span></div>`;

    return `
        ${foto}
        ${topo ? `<div class="card-brilho" id="card-brilho"></div>` : ""}
        <div class="card-top">
            <div class="card-selos">
                <span class="card-badge">🔥 ${escapeHtml(badge)}</span>
                ${item.na_academia_agora ? `<span class="card-selo-academia">🟢 Na academia agora</span>` : ""}
            </div>
            ${topo ? `<button class="card-icon-btn" id="btn-more" aria-label="Mais opções">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>` : ""}
        </div>
        ${topo ? `
            <div class="card-decisao curtir" id="decisao-curtir" aria-hidden="true">${ICONS.heart}<span>Curtir</span></div>
            <div class="card-decisao passar" id="decisao-passar" aria-hidden="true">${ICONS.x}<span>Passar</span></div>
            <button class="card-icon-btn card-info-btn" id="btn-info" aria-label="Ver bio">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </button>` : ""}
        <div class="card-bottom">
            <h2>${escapeHtml(item.usuario.nome)}${perfil.idade ? `, <span class="idade">${perfil.idade}</span>` : ""}</h2>
            <p class="card-meta">⚡ <span class="nivel">${escapeHtml(nivelLabel)}</span>${procurandoLabel ? ` · ${escapeHtml(procurandoLabel)}` : ""}</p>
            <div class="card-tags">${tags}</div>
        </div>
        ${topo ? `<div class="card-bio-overlay" id="card-bio" hidden>
            <p>${perfil.bio ? escapeHtml(perfil.bio) : "Essa pessoa ainda não escreveu uma bio."}</p>
        </div>` : ""}`;
}

// estados de repouso da pilha (o de trás "respira" conforme o arraste)
function estiloProximo(progresso) {
    const escala = 0.94 + progresso * 0.06;
    return {
        transform: `translateY(${(1 - progresso) * -14}px) scale(${escala})`,
        filter: `brightness(${0.62 + progresso * 0.38})`,
    };
}
const ESTILO_TERCEIRO = { transform: "translateY(-26px) scale(0.88)", filter: "brightness(0.4)" };

function renderizar() {
    if (indice >= itens.length) {
        deckEl.innerHTML = `<div class="empty"><p class="empty" style="padding:0">Ninguém novo por aqui ainda.<br>Volte mais tarde!</p></div>`;
        atualizarBotoesAcao(0, 0);
        return;
    }

    const terceiro = itens[indice + 2];
    const proximo = itens[indice + 1];
    deckEl.innerHTML = `
        <div class="deck-pilha">
            ${terceiro ? `<div class="swipe-card card-fundo card-terceiro" aria-hidden="true">${conteudoCardHtml(terceiro, false)}</div>` : ""}
            ${proximo ? `<div class="swipe-card card-fundo card-proximo" id="card-proximo" aria-hidden="true">${conteudoCardHtml(proximo, false)}</div>` : ""}
            <div class="swipe-card card-topo ${entradaComPop ? "entrando" : ""}" id="swipe-card" data-id="${itens[indice].usuario.id}">
                ${conteudoCardHtml(itens[indice], true)}
            </div>
        </div>`;
    entradaComPop = false;

    const terceiroEl = deckEl.querySelector(".card-terceiro");
    if (terceiroEl) Object.assign(terceiroEl.style, ESTILO_TERCEIRO);

    const proximoEl = document.getElementById("card-proximo");
    if (proximoEl) {
        if (vemDeLance && !SEM_MOVIMENTO) {
            // o novo card de trás vinha da terceira posição: desliza até a segunda em vez de surgir
            Object.assign(proximoEl.style, ESTILO_TERCEIRO, { transition: "none" });
            proximoEl.getBoundingClientRect();
            proximoEl.style.transition = `transform 0.36s ${EASE_VOLTA}, filter 0.36s ${EASE_VOLTA}`;
        }
        Object.assign(proximoEl.style, estiloProximo(0));
    }
    vemDeLance = false;

    document.getElementById("btn-info").addEventListener("click", () => {
        document.getElementById("card-bio").hidden = false;
    });
    document.getElementById("card-bio").addEventListener("click", (e) => {
        e.currentTarget.hidden = true;
    });
    ligarArraste(document.getElementById("swipe-card"));
    atualizarBotoesAcao(0, 0);
}

/** Os botões de baixo acompanham o gesto: o do lado puxado cresce e acende, o outro apaga. */
function atualizarBotoesAcao(dx, progresso) {
    const curtir = document.getElementById("btn-like");
    const passar = document.getElementById("btn-pass");
    const pCurtir = dx > 0 ? progresso : 0;
    const pPassar = dx < 0 ? progresso : 0;
    curtir.style.transform = pCurtir ? `scale(${1 + pCurtir * 0.14})` : "";
    passar.style.transform = pPassar ? `scale(${1 + pPassar * 0.14})` : "";
    curtir.style.opacity = pPassar ? 1 - pPassar * 0.55 : "";
    passar.style.opacity = pCurtir ? 1 - pCurtir * 0.55 : "";
    curtir.classList.toggle("armado", pCurtir >= 1);
    passar.classList.toggle("armado", pPassar >= 1);
}

/**
 * Posiciona o card do topo e tudo que depende do gesto.
 * pivo: +1 se foi pego na metade de cima (gira para o lado do puxão), -1 na de baixo (gira ao contrário).
 */
function posicionarCard(dx, dy, { pivo = 1, levantado = false, transicao = "none" } = {}) {
    const card = document.getElementById("swipe-card");
    if (!card) return;
    const progresso = Math.min(Math.abs(dx) / LIMITE_ARRASTE, 1);
    const rotacao = SEM_MOVIMENTO ? 0 : Math.max(-ROTACAO_MAX, Math.min(ROTACAO_MAX, dx * 0.07 * pivo));
    const escala = levantado && !SEM_MOVIMENTO ? 1.02 : 1;

    card.style.transition = transicao;
    card.style.transform = dx === 0 && dy === 0 && escala === 1
        ? ""
        : `translate(${dx}px, ${dy}px) rotate(${rotacao}deg) scale(${escala})`;

    // o brilho entra pela borda do lado para onde o card está indo
    const brilho = document.getElementById("card-brilho");
    brilho.style.transition = transicao === "none" ? "none" : "opacity 0.3s ease";
    brilho.className = `card-brilho ${dx > 0 ? "curtir" : dx < 0 ? "passar" : ""}`;
    brilho.style.opacity = progresso;

    const dCurtir = document.getElementById("decisao-curtir");
    const dPassar = document.getElementById("decisao-passar");
    const pCurtir = dx > 0 ? progresso : 0;
    const pPassar = dx < 0 ? progresso : 0;
    for (const [el, p, giro] of [[dCurtir, pCurtir, -8], [dPassar, pPassar, 8]]) {
        el.style.transition = transicao === "none" ? "none" : `opacity 0.24s ease, transform 0.24s ${EASE_VOLTA}`;
        el.style.opacity = p;
        el.style.transform = `rotate(${giro}deg) scale(${0.82 + p * 0.18})`;
    }

    const proximo = document.getElementById("card-proximo");
    if (proximo) {
        proximo.style.transition = transicao === "none" ? "none" : `transform 0.36s ${EASE_VOLTA}, filter 0.36s ${EASE_VOLTA}`;
        Object.assign(proximo.style, estiloProximo(progresso));
    }
    atualizarBotoesAcao(dx, progresso);
}

function pulsarBotao(curtir) {
    const botao = document.getElementById(curtir ? "btn-like" : "btn-pass");
    botao.classList.remove("pulsando");
    botao.getBoundingClientRect();
    botao.classList.add("pulsando");
}

/**
 * Tira o card da tela e registra a ação. Usado pelo gesto (com a velocidade da puxada),
 * pelos botões e pelas setas do teclado.
 */
function lancarCard(curtir, { dx = 0, dy = 0, vx = 0, vy = 0, pivo = 1, peloBotao = false } = {}) {
    if (ocupado || indice >= itens.length) return;
    ocupado = true;
    if (peloBotao) pulsarBotao(curtir);

    const card = document.getElementById("swipe-card");
    const sentido = curtir ? 1 : -1;
    const alvoX = sentido * (window.innerWidth / 2 + card.offsetWidth * 1.1);
    // puxada rápida: sai rápido; botão: saída firme e curta
    const velocidade = Math.max(Math.abs(vx), 1.6);
    const duracao = SEM_MOVIMENTO ? 160 : Math.round(Math.min(340, Math.max(200, Math.abs(alvoX - dx) / velocidade)));
    const alvoY = SEM_MOVIMENTO ? 0 : Math.max(-220, Math.min(220, dy + vy * duracao * 0.6 + (peloBotao ? -30 : 0)));

    if (SEM_MOVIMENTO) {
        card.style.transition = `opacity ${duracao}ms ease`;
        card.style.opacity = "0";
        posicionarCard(sentido * LIMITE_ARRASTE * 0.01, 0, { transicao: `opacity ${duracao}ms ease` });
    } else {
        posicionarCard(alvoX, alvoY, { pivo, transicao: `transform ${duracao}ms ${EASE_SAIDA}` });
    }

    setTimeout(async () => {
        vemDeLance = true;
        const ok = curtir ? await curtirAtual() : passarAtual();
        if (!ok) {
            // limite do plano ou erro: o card volta ao lugar
            vemDeLance = false;
            card.style.opacity = "";
            posicionarCard(0, 0, { transicao: `transform 0.42s ${EASE_VOLTA}` });
        }
        ocupado = false;
    }, duracao);
}

function ligarArraste(card) {
    let gesto = null;
    let quadro = 0;

    function desenhar() {
        quadro = 0;
        if (!gesto) return;
        const dx = gesto.x - gesto.x0;
        // na vertical o card segue o dedo com resistência, para não parecer solto
        const dy = (gesto.y - gesto.y0) * 0.35;
        posicionarCard(dx, dy, { pivo: gesto.pivo, levantado: true });
        const armado = Math.abs(dx) >= LIMITE_ARRASTE;
        if (armado && !gesto.armado && navigator.vibrate) navigator.vibrate(8);
        gesto.armado = armado;
    }

    card.addEventListener("pointerdown", (e) => {
        // botões, bio aberta e botão direito do mouse não iniciam o arraste
        if (ocupado || e.button !== 0 || e.target.closest("button, .card-bio-overlay:not([hidden])")) return;
        const caixa = card.getBoundingClientRect();
        gesto = {
            x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
            pivo: e.clientY - caixa.top < caixa.height / 2 ? 1 : -1,
            amostras: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }],
            armado: false,
        };
        card.setPointerCapture(e.pointerId);
        card.classList.add("arrastando");
        posicionarCard(0, 0, { levantado: true, transicao: `transform 0.18s ${EASE_VOLTA}` });
    });

    card.addEventListener("pointermove", (e) => {
        if (!gesto) return;
        e.preventDefault();
        gesto.x = e.clientX;
        gesto.y = e.clientY;
        gesto.amostras.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
        if (gesto.amostras.length > 6) gesto.amostras.shift();
        if (!quadro) quadro = requestAnimationFrame(desenhar);
    });

    function soltar(e) {
        if (!gesto) return;
        const g = gesto;
        gesto = null;
        if (quadro) cancelAnimationFrame(quadro);
        quadro = 0;
        card.classList.remove("arrastando");

        const dx = e.clientX - g.x0;
        const dy = (e.clientY - g.y0) * 0.35;
        // velocidade dos últimos ~100 ms do gesto
        const recentes = g.amostras.filter((a) => e.timeStamp - a.t <= 100);
        const primeira = recentes[0] || g.amostras[0];
        const tempo = Math.max(1, e.timeStamp - primeira.t);
        const vx = (e.clientX - primeira.x) / tempo;
        const vy = ((e.clientY - primeira.y) / tempo) * 0.35;

        const passouDoPonto = Math.abs(dx) >= LIMITE_ARRASTE;
        const puxadaRapida = Math.abs(vx) >= VELOCIDADE_PUXADA && Math.abs(dx) >= MINIMO_PUXADA && Math.sign(vx) === Math.sign(dx);
        if (passouDoPonto || puxadaRapida) {
            lancarCard(dx > 0, { dx, dy, vx, vy, pivo: g.pivo });
        } else {
            posicionarCard(0, 0, { transicao: `transform 0.42s ${EASE_VOLTA}` });
        }
    }

    card.addEventListener("pointerup", soltar);
    card.addEventListener("pointercancel", soltar);
}

function atualizarBtnUndo() {
    const btn = document.getElementById("btn-undo");
    if (btn) btn.disabled = historico.length === 0;
}

function dentroDaFaixaEtaria(item) {
    const idade = item.perfil?.idade;
    if (!idade) return true; // sem idade cadastrada não é filtrado
    const min = Number(localStorage.getItem("disc_min_age")) || 18;
    const max = Number(localStorage.getItem("disc_max_age")) || 60;
    return idade >= min && idade <= max;
}

async function carregar() {
    try {
        const todos = await apiFetch("/discover");
        itens = todos.filter(dentroDaFaixaEtaria);
        indice = 0;
        renderizar();
        atualizarBtnUndo();
    } catch (e) {
        erroEl.textContent = e.message;
    }
}

function passarAtual() {
    historico.push({ indice, tipo: "pass" });
    indice += 1;
    renderizar();
    atualizarBtnUndo();
    return true;
}

document.getElementById("btn-pass").addEventListener("click", () => lancarCard(false, { peloBotao: true }));

document.getElementById("btn-undo").addEventListener("click", async () => {
    if (!historico.length) return;
    const ultimo = historico[historico.length - 1];

    // desfazer um "passar" é só local — só desfazer um "curtir" fala com a API (e depende do plano)
    if (ultimo.tipo === "curtir") {
        try {
            await apiFetch(`/discover/curtir/${ultimo.usuarioId}`, { method: "DELETE" });
        } catch (e) {
            if (e.motivo) abrirUpgradeModal(e.motivo);
            else mostrarToast(e.message, "error");
            return;
        }
    }

    historico.pop();
    indice = ultimo.indice;
    entradaComPop = true;
    renderizar();
    atualizarBtnUndo();
});

async function curtirAtual() {
    const itemCurtido = itens[indice];
    try {
        const resultado = await apiFetch("/discover/curtir", {
            method: "POST",
            body: JSON.stringify({ para_usuario_id: itemCurtido.usuario.id }),
        });
        historico.push({ indice, tipo: "curtir", usuarioId: itemCurtido.usuario.id });
        indice += 1;
        renderizar();
        atualizarBtnUndo();
        if (resultado.match) {
            abrirMatchOverlay({
                matchId: resultado.match_id,
                outroNome: itemCurtido.usuario.nome,
                outroFoto: itemCurtido.perfil?.foto_url || null,
            });
        }
        return true;
    } catch (e) {
        if (e.motivo) abrirUpgradeModal(e.motivo);
        else erroEl.textContent = e.message;
        return false;
    }
}

document.getElementById("btn-like").addEventListener("click", () => lancarCard(true, { peloBotao: true }));

// setas do teclado também curtem/passam (fora de campos de texto e de folhas abertas)
document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select") || document.querySelector(".sheet-overlay")) return;
    if (e.key === "ArrowRight") lancarCard(true, { peloBotao: true });
    if (e.key === "ArrowLeft") lancarCard(false, { peloBotao: true });
});

carregar();
