require("dotenv").config();
const express = require('express');
const cors = require('cors');

const translatorRoutes = require('./apiTradutor');
const visionRoutes = require('./apiVisao');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', translatorRoutes);
app.use('/api', visionRoutes);     

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});