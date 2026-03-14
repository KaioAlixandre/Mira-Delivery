const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const axios = require('axios');

// Inicializar o cliente do Mercado Pago
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: {
        timeout: 5000,
        idempotencyKey: 'abc'
    }
});

const preference = new Preference(client);
const payment = new Payment(client);

/**
 * Cria uma preferência de pagamento no Mercado Pago
 * @param {Object} orderData - Dados do pedido
 * @param {Number} orderData.orderId - ID do pedido
 * @param {Number} orderData.totalAmount - Valor total do pedido
 * @param {String} orderData.description - Descrição do pedido
 * @param {Object} orderData.payer - Dados do pagador
 * @param {String} orderData.payer.name - Nome do pagador
 * @param {String} orderData.payer.email - Email do pagador
 * @param {String} orderData.payer.phone - Telefone do pagador (opcional)
 * @param {String} orderData.backUrl - URL de retorno após pagamento
 * @returns {Promise<Object>} Preferência criada
 */
async function createPreference(orderData) {
    try {
        // Garantir que backUrl seja uma URL válida
        const baseUrl = orderData.backUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
        const backUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        // Validar que backUrl é uma URL válida
        if (!backUrl || (!backUrl.startsWith('http://') && !backUrl.startsWith('https://'))) {
            throw new Error(`URL de retorno inválida: ${backUrl}. Deve começar com http:// ou https://`);
        }

        // Construir URLs de retorno
        const backUrls = {
            success: `${backUrl}/success`,
            failure: `${backUrl}/failure`,
            pending: `${backUrl}/pending`
        };

        // Validar que todas as URLs estão definidas ANTES de criar o preferenceData
        if (!backUrls.success || !backUrls.failure || !backUrls.pending) {
            throw new Error('Todas as URLs de retorno devem estar definidas. Verifique FRONTEND_URL no .env');
        }

        // Verificar se é localhost (não pode usar auto_return)
        const isLocalhost = backUrl.includes('localhost') || backUrl.includes('127.0.0.1');

        const preferenceData = {
            items: [
                {
                    title: orderData.description || `Pedido #${orderData.orderId}`,
                    quantity: 1,
                    unit_price: parseFloat(orderData.totalAmount),
                    currency_id: 'BRL'
                }
            ],
            payer: {
                name: orderData.payer.name,
                email: orderData.payer.email,
                ...(orderData.payer.phone && { phone: { number: orderData.payer.phone } })
            },
            back_urls: backUrls,
            external_reference: orderData.orderId.toString(),
            notification_url: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/payments/webhook`,
            statement_descriptor: 'MIRA DELIVERY'
        };

        // IMPORTANTE: Mercado Pago NÃO aceita auto_return com URLs localhost
        // Só adicionar auto_return se NÃO for localhost
        if (!isLocalhost) {
            preferenceData.auto_return = 'approved';
        }

        console.log('📋 Criando preferência com URLs:', {
            success: preferenceData.back_urls.success,
            failure: preferenceData.back_urls.failure,
            pending: preferenceData.back_urls.pending,
            backUrl_recebido: orderData.backUrl,
            backUrl_processado: backUrl,
            isLocalhost: isLocalhost,
            auto_return: preferenceData.auto_return || 'não definido (localhost)',
            back_urls_object: JSON.stringify(preferenceData.back_urls)
        });

        const response = await preference.create({ body: preferenceData });
        return response;
    } catch (error) {
        console.error('❌ Erro ao criar preferência no Mercado Pago:', error);
        throw error;
    }
}

/**
 * Busca informações de um pagamento pelo ID
 * @param {String} paymentId - ID do pagamento no Mercado Pago
 * @returns {Promise<Object>} Dados do pagamento
 */
async function getPayment(paymentId) {
    try {
        const response = await payment.get({ id: paymentId });
        return response;
    } catch (error) {
        console.error('❌ Erro ao buscar pagamento no Mercado Pago:', error);
        throw error;
    }
}

/**
 * Processa notificação de webhook do Mercado Pago
 * @param {Object} notificationData - Dados da notificação
 * @returns {Promise<Object>} Dados do pagamento atualizado
 */
async function processWebhook(notificationData) {
    try {
        const { type, data } = notificationData;
        
        if (type === 'payment') {
            const paymentData = await getPayment(data.id);
            return paymentData;
        }
        
        return null;
    } catch (error) {
        console.error('❌ Erro ao processar webhook do Mercado Pago:', error);
        throw error;
    }
}

/**
 * Busca pagamentos por external_reference (ID da assinatura)
 * @param {String} externalReference - ID da assinatura
 * @returns {Promise<Array>} Lista de pagamentos encontrados
 */
async function searchPaymentsByReference(externalReference) {
    try {
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        const response = await axios.get(
            `https://api.mercadopago.com/v1/payments/search`,
            {
                params: {
                    external_reference: externalReference,
                    sort: 'date_created',
                    criteria: 'desc'
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data.results || [];
    } catch (error) {
        console.error('❌ Erro ao buscar pagamentos por referência:', error);
        throw error;
    }
}

/**
 * Mapeia o status do Mercado Pago para o status interno
 * @param {String} mpStatus - Status do Mercado Pago
 * @returns {String} Status interno
 */
function mapPaymentStatus(mpStatus) {
    const statusMap = {
        'approved': 'PAID',
        'pending': 'PENDING',
        'in_process': 'PENDING',
        'rejected': 'FAILED',
        'cancelled': 'FAILED',
        'refunded': 'REFUNDED',
        'charged_back': 'REFUNDED'
    };
    
    return statusMap[mpStatus] || 'PENDING';
}

module.exports = {
    createPreference,
    getPayment,
    processWebhook,
    mapPaymentStatus,
    searchPaymentsByReference
};

