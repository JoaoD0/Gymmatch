/* Transições entre páginas (View Transitions entre documentos, Chrome/Edge 126+).
   Carregado no <head>: o evento "pagereveal" dispara antes da primeira pintura da página nova.
   A barra inferior grava o sentido da troca de aba; o resto é avançar (link) ou voltar (histórico). */
(function () {
    const CHAVE_SENTIDO = "gm-transicao";

    window.definirSentidoTransicao = function (sentido) {
        try {
            sessionStorage.setItem(CHAVE_SENTIDO, sentido);
        } catch { /* sem storage: usa o sentido padrão */ }
    };

    function sentidoGuardado() {
        try {
            return sessionStorage.getItem(CHAVE_SENTIDO);
        } catch {
            return null;
        }
    }

    // página que está saindo: fora da troca de abas, a barra e o botão da Lucia vão junto com ela
    // (senão ficariam flutuando por cima de telas que não têm barra, como o chat)
    window.addEventListener("pageswap", (evento) => {
        if (!evento.viewTransition) return;
        const sentido = sentidoGuardado();
        if (sentido !== "direita" && sentido !== "esquerda") document.documentElement.dataset.transicao = "pilha";
    });

    window.addEventListener("pagereveal", (evento) => {
        // a página pode ter voltado do cache do navegador ainda marcada da saída anterior
        delete document.documentElement.dataset.transicao;
        if (!evento.viewTransition) return;

        let sentido = null;
        try {
            sentido = sessionStorage.getItem(CHAVE_SENTIDO);
            sessionStorage.removeItem(CHAVE_SENTIDO);
        } catch { /* segue com o padrão */ }

        if (!sentido) {
            const tipo = window.navigation && navigation.activation && navigation.activation.navigationType;
            sentido = tipo === "traverse" ? "voltar" : "avancar";
        }

        const raiz = document.documentElement;
        raiz.dataset.transicao = sentido;
        evento.viewTransition.finished.finally(() => {
            delete raiz.dataset.transicao;
        });
    });
})();
