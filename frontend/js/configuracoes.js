/* Folha de Configurações do Perfil (me.tsx original, linhas 750–1039).
   Uso: abrirConfiguracoes({ getPerfil, getUsuario, salvarPerfilParcial, aoAtualizar }) */

const IDADE_MIN = 18;
const IDADE_MAX = 60;
const CHAVE_IDADE_MIN = "disc_min_age";
const CHAVE_IDADE_MAX = "disc_max_age";

function lerNumeroSalvo(chave, padrao) {
    try {
        return Number(localStorage.getItem(chave)) || padrao;
    } catch {
        return padrao;
    }
}

function pilulaPlanoHtml(plano) {
    const PILULAS = {
        diamond: { rotulo: "Diamond", classe: "diamond" },
        gold: { rotulo: "Gold", classe: "gold" },
    };
    const p = PILULAS[plano] || { rotulo: "Free", classe: "free" };
    return `<span class="cfg-pilula-plano ${p.classe}">${p.rotulo}</span>`;
}

function interruptorHtml(id, ligado, rotuloAcessivel) {
    return `
        <span class="switch">
            <input type="checkbox" role="switch" id="${id}" aria-checked="${ligado}" aria-label="${rotuloAcessivel}" ${ligado ? "checked" : ""} />
            <span class="track"><span class="thumb"></span></span>
        </span>`;
}

function textosLinha(titulo, subtitulo, extraClasse = "") {
    return `
        <div class="cfg-textos">
            <p class="cfg-rotulo ${extraClasse}">${titulo}</p>
            ${subtitulo ? `<p class="cfg-sub ${extraClasse}">${subtitulo}</p>` : ""}
        </div>`;
}

const SETA = `<span class="cfg-seta">${ICONS.chevronRight}</span>`;

