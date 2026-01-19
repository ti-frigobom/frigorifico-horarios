const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// 1. CONFIGURAÇÃO DO BANCO DE DATA (MONGODB ATLAS)
// Substitua o link abaixo pelo que você copiou no painel do MongoDB Atlas
const MONGO_URI = 'mongodb+srv://ti-frigobom:e9SD&n5F*y9!@horarios.epbewyg.mongodb.net/?appName=Horarios';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch(err => console.error('❌ Erro ao conectar:', err));

// 2. DEFINIÇÃO DO MODELO (Estrutura dos dados)
const SetorSchema = new mongoose.Schema({
    idSetor: Number,
    nome: String,
    horario: String
});
const Setor = mongoose.model('Setor', SetorSchema);

// 3. INICIALIZAÇÃO (Cria os 32 setores se o banco estiver vazio)
async function inicializarBanco() {
    const count = await Setor.countDocuments();
    if (count === 0) {
        const setoresIniciais = [];
        for (let i = 1; i <= 32; i++) {
            setoresIniciais.push({ idSetor: i, nome: `Setor ${i}`, horario: "07:00 - 17:00" });
        }
        await Setor.insertMany(setoresIniciais);
        console.log('📦 Banco inicializado com 32 setores.');
    }
}
inicializarBanco();

// 4. ROTAS DA API

// Rota para buscar todos os setores (usada pela TV e pelo Admin)
app.get('/api/setores', async (req, res) => {
    try {
        const setores = await Setor.find().sort({ idSetor: 1 });
        res.json(setores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para atualizar Nome e Horário (usada pelo botão SALVAR do Admin)
app.post('/api/atualizar', async (req, res) => {
    const { id, nome, horario } = req.body;
    try {
        await Setor.findOneAndUpdate(
            { idSetor: id }, 
            { nome: nome, horario: horario }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));