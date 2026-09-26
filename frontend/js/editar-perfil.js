exigirLogin();

const usuarioLocal = getUsuario();
let perfil = null;
let academias = [];
let academiaSelecionadaId = usuarioLocal?.academia_id || null;
let interesses = [];

const form = document.getElementById("form-editar");
const carregandoEl = document.getElementById("ep-carregando");

document.getElementById("btn-voltar").addEventListener("click", () => (window.location.href = "perfil.html"));

// ---------- pills (reaproveita o padrão do onboarding) ----------
function configurarGrupo(id, aoMudar) {
    const grupo = document.getElementById(id);
    const single = grupo.dataset.single === "true";

    grupo.addEventListener("click", (evento) => {
        const pill = evento.target.closest(".pill");
        if (!pill) return;
        const valor = pill.dataset.value;

        if (single) {
            const jaSelecionado = pill.classList.contains("selected");
            grupo.querySelectorAll(".pill").forEach((p) => p.classList.remove("selected"));
            if (!jaSelecionado) pill.classList.add("selected");
            aoMudar(jaSelecionado ? null : valor);
        } else {
            pill.classList.toggle("selected");
            aoMudar();
        }
    });
}

function valoresSelecionados(id) {
    return Array.from(document.querySelectorAll(`#${id} .pill.selected`)).map((p) => p.dataset.value);
}

function valorUnicoSelecionado(id) {
    const pill = document.querySelector(`#${id} .pill.selected`);
    return pill ? pill.dataset.value : null;
}

function marcarPills(id, valores) {
    const set = new Set(Array.isArray(valores) ? valores : valores ? [valores] : []);
    document.querySelectorAll(`#${id} .pill`).forEach((p) => p.classList.toggle("selected", set.has(p.dataset.value)));
}

configurarGrupo("ep-modalidades", () => {});
configurarGrupo("ep-objetivo", () => {});
configurarGrupo("ep-procurando", () => {});
configurarGrupo("ep-aberto-a", () => {});
configurarGrupo("ep-quando-treina", () => {});

// ---------- interesses (chips) ----------
function renderChips() {
    const el = document.getElementById("ep-chips");
    el.innerHTML = interesses
        .map(
            (i, idx) => `
        <span class="ep-chip">
            ${escapeHtml(i)}
            <button type="button" data-remover="${idx}" aria-label="Remover">${ICONS.x}</button>
        </span>
    `
        )
        .join("");
    document.getElementById("ep-interesses-contagem").textContent = `${interesses.length}/5`;

    el.querySelectorAll("[data-remover]").forEach((btn) =>
        btn.addEventListener("click", () => {
            interesses.splice(Number(btn.dataset.remover), 1);
            renderChips();
        })
    );
}

function adicionarInteresse() {
    const input = document.getElementById("ep-interesse-novo");
    const valor = input.value.trim();
    if (!valor) return;
    if (interesses.length >= 5) return mostrarToast("Máximo de 5 interesses", "error");
    if (interesses.some((i) => i.toLowerCase() === valor.toLowerCase())) return mostrarToast("Esse interesse já foi adicionado", "error");

    interesses.push(valor);
    input.value = "";
    renderChips();
}

document.getElementById("ep-interesse-add").addEventListener("click", adicionarInteresse);
document.getElementById("ep-interesse-novo").addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
        evento.preventDefault();
        adicionarInteresse();
    }
});

// ---------- academia ----------
function renderAcademias() {
    const termo = document.getElementById("ep-academia-busca").value.trim().toLowerCase();
    const filtradas = academias.filter(
        (a) => a.nome.toLowerCase().includes(termo) || (a.endereco || "").toLowerCase().includes(termo)
    );

    const el = document.getElementById("ep-academia-lista");
    el.innerHTML = filtradas
        .map(
            (a) => `
        <div class="ep-academia-item ${academiaSelecionadaId === a.id ? "selecionada" : ""}" data-academia-id="${a.id}">
            <span class="ep-academia-check">${ICONS.check}</span>
            <div>
                <div class="ep-academia-nome">${escapeHtml(a.nome)}</div>
                ${a.endereco ? `<div class="ep-academia-endereco">${escapeHtml(a.endereco)}</div>` : ""}
            </div>
        </div>
    `
        )
        .join("");

    el.querySelectorAll("[data-academia-id]").forEach((item) =>
        item.addEventListener("click", () => {
            academiaSelecionadaId = Number(item.dataset.academiaId);
            document.getElementById("ep-academia-erro").textContent = "";
            renderAcademias();
        })
    );
}

document.getElementById("ep-academia-busca").addEventListener("input", renderAcademias);

// ---------- campos somente leitura ----------
function renderReadonly() {
    const campos = [
        { label: "Email", valor: usuarioLocal.email },
        { label: "CPF", valor: perfil.cpf || "—" },
        { label: "Telefone", valor: perfil.telefone || "—" },
        { label: "Idade", valor: perfil.idade ? `${perfil.idade} anos` : "—" },
    ];
    document.getElementById("ep-readonly-grid").innerHTML = campos
        .map(
            (c) => `
        <div class="ep-readonly-field">
            ${ICONS.lock}
            <div>
                <span class="ep-readonly-label">${c.label}</span>
                <span class="ep-readonly-valor">${escapeHtml(c.valor)}</span>
            </div>
        </div>
    `
        )
        .join("");
}

