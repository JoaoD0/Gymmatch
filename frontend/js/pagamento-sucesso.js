exigirLogin();

const params = new URLSearchParams(window.location.search);
const chavePlano = params.get("plano");

const CORES_PLANO = {
    gold: { cor: "var(--gold)", icone: ICONS.crown },
    diamond: { cor: "var(--diamond)", icone: ICONS.sparkles },
};

const container = document.getElementById("sucesso-container");

function renderSucesso(plano) {
    const cores = CORES_PLANO[chavePlano] || CORES_PLANO.gold;
    container.innerHTML = `
        <div class="sucesso-icone-wrap">
            <div class="sucesso-circulo">${ICONS.checkCircle}</div>
            <div class="sucesso-mini" style="background:${cores.cor};color:#16161a">${cores.icone}</div>
        </div>
        <h1 class="sucesso-titulo">Bem-vindo ao ${escapeHtml(plano.nome)}!</h1>
        <p class="sucesso-texto">Sua assinatura foi ativada com sucesso. Aproveite todos os benefícios do plano ${escapeHtml(plano.nome)}.</p>
        <a href="discover.html" class="btn-primary sucesso-btn">Começar a usar</a>
        <a href="premium.html" class="sucesso-link">Ver meu plano</a>
    `;
}

function renderErro() {
    container.innerHTML = `
        <h1 class="sucesso-titulo">Algo deu errado…</h1>
        <p class="sucesso-texto">Não conseguimos confirmar sua assinatura. Tente novamente ou volte para o app.</p>
        <a href="discover.html" class="btn-primary sucesso-btn">Ir para o app</a>
    `;
}

async function confirmar() {
    try {
        const meuPlano = await apiFetch("/planos/me");
        if (meuPlano.ativa && meuPlano.plano.chave === chavePlano) {
            renderSucesso(meuPlano.plano);
        } else {
            renderErro();
        }
    } catch (e) {
        renderErro();
    }
}

confirmar();
