require('dotenv').config();
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// 🌟 IMPORTANDO O MIDDLEWARE DA LOJA
const tenantMiddleware = require('./middleware/tenantMiddleware');

// Instancie o PrismaClient
const prisma = new PrismaClient();
const app = express();

// CORREÇÃO 1: Porta dinâmica para a DigitalOcean
const PORT = process.env.PORT || 3001; 

// Importar as rotas organizadas (principais)
const authRoutes = require('./routes/auth'); // Ajustado para importar o diretório
const productRoutes = require('./routes/produtos');
const orderRoutes = require('./routes/pedidos');
const delivererRoutes = require('./routes/delivererRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Rotas ainda não organizadas
const cartRoutes = require('./routes/cartRoutes');
const insightsRoutes = require('./routes/insiths');
const storeConfigRoutes = require('./routes/configuracao'); 
const complementsRoutes = require('./routes/complementsRoutes'); 
const flavorsRoutes = require('./routes/flavorsRoutes');
const additionalsRoutes = require('./routes/additionalsRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const cozinheirosRoutes = require('./routes/cozinheiros');

// Webhook Z-API (não passa pelo tenantMiddleware /api)
const zapiWebhookRoutes = require('./routes/zapiWebhook');

// Middleware
app.use(cors());
app.use(express.json());

// Webhooks
app.use('/webhooks/zapi', zapiWebhookRoutes);

// Função para testar a conexão com o banco de dados
const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log('✅ Conectado com sucesso ao banco de dados!');
    } catch (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err);
        process.exit(1);
    }
};

// Conectar ao banco de dados e iniciar o servidor
connectDB().then(() => {
    
    // =======================================================
    // CORREÇÃO 2: ROTAS PÚBLICAS ANTES DO MIDDLEWARE
    // Cadastro, login e reset de senha não exigem que a loja já exista
    // =======================================================
    app.use('/api/auth', authRoutes.router);
    app.use('/api/auth', passwordResetRoutes);


    // =======================================================
    // A MÁGICA ACONTECE AQUI!
    // Todas as requisições para /api a partir daqui vão passar pelo 
    // tenantMiddleware primeiro para descobrir qual é o lojaId.
    // =======================================================
    app.use('/api', tenantMiddleware);

    // Conectar as rotas privadas (Organizadas)
    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/deliverers', delivererRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/insights', insightsRoutes);
    app.use('/api/store-config', storeConfigRoutes);
    app.use('/api/complements', complementsRoutes);
    app.use('/api/complement-categories', require('./routes/complementCategoriesRoutes'));
    app.use('/api/flavors', flavorsRoutes);
    app.use('/api/flavor-categories', require('./routes/flavorCategoriesRoutes'));
    app.use('/api/additionals', additionalsRoutes);
    app.use('/api/additional-categories', require('./routes/additionalCategoriesRoutes'));
    app.use('/api/cozinheiros', cozinheirosRoutes);
    
    // Rota de debug temporária
    const debugRoutes = require('./routes/debug');
    app.use('/api', debugRoutes);
    
    // Servir arquivos estáticos da pasta uploads
    app.use('/uploads', express.static('uploads'));

    // Rota de teste
    app.get('/', (req, res) => {
        console.log('➡️ [GET /] Rota de teste acessada.');
        res.send('API da Açaíteria funcionando!');
    });

    // CORREÇÃO 1 (Continuação): O '0.0.0.0' libera acesso externo na DigitalOcean
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor da API rodando na porta ${PORT}`);
    });
});
