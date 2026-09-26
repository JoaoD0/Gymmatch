/**
 * Abre uma folha (bottom sheet) com o HTML dado. Clicar fora fecha.
 * opcoes.classe: classe extra no overlay; opcoes.podeFechar(): retorne false para impedir o fechamento pelo clique fora.
 */
function abrirFolha(conteudoHtml, opcoes = {}) {
    const overlay = document.createElement("div");
    overlay.className = "sheet-overlay" + (opcoes.classe ? ` ${opcoes.classe}` : "");
    overlay.innerHTML = `
        <div class="sheet-panel">
            <div class="sheet-handle"></div>
            <div class="sheet-content">${conteudoHtml}</div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    function fechar() {
        overlay.remove();
        if (!document.querySelector(".sheet-overlay")) document.body.style.overflow = "";
    }

    overlay.addEventListener("click", (evento) => {
        if (evento.target !== overlay) return;
        if (opcoes.podeFechar && opcoes.podeFechar() === false) return;
        fechar();
    });

    return {
        overlay,
        painel: overlay.querySelector(".sheet-panel"),
        conteudo: overlay.querySelector(".sheet-content"),
        fechar,
    };
}
