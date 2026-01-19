const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./horarios.db');

app.use(bodyParser.json());
app.use(express.static('public'));

// Criação da tabela de 32 setores na primeira execução
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS setores (id INTEGER PRIMARY KEY, nome TEXT, horario TEXT)");
    
    db.get("SELECT count(*) as count FROM setores", (err, row) => {
        if (row.count === 0) {
            for (let i = 1; i <= 32; i++) {
                db.run("INSERT INTO setores (nome, horario) VALUES (?, ?)", [`Setor ${i}`, "07:00 - 17:00"]);
            }
        }
    });
});

// Rota para buscar todos os setores
app.get('/api/setores', (req, res) => {
    db.all("SELECT * FROM setores", [], (err, rows) => {
        res.json(rows);
    });
});

// Rota para atualizar um horário
app.post('/api/atualizar', (req, res) => {
    const { id, horario } = req.body;
    db.run("UPDATE setores SET horario = ? WHERE id = ?", [horario, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));