function abrirConfiguracoes(ctx) {
    const perfil = ctx.getPerfil();
    const usuario = ctx.getUsuario();
    const pausado = usuario.status === "pausado";
    const faixaSalva = { min: lerNumeroSalvo(CHAVE_IDADE_MIN, IDADE_MIN), max: lerNumeroSalvo(CHAVE_IDADE_MAX, IDADE_MAX) };
    const faixa = { ...faixaSalva };
    let estadoNotif = window.estadoNotificacoes ? estadoNotificacoes() : "indisponivel";
    let ativandoNotif = false;

    const folha = abrirFolha(`
        <p class="cfg-titulo-folha">Configurações</p>

        <p class="cfg-secao">Conta</p>
        <a class="cfg-linha" href="premium.html">
            <span class="cfg-icone ambar">${ICONS.crown}</span>
            ${textosLinha("Plano atual")}
            ${pilulaPlanoHtml(perfil.plano)}
            ${SETA}
        </a>
        <a class="cfg-linha" href="editar-perfil.html">
            <span class="cfg-icone">${ICONS.pencilLine}</span>
            ${textosLinha("Editar perfil")}
            ${SETA}
        </a>
        <div class="cfg-linha estatica">
            <span class="cfg-icone">${ICONS.mail}</span>
            <div class="cfg-textos">
                <p class="cfg-email-rotulo">Email</p>
                <p class="cfg-email">${escapeHtml(usuario.email)}</p>
            </div>
        </div>

        <div class="cfg-divisoria"></div>

        <p class="cfg-secao">Privacidade</p>
        <label class="cfg-linha">
            <span class="cfg-icone">${ICONS.target}</span>
            ${textosLinha("Ocultar objetivo", "Amizade, parceiro ou romance — fica só pra você")}
            ${interruptorHtml("cfg-ocultar-objetivo", !!perfil.ocultar_objetivo, "Ocultar objetivo")}
        </label>
        <button type="button" class="cfg-linha" id="cfg-pausar">
            <span class="cfg-icone ${pausado ? "verde" : ""}">${pausado ? ICONS.play : ICONS.pause}</span>
            ${pausado
                ? textosLinha("Reativar conta", "Volta a aparecer no Discover")
                : textosLinha("Pausar conta", "Você some do Discover temporariamente")}
        </button>

        <div class="cfg-divisoria"></div>

        <p class="cfg-secao">Descoberta</p>
        <div class="cfg-descoberta">
            <div>
                <div class="cfg-desc-cabeca">
                    <p class="cfg-desc-titulo">Faixa etária</p>
                    <span class="cfg-desc-valor" id="cfg-faixa-valor"></span>
                </div>
                <div class="cfg-slider">
                    <div class="cfg-slider-trilho"></div>
                    <div class="cfg-slider-faixa" id="cfg-slider-faixa"></div>
                    <input type="range" id="cfg-idade-min" min="${IDADE_MIN}" max="${IDADE_MAX}" value="${faixa.min}" aria-label="Idade mínima" />
                    <input type="range" id="cfg-idade-max" min="${IDADE_MIN}" max="${IDADE_MAX}" value="${faixa.max}" aria-label="Idade máxima" />
                </div>
                <div class="cfg-desc-extremos"><span>18</span><span>60+</span></div>
            </div>
            <div class="cfg-em-breve" aria-disabled="true">
                <div class="cfg-desc-cabeca">
                    <p class="cfg-desc-titulo">Distância máxima</p>
                    <span class="cfg-em-breve-tag">Em breve</span>
                </div>
                <div class="cfg-slider-trilho estatico"></div>
                <div class="cfg-desc-extremos"><span>5 km</span><span>100 km</span></div>
            </div>
            <button type="button" class="cfg-salvar" id="cfg-salvar-faixa" hidden>Salvar preferências</button>
        </div>

        <div class="cfg-divisoria"></div>

        <p class="cfg-secao">Notificações</p>
        <div id="cfg-notificacoes"></div>

        <div class="cfg-divisoria"></div>

        <p class="cfg-secao">Ajuda</p>
        <a class="cfg-linha" href="lucia.html">
            <span class="cfg-lucia-mini">Lú</span>
            ${textosLinha("Lucia", "Tire dúvidas sobre o app")}
            ${SETA}
        </a>
        <label class="cfg-linha">
            <span class="cfg-icone vazio"></span>
            ${textosLinha("Quer a Lucia por perto?", "Aparece em todas as telas como botão flutuante")}
            ${interruptorHtml("cfg-lucia-fab", window.Lucia ? Lucia.fabLigado() : true, "Mostrar botão flutuante da Lucia")}
        </label>
        <button type="button" class="cfg-linha" id="cfg-alterar-senha">
            <span class="cfg-icone">${ICONS.keyRound}</span>
            ${textosLinha("Alterar senha", "Troque sua senha de acesso")}
        </button>
        <a class="cfg-linha" id="cfg-feedback" href="mailto:suporte@gymmatch.app?subject=Feedback%20GymMatch">
            <span class="cfg-icone">${ICONS.messageCircle}</span>
            ${textosLinha("Enviar feedback")}
            ${SETA}
        </a>

        <div class="cfg-divisoria"></div>

        <button type="button" class="cfg-linha" id="cfg-sair">
            <span class="cfg-icone">${ICONS.logOut}</span>
            ${textosLinha("Sair")}
        </button>
        <button type="button" class="cfg-linha perigo" id="cfg-excluir">
            <span class="cfg-icone vermelho">${ICONS.trash2}</span>
            ${textosLinha("Excluir conta", "Apaga todos os dados permanentemente", "vermelho")}
        </button>

        <button type="button" class="cfg-cancelar" id="cfg-cancelar">Cancelar</button>
        <div class="cfg-links">
            <a href="termos.html">Termos de uso</a>
            <span>·</span>
            <a href="privacidade.html">Privacidade</a>
        </div>
        <p class="cfg-versao">GymMatch v1.0</p>
    `, { classe: "cfg-folha" });

    const $ = (seletor) => folha.conteudo.querySelector(seletor);

    // ---------- faixa etária ----------
    const inputMin = $("#cfg-idade-min");
    const inputMax = $("#cfg-idade-max");

    function atualizarFaixa() {
        const intervalo = IDADE_MAX - IDADE_MIN;
        const pctMin = ((faixa.min - IDADE_MIN) / intervalo) * 100;
        const pctMax = ((faixa.max - IDADE_MIN) / intervalo) * 100;
        $("#cfg-slider-faixa").style.left = `${pctMin}%`;
        $("#cfg-slider-faixa").style.right = `${100 - pctMax}%`;
        $("#cfg-faixa-valor").textContent = `${faixa.min}–${faixa.max} anos`;
        // perto do topo, o cursor do mínimo fica por cima para não ficar preso atrás do máximo
        inputMin.style.zIndex = faixa.min > IDADE_MAX - 10 ? 5 : 3;
        inputMax.style.zIndex = 4;
        $("#cfg-salvar-faixa").hidden = faixa.min === faixaSalva.min && faixa.max === faixaSalva.max;
    }

    inputMin.addEventListener("input", () => {
        faixa.min = Math.min(Number(inputMin.value), faixa.max - 1);
        inputMin.value = faixa.min;
        atualizarFaixa();
    });
    inputMax.addEventListener("input", () => {
        faixa.max = Math.max(Number(inputMax.value), faixa.min + 1);
        inputMax.value = faixa.max;
        atualizarFaixa();
    });
    $("#cfg-salvar-faixa").addEventListener("click", () => {
        try {
            localStorage.setItem(CHAVE_IDADE_MIN, faixa.min);
            localStorage.setItem(CHAVE_IDADE_MAX, faixa.max);
        } catch {
            mostrarToast("Não foi possível salvar neste navegador", "error");
            return;
        }
        faixaSalva.min = faixa.min;
        faixaSalva.max = faixa.max;
        atualizarFaixa();
        mostrarToast("Preferências salvas", "success");
    });
    atualizarFaixa();

    // ---------- notificações ----------
    function renderizarNotificacoes() {
        const estado = ativandoNotif ? "ativando" : estadoNotif;
        const SUBTITULOS = {
            ativando: "Ativando...",
            ativo: "Notificações ativadas",
            negado: "Bloqueado — habilite no navegador",
        };
        const permitido = "Notification" in window && Notification.permission === "granted";
        const pausadas = window.notificacoesPausadas ? notificacoesPausadas() : false;

        $("#cfg-notificacoes").innerHTML = `
            <button type="button" class="cfg-linha" id="cfg-notif" ${estado === "ativando" || estado === "ativo" ? "disabled" : ""}>
                <span class="cfg-icone ${estado === "negado" ? "vermelho" : ""}">${estado === "negado" ? ICONS.bellOff : ICONS.bell}</span>
                ${textosLinha("Notificações", SUBTITULOS[estado] || "Receba alertas de matches e mensagens")}
                ${estado === "ativo" ? `<span class="cfg-ativo">Ativo</span>` : ""}
            </button>
            ${permitido ? `
                <label class="cfg-linha">
                    <span class="cfg-icone vazio"></span>
                    ${textosLinha("Pausar notificações", "Silencia os avisos sem mudar a permissão do navegador")}
                    ${interruptorHtml("cfg-notif-pausar", pausadas, "Pausar notificações")}
                </label>` : ""}`;

        $("#cfg-notif").addEventListener("click", async () => {
            if (estadoNotif === "indisponivel") {
                mostrarToast("Notificações não suportadas neste navegador", "error");
                return;
            }
            if (estadoNotif === "negado") {
                mostrarToast("Libere as notificações nas configurações do navegador", "error");
                return;
            }
            ativandoNotif = true;
            renderizarNotificacoes();
            estadoNotif = await ativarNotificacoes();
            ativandoNotif = false;
            renderizarNotificacoes();
            if (estadoNotif === "ativo") mostrarToast("Notificações ativadas", "success");
        });

        const pausar = $("#cfg-notif-pausar");
        if (pausar) {
            pausar.addEventListener("change", () => {
                pausarNotificacoes(pausar.checked);
                estadoNotif = estadoNotificacoes();
                renderizarNotificacoes();
                mostrarToast(pausar.checked ? "Notificações pausadas" : "Notificações retomadas");
            });
        }
    }
    renderizarNotificacoes();

    // ---------- privacidade ----------
    const ocultar = $("#cfg-ocultar-objetivo");
    ocultar.addEventListener("change", async () => {
        const ligado = ocultar.checked;
        ocultar.setAttribute("aria-checked", ligado);
        ocultar.disabled = true;
        try {
            await ctx.salvarPerfilParcial({ ocultar_objetivo: ligado });
            ctx.aoAtualizar();
            mostrarToast(ligado ? "Objetivo ocultado" : "Objetivo visível");
        } catch (e) {
            ocultar.checked = !ligado;
            ocultar.setAttribute("aria-checked", !ligado);
            mostrarToast(e.message, "error");
        } finally {
            ocultar.disabled = false;
        }
    });

    $("#cfg-pausar").addEventListener("click", async () => {
        const usuarioAtual = ctx.getUsuario();
        const novoStatus = usuarioAtual.status === "pausado" ? "ativo" : "pausado";
        folha.fechar();
        try {
            const atualizado = await apiFetch("/auth/me/status", {
                method: "PUT",
                body: JSON.stringify({ status: novoStatus }),
            });
            usuarioAtual.status = atualizado.status;
            setUsuario(usuarioAtual);
            ctx.aoAtualizar();
            mostrarToast(novoStatus === "pausado" ? "Conta pausada" : "Conta reativada");
        } catch (e) {
            mostrarToast(e.message, "error");
        }
    });

    // ---------- ajuda / sessão ----------
    const fab = $("#cfg-lucia-fab");
    fab.addEventListener("change", () => {
        fab.setAttribute("aria-checked", fab.checked);
        if (window.Lucia) Lucia.setFabLigado(fab.checked);
    });

    $("#cfg-alterar-senha").addEventListener("click", () => {
        folha.fechar();
        abrirAlterarSenha();
    });
    $("#cfg-feedback").addEventListener("click", () => folha.fechar());
    $("#cfg-sair").addEventListener("click", () => {
        folha.fechar();
        logout();
    });
    $("#cfg-excluir").addEventListener("click", () => {
        folha.fechar();
        confirmarExclusao();
    });
    $("#cfg-cancelar").addEventListener("click", folha.fechar);
}

