const MAX_CARACTERES = 500;
const MAX_HISTORICO_ENVIADO = 20;
const TEXTO_ENCERRAMENTO = "Fico feliz que pude ajudar! 😊 Encerrando nossa conversa por aqui. Se precisar, é só voltar. Até logo! 👋";
const TEXTO_ERRO = "Ops, tive um probleminha. Tente novamente! 🙏";
const PALAVRAS_ENCERRAMENTO = ["obrigado", "obrigada", "valeu", "resolvido", "resolveu", "funcionou", "consegui", "entendi", "ok", "ótimo", "perfeito", "tchau"];
const ATALHOS_PADRAO = ["Como dar match?", "Editar perfil", "Ver planos", "Segurança", "Denunciar alguém", "Falar com atendente"];

const elMensagens = document.getElementById("lucia-mensagens");
const elAtalhos = document.getElementById("lucia-atalhos");
const elInput = document.getElementById("lucia-input");
const elEnviar = document.getElementById("lucia-enviar");
const elContador = document.getElementById("lucia-contador");
const elStatus = document.getElementById("lucia-status");
const elFaixa = document.getElementById("lucia-faixa-notif");

let mensagens = [];
let esperando = false;
let atalhos = ATALHOS_PADRAO;

// \b do JavaScript não entende letras acentuadas ("ótimo"); a borda aqui é "não é letra nem número" em Unicode
const REGEX_ENCERRAMENTO = new RegExp(`(^|[^\\p{L}\\p{N}])(${PALAVRAS_ENCERRAMENTO.join("|")})(?=$|[^\\p{L}\\p{N}])`, "iu");
const REGEX_NEGACAO = /(^|[^\p{L}\p{N}])(não|nao|nem|nunca)(?=$|[^\p{L}\p{N}])/iu;

function ehEncerramento(texto) {
    const palavras = texto.trim().split(/\s+/).filter(Boolean);
    return palavras.length <= 6 && REGEX_ENCERRAMENTO.test(texto) && !REGEX_NEGACAO.test(texto);
}

/** Escapa primeiro; só depois transforma **negrito** e o e-mail de suporte em HTML. */
function formatar(texto) {
    return escapeHtml(texto)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/suporte@gymmatch\.app/g, '<a href="mailto:suporte@gymmatch.app">suporte@gymmatch.app</a>');
}

// ---------- render ----------
function renderizarMensagens() {
    elMensagens.innerHTML = mensagens.map((m) => `
        <div class="lucia-linha ${m.de === "usuario" ? "minha" : ""}">
            <div class="lucia-bolha ${m.de === "usuario" ? "usuario" : "lucia"}">${formatar(m.conteudo)}</div>
        </div>`).join("") + (esperando ? `
        <div class="lucia-linha">
            <div class="lucia-bolha lucia lucia-digitando"><span></span><span></span><span></span></div>
        </div>` : "");
    requestAnimationFrame(() => elMensagens.scrollTo({ top: elMensagens.scrollHeight, behavior: "smooth" }));
}

function renderizarEstado() {
    elStatus.classList.toggle("digitando", esperando);
    elStatus.querySelector(".lucia-status-texto").textContent = esperando ? "digitando..." : "online agora";
    elAtalhos.hidden = esperando;
    atualizarCampo();
}

function renderizarAtalhos() {
    elAtalhos.innerHTML = atalhos.map((rotulo, i) =>
        `<button type="button" class="lucia-atalho" data-indice="${i}">${escapeHtml(rotulo)}</button>`).join("");
}

function atualizarCampo() {
    const n = elInput.value.length;
    elContador.hidden = n <= 400;
    elContador.textContent = MAX_CARACTERES - n;
    elContador.classList.toggle("no-limite", n >= MAX_CARACTERES);
    elEnviar.disabled = esperando || !elInput.value.trim();
}

function renderizarFaixaNotificacoes() {
    const mostrar = window.estadoNotificacoes && estadoNotificacoes() === "idle";
    elFaixa.hidden = !mostrar;
    if (!mostrar) return;
    elFaixa.innerHTML = `
        ${ICONS.bell}
        <p>Ative notificações para receber as respostas da Lucia</p>
        <button type="button" id="lucia-ativar-notif">Ativar</button>`;
    document.getElementById("lucia-ativar-notif").addEventListener("click", async () => {
        await ativarNotificacoes();
        renderizarFaixaNotificacoes();
    });
}

