/* Notificações do sistema pela API Notification do navegador (sem service worker / web push).
   Quem dispara são os pollings que as telas já fazem; aqui só fica o estado e o envio. */
(function () {
    const CHAVE_PAUSADAS = "gymmatch_notificacoes_pausadas";
    const ICONE = "icon-192.png";

    function suportado() {
        return "Notification" in window;
    }

    function pausadas() {
        try {
            return localStorage.getItem(CHAVE_PAUSADAS) === "1";
        } catch {
            return false;
        }
    }

    /** "indisponivel" | "idle" | "ativo" | "negado" */
    function estadoNotificacoes() {
        if (!suportado()) return "indisponivel";
        if (Notification.permission === "denied") return "negado";
        if (Notification.permission === "granted" && !pausadas()) return "ativo";
        return "idle";
    }

    async function ativarNotificacoes() {
        if (!suportado()) return "indisponivel";
        try {
            localStorage.removeItem(CHAVE_PAUSADAS);
        } catch { /* sem storage: segue só com a permissão */ }
        if (Notification.permission === "default") {
            try {
                await Notification.requestPermission();
            } catch {
                // navegadores antigos só aceitam callback; ficam no estado atual
            }
        }
        return estadoNotificacoes();
    }

    function pausarNotificacoes(pausar) {
        try {
            if (pausar) localStorage.setItem(CHAVE_PAUSADAS, "1");
            else localStorage.removeItem(CHAVE_PAUSADAS);
        } catch { /* sem storage: a preferência só não fica salva */ }
    }

    function notificacoesPausadas() {
        return pausadas();
    }

    /** Só dispara com a aba em segundo plano; com ela visível, o toast da própria tela já avisa. */
    function notificar(titulo, corpo, url, tag) {
        if (estadoNotificacoes() !== "ativo" || document.visibilityState === "visible") return;
        try {
            const n = new Notification(titulo, { body: corpo, icon: ICONE, tag: tag || titulo });
            n.onclick = () => {
                window.focus();
                if (url) window.location.href = url;
                n.close();
            };
        } catch {
            // alguns navegadores móveis só permitem notificação via service worker
        }
    }

    window.estadoNotificacoes = estadoNotificacoes;
    window.ativarNotificacoes = ativarNotificacoes;
    window.pausarNotificacoes = pausarNotificacoes;
    window.notificacoesPausadas = notificacoesPausadas;
    window.notificar = notificar;
})();