function abrirAlterarSenha() {
    const folha = abrirFolha(`
        <p class="sheet-title">Alterar senha</p>
        <label>Senha atual</label>
        <input type="password" id="senha-atual" />
        <label>Nova senha</label>
        <input type="password" id="senha-nova" />
        <label>Confirmar nova senha</label>
        <input type="password" id="senha-confirmar" />
        <p class="error" id="senha-erro"></p>
        <button class="btn-primary" id="btn-salvar-senha">Salvar nova senha</button>
        <button class="btn-secondary" id="btn-cancelar-senha" style="width:100%;margin-top:8px">Cancelar</button>
    `);

    folha.conteudo.querySelector("#btn-cancelar-senha").addEventListener("click", folha.fechar);
    folha.conteudo.querySelector("#btn-salvar-senha").addEventListener("click", async () => {
        const atual = folha.conteudo.querySelector("#senha-atual").value;
        const nova = folha.conteudo.querySelector("#senha-nova").value;
        const confirmar = folha.conteudo.querySelector("#senha-confirmar").value;
        const erroEl = folha.conteudo.querySelector("#senha-erro");
        erroEl.textContent = "";

        if (nova.length < 6) return (erroEl.textContent = "A nova senha precisa ter pelo menos 6 caracteres.");
        if (nova !== confirmar) return (erroEl.textContent = "As senhas não coincidem.");

        try {
            await apiFetch("/auth/me/senha", {
                method: "PUT",
                body: JSON.stringify({ senha_atual: atual, nova_senha: nova }),
            });
            folha.fechar();
            mostrarToast("Senha alterada com sucesso");
        } catch (e) {
            erroEl.textContent = e.message;
        }
    });
}

function confirmarExclusao() {
    const folha = abrirFolha(`
        <p class="sheet-title" style="color:var(--destructive)">Excluir conta?</p>
        <p style="color:var(--muted-foreground); font-size:14px; margin-bottom:20px">
            Isso apaga permanentemente sua conta, perfil, fotos, matches e mensagens. Essa ação não pode ser desfeita.
        </p>
        <button class="btn-primary" id="btn-confirmar-exclusao" style="background-image:none;background:var(--destructive)">Sim, excluir minha conta</button>
        <button class="btn-secondary" id="btn-cancelar-exclusao" style="width:100%;margin-top:8px">Cancelar</button>
    `);

    folha.conteudo.querySelector("#btn-cancelar-exclusao").addEventListener("click", folha.fechar);
    folha.conteudo.querySelector("#btn-confirmar-exclusao").addEventListener("click", async () => {
        try {
            await apiFetch("/auth/me", { method: "DELETE" });
            logout();
        } catch (e) {
            mostrarToast(e.message, "error");
        }
    });
}
