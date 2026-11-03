const express = require('express');
const multer = require('multer');
const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { ApiKeyCredentials } = require('@azure/ms-rest-js');

const router = express.Router();

// Autenticação (mesmo padrão do tradutor: variáveis no .env)
const key = process.env.VISION_KEY;
const endpoint = process.env.VISION_ENDPOINT;

const computerVisionClient = new ComputerVisionClient(
    new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }),
    endpoint
);

// Imagem fica só em memória (não grava nada em disco)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Envie apenas arquivos de imagem.'));
    }
});

router.post('/analisar-imagem', (req, res) => {
    upload.single('imagem')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
        }

        try {
            // 'pt' devolve os nomes das tags em português
            const result = await computerVisionClient.analyzeImageInStream(req.file.buffer, {
                visualFeatures: ['Tags', 'Description'],
                language: 'pt'
            });

            const tags = (result.tags || [])
                .map(t => ({ name: t.name, confidence: t.confidence }))
                .sort((a, b) => b.confidence - a.confidence);

            // Legenda (descrição) com maior confiança, se houver
            const captions = (result.description && result.description.captions) || [];
            const melhor = captions.slice().sort((a, b) => b.confidence - a.confidence)[0];
            const descricao = melhor ? { texto: melhor.text, confianca: melhor.confidence } : null;

            res.json({ tags, descricao });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Erro ao comunicar com a API de visão computacional.' });
        }
    });
});

module.exports = router;