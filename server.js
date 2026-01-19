const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session'); // Nova dependência
const path = require('path');

const app = express();

// CONFIGURAÇÃO DE SESSÃO
app.use(session({
    secret: 'chave-secreta-frigorifico', // Pode ser qualquer texto
    resave: false,
    saveUninitialized: true
}));

app.use(bodyParser.json());

// CONFIGURAÇÃO DE LOGIN (USUÁRIO E SENHA)
const LOGIN_USER = "admin";
const LOGIN_PASS = "Fr!go26"; // <--- ALTERE SUA SENHA AQUI

// Middleware de Proteção
function proteger(req, res, next) {
    if (req.session.logado) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

// Rota de Login
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === LOGIN_USER && senha === LOGIN_PASS) {
        req.session.logado = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Acesso negado" });
    }
});

// APLICAÇÃO DA PROTEÇÃO:
// A página da TV (index.html) continua pública.
// Protegemos o Admin, o Gerador e as APIs de escrita.
app.use('/admin.html', proteger);
app.use('/gerador.html', proteger);
app.post('/api/atualizar-todos', proteger);
app.post('/api/setores', proteger);
app.delete('/api/setores/:id', proteger);

app.use(express.static('public'));

// ... (Restante do código de conexão MongoDB e rotas GET que já criamos)

// 1. CONEXÃO COM O BANCO DE DADOS (MONGODB ATLAS)
const MONGO_URI = 'mongodb+srv://ti-frigobom:e9SD&n5F*y9!@horarios.epbewyg.mongodb.net/?appName=Horarios'; // <--- COLOQUE SUA STRING AQUI

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch(err => console.error('❌ Erro ao conectar:', err));

// 2. DEFINIÇÃO DO MODELO DE DADOS
const SetorSchema = new mongoose.Schema({
    idSetor: Number, // Usado para identificação única
    ordem: Number,   // Usado para definir a posição na tela
    nome: String,
    horario: String
});
const Setor = mongoose.model('Setor', SetorSchema);

// 3. INICIALIZAÇÃO DO BANCO (Cria dados iniciais se estiver vazio)
async function inicializarBanco() {
    const count = await Setor.countDocuments();
    if (count === 0) {
        const setoresIniciais = [];
        for (let i = 1; i <= 32; i++) {
            setoresIniciais.push({ idSetor: i, ordem: i, nome: `Setor ${i}`, horario: "07:00 - 17:00" });
        }
        await Setor.insertMany(setoresIniciais);
        console.log('📦 Banco inicializado com sucesso.');
    }
}
inicializarBanco();

// 4. ROTAS DA API

// Buscar todos os setores ordenados pela posição definida pelo usuário
app.get('/api/setores', async (req, res) => {
    try {
        const setores = await Setor.find().sort({ ordem: 1 });
        res.json(setores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Criar um novo setor no final da lista
app.post('/api/setores', async (req, res) => {
    try {
        const ultimo = await Setor.findOne().sort({ ordem: -1 });
        const novaOrdem = ultimo ? ultimo.ordem + 1 : 1;
        const novoId = ultimo ? ultimo.idSetor + 1 : Date.now(); // ID único simples

        const novoSetor = new Setor({
            idSetor: novoId,
            ordem: novaOrdem,
            nome: "Novo Setor",
            horario: "00:00 - 00:00"
        });
        await novoSetor.save();
        res.json(novoSetor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Excluir um setor específico
app.delete('/api/setores/:id', async (req, res) => {
    try {
        await Setor.findOneAndDelete({ idSetor: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SALVAR TUDO E ORDENAÇÃO (Rota Principal)
app.post('/api/atualizar-todos', async (req, res) => {
    const { setores } = req.body; 
    try {
        const operacoes = setores.map((s, index) => ({
            updateOne: {
                filter: { idSetor: s.idSetor },
                update: { 
                    nome: s.nome, 
                    horario: s.horario,
                    ordem: index // Salva a nova ordem baseada na posição do array enviado
                }
            }
        }));
        await Setor.bulkWrite(operacoes);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. LIGAR O SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));