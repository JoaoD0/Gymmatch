const FONTES_TEXTO = [
    { chave: "barlow", rotulo: "BOLD", family: "'Barlow Condensed', sans-serif", weight: 800 },
    { chave: "bebas", rotulo: "BEBAS", family: "'Bebas Neue', sans-serif", weight: 400 },
    { chave: "anton", rotulo: "ANTON", family: "'Anton', sans-serif", weight: 400 },
    { chave: "oswald", rotulo: "OSWALD", family: "'Oswald', sans-serif", weight: 700 },
    { chave: "montserrat", rotulo: "CLEAN", family: "'Montserrat', sans-serif", weight: 900 },
    { chave: "playfair", rotulo: "CLÁSSICO", family: "'Playfair Display', serif", weight: 700, italic: true },
    { chave: "syne", rotulo: "SYNE", family: "'Syne', sans-serif", weight: 800 },
    { chave: "marker", rotulo: "MARKER", family: "'Permanent Marker', cursive", weight: 400 },
];

const CORES_TEXTO = ["#ffffff", "#e85a4f", "#f07c45", "#fbbf24", "#000000", "#3b82f6", "#a855f7", "#22c55e", "#ec4899"];

const FILTROS = [
    { chave: "orig", rotulo: "ORIG", css: "none" },
    { chave: "vivid", rotulo: "VIVID", css: "saturate(1.6) contrast(1.1)" },
    { chave: "matte", rotulo: "MATTE", css: "contrast(0.9) brightness(0.95) saturate(0.7)" },
    { chave: "drama", rotulo: "DRAMA", css: "contrast(1.4) brightness(0.85) grayscale(0.3)" },
];

const TAGS_TREINO_UI = [
    { nome: "Novo PR!", icone: "trophy" },
    { nome: "Treino de hoje", icone: "dumbbell" },
    { nome: "Cardio", icone: "zap" },
    { nome: "Pernas", icone: "flame" },
    { nome: "Peito", icone: "dumbbell" },
    { nome: "Costas", icone: "dumbbell" },
    { nome: "Ombros", icone: "dumbbell" },
    { nome: "Braços", icone: "dumbbell" },
    { nome: "Funcional", icone: "timer" },
    { nome: "Dia de descanso", icone: "heart" },
];

function fonteDados(chave) {
    return FONTES_TEXTO.find((f) => f.chave === chave) || FONTES_TEXTO[0];
}

// ---------- interação genérica de arraste/pinça (Pointer Events — funciona com toque e mouse) ----------
function configurarFotoInteracao(areaEl, estado, aoMudar) {
    const pointers = new Map();
    let distInicial = null;
    let zoomInicial = null;
    let arrastando = false;
    let inicioArraste = null;
    let offsetInicial = null;

    areaEl.addEventListener("pointerdown", (e) => {
        areaEl.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.size === 1) {
            arrastando = estado.zoom > 1;
            inicioArraste = { x: e.clientX, y: e.clientY };
            offsetInicial = { x: estado.offsetX, y: estado.offsetY };
        } else if (pointers.size === 2) {
            const [p1, p2] = [...pointers.values()];
            distInicial = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            zoomInicial = estado.zoom;
            arrastando = false;
        }
    });

    areaEl.addEventListener("pointermove", (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.size === 2 && distInicial) {
            const [p1, p2] = [...pointers.values()];
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            estado.zoom = Math.min(5, Math.max(1, zoomInicial * (dist / distInicial)));
            aoMudar();
        } else if (pointers.size === 1 && arrastando) {
            const p = pointers.get(e.pointerId);
            estado.offsetX = offsetInicial.x + (p.x - inicioArraste.x);
            estado.offsetY = offsetInicial.y + (p.y - inicioArraste.y);
            aoMudar();
        }
    });

    function soltar(e) {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) distInicial = null;
        if (pointers.size === 0) {
            arrastando = false;
            if (estado.zoom <= 1) {
                estado.offsetX = 0;
                estado.offsetY = 0;
                aoMudar();
            }
        }
    }
    areaEl.addEventListener("pointerup", soltar);
    areaEl.addEventListener("pointercancel", soltar);

    areaEl.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.15 : -0.15;
            const novoZoom = Math.min(5, Math.max(1, estado.zoom + delta));
            estado.zoom = novoZoom;
            if (novoZoom <= 1) {
                estado.offsetX = 0;
                estado.offsetY = 0;
            }
            aoMudar();
        },
        { passive: false }
    );
}

