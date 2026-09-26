exigirLogin();

let planos = [];
let meuPlano = null;
let selecionado = "gold";

const CORES_PLANO = {
    gratis: { cor: "var(--muted-foreground)", forte: "var(--secondary)", texto: "var(--foreground)", checkBg: "color-mix(in oklch, var(--muted-foreground) 15%, transparent)" },
    gold: { cor: "var(--gold)", forte: "var(--gold-strong)", texto: "#16161a", checkBg: "color-mix(in oklch, var(--gold) 15%, transparent)" },
    diamond: { cor: "var(--diamond)", forte: "var(--diamond-strong)", texto: "#ffffff", checkBg: "color-mix(in oklch, var(--diamond) 15%, transparent)" },
};

function formatarPreco(valor) {
    return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

function render() {
    const plano = planos.find((p) => p.chave === selecionado);
    const cores = CORES_PLANO[selecionado];
    const ehAtual = meuPlano.plano.chave === selecionado;
    const nomeAtual = planos.find((p) => p.chave === meuPlano.plano.chave)?.nome || meuPlano.plano.nome;

    document.getElementById("premium-plano-atual").innerHTML = `Plano atual: <strong>${escapeHtml(nomeAtual)}</strong>`;

    document.querySelectorAll("#premium-selector button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.plano === selecionado);
    });

    const precoHtml =
        plano.chave === "gratis"
            ? `<div class="premium-preco-row"><span class="premium-preco">Grátis</span></div>`
            : `<div class="premium-preco-row"><span class="premium-preco">${formatarPreco(plano.preco_mensal)}</span><span class="premium-preco-sufixo">/mês</span></div>`;

    const beneficiosHtml = plano.beneficios
        .map(
            (b) => `
        <li><span class="premium-check" style="background:${cores.checkBg};color:${cores.cor}">${ICONS.check}</span>${escapeHtml(b)}</li>
    `
        )
        .join("");

    let acaoHtml;
    if (plano.chave === "gratis") {
        acaoHtml = `<div class="premium-acao-atual">${ehAtual ? "Seu plano atual" : "Plano gratuito — sem custo"}</div>`;
    } else if (ehAtual) {
        acaoHtml = `
            <button type="button" class="premium-btn-assinar disabled" disabled style="background:${cores.forte};color:${cores.texto}">Plano atual</button>
            <p class="premium-renova">Renova em ${meuPlano.dias_restantes} dias · Cartão •••• ${escapeHtml(meuPlano.cartao_final || "")}</p>
            <button type="button" class="premium-cancelar" id="btn-cancelar">Cancelar assinatura</button>
        `;
    } else {
        acaoHtml = `<a href="pagamento.html?plano=${plano.chave}" class="premium-btn-assinar" style="background:${cores.forte};color:${cores.texto}">Assinar ${escapeHtml(plano.nome)} · ${formatarPreco(plano.preco_mensal)}/mês</a>`;
    }

    document.getElementById("premium-detalhe").innerHTML = `
        ${precoHtml}
        <p class="premium-tagline">${escapeHtml(plano.tagline)}</p>
        <ul class="premium-beneficios">${beneficiosHtml}</ul>
        ${acaoHtml}
    `;

    const btnCancelar = document.getElementById("btn-cancelar");
    if (btnCancelar) btnCancelar.addEventListener("click", confirmarCancelamento);
}

function confirmarCancelamento() {
    const folha = abrirFolha(`
        <p class="sheet-title">Cancelar assinatura?</p>
        <p style="color:var(--muted-foreground);font-size:14px;margin-bottom:20px">Você volta para o plano Grátis imediatamente.</p>
        <button type="button" class="btn-primary" id="btn-confirmar-cancelar" style="background-image:none;background:var(--destructive)">Sim, cancelar</button>
        <button type="button" class="btn-secondary" id="btn-manter" style="width:100%;margin-top:8px">Manter assinatura</button>
    `);

    folha.conteudo.querySelector("#btn-manter").addEventListener("click", folha.fechar);
    folha.conteudo.querySelector("#btn-confirmar-cancelar").addEventListener("click", async () => {
        try {
            await apiFetch("/planos/cancelar", { method: "POST" });
            folha.fechar();
            mostrarToast("Assinatura cancelada");
            meuPlano = await apiFetch("/planos/me");
            selecionado = "gratis";
            render();
        } catch (e) {
            mostrarToast(e.message, "error");
        }
    });
}

document.querySelectorAll("#premium-selector button").forEach((btn) => {
    btn.addEventListener("click", () => {
        selecionado = btn.dataset.plano;
        render();
    });
});

async function carregar() {
    try {
        const [listaPlanos, planoAtualResp] = await Promise.all([apiFetch("/planos"), apiFetch("/planos/me")]);
        planos = listaPlanos;
        meuPlano = planoAtualResp;
        selecionado = meuPlano.plano.chave === "gratis" ? "gold" : meuPlano.plano.chave;
        render();
    } catch (e) {
        document.getElementById("premium-detalhe").innerHTML = `<p class="error">${escapeHtml(e.message)}</p>`;
    }
}

carregar();
