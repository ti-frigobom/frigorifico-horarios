const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();

// 1. CONEXÃO MONGODB
const MONGO_URI = 'mongodb+srv://ti-frigobom:e9SD&n5F*y9!@horarios.epbewyg.mongodb.net/?appName=Horarios'; 
mongoose.connect(MONGO_URI).then(() => console.log('✅ MongoDB Conectado'));

// 2. MODELOS
const Setor = mongoose.model('Setor', new mongoose.Schema({
    idSetor: Number, ordem: Number, nome: String, horario: String
}));
const Config = mongoose.model('Config', new mongoose.Schema({
    chave: String, valor: String
}));

// 3. MIDDLEWARES
app.use(bodyParser.json());
app.use(session({
    secret: 'frigo-secret-2026',
    resave: false,
    saveUninitialized: true
}));

// 4. SEGURANÇA
const LOGIN_USER = "admin";
const LOGIN_PASS = "Fr!go26";

function proteger(req, res, next) {
    if (req.session.logado) next();
    else res.status(401).json({ error: "Não autorizado" });
}

// 5. ROTAS
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === LOGIN_USER && senha === LOGIN_PASS) {
        req.session.logado = true;
        res.json({ success: true });
    } else res.status(401).json({ success: false });
});

app.get('/api/config/data', async (req, res) => {
    const cfg = await Config.findOne({ chave: 'data_producao' });
    res.json(cfg || { valor: "" });
});

app.get('/api/setores', async (req, res) => {
    const lista = await Setor.find().sort({ ordem: 1 });
    res.json(lista);
});

// Salvar Tudo (Protegido)
app.post('/api/atualizar-todos', proteger, async (req, res) => {
    const { setores, dataProducao } = req.body;
    try {
        await Config.findOneAndUpdate({ chave: 'data_producao' }, { valor: dataProducao }, { upsert: true });
        const ops = setores.map((s, i) => ({
            updateOne: { filter: { idSetor: s.idSetor }, update: { nome: s.nome, horario: s.horario, ordem: i } }
        }));
        await Setor.bulkWrite(ops);
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/setores', proteger, async (req, res) => {
    const novo = new Setor({ idSetor: Date.now(), ordem: 99, nome: "Novo Setor", horario: "00:00 - 00:00" });
    await novo.save();
    res.json(novo);
});

app.delete('/api/setores/:id', proteger, async (req, res) => {
    await Setor.findOneAndDelete({ idSetor: req.params.id });
    res.json({ success: true });
});

app.use(express.static('public'));
app.listen(process.env.PORT || 3000);