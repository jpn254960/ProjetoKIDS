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
const nodemailer = require("nodemailer");
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
    CREATE TABLE IF NOT EXISTS registro (
        registro_id INT AUTO_INCREMENT PRIMARY KEY,
        id INT NOT NULL,
        tipo TEXT,
        nome VARCHAR(255) NOT NULL,
        sala VARCHAR(100),
        familia VARCHAR(255),
        prof VARCHAR(255),
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

app.post('/api/enviarEmail',async (req,res)=>{
    const{dados,familia}= req.body
    // Configuração do transportador para o Gmail
    const dadosfamilia =  db.prepare('SELECT * FROM familias WHERE id=?').get(familia)
    console.log(dadosfamilia)
     const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "joaopepeudro@gmail.com",
      pass: "qbqx qxpz lshx fbel" // Substitua pela sua Senha de App do Google
    }
  });

  // Template HTML do e-mail estruturado
  const htmlConteudo = `
    <!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cadastro Realizado</title>

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      padding: 40px 20px;
    }

    .container {
      max-width: 550px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .header {
      background: #5E179B;
      padding: 32px;
      text-align: center;
    }

    .header h1 {
      color: #ffffff;
      font-size: 24px;
    }

    .content {
      padding: 32px;
    }

    .welcome-text {
      font-size: 16px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 18px;
    }

    .credentials-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      margin: 24px 0;
    }

    .credential-row {
      margin-bottom: 16px;
    }

    .credential-row:last-child {
      margin-bottom: 0;
    }

    .label {
      display: block;
      font-size: 11px;
      font-weight: bold;
      color: #64748b;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      display: inline-block;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 8px;
      font-family: monospace;
      color: #1e293b;
      font-size: 15px;
    }

    .alert-box {
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 28px;
    }

    .alert-text {
      font-size: 14px;
      line-height: 1.5;
      color: #92400e;
    }

    .btn-container {
      text-align: center;
      margin-top: 24px;
    }

    .btn {
      display: inline-block;
      background: #5E179B;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 14px;
    }

    .footer {
      padding: 24px 32px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
    }

    @media only screen and (max-width: 600px) {
      body {
        padding: 20px 10px;
      }

      .content,
      .footer {
        padding: 24px;
      }

      .header {
        padding: 24px;
      }

      .header h1 {
        font-size: 20px;
      }
    }
  </style>
</head>

<body>

  <div class="container">

    <!-- HEADER -->
    <div class="header">
      <h1>Acesso liberado</h1>
    </div>

    <!-- CONTEÚDO -->
    <div class="content">

      <p class="welcome-text">
        Olá, ${dados.nome}
      </p>

      <p class="welcome-text">
        Você foi adicionado com sucesso como
        <strong>responsável</strong>
        na
        <strong>${dadosfamilia.nome}</strong>.
      </p>

      <p class="welcome-text">
        Agora você pode gerenciar os dados e realizar o
        check-in/check-out das crianças vinculadas ao grupo familiar.
      </p>

      <!-- CARD -->
      <div class="credentials-card">

        <div class="credential-row">
          <span class="label">E-mail de acesso</span>
          <span class="value">${dados.email}</span>
        </div>

        <div class="credential-row">
          <span class="label">Senha temporária</span>
          <span class="value">${dados.senha}</span>
        </div>

      </div>

      <!-- ALERTA -->
      <div class="alert-box">
        <p class="alert-text">
          <strong>Aviso de Segurança:</strong>
          esta senha é temporária.
          Recomendamos alterá-la após o primeiro acesso.
        </p>
      </div>

      <!-- BOTÃO -->
      <div class="btn-container">
        <a
          href="https://seusite.com/login"
          class="btn"
          target="_blank"
        >
          Acessar Painel da Família
        </a>
      </div>

    </div>

    <!-- FOOTER -->
    <div class="footer">
      <p>
        Este é um e-mail automático do sistema.
        Por favor, não responda esta mensagem.
      </p>

      <p>
        © 2026 Aliança Kids. Todos os direitos reservados.
      </p>
    </div>

  </div>

</body>
</html>
  `;

  try {
    // Conteúdo e envio do email
    const info = await transporter.sendMail({
      from: '"Sistema Aliança" <seuemail@gmail.com>',
      to: dados.email,
      subject: "Cadastro do kids da CBA",
      text: "Olá! Email automatico não responder", // Fallback para clientes de email antigos
      html: htmlConteudo // O HTML estruturado acima
    });
    res.json({success: true})
    console.log("Email enviado com sucesso! ID:", info.messageId);
  } catch (error) {
    console.error("Erro ao enviar o email:", error);
  }
})


// Rota upload
app.post('/api/enviarImagem', upload.single('imagem'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo enviado'
            });
        }

        return res.json({
            success: true,
            mensagem: 'Upload feito com sucesso',
            arquivo: req.file,
            url: `/IMG_DE_PERFIL/${req.file.filename}`
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Erro no upload'
        });
    }
});

app.post('/api/registrar', (req, res) => {
    try {
        const data = new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo'
        });

        const timestamp = Date.now();
        const aleatorio = Math.floor(Math.random() * 100000);
        const idRegistro = `REG-${timestamp}-${aleatorio}`;
        const { id, nome, sala, familia, prof, tipo } = req.body;
        const valor = tipo == 'Entrada' ? 1 : 0
        const att = db.prepare('UPDATE kids SET status=?,ultimaAtividade=? WHERE id=?').run(valor,data,id)
        const stmt = db.prepare(`
            INSERT INTO registro (registro_id ,id, nome, sala, familia, prof, data, tipo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(idRegistro ,id, nome, sala, familia, prof, data, tipo);

        return res.json({
            success: true,
            message: 'Registro criado com sucesso',
            id: result.lastInsertRowid,
            data:data
        });

    } catch (error) {
        console.error('Erro ao registrar entrada:', error);

        return res.status(500).json({
            success: false,
            message: 'Erro ao registrar entrada'
        });
    }
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

app.post('/api/novoResponsavel',(req,res)=>{
    const {nome,familia,email,senha,foto,telefone} = req.body
    try{
        const timestamp = Date.now();
        const aleatorio = Math.floor(Math.random() * 100000);
        const iDuser =  `USER-${timestamp}-${aleatorio}`;
        db.prepare('INSERT INTO usuarios (id,nome,email,senha,foto,familia,class,telefone) VALUES (?,?,?,?,?,?,?,?)').run(iDuser,nome,email,senha,foto,familia,'RESP',telefone)
        res.json({success:true})
    }catch(e){
        console.log(e);

        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao criar família',
            erro: e.message
        });
    }
})


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