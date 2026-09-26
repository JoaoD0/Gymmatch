// "localhost" no Windows tenta o IPv6 primeiro e a API (uvicorn) só escuta IPv4: ~200 ms de atraso por chamada
const API_BASE_URL = `http://${location.hostname === "localhost" || !location.hostname ? "127.0.0.1" : location.hostname}:8000`;

function getToken() {
    return localStorage.getItem("gymmatch_token");
}

function setToken(token) {
    localStorage.setItem("gymmatch_token", token);
}

function setUsuario(usuario) {
    localStorage.setItem("gymmatch_usuario", JSON.stringify(usuario));
}

function getUsuario() {
    const raw = localStorage.getItem("gymmatch_usuario");
    return raw ? JSON.parse(raw) : null;
}

function logout() {
    localStorage.removeItem("gymmatch_token");
    localStorage.removeItem("gymmatch_usuario");
    try {
        sessionStorage.removeItem("gm-nav-foto");
    } catch { /* sem storage */ }
    window.location.href = "index.html";
}

function exigirLogin() {
    if (!getToken()) {
        window.location.href = "index.html";
    }
}

/** Token vencido ou inválido: limpa a sessão e volta ao login, em vez de deixar a tela presa num erro. */
function sairSeSessaoExpirou(resposta, caminho) {
    if (resposta.status === 401 && getToken() && !caminho.startsWith("/auth/login")) {
        logout();
    }
}

async function apiFetch(caminho, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const resposta = await fetch(`${API_BASE_URL}${caminho}`, { ...options, headers });
    sairSeSessaoExpirou(resposta, caminho);
    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        const detail = dados && dados.detail;
        // 403 com { motivo, mensagem } -> é um bloqueio de plano; a tela chama o modal de upgrade
        if (detail && typeof detail === "object" && detail.motivo) {
            const erro = new Error(detail.mensagem || "Essa ação não está disponível no seu plano.");
            erro.motivo = detail.motivo;
            throw erro;
        }
        throw new Error((typeof detail === "string" && detail) || "Erro inesperado");
    }
    return dados;
}

/** Envia um arquivo (multipart/form-data) para a API — usado em uploads de foto. */
async function apiFetchArquivo(caminho, campo, arquivo, options = {}) {
    const formData = new FormData();
    formData.append(campo, arquivo);
    const resposta = await fetch(`${API_BASE_URL}${caminho}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
        ...options,
    });
    sairSeSessaoExpirou(resposta, caminho);
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) {
        throw new Error((dados && dados.detail) || "Não foi possível enviar o arquivo");
    }
    return dados;
}

/** Escapa texto vindo do usuário antes de inserir via innerHTML (evita XSS). */
function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

/** Mostra uma notificação temporária no topo da tela. Use no lugar de alert(). */
function mostrarToast(texto, tipo = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.textContent = texto;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}
