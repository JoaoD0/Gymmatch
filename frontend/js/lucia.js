/* Núcleo da Lucia no front: histórico, não lidas, timer de inatividade, botão flutuante e aviso no topo.
   Tudo fica no localStorage com chaves prefixadas pelo id do usuário ("lucia:<id>:..."). */
(function () {
    const AVISO_MS = 10 * 60 * 1000;
    const ENCERRAR_MS = 3 * 60 * 1000;
    const PAUSA_DESPEDIDA_MS = 2000;
    const AVISO_TOPO_MS = 6000;

    const BOAS_VINDAS = [
        "Olá! 👋 Eu sou a Lucia, assistente do GymMatch! Estou aqui para te ajudar com qualquer dúvida sobre o app.",
        "Pode me perguntar sobre matches, perfil, planos, segurança ou qualquer outra coisa. Use os atalhos abaixo ou escreva livremente!",
    ];
    const TEXTO_AVISO = "Ei, ainda está por aí? 👀 Sua conversa fica salva por mais 3 minutos — depois disso começo do zero!";
    const TEXTO_DESPEDIDA = "Parece que você saiu. Encerrando a conversa e começando do zero quando voltar. Até logo! 👋";

    const PAGINA = location.pathname.split("/").pop() || "index.html";
    const NA_TELA_DA_LUCIA = PAGINA === "lucia.html";
    const SEM_BOTAO = ["lucia.html", "chat.html", "index.html", "onboarding.html"];

    // ---------- armazenamento por usuário ----------
    function usuarioId() {
        try {
            const u = getUsuario();
            return u ? u.id : null;
        } catch {
            return null;
        }
    }

    function chave(nome) {
        return `lucia:${usuarioId()}:${nome}`;
    }

    function ler(nome) {
        try {
            return localStorage.getItem(chave(nome));
        } catch {
            return null;
        }
    }

    function gravar(nome, valor) {
        try {
            if (valor === null) localStorage.removeItem(chave(nome));
            else localStorage.setItem(chave(nome), String(valor));
        } catch { /* sem storage: a conversa vive só nesta página */ }
    }

    function avisarMudanca() {
        window.dispatchEvent(new CustomEvent("lucia:historico-mudou"));
    }

    function novoId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    function mensagem(de, conteudo, extra = {}) {
        return { id: novoId(), de, conteudo, criado_em: Date.now(), ...extra };
    }

    function construirBoasVindas() {
        return BOAS_VINDAS.map((conteudo, i) => ({ id: `boas-vindas-${i}`, de: "lucia", conteudo, criado_em: Date.now() + i }));
    }

    function getHistorico() {
        try {
            const lista = JSON.parse(ler("historico") || "[]");
            return Array.isArray(lista) ? lista : [];
        } catch {
            return [];
        }
    }

    function setHistorico(msgs, { avisar = true } = {}) {
        gravar("historico", JSON.stringify(msgs));
        if (avisar) avisarMudanca();
    }

    function jaViuBoasVindas() {
        return ler("boas_vindas") === "1";
    }

    function marcarBoasVindasVistas() {
        gravar("boas_vindas", "1");
    }

    function getNaoLidas() {
        const v = ler("nao_lidas");
        if (v === null) return jaViuBoasVindas() ? 0 : 1;
        return Number(v) || 0;
    }

    function setNaoLidas(n) {
        gravar("nao_lidas", Math.max(0, n));
        avisarMudanca();
    }

    function getUltimaAtividade() {
        return Number(ler("ultima_atividade") || 0);
    }

    function fabLigado() {
        return ler("fab") !== "false";
    }

    function setFabLigado(ligado) {
        gravar("fab", ligado ? "true" : "false");
        window.dispatchEvent(new CustomEvent("lucia:fab-changed", { detail: ligado }));
    }

    function reiniciarConversa() {
        setHistorico(construirBoasVindas());
        gravar("ultima_atividade", 0);
        agendar();
    }

    function registrarAtividade() {
        gravar("ultima_atividade", Date.now());
        agendar();
    }

    // ---------- timer de inatividade ----------
    let timerAviso = null;
    let timerEncerrar = null;
    let timerLimpar = null;

    function limparTimers() {
        clearTimeout(timerAviso);
        clearTimeout(timerEncerrar);
        clearTimeout(timerLimpar);
    }

    // outra aba pode já ter adicionado a mesma mensagem; o tipo + horário evita duplicar
    function jaTem(tipo, desde) {
        return getHistorico().some((m) => m.tipo === tipo && m.criado_em >= desde);
    }

    function encerrar(ultima) {
        if (getUltimaAtividade() !== ultima) return;
        if (!jaTem("despedida", ultima)) {
            setHistorico([...getHistorico(), mensagem("lucia", TEXTO_DESPEDIDA, { tipo: "despedida" })]);
        }
        timerLimpar = setTimeout(() => {
            if (getUltimaAtividade() !== ultima) return;
            setHistorico(construirBoasVindas(), { avisar: false });
            gravar("ultima_atividade", 0);
            setNaoLidas(NA_TELA_DA_LUCIA ? 0 : 1);
        }, PAUSA_DESPEDIDA_MS);
    }

    function avisar(ultima) {
        if (getUltimaAtividade() !== ultima) return;
        if (!jaTem("aviso", ultima)) {
            setHistorico([...getHistorico(), mensagem("lucia", TEXTO_AVISO, { tipo: "aviso" })], { avisar: false });
            if (!NA_TELA_DA_LUCIA) gravar("nao_lidas", Math.max(getNaoLidas(), 1));
            avisarMudanca();
            if (window.notificar) window.notificar("Lucia", TEXTO_AVISO, "lucia.html", "lucia");
        }
        timerEncerrar = setTimeout(() => encerrar(ultima), ENCERRAR_MS);
    }

    function agendar() {
        limparTimers();
        const ultima = getUltimaAtividade();
        if (!ultima) return;

        const passou = Date.now() - ultima;
        if (passou >= AVISO_MS + ENCERRAR_MS) {
            // a página abriu depois do prazo inteiro: recomeça em silêncio
            setHistorico(construirBoasVindas(), { avisar: false });
            gravar("ultima_atividade", 0);
            avisarMudanca();
            return;
        }
        if (passou >= AVISO_MS) {
            avisar(ultima);
            clearTimeout(timerEncerrar);
            timerEncerrar = setTimeout(() => encerrar(ultima), AVISO_MS + ENCERRAR_MS - passou);
            return;
        }
        timerAviso = setTimeout(() => avisar(ultima), AVISO_MS - passou);
    }

    // ---------- avatar ----------
    function avatarHtml(tamanho) {
        return `
            <div class="lucia-avatar" style="width:${tamanho}px;height:${tamanho}px">
                <div class="lucia-avatar-circulo" style="font-size:${Math.round(tamanho * 0.4)}px">Lú</div>
                <div class="lucia-avatar-estrela">${ICONS.star}</div>
            </div>`;
    }

    // ---------- botão flutuante ----------
    let fab = null;

    function deveMostrarFab() {
        return !SEM_BOTAO.includes(PAGINA) && document.getElementById("bottom-nav") !== null && fabLigado();
    }

    function renderizarFab() {
        if (!deveMostrarFab()) {
            if (fab) fab.hidden = true;
            return;
        }
        if (!fab) {
            fab = document.createElement("a");
            fab.href = "lucia.html";
            fab.className = "lucia-fab";
            fab.setAttribute("aria-label", "Falar com a Lucia");
            document.body.appendChild(fab);
        }
        const n = getNaoLidas();
        fab.hidden = false;
        fab.innerHTML = `
            <span class="lucia-fab-lu">Lú</span>
            <span class="lucia-fab-texto">Sua assistente a um toque</span>
            ${n > 0 ? `<span class="lucia-fab-contador">${n}</span>` : ""}`;
    }

    // ---------- aviso no topo ----------
    let areaAvisos = null;

    function avisoJaMostrado(id) {
        return ler("ultimo_aviso") === id;
    }

    function mostrarAvisoTopo() {
        if (NA_TELA_DA_LUCIA || getNaoLidas() <= 0) return;
        const ultima = [...getHistorico()].reverse().find((m) => m.de === "lucia");
        if (!ultima || avisoJaMostrado(ultima.id)) return;
        gravar("ultimo_aviso", ultima.id);

        if (!areaAvisos) {
            areaAvisos = document.createElement("div");
            areaAvisos.className = "lucia-avisos";
            document.body.appendChild(areaAvisos);
        }
        const aviso = document.createElement("div");
        aviso.className = "lucia-aviso";
        aviso.setAttribute("role", "button");
        aviso.tabIndex = 0;
        aviso.innerHTML = `
            ${avatarHtml(36)}
            <div class="lucia-aviso-corpo">
                <div class="lucia-aviso-topo">
                    <span class="lucia-aviso-nome">Lucia</span>
                    <span class="lucia-aviso-tag">assistente</span>
                    <span class="lucia-aviso-agora">agora</span>
                </div>
                <p class="lucia-aviso-texto">${escapeHtml(ultima.conteudo)}</p>
                <p class="lucia-aviso-abrir">Toque para abrir →</p>
            </div>
            <button type="button" class="lucia-aviso-fechar" aria-label="Fechar">×</button>`;

        const fechar = () => aviso.remove();
        const timer = setTimeout(fechar, AVISO_TOPO_MS);
        aviso.querySelector(".lucia-aviso-fechar").addEventListener("click", (e) => {
            e.stopPropagation();
            clearTimeout(timer);
            fechar();
        });
        aviso.addEventListener("click", () => (window.location.href = "lucia.html"));
        aviso.addEventListener("keydown", (e) => {
            if (e.key === "Enter") window.location.href = "lucia.html";
        });
        areaAvisos.appendChild(aviso);
    }

    // ---------- eventos ----------
    window.addEventListener("lucia:historico-mudou", () => {
        renderizarFab();
        mostrarAvisoTopo();
    });
    window.addEventListener("lucia:fab-changed", renderizarFab);

    // outra aba mudou a conversa deste usuário: sincroniza botão, aviso e timer
    window.addEventListener("storage", (e) => {
        if (!e.key || !e.key.startsWith(`lucia:${usuarioId()}:`)) return;
        if (e.key.endsWith(":ultima_atividade")) agendar();
        if (e.key.endsWith(":fab")) renderizarFab();
        if (e.key.endsWith(":historico") || e.key.endsWith(":nao_lidas")) avisarMudanca();
    });

    window.Lucia = {
        BOAS_VINDAS,
        getHistorico,
        setHistorico,
        getNaoLidas,
        setNaoLidas,
        marcarBoasVindasVistas,
        construirBoasVindas,
        reiniciarConversa,
        registrarAtividade,
        getUltimaAtividade,
        fabLigado,
        setFabLigado,
        mensagem,
        avatarHtml,
        EXPIRA_MS: AVISO_MS + ENCERRAR_MS,
    };

    if (usuarioId() !== null) {
        agendar();
        // o script roda depois da barra no HTML: cria o botão já, antes da primeira pintura (transição sem piscar)
        if (document.body) renderizarFab();
        else document.addEventListener("DOMContentLoaded", renderizarFab);
    }
})();
