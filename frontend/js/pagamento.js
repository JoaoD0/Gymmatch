exigirLogin();

const params = new URLSearchParams(window.location.search);
const chavePlano = params.get("plano");

if (chavePlano !== "gold" && chavePlano !== "diamond") {
    window.location.href = "premium.html";
}

const CORES_PLANO = {
    gold: { cor: "var(--gold)", forte: "var(--gold-strong)", texto: "#16161a", icone: ICONS.crown },
    diamond: { cor: "var(--diamond)", forte: "var(--diamond-strong)", texto: "#ffffff", icone: ICONS.sparkles },
};

document.getElementById("btn-voltar").addEventListener("click", () => (window.location.href = "premium.html"));

function formatarPreco(valor) {
    return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

let plano = null;

async function carregarPlano() {
    try {
        const planos = await apiFetch("/planos");
        plano = planos.find((p) => p.chave === chavePlano);
        if (!plano) {
            window.location.href = "premium.html";
            return;
        }

        const cores = CORES_PLANO[chavePlano];
        document.getElementById("pag-plano-card").innerHTML = `
            <div class="pag-card" style="
                background: linear-gradient(135deg, color-mix(in oklch, ${cores.cor} 20%, transparent), color-mix(in oklch, ${cores.cor} 5%, transparent));
                border-color: color-mix(in oklch, ${cores.cor} 40%, transparent);
            ">
                <div class="pag-card-icone" style="background:color-mix(in oklch, ${cores.cor} 12%, transparent); color:${cores.cor}">${cores.icone}</div>
                <p class="pag-card-nome">Plano ${escapeHtml(plano.nome)}</p>
                <p class="pag-card-preco">${formatarPreco(plano.preco_mensal)}/mês · cobrado mensalmente</p>
                ${plano.beneficios
                    .map(
                        (b) => `<div class="pag-card-beneficio" style="color:${cores.cor}">${ICONS.zap}<span style="color:var(--foreground)">${escapeHtml(b)}</span></div>`
                    )
                    .join("")}
            </div>
        `;

        document.getElementById("pag-aviso").hidden = false;
        document.getElementById("pag-aviso").innerHTML = `${ICONS.info}<span>Modo demonstração — nenhuma cobrança real é feita.</span>`;

        const btn = document.getElementById("btn-assinar");
        btn.style.background = cores.forte;
        btn.style.color = cores.texto;
        btn.textContent = `Assinar ${plano.nome} — ${formatarPreco(plano.preco_mensal)}/mês`;

        document.querySelectorAll(".pag-selo")[0].innerHTML = `${ICONS.shieldCheck}<p>Dados do cartão não são armazenados</p>`;
        document.querySelectorAll(".pag-selo")[1].innerHTML = `${ICONS.refreshCcw}<p>Cancele quando quiser</p>`;
        document.querySelectorAll(".pag-selo")[2].innerHTML = `${ICONS.zap}<p>Ativação imediata</p>`;

        document.getElementById("form-pagamento").hidden = false;
    } catch (e) {
        document.getElementById("pag-plano-card").innerHTML = `<p class="error">${escapeHtml(e.message)}</p>`;
    }
}

// ---------- validação de cartão ----------
function luhnValido(numero) {
    const digitos = numero.replace(/\D/g, "");
    if (digitos.length < 12) return false;
    let soma = 0;
    let dobrar = false;
    for (let i = digitos.length - 1; i >= 0; i--) {
        let d = Number(digitos[i]);
        if (dobrar) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        soma += d;
        dobrar = !dobrar;
    }
    return soma % 10 === 0;
}

function detectarBandeira(numeroDigitos) {
    if (/^4/.test(numeroDigitos)) return "Visa";
    if (/^(5[1-5]|22[2-9][1-9]|2[3-6]\d{2}|27[01]\d|2720)/.test(numeroDigitos)) return "Mastercard";
    if (/^(34|37)/.test(numeroDigitos)) return "Amex";
    if (/^(636368|438935|504175|451416|636297)/.test(numeroDigitos)) return "Elo";
    return numeroDigitos.length >= 6 ? "Outro" : "";
}

const inputNumero = document.getElementById("pag-numero");
inputNumero.addEventListener("input", (evento) => {
    const digitos = evento.target.value.replace(/\D/g, "").slice(0, 19);
    evento.target.value = digitos.replace(/(\d{4})(?=\d)/g, "$1 ");
    document.getElementById("pag-bandeira").textContent = detectarBandeira(digitos);
});

const inputValidade = document.getElementById("pag-validade");
inputValidade.addEventListener("input", (evento) => {
    let v = evento.target.value.replace(/\D/g, "").slice(0, 4);
    if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    evento.target.value = v;
});

function limparErros() {
    document.querySelectorAll(".error").forEach((el) => (el.textContent = ""));
}

function mostrarErro(campoId, mensagem) {
    const el = document.getElementById(`erro-${campoId}`);
    if (el) el.textContent = mensagem;
}

function validarFormulario() {
    limparErros();
    let ok = true;

    const nome = document.getElementById("pag-nome").value.trim();
    const numeroDigitos = document.getElementById("pag-numero").value.replace(/\D/g, "");
    const validade = document.getElementById("pag-validade").value;
    const cvv = document.getElementById("pag-cvv").value;

    if (!nome) {
        mostrarErro("pag-nome", "Informe o nome impresso no cartão.");
        ok = false;
    }

    if (numeroDigitos.length < 13 || !luhnValido(numeroDigitos)) {
        mostrarErro("pag-numero", "Número de cartão inválido.");
        ok = false;
    }

    const partesValidade = validade.split("/");
    const mes = Number(partesValidade[0]);
    const ano = Number(partesValidade[1]);
    if (validade.length !== 5 || !mes || mes < 1 || mes > 12 || !ano) {
        mostrarErro("pag-validade", "Validade inválida.");
        ok = false;
    } else {
        const agora = new Date();
        const anoAtual = agora.getFullYear() % 100;
        const mesAtual = agora.getMonth() + 1;
        if (ano < anoAtual || (ano === anoAtual && mes < mesAtual)) {
            mostrarErro("pag-validade", "Cartão vencido.");
            ok = false;
        }
    }

    if (!/^\d{3,4}$/.test(cvv)) {
        mostrarErro("pag-cvv", "CVV inválido.");
        ok = false;
    }

    return ok ? { numeroDigitos } : null;
}

function aguardar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

document.getElementById("form-pagamento").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = validarFormulario();
    if (!dados) return;

    const btn = document.getElementById("btn-assinar");
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="pag-spinner">${ICONS.loader}</span> Processando...`;

    try {
        await aguardar(1200);

        const cartaoFinal = dados.numeroDigitos.slice(-4);
        const cartaoBandeira = detectarBandeira(dados.numeroDigitos) || "outro";

        await apiFetch("/planos/assinar", {
            method: "POST",
            body: JSON.stringify({ plano: chavePlano, cartao_final: cartaoFinal, cartao_bandeira: cartaoBandeira }),
        });

        window.location.href = `pagamento-sucesso.html?plano=${chavePlano}`;
    } catch (e) {
        mostrarToast(e.message, "error");
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
});

carregarPlano();