// ---------- histórico ----------
function salvar(novas) {
    mensagens = novas;
    Lucia.setHistorico(mensagens, { avisar: false });
    renderizarMensagens();
}

function carregarHistorico() {
    const historico = Lucia.getHistorico();
    const ultima = Lucia.getUltimaAtividade();
    const expirou = ultima && Date.now() - ultima > Lucia.EXPIRA_MS;
    if (!historico.length || expirou) {
        mensagens = Lucia.construirBoasVindas();
        Lucia.setHistorico(mensagens, { avisar: false });
    } else {
        mensagens = historico;
    }
    renderizarMensagens();
}

// ---------- envio ----------
function historicoParaApi(lista) {
    return lista.slice(-MAX_HISTORICO_ENVIADO).map((m) => ({ papel: m.de === "usuario" ? "usuario" : "assistente", conteudo: m.conteudo }));
}

async function enviar(texto, { atalho = false } = {}) {
    const limpo = texto.trim();
    if (!limpo || esperando) return;

    const anteriores = mensagens;
    elInput.value = "";
    Lucia.registrarAtividade();
    salvar([...anteriores, Lucia.mensagem("usuario", limpo)]);

    if (!atalho && ehEncerramento(limpo)) {
        esperando = true;
        renderizarEstado();
        await new Promise((r) => setTimeout(r, 700));
        esperando = false;
        salvar([...mensagens, Lucia.mensagem("lucia", TEXTO_ENCERRAMENTO)]);
        renderizarEstado();
        setTimeout(() => {
            Lucia.reiniciarConversa();
            carregarHistorico();
        }, 3000);
        return;
    }

    esperando = true;
    renderizarMensagens();
    renderizarEstado();
    try {
        const resposta = atalho
            ? await apiFetch("/lucia/atalhos", { method: "POST", body: JSON.stringify({ rotulo: limpo }) })
            : await apiFetch("/lucia/mensagens", {
                method: "POST",
                body: JSON.stringify({ historico: historicoParaApi(anteriores), texto: limpo }),
            });
        esperando = false;
        salvar([...mensagens, Lucia.mensagem("lucia", resposta.resposta)]);
    } catch (e) {
        esperando = false;
        // devolve o texto ao campo e tira a bolha do usuário, para reenviar sem duplicar
        salvar([...anteriores, Lucia.mensagem("lucia", TEXTO_ERRO)]);
        elInput.value = limpo;
    }
    renderizarEstado();
    elInput.focus();
}

// ---------- eventos ----------
document.getElementById("lucia-voltar").innerHTML = ICONS.arrowLeft;
document.getElementById("lucia-limpar").innerHTML = ICONS.trash2;
document.getElementById("lucia-avatar-topo").innerHTML = Lucia.avatarHtml(40);
elEnviar.innerHTML = ICONS.send;

document.getElementById("lucia-voltar").addEventListener("click", () => {
    if (history.length > 1) history.back();
    else window.location.href = "perfil.html";
});
document.getElementById("lucia-limpar").addEventListener("click", () => {
    Lucia.reiniciarConversa();
    carregarHistorico();
});

elInput.addEventListener("input", atualizarCampo);
elInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        enviar(elInput.value);
    }
});
elEnviar.addEventListener("click", () => enviar(elInput.value));
elAtalhos.addEventListener("click", (e) => {
    const botao = e.target.closest(".lucia-atalho");
    if (botao) enviar(atalhos[Number(botao.dataset.indice)], { atalho: true });
});

// o timer (lucia.js) pode adicionar o aviso ou a despedida enquanto a tela está aberta
window.addEventListener("lucia:historico-mudou", () => {
    if (esperando) return;
    mensagens = Lucia.getHistorico();
    if (!mensagens.length) mensagens = Lucia.construirBoasVindas();
    renderizarMensagens();
    if (Lucia.getNaoLidas() > 0) Lucia.setNaoLidas(0);
});

// ---------- início ----------
Lucia.marcarBoasVindasVistas();
Lucia.setNaoLidas(0);
carregarHistorico();
Lucia.registrarAtividade();
renderizarAtalhos();
renderizarEstado();
renderizarFaixaNotificacoes();
apiFetch("/lucia/atalhos").then((lista) => {
    if (Array.isArray(lista) && lista.length) {
        atalhos = lista;
        renderizarAtalhos();
    }
}).catch(() => {});
