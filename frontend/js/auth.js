const formLogin = document.getElementById("form-login");
const formCadastro = document.getElementById("form-cadastro");
const erroEl = document.getElementById("erro");

document.getElementById("tab-login").addEventListener("click", () => {
    formLogin.style.display = "block";
    formCadastro.style.display = "none";
    erroEl.textContent = "";
});

document.getElementById("tab-cadastro").addEventListener("click", () => {
    formLogin.style.display = "none";
    formCadastro.style.display = "block";
    erroEl.textContent = "";
});

formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    erroEl.textContent = "";

    const email = document.getElementById("login-email").value;
    const senha = document.getElementById("login-senha").value;

    try {
        const dados = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, senha }),
        });
        setToken(dados.token);
        setUsuario(dados.usuario);
        window.location.href = "discover.html";
    } catch (e) {
        erroEl.textContent = e.message;
    }
});

formCadastro.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    erroEl.textContent = "";

    const nome = document.getElementById("cad-nome").value;
    const email = document.getElementById("cad-email").value;
    const senha = document.getElementById("cad-senha").value;

    try {
        await apiFetch("/auth/cadastro", {
            method: "POST",
            body: JSON.stringify({ nome, email, senha }),
        });
        const dados = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, senha }),
        });
        setToken(dados.token);
        setUsuario(dados.usuario);
        window.location.href = "onboarding.html";
    } catch (e) {
        erroEl.textContent = e.message;
    }
});

if (getToken()) {
    window.location.href = "discover.html";
}