function configurarStickerInteracao(elemento, areaEl, estado, { chaveX, chaveY, chaveEscala, escalaMin, escalaMax, ehEditando, aoMudar }) {
    const pointers = new Map();
    let arrastando = false;
    let inicioArraste = null;
    let posInicial = null;
    let distInicial = null;
    let escalaInicial = null;

    elemento.addEventListener("pointerdown", (e) => {
        if (ehEditando()) return;
        e.stopPropagation();
        elemento.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.size === 1) {
            arrastando = true;
            inicioArraste = { x: e.clientX, y: e.clientY };
            posInicial = { x: estado[chaveX], y: estado[chaveY] };
        } else if (pointers.size === 2 && chaveEscala) {
            const [p1, p2] = [...pointers.values()];
            distInicial = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            escalaInicial = estado[chaveEscala];
            arrastando = false;
        }
    });

    elemento.addEventListener("pointermove", (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.size === 2 && chaveEscala && distInicial) {
            const [p1, p2] = [...pointers.values()];
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            estado[chaveEscala] = Math.min(escalaMax, Math.max(escalaMin, escalaInicial * (dist / distInicial)));
            aoMudar();
        } else if (pointers.size === 1 && arrastando) {
            const rect = areaEl.getBoundingClientRect();
            const dxPct = ((e.clientX - inicioArraste.x) / rect.width) * 100;
            const dyPct = ((e.clientY - inicioArraste.y) / rect.height) * 100;
            estado[chaveX] = Math.min(92, Math.max(8, posInicial.x + dxPct));
            estado[chaveY] = Math.min(92, Math.max(8, posInicial.y + dyPct));
            aoMudar();
        }
    });

    function soltar(e) {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) distInicial = null;
        if (pointers.size === 0) arrastando = false;
    }
    elemento.addEventListener("pointerup", soltar);
    elemento.addEventListener("pointercancel", soltar);

    if (chaveEscala) {
        elemento.addEventListener(
            "wheel",
            (e) => {
                e.preventDefault();
                e.stopPropagation();
                const delta = e.deltaY < 0 ? 0.1 : -0.1;
                estado[chaveEscala] = Math.min(escalaMax, Math.max(escalaMin, estado[chaveEscala] + delta));
                aoMudar();
            },
            { passive: false }
        );
    }
}

