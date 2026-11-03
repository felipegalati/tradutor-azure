const API_URL = 'http://localhost:3000/api/traduzir';

let timeoutId = null;
let controller = null;

const textarea = document.getElementById('texto');
const resultadoPre = document.getElementById('resultado');
const statusDiv = document.getElementById('status');
const fromLangSelect = document.getElementById('fromLang');
const toLangSelect = document.getElementById('toLang');
const btnInverter = document.getElementById('btnInverter');

textarea.addEventListener('input', acionarTraducao);
fromLangSelect.addEventListener('change', acionarTraducao);
toLangSelect.addEventListener('change', acionarTraducao);

btnInverter.addEventListener('click', () => {
    const tempLang = fromLangSelect.value;
    fromLangSelect.value = toLangSelect.value;
    toLangSelect.value = tempLang;

    // Verifica se há uma tradução pronta e a move para o campo de texto
    const textoAtual = textarea.value.trim();
    const resultadoAtual = resultadoPre.innerText.trim();

    if (resultadoAtual && resultadoAtual !== "Aguardando texto..." && resultadoAtual !== "Nenhuma tradução retornada.") {
        textarea.value = resultadoAtual;
    }

    acionarTraducao();
});

function acionarTraducao() {
    const text = textarea.value.trim();

    clearTimeout(timeoutId);

    if (!text) {
        resultadoPre.innerText = "Aguardando texto...";
        statusDiv.innerText = "Pronto para traduzir";
        return;
    }

    statusDiv.innerText = "Aguardando você terminar...";

    timeoutId = setTimeout(() => {
        realizarTraducao(text);
    }, 500);
}

async function realizarTraducao(text) {
    const from = fromLangSelect.value;
    const to = toLangSelect.value;

    if (controller) {
        controller.abort();
    }
    controller = new AbortController();

    statusDiv.innerText = "Traduzindo...";

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, from, to }),
            signal: controller.signal
        });

        const data = await response.json();
        
        if (data && data[0] && data[0].translations) {
            let traducaoFormatada = data[0].translations.map(t => t.text).join('\n');
            resultadoPre.innerText = traducaoFormatada;
            statusDiv.innerText = "Traduzido com sucesso!";
        } else {
            resultadoPre.innerText = "Nenhuma tradução retornada.";
            statusDiv.innerText = "Pronto";
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Requisição anterior cancelada.');
        } else {
            console.error('Erro:', error);
            statusDiv.innerText = "Erro ao conectar com o servidor.";
        }
    }
}