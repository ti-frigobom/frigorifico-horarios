const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();

// 1. CONEXÃO COM O MONGODB ATLAS
// Substitua pela sua string de conexão real do MongoDB Atlas
const MONGO_URI = 'mongodb+srv://ti-frigobom:e9SD&n5F*y9!@horarios.epbewyg.mongodb.net/?appName=Horarios'; 

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch(err => console.error('❌ Erro ao conectar MongoDB:', err));

// 2. MODELOS DE DADOS (Schemas)
// Modelo para os Setores
const SetorSchema = new mongoose.Schema({
    idSetor: Number,
    ordem: Number,
    nome: String,
    horario: String
});
const Setor = mongoose.model('Setor', SetorSchema);

// Modelo para Configurações (como a Data de Produção)
const ConfigSchema = new mongoose.Schema({
    chave: String,
    valor: String
});
const Config = mongoose.model('Config', ConfigSchema);

// 3. CONFIGURAÇÃO DE SESSÃO E MIDDLEWARES
app.use(session({
    secret: 'chave-secreta-frigorifico-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Sessão válida por 24 horas
}));

app.use(bodyParser.json());
app.use(express.static('public'));

// 4. CONFIGURAÇÃO DE LOGIN (USUÁRIO E SENHA)
const LOGIN_USER = "admin";
const LOGIN_PASS = "Fr!go26"; 

// Middleware para proteger páginas e APIs de escrita
function proteger(req, res, next) {
    if (req.session.logado) {
        next();
    } else {
        // Se for uma requisição de API, retorna erro 401. Caso contrário, manda para login.
        if (req.path.includes('/api/')) {
            return res.status(401).json({ error: "Não autorizado" });
        }
        res.redirect('/login.html');
    }
}

// 5. ROTAS DE AUTENTICAÇÃO
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === LOGIN_USER && senha === LOGIN_PASS) {
        req.session.logado = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Usuário ou senha incorretos" });
    }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

// 6. ROTAS PÚBLICAS (Acessadas pela TV e Login)

// Busca a Data de Produção definida no Admin
app.get('/api/config/data', async (req, res) => {
    try {
        const config = await Config.findOne({ chave: 'data_producao' });
        res.json(config || { valor: "" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Busca a lista de setores ordenados
app.get('/api/setores', async (req, res) => {
    try {
        const setores = await Setor.find().sort({ ordem: 1 });
        res.json(setores);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. ROTAS PROTEGIDAS (Apenas para Admin Logado)

// Proteção das páginas HTML
app.get('/admin.html', proteger, (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/gerador.html', proteger, (req, res) => res.sendFile(path.join(__dirname, 'public', 'gerador.html')));

// SALVAR TUDO (Data + Setores + Ordem)
app.post('/api/atualizar-todos', proteger, async (req, res) => {
    const { setores, dataProducao } = req.body;
    try {
        // 1. Atualiza ou cria a Data de Produção Global
        await Config.findOneAndUpdate(
            { chave: 'data_producao' }, 
            { valor: dataProducao }, 
            { upsert: true }
        );
        
        // 2. Atualiza os setores em lote (BulkWrite)
        if (setores && setores.length > 0) {
            const operacoes = setores.map((s, index) => ({
                updateOne: {
                    filter: { idSetor: s.idSetor },
                    update: { nome: s.nome, horario: s.horario, ordem: index }
                }
            }));
            await Setor.bulkWrite(operacoes);
        }

        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: err.message }); 
    }
});

// Adicionar um novo setor (ID único baseado em timestamp)
app.post('/api/setores', proteger, async (req, res) => {
    try {
        const ultimo = await Setor.findOne().sort({ ordem: -1 });
        const novoSetor = new Setor({
            idSetor: Date.now(),
            ordem: ultimo ? ultimo.ordem + 1 : 1,
            nome: "Novo Setor",
            horario: "00:00 - 00:00"
        });
        await novoSetor.save();
        res.json(novoSetor);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Excluir um setor pelo ID
app.delete('/api/setores/:id', proteger, async (req, res) => {
    try {
        await Setor.findOneAndDelete({ idSetor: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 8. INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});