// ---------- etapa 1: escolher a foto ----------
function abrirCriador() {
    _criadorAberto = true;

    const folha = abrirFolha(`
        <div class="mvc-sheet-header">
            <div class="mvc-sheet-icone">${ICONS.zap}</div>
            <p class="mvc-sheet-titulo">NOVO MOVE</p>
        </div>
        <p class="mvc-sheet-subtitulo">Compartilhe seu treino • some em 24h</p>

        <button type="button" class="mvc-opcao camera" id="mvc-opcao-camera">
            <div class="mvc-opcao-icone">${ICONS.camera}</div>
            <div>
                <div class="mvc-opcao-titulo">Câmera</div>
                <div class="mvc-opcao-desc">Tire uma foto agora</div>
            </div>
        </button>
        <button type="button" class="mvc-opcao" id="mvc-opcao-galeria">
            <div class="mvc-opcao-icone">${ICONS.image}</div>
            <div>
                <div class="mvc-opcao-titulo">Galeria</div>
                <div class="mvc-opcao-desc">Escolha da biblioteca</div>
            </div>
        </button>

        <input type="file" id="mvc-input-camera" accept="image/*" capture="environment" hidden />
        <input type="file" id="mvc-input-galeria" accept="image/*" hidden />
    `);

    folha.painel.style.background = "oklch(0.14 0.013 280)";
    folha.painel.style.borderTop = "1px solid color-mix(in oklch, var(--primary) 12%, transparent)";

    folha.overlay.addEventListener("click", (e) => {
        if (e.target === folha.overlay) _criadorAberto = false;
    });

    const inputCamera = folha.conteudo.querySelector("#mvc-input-camera");
    const inputGaleria = folha.conteudo.querySelector("#mvc-input-galeria");
    folha.conteudo.querySelector("#mvc-opcao-camera").addEventListener("click", () => inputCamera.click());
    folha.conteudo.querySelector("#mvc-opcao-galeria").addEventListener("click", () => inputGaleria.click());

    function tratarArquivo(evento) {
        const arquivo = evento.target.files[0];
        if (!arquivo) return;
        if (arquivo.size > 10 * 1024 * 1024) {
            mostrarToast("Máximo 10 MB", "error");
            evento.target.value = "";
            return;
        }
        folha.fechar();
        abrirEditor(arquivo);
    }
    inputCamera.addEventListener("change", tratarArquivo);
    inputGaleria.addEventListener("change", tratarArquivo);
}

