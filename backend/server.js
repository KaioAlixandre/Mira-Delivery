require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// 🌟 IMPORTANDO O MIDDLEWARE DA LOJA
const tenantMiddleware = require('./middleware/tenantMiddleware');

// Instancie o PrismaClient
const prisma = new PrismaClient();
const app = express();

// Porta dinâmica para a DigitalOcean
const PORT = process.env.PORT || 3001; 

// Importar as rotas
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/produtos');
const orderRoutes = require('./routes/pedidos');
const delivererRoutes = require('./routes/delivererRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const cartRoutes = require('./routes/cartRoutes');
const insightsRoutes = require('./routes/insiths');
const storeConfigRoutes = require('./routes/configuracao'); 
const complementsRoutes = require('./routes/complementsRoutes'); 
const flavorsRoutes = require('./routes/flavorsRoutes');
const additionalsRoutes = require('./routes/additionalsRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const cozinheirosRoutes = require('./routes/cozinheiros');
const zapiWebhookRoutes = require('./routes/zapiWebhook');
const deliveryNeighborhoodRoutes = require('./routes/deliveryNeighborhoods');
const masterRoutes = require('./routes/master');
const mercadoPagoRoutes = require('./routes/mercadoPagoRoutes');
const storeSubscriptionRoutes = require('./routes/storeSubscriptionRoutes');

// 1. Middlewares Globais
app.use(cors());
app.use(express.json());

// 2. Webhooks e rotas master (não usam tenantMiddleware)
app.use('/webhooks/zapi', zapiWebhookRoutes);
app.use('/api/master', masterRoutes);
// Webhook do Mercado Pago (não usa tenantMiddleware, é chamado diretamente pelo MP)
// Criar rota específica para webhook antes do tenantMiddleware
const mercadoPagoService = require('./services/mercadoPagoService');
app.post('/api/payments/webhook', express.json(), async (req, res) => {
    try {
        const { type, data } = req.body;
        console.log('📥 Webhook recebido do Mercado Pago:', { type, data });
        console.log('📥 Body completo:', JSON.stringify(req.body, null, 2));

        if (type === 'payment') {
            console.log('💳 Processando webhook de pagamento. ID:', data.id);
            const paymentData = await mercadoPagoService.getPayment(data.id);
            console.log('💳 Dados do pagamento:', {
                id: paymentData.id,
                status: paymentData.status,
                external_reference: paymentData.external_reference,
                transaction_amount: paymentData.transaction_amount
            });
            
            const referenceId = parseInt(paymentData.external_reference);
            console.log('🔍 Buscando assinatura com ID:', referenceId);
            
            // Verificar se é uma assinatura de loja
            const assinatura = await prisma.assinatura_loja.findUnique({
                where: { id: referenceId },
                include: { loja: true }
            });
            
            console.log('🔍 Assinatura encontrada:', assinatura ? `Sim (ID: ${assinatura.id})` : 'Não');

            if (assinatura) {
                // Processar pagamento de assinatura
                const internalStatus = mercadoPagoService.mapPaymentStatus(paymentData.status);
                
                await prisma.assinatura_loja.update({
                    where: { id: assinatura.id },
                    data: {
                        status: internalStatus,
                        idTransacao: paymentData.id.toString()
                    }
                });

                // Se pagamento foi aprovado
                if (internalStatus === 'PAID') {
                    const dadosCadastro = assinatura.dadosCadastro || {};
                    
                    // Verificar se é upgrade de plano
                    if (dadosCadastro.tipo === 'upgrade') {
                        // Atualizar plano da loja
                        await prisma.loja.update({
                            where: { id: assinatura.loja.id },
                            data: { planoMensal: assinatura.plano }
                        });
                        console.log(`✅ Plano da loja ${assinatura.loja.nome} atualizado para ${assinatura.plano} após pagamento aprovado.`);
                    } 
                    // Se não está ativa, criar a loja completa (cadastro inicial)
                    else if (!assinatura.loja.ativa) {
                        const bcrypt = require('bcrypt');
                        const removePhoneMask = (phone) => phone ? phone.toString().replace(/\D/g, '') : phone;
                        const telefoneLimpo = removePhoneMask(dadosCadastro.telefone);
                        const hashedPassword = await bcrypt.hash(dadosCadastro.password, 10);

                        await prisma.$transaction(async (tx) => {
                            // Ativar a loja
                            await tx.loja.update({
                                where: { id: assinatura.loja.id },
                                data: { ativa: true }
                            });

                            // Criar configuração padrão
                            await tx.configuracao_loja.create({
                                data: {
                                    lojaId: assinatura.loja.id,
                                    aberto: true,
                                    horaAbertura: '18:00',
                                    horaFechamento: '23:59',
                                    diasAbertos: '0,1,2,3,4,5,6',
                                    horaEntregaInicio: '18:00',
                                    horaEntregaFim: '23:59'
                                }
                            });

                            // Criar usuário admin
                            await tx.usuario.create({
                                data: {
                                    lojaId: assinatura.loja.id,
                                    nomeUsuario: dadosCadastro.username,
                                    telefone: telefoneLimpo,
                                    email: dadosCadastro.email || null,
                                    senha: hashedPassword,
                                    funcao: 'admin'
                                }
                            });
                        });

                        console.log(`✅ Loja ${assinatura.loja.nome} ativada após pagamento aprovado.`);
                    }
                }

                console.log(`✅ Assinatura ${assinatura.id} processada. Status: ${internalStatus}`);
            } else {
                // Processar pagamento de pedido (fluxo antigo)
                const order = await prisma.pedido.findUnique({
                    where: { id: referenceId },
                    include: { pagamento: true }
                });

                if (!order) {
                    console.error(`❌ Referência ${referenceId} não encontrada (nem assinatura nem pedido) para o pagamento ${data.id}`);
                    return res.status(404).json({ message: 'Referência não encontrada.' });
                }

                const internalStatus = mercadoPagoService.mapPaymentStatus(paymentData.status);

                if (order.pagamento) {
                    await prisma.pagamento.update({
                        where: { pedidoId: order.id },
                        data: {
                            status: internalStatus,
                            idTransacao: paymentData.id.toString()
                        }
                    });
                } else {
                    await prisma.pagamento.create({
                        data: {
                            pedidoId: order.id,
                            valor: parseFloat(paymentData.transaction_amount),
                            metodo: 'CREDIT_CARD',
                            status: internalStatus,
                            idTransacao: paymentData.id.toString()
                        }
                    });
                }

                if (internalStatus === 'PAID' && order.status !== 'CONCLUIDO') {
                    await prisma.pedido.update({
                        where: { id: order.id },
                        data: { status: 'CONFIRMADO' }
                    });
                }

                console.log(`✅ Pagamento de pedido ${order.id} processado. Status: ${internalStatus}`);
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        res.status(500).json({
            message: 'Erro ao processar webhook.',
            error: error.message
        });
    }
});

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
    // A MÁGICA ACONTECE AQUI! (MOVIMENTADO PARA CIMA)
    // Aplicamos o tenantMiddleware a TODAS as rotas /api.
    // Assim, o req.lojaId estará disponível para o /register e /login.
    // =======================================================
    app.use('/api', tenantMiddleware);

    // 3. Rotas de Autenticação (Agora já possuem acesso ao req.lojaId)
    app.use('/api/auth', authRoutes.router);
    app.use('/api/auth', passwordResetRoutes);

    // 4. Outras Rotas Privadas/Públicas da Loja
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
    app.use('/api/delivery-neighborhoods', deliveryNeighborhoodRoutes.router);
    app.use('/api/payments', mercadoPagoRoutes);
    app.use('/api/store-subscription', storeSubscriptionRoutes);
    
    // Rota de debug temporária
    const debugRoutes = require('./routes/debug');
    app.use('/api', debugRoutes);
    
    // Servir arquivos estáticos
    app.use('/uploads', express.static('uploads'));

    // Rota de teste raiz
    app.get('/', (req, res) => {
        res.send('API da Açaíteria funcionando!');
    });

    // Iniciar o servidor
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor da API rodando na porta ${PORT}`);
    });
});
