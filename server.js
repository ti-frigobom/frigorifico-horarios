const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// 1. COLE AQUI SUA STRING DE CONEXÃO DO MONGODB ATLAS
// Substitua <password> pela senha que você criou no Atlas
const MONGO_URI = 'mongodb+srv://ti-frigobom:<db_password>@horarios.epbewyg.mongodb.net/?appName=Horarios';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB Atlas'))
  .catch(err => console.error('Erro ao conectar:', err));

// 2. Definindo o Modelo de Dados
const SetorSchema = new mongoose.Schema({
    idSetor: Number,
    nome: String,
    horario: String
});
const Setor = mongoose.model('Setor', SetorSchema);

// 3. Inicializar 32 setores se o banco estiver vazio
async function inicializarBanco() {
    const count = await Setor.countDocuments();
    if (count === 0) {
        const setoresIniciais = [];
        for (let i = 1; i <= 32; i++) {
            setoresIniciais.push({ idSetor: i, nome: `Setor ${i}`, horario: "07:00 - 17:00" });
        }
        await Setor.insertMany(setoresIniciais);
        console.log('Banco inicializado com 32 setores.');
    }
}
inicializarBanco();

// Rota atualizada para aceitar nome e horário
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));