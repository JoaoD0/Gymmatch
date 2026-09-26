(function () {
    // Ícones copiados de node_modules/lucide-react (v0.575.0) do projeto original — sem CDN.
    const ICONE_RADAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/>
        <path d="M4 6h.01"/>
        <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/>
        <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/>
        <path d="M12 18h.01"/>
        <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/>
        <circle cx="12" cy="12" r="2"/>
        <path d="m13.41 10.59 5.66-5.66"/>
    </svg>`;

    const ICONE_MESSAGE_CIRCLE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>
    </svg>`;

    const ICONE_NEWSPAPER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18h-5"/>
        <path d="M18 14h-8"/>
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/>
        <rect width="8" height="4" x="10" y="6" rx="1"/>
    </svg>`;

    const ICONE_DUMBBELL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/>
        <path d="m2.5 21.5 1.4-1.4"/>
        <path d="m20.1 3.9 1.4-1.4"/>
        <path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/>
        <path d="m9.6 14.4 4.8-4.8"/>
    </svg>`;

    const ICONE_USER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
    </svg>`;

    const ITEMS = [
        { href: "discover.html", label: "Descobrir", icone: ICONE_RADAR },
        { href: "matches.html", label: "Matches", icone: ICONE_MESSAGE_CIRCLE },
        { href: "feed.html", label: "Feed", icone: ICONE_NEWSPAPER },
        { href: "treino.html", label: "Treino", icone: ICONE_DUMBBELL, tambemEm: ["desafios.html"], avisaPendencias: true },
        { href: "perfil.html", label: "Perfil", icone: ICONE_USER, ehPerfil: true },
    ];

    const ITEM_W = 64;
    const PX = 12;

    function paginaAtual() {
        return location.pathname.split("/").pop() || "discover.html";
    }

    function montarBarra(fotoUrl) {
        const nav = document.getElementById("bottom-nav");
        if (!nav) return;

        const atual = paginaAtual();
        const activeIndex = ITEMS.findIndex((item) => item.href === atual || (item.tambemEm || []).includes(atual));
        const hasActive = activeIndex >= 0;
        const centerX = hasActive ? PX + activeIndex * ITEM_W + ITEM_W / 2 : -999;

        const barra = hasActive
            ? `<span class="bar-indicator" style="left:${centerX - 16}px"></span>`
            : "";
        const cone = hasActive
            ? `<span class="beam-cone" style="left:${centerX - 32}px"></span>`
            : "";

        const itensHtml = ITEMS.map((item, idx) => {
            const active = idx === activeIndex;
            let conteudo;
            if (item.ehPerfil && fotoUrl) {
                conteudo = `<img src="${fotoUrl}" alt="" class="nav-photo ${active ? "active" : ""}" />`;
            } else {
                conteudo = `<span class="nav-icon ${active ? "active" : ""}">${item.icone}</span>`;
            }
            const ponto = item.avisaPendencias ? `<span class="nav-dot" id="nav-dot-treino" hidden></span>` : "";
            return `<a href="${item.href}" class="nav-item" aria-label="${item.label}">${conteudo}${ponto}</a>`;
        }).join("");

        nav.innerHTML = `<div class="nav-pill">${barra}${cone}${itensHtml}</div>`;
    }

    const CHAVE_FOTO = "gm-nav-foto";

    function fotoGuardada() {
        try {
            return sessionStorage.getItem(CHAVE_FOTO);
        } catch {
            return null;
        }
    }

    function guardarFoto(url) {
        try {
            if (url) sessionStorage.setItem(CHAVE_FOTO, url);
            else sessionStorage.removeItem(CHAVE_FOTO);
        } catch { /* sem storage: a foto só aparece depois da API */ }
    }

    // o sentido do deslize da página segue a posição da aba (direita/esquerda da atual)
    function ligarSentidoDasAbas() {
        const nav = document.getElementById("bottom-nav");
        if (!nav || !window.definirSentidoTransicao) return;
        nav.addEventListener("click", (e) => {
            const link = e.target.closest("a.nav-item");
            if (!link) return;
            const atual = ITEMS.findIndex((i) => i.href === paginaAtual() || (i.tambemEm || []).includes(paginaAtual()));
            const destino = ITEMS.findIndex((i) => i.href === link.getAttribute("href"));
            if (destino === atual) {
                e.preventDefault();
                return;
            }
            definirSentidoTransicao(atual < 0 || destino > atual ? "direita" : "esquerda");
        });
    }

    async function atualizarFoto() {
        if (typeof getToken !== "function" || !getToken()) return;
        try {
            const perfil = await apiFetch("/perfil/me");
            const fotoUrl = perfil && perfil.foto_url ? `${API_BASE_URL}${perfil.foto_url}` : null;
            if (fotoUrl !== fotoGuardada()) {
                guardarFoto(fotoUrl);
                montarBarra(fotoUrl);
                atualizarPendencias();
            }
        } catch (e) {
            // sem perfil/foto ainda: fica o ícone padrão de usuário
        }
    }

    function iniciar() {
        // desenha na hora (com a foto da visita anterior): a barra não pode sumir entre uma aba e outra
        montarBarra(fotoGuardada());
        ligarSentidoDasAbas();
        atualizarFoto();
        atualizarPendencias();
        // segue em segundo plano (espaçado pelo navegador) para avisar convites novos pela notificação do sistema
        setInterval(atualizarPendencias, INTERVALO_PENDENCIAS_MS);
    }

    const INTERVALO_PENDENCIAS_MS = 30000;
    let pendenciasAnteriores = null;

    function mostrarPontoTreino(quantidade) {
        const ponto = document.getElementById("nav-dot-treino");
        if (ponto) ponto.hidden = !(quantidade > 0);
    }

    async function atualizarPendencias() {
        if (typeof getToken !== "function" || !getToken()) return;
        // a tela de Matches confere sozinha a cada 10s; nas outras, vai junto deste ciclo
        if (window.verificarMatchesNovos && paginaAtual() !== "matches.html") verificarMatchesNovos();
        try {
            const { quantidade } = await apiFetch("/treino/pendentes");
            if (pendenciasAnteriores !== null && quantidade > pendenciasAnteriores && window.notificar) {
                notificar("Convite de treino", "Você recebeu um convite para treinar.", "treino.html", "treino");
            }
            pendenciasAnteriores = quantidade;
            mostrarPontoTreino(quantidade);
        } catch (e) {
            // sem conexão: o ponto fica como estava até a próxima tentativa
        }
    }

    // a tela de Treino atualiza o ponto na hora, sem esperar o próximo ciclo
    window.mostrarPontoTreino = mostrarPontoTreino;

    iniciar();
})();