// ---------- carregar ----------
async function carregar() {
    try {
        const [perfilResp, academiasResp] = await Promise.all([apiFetch("/perfil/me"), apiFetch("/academias")]);
        perfil = perfilResp || {};
        academias = academiasResp;

        document.getElementById("ep-nome").value = usuarioLocal.nome || "";
        document.getElementById("ep-genero").value = perfil.genero || "masculino";
        document.getElementById("ep-orientacao").value = perfil.orientacao_sexual || "";
        document.getElementById("ep-ocultar-orientacao").checked = !!perfil.ocultar_orientacao;
        document.getElementById("ep-nivel").value = perfil.nivel || "iniciante";
        document.getElementById("ep-divisao").value = perfil.divisao_treino || "";
        document.getElementById("ep-pr-supino").value = perfil.pr_supino ?? "";
        document.getElementById("ep-pr-agachamento").value = perfil.pr_agachamento ?? "";
        document.getElementById("ep-pr-terra").value = perfil.pr_terra ?? "";
        document.getElementById("ep-ocultar-horarios").checked = !!perfil.ocultar_horarios;
        document.getElementById("ep-bio").value = perfil.bio || "";

        marcarPills("ep-modalidades", perfil.modalidades || []);
        marcarPills("ep-objetivo", perfil.objetivo || null);
        marcarPills("ep-procurando", perfil.procurando || "amizade");
        marcarPills("ep-aberto-a", perfil.aberto_a || []);
        marcarPills("ep-quando-treina", perfil.quando_treina || []);

        interesses = [...(perfil.interesses || [])];
        renderChips();
        renderAcademias();
        renderReadonly();

        carregandoEl.hidden = true;
        form.hidden = false;
    } catch (e) {
        carregandoEl.textContent = "Não foi possível carregar seu perfil. " + e.message;
    }
}

// ---------- salvar ----------
document.getElementById("btn-salvar").addEventListener("click", async () => {
    const btn = document.getElementById("btn-salvar");
    const nome = document.getElementById("ep-nome").value.trim();
    const nomeErroEl = document.getElementById("ep-nome-erro");
    const academiaErroEl = document.getElementById("ep-academia-erro");
    nomeErroEl.textContent = "";
    academiaErroEl.textContent = "";

    if (!nome) {
        nomeErroEl.textContent = "O nome não pode ficar vazio.";
        return;
    }
    if (nome.length > 60) {
        nomeErroEl.textContent = "O nome pode ter no máximo 60 caracteres.";
        return;
    }
    if (!academiaSelecionadaId) {
        academiaErroEl.textContent = "Selecione uma academia.";
        return;
    }

    btn.disabled = true;
    btn.textContent = "Salvando…";

    try {
        await apiFetch("/auth/me", { method: "PUT", body: JSON.stringify({ nome }) });

        // objetivo do treino: o enum do banco não aceita "sem valor" — usa "outro" quando desmarcado
        const objetivoSelecionado = valorUnicoSelecionado("ep-objetivo") || "outro";
        const procurandoSelecionado = valorUnicoSelecionado("ep-procurando") || "amizade";

        await apiFetch("/perfil/me", {
            method: "PUT",
            body: JSON.stringify({
                bio: document.getElementById("ep-bio").value.trim(),
                objetivo: objetivoSelecionado,
                nivel: document.getElementById("ep-nivel").value,
                modalidades: valoresSelecionados("ep-modalidades"),
                idade: perfil.idade,
                telefone: perfil.telefone,
                cpf: perfil.cpf,
                genero: document.getElementById("ep-genero").value,
                orientacao_sexual: document.getElementById("ep-orientacao").value,
                procurando: procurandoSelecionado,
                aberto_a: valoresSelecionados("ep-aberto-a"),
                mostrar_para: perfil.mostrar_para || [],
                quando_treina: valoresSelecionados("ep-quando-treina"),
                divisao_treino: document.getElementById("ep-divisao").value,
                interesses,
                aceitar_termos: !!perfil.termos_aceitos_em,
                ocultar_objetivo: !!perfil.ocultar_objetivo,
                ocultar_orientacao: document.getElementById("ep-ocultar-orientacao").checked,
                ocultar_horarios: document.getElementById("ep-ocultar-horarios").checked,
                pr_supino: document.getElementById("ep-pr-supino").value ? Number(document.getElementById("ep-pr-supino").value) : null,
                pr_agachamento: document.getElementById("ep-pr-agachamento").value
                    ? Number(document.getElementById("ep-pr-agachamento").value)
                    : null,
                pr_terra: document.getElementById("ep-pr-terra").value ? Number(document.getElementById("ep-pr-terra").value) : null,
            }),
        });

        if (academiaSelecionadaId !== usuarioLocal.academia_id) {
            await apiFetch(`/academias/${academiaSelecionadaId}/entrar`, { method: "POST" });
        }

        usuarioLocal.nome = nome;
        usuarioLocal.academia_id = academiaSelecionadaId;
        setUsuario(usuarioLocal);

        mostrarToast("Perfil atualizado com sucesso");
        window.location.href = "perfil.html";
    } catch (e) {
        mostrarToast(e.message, "error");
        btn.disabled = false;
        btn.textContent = "Salvar";
    }
});

carregar();
