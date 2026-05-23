const express = require('express');

const app = express();
const PORT = 3000;
const path = require('path')
const multer = require('multer');
const { url } = require('inspector');
const Database = require('better-sqlite3');
const { error } = require('console');
const db = new Database('servers/banco.db');
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const { fileTypeFromBuffer } = require("file-type");

db.exec(`
    CREATE TABLE IF NOT EXISTS familias (
        id TEXT PRIMARY KEY,
        nome TEXT,
        data TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nome TEXT,
        email TEXT,
        senha TEXT,
        foto TEXT,
        familia TEXT,
        class TEXT,
        telefone TEXT
    );
    CREATE TABLE IF NOT EXISTS kids (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        foto TEXT,
        dataNascimento TEXT,
        restricaoAlimentar INTEGER DEFAULT 0,
        obs TEXT,
        class TEXT,
        family TEXT,
        ultimaAtividade TEXT,
        status TEXT DEFAULT 'ativo'
    );
`);

// Middleware para JSON
app.use(express.static(path.join(__dirname,'..','public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'IMG_DE_PERFIL'))
    },

    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname)

        cb(null, uniqueName)
    }
})

const upload = multer({ storage });
const upload2 = multer({ storage: multer.memoryStorage() });


// Rota upload
app.post('/api/enviarImagem', upload.single('imagem'), (req, res) => {
  res.json({
    mensagem: 'Upload feito com sucesso',
    arquivo: req.file,
    url: req.path
  });
});

app.post('/api/adicionarKids', (req, res) => {
    try {
        const { nome, foto, nascimento, restricao, obs, turma, family } = req.body;
        const timestamp = Date.now();
        const aleatorio = Math.floor(Math.random() * 100000);
        const IDKIDS = `kids-${timestamp}-${aleatorio}`;
        
        db.prepare(`INSERT INTO kids (id,nome,foto,dataNascimento,restricaoAlimentar,obs,class,family,ultimaAtividade,status) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
            IDKIDS,
            nome,
            foto || '',
            nascimento,
            restricao === 'sim' ? 1 : 0,
            obs || '',
            turma || '',
            family || '',
            null,
            'ativo'
        );
        res.status(200).json({ success: true, message: 'Kid cadastrado com sucesso', IDKIDS });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar kid' });
    }
});

app.get('/api/verficarEmail',(req,res)=>{
    const {email} = req.query
    const respotas = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email)
    res.json(respotas? respotas : false)
})

app.get('/api/buscarfamilia', (req, res) => {
    const { idFamily } = req.query

    try {

        const usuarios = db
            .prepare('SELECT * FROM usuarios WHERE familia = ?')
            .all(idFamily)

        const kids = db
            .prepare('SELECT * FROM kids WHERE family = ?')
            .all(idFamily)

        const resposta = [...usuarios, ...kids]

        res.json(resposta)

    } catch (error) {
        console.log(error)

        res.status(500).json({
            success: false,
            message: 'Erro ao buscar família'
        })
    }
})

app.post('/api/login',(req,res)=>{
    const {email,senha} = req.body
    const respotas = db.prepare('SELECT * FROM usuarios WHERE email = ? AND senha = ?').get(email,senha)
    res.json(respotas? respotas : false)
})

app.post("/api/converterImagem", upload2.single("imagem"), async (req, res) => {
    try {
        const buffer = req.file.buffer;

        // 🔥 detecta real formato da imagem
        const type = await fileTypeFromBuffer(buffer);


        let finalBuffer = buffer;

        // 🔥 HEIC detectado pelo conteúdo real
        if (
            type?.ext === "heic" ||
            type?.ext === "heif" ||
            type?.mime === "image/heic" ||
            type?.mime === "image/heif"
        ) {

            finalBuffer = await heicConvert({
                buffer,
                format: "JPEG",
                quality: 0.9
            });
        }

        const jpgBuffer = await sharp(finalBuffer)
            .rotate()
            .jpeg({ quality: 80 })
            .toBuffer();

        res.set("Content-Type", "image/jpeg");
        res.send(jpgBuffer);

    } catch (err) {
        console.error("ERRO:", err);
        res.status(500).json({ erro: err.message });
    }
});
app.post('/api/criarConta', (req, res) => {
    const { nome, familia, email, senha, foto, telefone } = req.body;

    const timestamp = Date.now();
    const aleatorio = Math.floor(Math.random() * 100000);
    const idFamily = `family-${timestamp}-${aleatorio}`;
    const iDuser =  `USER-${timestamp}-${aleatorio}`;
    const data = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    try{
        db.prepare(`INSERT INTO familias (id,nome,data) VALUES (?,?,?)`).run(idFamily,familia,data)
        db.prepare('INSERT INTO usuarios (id,nome,email,senha,foto,familia,class,telefone) VALUES (?,?,?,?,?,?,?,?)').run(iDuser,nome,email,senha,foto,idFamily,'RESP',telefone)
         // retorno sucesso
        res.json({
            sucesso: true,
            mensagem: 'Família criada com sucesso',
            usuario: {
                id: iDuser,
                nome,
                email,
                foto,
                familia: idFamily,
                class: 'RESP',
                telefone: telefone
            }
        });
    }catch(e){
        console.log(e);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao criar família',
            erro: e.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});