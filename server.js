const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();

// 1. CONEXÃO COM O MONGODB ATLAS
const MONGO_URI = 'mongodb+srv://ti-frigobom:e9SD&n5F*y9!@horarios.epbewyg.mongodb.net/?appName=Horarios'; 

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch(err => console.error('❌ Erro ao conectar:', err));

// 2. MODELOS DE DADOS
const SetorSchema = new mongoose.Schema({
    idSetor: Number,
    ordem: Number,
    nome: String,
    horario: String
});
const Setor = mongoose.model('Setor', SetorSchema);

const ConfigSchema = new mongoose.Schema({
    chave: String,
    valor: String
});
const Config = mongoose.model('Config', ConfigSchema);

// 3. CONFIGURAÇÃO DE SEGURANÇA E SESSÃO
app.use(session({
    secret: 'frigorifico-seguro-2026',
    resave: false,
    saveUninitialized: true
}));
app.use(bodyParser.json());

const LOGIN_USER = "admin";
const LOGIN_PASS = "frigo123"; // Altere sua senha aqui

function proteger(req, res, next) {
    if (req.session.logado) next();
    else res.status(401).json({ error: "Não autorizado" });
}

// 4. ROTAS DE AUTENTICAÇÃO
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === LOGIN_USER && senha === LOGIN_PASS) {
        req.session.logado = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// 5. ROTAS DA API
app.get('/api/setores', async (req, res) => {
    const setores = await Setor.find().sort({ ordem: 1 });
    res.json(setores);
});

app.get('/api/config/data', async (req, res) => {
    const config = await Config.findOne({ chave: 'data_producao' });
    res.json(config || { valor: "" });
});

app.post('/api/atualizar-todos', proteger, async (req, res) => {
    const { setores, dataProducao } = req.body;
    try {
        await Config.findOneAndUpdate({ chave: 'data_producao' }, { valor: dataProducao }, { upsert: true });
        const operacoes = setores.map((s, index) => ({
            updateOne: {
                filter: { idSetor: s.idSetor },
                update: { nome: s.nome, horario: s.horario, ordem: index }
            }
        }));
        await Setor.bulkWrite(operacoes);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/setores', proteger, async (req, res) => {
    const ultimo = await Setor.findOne().sort({ ordem: -1 });
    const novoSetor = new Setor({
        idSetor: Date.now(),
        ordem: ultimo ? ultimo.ordem + 1 : 1,
        nome: "Novo Setor",
        horario: "00:00 - 00:00"
    });
    await novoSetor.save();
    res.json(novoSetor);
});

app.delete('/api/setores/:id', proteger, async (req, res) => {
    await Setor.findOneAndDelete({ idSetor: req.params.id });
    res.json({ success: true });
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor na porta ${PORT}`));