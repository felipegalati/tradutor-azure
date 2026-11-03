const API_URL = 'http://localhost:3000/api/analisar-imagem';
const TOP_N = 5;

const inputArquivo = document.getElementById('arquivo');
const dropzone = document.getElementById('dropzone');
const preview = document.getElementById('preview');
const btnAnalisar = document.getElementById('btnAnalisar');
const btnResetar = document.getElementById('btnResetar');
const resumoDiv = document.getElementById('resumo');
const descricaoDiv = document.getElementById('descricao');
const rankingDiv = document.getElementById('ranking');
const outrasDiv = document.getElementById('outras');
const statusDiv = document.getElementById('status');

let arquivoAtual = null;
let controller = null;

inputArquivo.addEventListener('change', () => {
    if (inputArquivo.files[0]) selecionarArquivo(inputArquivo.files[0]);
});

// Drag & drop
['dragenter', 'dragover'].forEach(ev =>
    dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('arrastando'); })
);
['dragleave', 'drop'].forEach(ev =>
    dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('arrastando'); })
);
dropzone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) selecionarArquivo(file);
});

// Colar imagem (Ctrl+V / Cmd+V) em qualquer lugar da página
document.addEventListener('paste', e => {
    const itens = e.clipboardData ? e.clipboardData.items : [];
    for (const item of itens) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                e.preventDefault();
                selecionarArquivo(file);
                return;
            }
        }
    }
});

btnAnalisar.addEventListener('click', analisarImagem);
btnResetar.addEventListener('click', resetar);

function selecionarArquivo(file) {
    if (!file.type.startsWith('image/')) {
        statusDiv.innerText = "Selecione um arquivo de imagem.";
        return;
    }
    if (file.size > 4 * 1024 * 1024) {
        statusDiv.innerText = "Imagem muito grande (máximo 4 MB).";
        return;
    }

    if (preview.src) URL.revokeObjectURL(preview.src);
    arquivoAtual = file;
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    btnAnalisar.disabled = false;
    btnResetar.disabled = false;

    resumoDiv.innerText = "Imagem carregada. Clique em analisar.";
    limparDescricao();
    rankingDiv.innerHTML = "";
    outrasDiv.innerHTML = "";
    statusDiv.innerText = "Pronto para analisar";
}

async function analisarImagem() {
    if (!arquivoAtual) return;

    if (controller) controller.abort();
    controller = new AbortController();

    btnAnalisar.disabled = true;
    statusDiv.innerText = "Analisando...";
    resumoDiv.innerText = "Analisando imagem...";
    limparDescricao();
    rankingDiv.innerHTML = "";
    outrasDiv.innerHTML = "";

    const formData = new FormData();
    formData.append('imagem', arquivoAtual);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro desconhecido.');
        }

        renderizarDescricao(data.descricao);

        if (!data.tags || data.tags.length === 0) {
            resumoDiv.innerText = "Nenhum objeto reconhecido.";
            statusDiv.innerText = "Pronto";
            return;
        }

        renderizarResultado(data.tags);
        statusDiv.innerText = "Analisado com sucesso!";

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Requisição anterior cancelada.');
            return;
        }
        console.error('Erro:', error);
        resumoDiv.innerText = "Não foi possível analisar a imagem.";
        statusDiv.innerText = error.message || "Erro ao conectar com o servidor.";
    } finally {
        // Só reabilita se ainda houver imagem (o reset limpa o arquivo)
        btnAnalisar.disabled = !arquivoAtual;
    }
}

function resetar() {
    // Cancela análise em andamento
    if (controller) {
        controller.abort();
        controller = null;
    }

    if (preview.src) URL.revokeObjectURL(preview.src);
    preview.removeAttribute('src');
    preview.hidden = true;

    inputArquivo.value = ''; // permite escolher a mesma imagem de novo
    arquivoAtual = null;

    btnAnalisar.disabled = true;
    btnResetar.disabled = true;

    resumoDiv.innerText = "Aguardando imagem...";
    limparDescricao();
    rankingDiv.innerHTML = "";
    outrasDiv.innerHTML = "";
    statusDiv.innerText = "Pronto para analisar";
}

function limparDescricao() {
    descricaoDiv.hidden = true;
    descricaoDiv.innerHTML = "";
}

function renderizarDescricao(desc) {
    limparDescricao();
    if (!desc || !desc.texto) return;

    const titulo = document.createElement('div');
    titulo.className = 'descricao-titulo';
    titulo.textContent = 'O que está acontecendo';

    const texto = document.createElement('div');
    texto.className = 'descricao-texto';
    // Primeira letra maiúscula + ponto final
    const t = desc.texto.charAt(0).toUpperCase() + desc.texto.slice(1);
    texto.textContent = /[.!?]$/.test(t) ? t : t + '.';

    const conf = document.createElement('div');
    conf.className = 'descricao-conf';
    conf.textContent = `Confiança: ${pct(desc.confianca)}%`;

    descricaoDiv.append(titulo, texto, conf);
    descricaoDiv.hidden = false;
}

function pct(valor) {
    return Math.round(valor * 100);
}

function renderizarResultado(tags) {
    const principal = tags[0];
    const top = tags.slice(0, TOP_N);
    const restantes = tags.slice(TOP_N);

    // Texto principal: "A imagem é: CACHORRO (99%)"
    resumoDiv.innerHTML = "";
    resumoDiv.append("A imagem é: ");
    const strong = document.createElement('strong');
    strong.textContent = `${principal.name} (${pct(principal.confidence)}%)`;
    resumoDiv.appendChild(strong);

    // Ranking em barras (top 5)
    rankingDiv.innerHTML = "";
    top.forEach((tag, i) => {
        const item = document.createElement('div');
        item.className = 'rank-item';

        const pos = document.createElement('div');
        pos.className = 'rank-pos';
        pos.textContent = `#${i + 1}`;

        const info = document.createElement('div');
        info.className = 'rank-info';

        const nome = document.createElement('div');
        nome.className = 'rank-nome';
        const spanNome = document.createElement('span');
        spanNome.textContent = tag.name;
        const spanPct = document.createElement('span');
        spanPct.textContent = `${pct(tag.confidence)}%`;
        nome.append(spanNome, spanPct);

        const barra = document.createElement('div');
        barra.className = 'barra';
        const fill = document.createElement('div');
        fill.className = 'barra-fill';
        barra.appendChild(fill);

        info.append(nome, barra);
        item.append(pos, info);
        rankingDiv.appendChild(item);

        // Anima a barra após inserir no DOM
        requestAnimationFrame(() => requestAnimationFrame(() => {
            fill.style.width = `${pct(tag.confidence)}%`;
        }));
    });

    // Demais tags como chips
    outrasDiv.innerHTML = "";
    restantes.forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = `${tag.name} (${pct(tag.confidence)}%)`;
        outrasDiv.appendChild(chip);
    });
}