// ---------- etapa 2: editor ----------
function abrirEditor(arquivo) {
    _criadorAberto = true;
    const fotoUrl = URL.createObjectURL(arquivo);

    const estado = {
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        texto: "",
        textoVisivel: false,
        textoX: 50,
        textoY: 30,
        textoEscala: 1,
        fonte: FONTES_TEXTO[0].chave,
        cor: "#ffffff",
        alinhamento: "center",
        tag: null,
        tagX: 50,
        tagY: 82,
        filtroChave: "orig",
        painelAberto: null,
    };

    const overlay = document.createElement("div");
    overlay.className = "mvc-editor";
    overlay.innerHTML = `
        <div class="mvc-area-wrap" id="mvc-area-wrap">
            <div class="mvc-area" id="mvc-area">
                <img class="mvc-foto" id="mvc-foto" src="${fotoUrl}" alt="" draggable="false" />
                <div class="mvc-area-gradiente"></div>
                <div id="mvc-texto-area"></div>
                <div id="mvc-tag-area"></div>
            </div>
            <div class="mvc-topbar">
                <button type="button" class="mvc-voltar" id="mvc-voltar">${ICONS.x} MOVES</button>
                <button type="button" class="mvc-postar" id="mvc-postar">POSTAR →</button>
            </div>
            <span class="mvc-marca">GYMMATCH</span>
            <div class="mvc-toolbar" id="mvc-toolbar">
                <div class="mvc-abas">
                    <button type="button" class="mvc-aba" data-aba="texto">${ICONS.type}<span>TEXTO</span></button>
                    <button type="button" class="mvc-aba" data-aba="tags">${ICONS.tag}<span>TAGS</span></button>
                    <button type="button" class="mvc-aba" data-aba="filtros">${ICONS.sparkles}<span>FILTROS</span></button>
                </div>
                <div id="mvc-painel"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const areaEl = overlay.querySelector("#mvc-area");
    const fotoEl = overlay.querySelector("#mvc-foto");
    const textoAreaEl = overlay.querySelector("#mvc-texto-area");
    const tagAreaEl = overlay.querySelector("#mvc-tag-area");
    const toolbarEl = overlay.querySelector("#mvc-toolbar");
    const painelEl = overlay.querySelector("#mvc-painel");
    const postarBtn = overlay.querySelector("#mvc-postar");

    function fecharEditor() {
        URL.revokeObjectURL(fotoUrl);
        overlay.remove();
        document.body.style.overflow = "";
    }

    overlay.querySelector("#mvc-voltar").addEventListener("click", () => {
        fecharEditor();
        abrirCriador();
    });

    // ---------- foto: posição base (cover) + zoom/arraste ----------
    function aplicarTransformFoto() {
        fotoEl.style.transform = `translate(-50%, -50%) translate(${estado.offsetX}px, ${estado.offsetY}px) scale(${estado.zoom})`;
    }

    fotoEl.addEventListener("load", () => {
        const rect = areaEl.getBoundingClientRect();
        const escalaCover = Math.max(rect.width / fotoEl.naturalWidth, rect.height / fotoEl.naturalHeight);
        fotoEl.style.width = `${fotoEl.naturalWidth * escalaCover}px`;
        fotoEl.style.height = `${fotoEl.naturalHeight * escalaCover}px`;
        aplicarTransformFoto();
    });

    configurarFotoInteracao(areaEl, estado, aplicarTransformFoto);

    // ---------- fechar painel ao tocar na foto ----------
    areaEl.addEventListener("click", () => {
        if (estado.painelAberto) {
            if (estado.painelAberto === "texto" && estado.texto.trim()) estado.textoVisivel = true;
            estado.painelAberto = null;
            atualizarAbasEPainel();
        }
    });

    // ---------- texto ----------
    function estaEditandoTexto() {
        return estado.painelAberto === "texto";
    }

    function renderTexto() {
        textoAreaEl.innerHTML = "";
        const f = fonteDados(estado.fonte);

        if (estaEditandoTexto()) {
            textoAreaEl.innerHTML = `
                <textarea class="mvc-texto-input" id="mvc-texto-input" maxlength="150" placeholder="QUAL FOI O SET?"
                    style="font-family:${f.family}; font-weight:${f.weight}; ${f.italic ? "font-style:italic;" : ""} color:${estado.cor}; text-align:${estado.alinhamento};"></textarea>
                <span class="mvc-texto-contador" id="mvc-texto-contador">${estado.texto.length}/150</span>
            `;
            const input = textoAreaEl.querySelector("#mvc-texto-input");
            input.value = estado.texto;
            setTimeout(() => input.focus(), 0);
            input.addEventListener("click", (e) => e.stopPropagation());
            input.addEventListener("input", () => {
                estado.texto = input.value;
                textoAreaEl.querySelector("#mvc-texto-contador").textContent = `${estado.texto.length}/150`;
            });
        } else if (estado.textoVisivel && estado.texto.trim()) {
            const el = document.createElement("div");
            el.className = "mvc-texto-sticker";
            el.id = "mvc-texto-sticker";
            el.textContent = estado.texto;
            el.style.left = `${estado.textoX}%`;
            el.style.top = `${estado.textoY}%`;
            el.style.fontSize = `${22 * estado.textoEscala}px`;
            el.style.fontFamily = f.family;
            el.style.fontWeight = f.weight;
            if (f.italic) el.style.fontStyle = "italic";
            el.style.color = estado.cor;
            el.style.textAlign = estado.alinhamento;
            textoAreaEl.appendChild(el);

            el.addEventListener("dblclick", (e) => {
                e.stopPropagation();
                estado.painelAberto = "texto";
                atualizarAbasEPainel();
            });

            configurarStickerInteracao(el, areaEl, estado, {
                chaveX: "textoX",
                chaveY: "textoY",
                chaveEscala: "textoEscala",
                escalaMin: 0.4,
                escalaMax: 4,
                ehEditando: () => false,
                aoMudar: () => {
                    el.style.left = `${estado.textoX}%`;
                    el.style.top = `${estado.textoY}%`;
                    el.style.fontSize = `${22 * estado.textoEscala}px`;
                },
            });
        }
    }

    // ---------- tag ----------
    function renderTag() {
        tagAreaEl.innerHTML = "";
        if (!estado.tag) return;
        const info = TAGS_TREINO_UI.find((t) => t.nome === estado.tag);

        const el = document.createElement("div");
        el.className = "mvc-tag-sticker";
        el.id = "mvc-tag-sticker";
        el.style.left = `${estado.tagX}%`;
        el.style.top = `${estado.tagY}%`;
        el.innerHTML = `${ICONS[info?.icone] || ICONS.dumbbell}<span>${escapeHtml(estado.tag)}</span>`;
        tagAreaEl.appendChild(el);

        configurarStickerInteracao(el, areaEl, estado, {
            chaveX: "tagX",
            chaveY: "tagY",
            ehEditando: () => false,
            aoMudar: () => {
                el.style.left = `${estado.tagX}%`;
                el.style.top = `${estado.tagY}%`;
            },
        });
    }

    // ---------- painel (texto/tags/filtros) ----------
    function renderPainel() {
        if (!estado.painelAberto) {
            painelEl.innerHTML = "";
            return;
        }

        if (estado.painelAberto === "texto") {
            painelEl.innerHTML = `
                <div class="mvc-painel">
                    <div class="mvc-fontes-linha">
                        ${FONTES_TEXTO.map(
                            (f) => `
                            <button type="button" class="mvc-fonte-btn ${estado.fonte === f.chave ? "ativa" : ""}" data-fonte="${f.chave}">
                                <span class="aa" style="font-family:${f.family}; font-weight:${f.weight}; ${f.italic ? "font-style:italic;" : ""}">Aa</span>
                                <span class="rotulo">${f.rotulo}</span>
                            </button>
                        `
                        ).join("")}
                    </div>
                    <div class="mvc-cores-linha">
                        ${CORES_TEXTO.map(
                            (c) => `<button type="button" class="mvc-cor-btn ${estado.cor === c ? "ativa" : ""}" data-cor="${c}" style="background:${c}"></button>`
                        ).join("")}
                    </div>
                    <div class="mvc-align-linha">
                        <button type="button" class="mvc-align-btn ${estado.alinhamento === "left" ? "ativa" : ""}" data-align="left">${ICONS.alignLeft}</button>
                        <button type="button" class="mvc-align-btn ${estado.alinhamento === "center" ? "ativa" : ""}" data-align="center">${ICONS.alignCenter}</button>
                        <button type="button" class="mvc-align-btn ${estado.alinhamento === "right" ? "ativa" : ""}" data-align="right">${ICONS.alignRight}</button>
                    </div>
                </div>
            `;
            painelEl.querySelectorAll("[data-fonte]").forEach((b) =>
                b.addEventListener("click", (e) => {
                    e.stopPropagation();
                    estado.fonte = b.dataset.fonte;
                    atualizarAbasEPainel();
                })
            );
            painelEl.querySelectorAll("[data-cor]").forEach((b) =>
                b.addEventListener("click", (e) => {
                    e.stopPropagation();
                    estado.cor = b.dataset.cor;
                    atualizarAbasEPainel();
                })
            );
            painelEl.querySelectorAll("[data-align]").forEach((b) =>
                b.addEventListener("click", (e) => {
                    e.stopPropagation();
                    estado.alinhamento = b.dataset.align;
                    atualizarAbasEPainel();
                })
            );
        } else if (estado.painelAberto === "tags") {
            painelEl.innerHTML = `
                <div class="mvc-painel">
                    <div class="mvc-tags-grid">
                        ${TAGS_TREINO_UI.map(
                            (t) => `
                            <button type="button" class="mvc-tag-pill ${estado.tag === t.nome ? "ativa" : ""}" data-tag="${t.nome}">
                                ${ICONS[t.icone]}<span>${t.nome}</span>
                            </button>
                        `
                        ).join("")}
                    </div>
                </div>
            `;
            painelEl.querySelectorAll("[data-tag]").forEach((b) =>
                b.addEventListener("click", (e) => {
                    e.stopPropagation();
                    estado.tag = estado.tag === b.dataset.tag ? null : b.dataset.tag;
                    renderTag();
                    renderPainel();
                })
            );
        } else if (estado.painelAberto === "filtros") {
            painelEl.innerHTML = `
                <div class="mvc-painel">
                    <div class="mvc-filtros-linha">
                        ${FILTROS.map(
                            (f) => `
                            <button type="button" class="mvc-filtro-btn ${estado.filtroChave === f.chave ? "ativa" : ""}" data-filtro="${f.chave}">
                                <span class="mvc-filtro-thumb" style="background-image:url('${fotoUrl}'); filter:${f.css}"></span>
                                <span class="mvc-filtro-rotulo">${f.rotulo}</span>
                            </button>
                        `
                        ).join("")}
                    </div>
                </div>
            `;
            painelEl.querySelectorAll("[data-filtro]").forEach((b) =>
                b.addEventListener("click", (e) => {
                    e.stopPropagation();
                    estado.filtroChave = b.dataset.filtro;
                    fotoEl.style.filter = FILTROS.find((f) => f.chave === estado.filtroChave).css;
                    renderPainel();
                })
            );
        }
    }

    function atualizarAbasEPainel() {
        toolbarEl.querySelectorAll(".mvc-aba").forEach((btn) => {
            btn.classList.toggle("ativa", btn.dataset.aba === estado.painelAberto);
        });
        postarBtn.textContent = estaEditandoTexto() ? "PRONTO" : "POSTAR →";
        renderPainel();
        renderTexto();
    }

    toolbarEl.querySelectorAll(".mvc-aba").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const aba = btn.dataset.aba;
            const estavaEditandoTexto = estaEditandoTexto();
            estado.painelAberto = estado.painelAberto === aba ? null : aba;
            if (estavaEditandoTexto && estado.texto.trim()) estado.textoVisivel = true;
            atualizarAbasEPainel();
        });
    });

    postarBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (estaEditandoTexto()) {
            if (estado.texto.trim()) estado.textoVisivel = true;
            estado.painelAberto = null;
            atualizarAbasEPainel();
            return;
        }
        publicar();
    });

    // ---------- publicar ----------
    function quebrarLinhas(ctx, texto, maxWidth) {
        const palavras = texto.split(/\s+/);
        const linhas = [];
        let atual = "";
        for (const palavra of palavras) {
            const tentativa = atual ? `${atual} ${palavra}` : palavra;
            if (ctx.measureText(tentativa).width > maxWidth && atual) {
                linhas.push(atual);
                atual = palavra;
            } else {
                atual = tentativa;
            }
        }
        if (atual) linhas.push(atual);
        return linhas;
    }

    function desenharTagNoCanvas(ctx, k) {
        const corPrimaria = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
        const fontSize = 24 * k;
        ctx.font = `800 ${fontSize}px "Barlow Condensed", sans-serif`;
        const texto = estado.tag.toUpperCase();
        const paddingX = 16 * k;
        const paddingY = 9 * k;
        const textW = ctx.measureText(texto).width;
        const boxW = textW + paddingX * 2;
        const boxH = fontSize + paddingY * 2;
        const cx = (estado.tagX / 100) * 1080;
        const cy = (estado.tagY / 100) * 1920;
        const x = cx - boxW / 2;
        const y = cy - boxH / 2;
        const r = 4 * k;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + boxW, y, x + boxW, y + boxH, r);
        ctx.arcTo(x + boxW, y + boxH, x, y + boxH, r);
        ctx.arcTo(x, y + boxH, x, y, r);
        ctx.arcTo(x, y, x + boxW, y, r);
        ctx.closePath();
        ctx.fillStyle = "rgba(8,8,10,0.7)";
        ctx.fill();
        ctx.lineWidth = 1.5 * k;
        ctx.strokeStyle = corPrimaria;
        ctx.stroke();

        ctx.fillStyle = corPrimaria;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(texto, cx, cy + fontSize * 0.03);
        ctx.restore();
    }

    async function gerarImagemFinal(areaW, areaH) {
        const CANVAS_W = 1080;
        const CANVAS_H = 1920;
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        const ctx = canvas.getContext("2d");
        const k = CANVAS_W / areaW;

        const f = fonteDados(estado.fonte);
        try {
            await document.fonts.load(`${f.weight} 40px ${f.family}`);
        } catch (e) {
            // segue mesmo se a fonte não carregar a tempo
        }

        // 1) foto (cover + zoom + pan + filtro)
        const coverScale = Math.max(areaW / fotoEl.naturalWidth, areaH / fotoEl.naturalHeight);
        const totalScale = coverScale * estado.zoom * k;
        const imgWCanvas = fotoEl.naturalWidth * totalScale;
        const imgHCanvas = fotoEl.naturalHeight * totalScale;
        const cx = CANVAS_W / 2 + estado.offsetX * k;
        const cy = CANVAS_H / 2 + estado.offsetY * k;

        ctx.save();
        ctx.filter = FILTROS.find((flt) => flt.chave === estado.filtroChave).css;
        ctx.drawImage(fotoEl, cx - imgWCanvas / 2, cy - imgHCanvas / 2, imgWCanvas, imgHCanvas);
        ctx.restore();

        // 2) texto
        if (estado.texto.trim()) {
            const fontSizeCanvas = 22 * estado.textoEscala * k;
            ctx.font = `${f.italic ? "italic " : ""}${f.weight} ${fontSizeCanvas}px ${f.family}`;
            const maxWidth = CANVAS_W * 0.78;
            const linhas = quebrarLinhas(ctx, estado.texto, maxWidth);
            const lineHeight = fontSizeCanvas * 1.35;
            const x = (estado.textoX / 100) * CANVAS_W;
            const yCentro = (estado.textoY / 100) * CANVAS_H;
            const yInicio = yCentro - ((linhas.length - 1) * lineHeight) / 2;

            ctx.textAlign = estado.alinhamento;
            ctx.textBaseline = "middle";
            ctx.fillStyle = estado.cor;

            linhas.forEach((linha, i) => {
                const y = yInicio + i * lineHeight;
                ctx.shadowColor = "rgba(0,0,0,1)";
                ctx.shadowBlur = 16 * k;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2 * k;
                ctx.fillText(linha, x, y);
                ctx.shadowColor = "rgba(0,0,0,0.9)";
                ctx.shadowBlur = 4 * k;
                ctx.shadowOffsetY = 0;
                ctx.fillText(linha, x, y);
            });
        }

        // 3) tag
        if (estado.tag) desenharTagNoCanvas(ctx, k);

        return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9));
    }

    async function publicar() {
        const publicandoEl = document.createElement("div");
        publicandoEl.className = "mvc-publicando";
        publicandoEl.innerHTML = `<div class="mvc-spinner"></div><span>PUBLICANDO...</span>`;
        overlay.appendChild(publicandoEl);

        try {
            const rect = areaEl.getBoundingClientRect();
            const blob = await gerarImagemFinal(rect.width, rect.height);

            const formData = new FormData();
            formData.append("arquivo", blob, "move.jpg");
            formData.append("texto", estado.texto.trim());
            if (estado.tag) formData.append("tag", estado.tag);

            const resposta = await fetch(`${API_BASE_URL}/moves`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getToken()}` },
                body: formData,
            });
            const dados = await resposta.json().catch(() => null);
            if (!resposta.ok) {
                throw new Error((dados && dados.detail) || "Não foi possível publicar o move");
            }

            mostrarToast("Move publicado!");
            fecharEditor();
            _criadorAberto = false;
            recarregarMovesRow();
        } catch (e) {
            publicandoEl.remove();
            mostrarToast(e.message, "error");
        }
    }

    atualizarAbasEPainel();
}
