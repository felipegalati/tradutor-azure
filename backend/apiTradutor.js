const express = require('express');
const router = express.Router();
const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

let key = process.env.API_KEY;
let endpoint = "https://api.cognitive.microsofttranslator.com";
let location = process.env.LOCATION;

router.post('/traduzir', async (req, res) => {
    const { text, from, to } = req.body;

    if (!text || text.trim() === "") {
        return res.json([]); // Retorna vazio se o texto estiver em branco
    }

    let params = new URLSearchParams();
    params.append("api-version", "3.0");
    params.append("from", from || "en");
    
    if (Array.isArray(to)) {
        to.forEach(lang => params.append("to", lang));
    } else {
        params.append("to", to || "pt");
    }

    try {
        const response = await axios({
            baseURL: endpoint,
            url: '/translate',
            method: 'post',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Ocp-Apim-Subscription-Region': location,
                'Content-type': 'application/json',
                'X-ClientTraceId': uuidv4().toString()
            },
            params: params,
            data: [{ 'text': text }],
            responseType: 'json'
        });

        res.json(response.data);
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Erro ao comunicar com a API de tradução." });
    }
});

module.exports = router;