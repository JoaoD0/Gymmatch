const UPGRADE_TEXTOS = {
    limite_curtidas: {
        titulo: "Curtidas acabaram",
        subtitulo: "Você usou as 20 curtidas do dia. Volte amanhã ou assine para ter ilimitadas.",
    },
    limite_matches: {
        titulo: "Limite de matches",
        subtitulo: "Você chegou no máximo de matches do seu plano.",
    },
    desfazer: {
        titulo: "Desfazer curtida",
        subtitulo: "Essa função é exclusiva dos planos Gold e Diamond.",
    },
    curtidas_recebidas: {
        titulo: "Quem te curtiu",
        subtitulo: "Veja quem curtiu você com Gold ou Diamond.",
    },
};

function formatarPreco(valor) {
    return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

function upgCardHtml(plano, planoAtual, cor, corForte, corTexto) {
    const atual = plano.chave === planoAtual;
    const beneficios = plano.beneficios
        .slice(0, 4)
        .map((b) => `<li>· ${escapeHtml(b)}</li>`)
        .join("");

    const acao = atual
        ? `<button type="button" class="btn-secondary" disabled>Plano atual</button>`
        : `<a href="pagamento.html?plano=${plano.chave}" class="btn-assinar" style="background:${corForte};color:${corTexto}">Assinar</a>`;

    return `
        <div class="upg-card" style="border-color: color-mix(in oklch, ${cor} 35%, transparent)">
            <span class="upg-pill" style="background:${cor};color:${corTexto}">${escapeHtml(plano.nome)}</span>
            <div class="upg-preco">${formatarPreco(plano.preco_mensal)}<span>/mês</span></div>
            <ul class="upg-beneficios">${beneficios}</ul>
            ${acao}
        </div>
    `;
}

async function abrirUpgradeModal(motivo) {
    const texto = UPGRADE_TEXTOS[motivo] || { titulo: "Recurso Premium", subtitulo: "Assine para desbloquear esse recurso." };

    let planos = [];
    let planoAtual = "gratis";
    try {
        const [listaPlanos, meuPlano] = await Promise.all([apiFetch("/planos"), apiFetch("/planos/me")]);
        planos = listaPlanos;
        planoAtual = meuPlano.plano.chave;
    } catch (e) {
        mostrarToast("Não foi possível carregar os planos", "error");
        return;
    }

    const gold = planos.find((p) => p.chave === "gold");
    const diamond = planos.find((p) => p.chave === "diamond");

    const folha = abrirFolha(`
        <div class="upg-header">
            <div>
                <p class="sheet-title" style="margin-bottom:4px">${escapeHtml(texto.titulo)}</p>
                <p class="upg-subtitulo">${escapeHtml(texto.subtitulo)}</p>
            </div>
            <button class="upg-fechar" id="upg-fechar" aria-label="Fechar">${ICONS.x}</button>
        </div>
        <div class="upg-cards">
            ${gold ? upgCardHtml(gold, planoAtual, "var(--gold)", "var(--gold-strong)", "#16161a") : ""}
            ${diamond ? upgCardHtml(diamond, planoAtual, "var(--diamond)", "var(--diamond-strong)", "#ffffff") : ""}
        </div>
        <button type="button" class="upg-continuar" id="upg-continuar">Continuar grátis</button>
    `);

    folha.conteudo.querySelector("#upg-fechar").addEventListener("click", folha.fechar);
    folha.conteudo.querySelector("#upg-continuar").addEventListener("click", folha.fechar);
}
