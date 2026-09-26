exigirLogin();

const usuario = getUsuario();
const estado = {
    nome: usuario?.nome || "",
    telefone: "",
    idade: 18,
    cpf: "",
    genero: null,
    orientacao_sexual: "",
    procurando: null,
    aberto_a: [],
    mostrar_para: [],
    nivel: null,
    quando_treina: [],
    modalidades: [],
    divisao_treino: "",
    interesses: "",
    academia_id: null,
    bio: "",
    foto: null,
};

document.getElementById("ob-nome").value = estado.nome;

// ---------- pills ----------
function configurarGrupo(id, chave) {
    const grupo = document.getElementById(id);
    const single = grupo.dataset.single === "true";

    grupo.addEventListener("click", (evento) => {
        const pill = evento.target.closest(".pill");
        if (!pill) return;
        const valor = pill.dataset.value;

        if (single) {
            grupo.querySelectorAll(".pill").forEach((p) => p.classList.remove("selected"));
            pill.classList.add("selected");
            estado[chave] = valor;
        } else {
            pill.classList.toggle("selected");
            const lista = estado[chave];
            const idx = lista.indexOf(valor);
            if (idx === -1) lista.push(valor);
            else lista.splice(idx, 1);
        }
    });
}

configurarGrupo("ob-genero", "genero");
configurarGrupo("ob-procurando", "procurando");
configurarGrupo("ob-aberto-a", "aberto_a");
configurarGrupo("ob-mostrar-para", "mostrar_para");
configurarGrupo("ob-nivel", "nivel");
configurarGrupo("ob-quando-treina", "quando_treina");
configurarGrupo("ob-modalidades", "modalidades");

// ---------- navegação entre etapas ----------
const totalEtapas = 4;
let etapaAtual = 1;

function atualizarProgresso() {
    document.querySelectorAll(".progress-seg").forEach((seg) => {
        seg.classList.toggle("filled", Number(seg.dataset.step) <= etapaAtual);
    });
}

function irPara(etapa) {
    document.getElementById(`step-${etapaAtual}`).hidden = true;
    etapaAtual = etapa;
    document.getElementById(`step-${etapaAtual}`).hidden = false;
    atualizarProgresso();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

atualizarProgresso();

document.getElementById("btn-step1-next").addEventListener("click", () => {
    estado.nome = document.getElementById("ob-nome").value.trim();
    estado.telefone = document.getElementById("ob-telefone").value.trim();
    estado.idade = Number(document.getElementById("ob-idade").value) || null;
    estado.cpf = document.getElementById("ob-cpf").value.trim();
    estado.orientacao_sexual = document.getElementById("ob-orientacao").value.trim();

    if (!estado.nome) return alert("Preencha seu nome completo.");
    if (!estado.idade || estado.idade < 18) return alert("Você precisa ter 18 anos ou mais.");
    if (!estado.genero) return alert("Selecione um gênero.");

    irPara(2);
});

document.getElementById("btn-step2-back").addEventListener("click", () => irPara(1));
document.getElementById("btn-step2-next").addEventListener("click", () => {
    if (!estado.procurando) return alert("Selecione o que você está procurando.");
    irPara(3);
});

document.getElementById("btn-step3-back").addEventListener("click", () => irPara(2));
document.getElementById("btn-step3-next").addEventListener("click", () => {
    estado.divisao_treino = document.getElementById("ob-divisao").value.trim();
    estado.interesses = document.getElementById("ob-interesses").value.trim();

    if (!estado.nivel) return alert("Selecione seu nível de treino.");
    irPara(4);
});

document.getElementById("btn-step4-back").addEventListener("click", () => irPara(3));

// ---------- etapa 4: academia + foto ----------
const erroEl = document.getElementById("erro");
const academiaSelect = document.getElementById("ob-academia");

async function carregarAcademias() {
    const academias = await apiFetch("/academias");
    academiaSelect.insertAdjacentHTML(
        "beforeend",
        academias.map((a) => `<option value="${a.id}">${a.nome}</option>`).join("")
    );
    if (usuario?.academia_id) {
        academiaSelect.value = usuario.academia_id;
    }
}
carregarAcademias().catch((e) => (erroEl.textContent = e.message));

document.getElementById("ob-foto").addEventListener("change", (evento) => {
    estado.foto = evento.target.files[0] || null;
});

async function enviarFoto() {
    if (!estado.foto) return;
    const formData = new FormData();
    formData.append("arquivo", estado.foto);
    const resposta = await fetch(`${API_BASE_URL}/perfil/me/foto`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
    });
    if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        throw new Error((dados && dados.detail) || "Não foi possível enviar a foto");
    }
}

document.getElementById("btn-concluir").addEventListener("click", async () => {
    erroEl.textContent = "";
    estado.bio = document.getElementById("ob-bio").value.trim();
    estado.academia_id = Number(academiaSelect.value) || null;
    const termosAceitos = document.getElementById("ob-termos").checked;

    if (!estado.academia_id) return (erroEl.textContent = "Selecione uma academia.");
    if (!termosAceitos) return (erroEl.textContent = "É preciso aceitar os termos para continuar.");

    const botao = document.getElementById("btn-concluir");
    botao.disabled = true;
    botao.textContent = "Concluindo...";

    try {
        await apiFetch("/auth/me", {
            method: "PUT",
            body: JSON.stringify({ nome: estado.nome }),
        });

        await apiFetch("/perfil/me", {
            method: "PUT",
            body: JSON.stringify({
                bio: estado.bio,
                objetivo: "outro",
                nivel: estado.nivel,
                modalidades: estado.modalidades,
                idade: estado.idade,
                telefone: estado.telefone,
                cpf: estado.cpf,
                genero: estado.genero,
                orientacao_sexual: estado.orientacao_sexual,
                procurando: estado.procurando,
                aberto_a: estado.aberto_a,
                mostrar_para: estado.mostrar_para,
                quando_treina: estado.quando_treina,
                divisao_treino: estado.divisao_treino,
                interesses: estado.interesses
                    .split(",")
                    .map((i) => i.trim())
                    .filter(Boolean),
                aceitar_termos: true,
            }),
        });

        await apiFetch(`/academias/${estado.academia_id}/entrar`, { method: "POST" });
        await enviarFoto();

        usuario.nome = estado.nome;
        usuario.academia_id = estado.academia_id;
        setUsuario(usuario);

        window.location.href = "discover.html";
    } catch (e) {
        erroEl.textContent = e.message;
        botao.disabled = false;
        botao.textContent = "Concluir";
    }
});
