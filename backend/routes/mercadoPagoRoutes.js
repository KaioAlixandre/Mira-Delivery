const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mercadoPagoService = require('../services/mercadoPagoService');
const { authenticateToken } = require('./auth');

/**
 * POST /api/payments/create-preference
 * Cria uma preferência de pagamento no Mercado Pago
 */
router.post('/create-preference', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user.id;

        if (!orderId) {
            return res.status(400).json({ message: 'ID do pedido é obrigatório.' });
        }

        // Buscar o pedido e verificar se pertence ao usuário
        const order = await prisma.pedido.findFirst({
            where: {
                id: parseInt(orderId),
                usuarioId: userId,
                lojaId: req.lojaId
            },
            include: {
                usuario: true,
                pagamento: true
            }
        });

        if (!order) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        // Verificar se o pedido já foi pago
        if (order.pagamento && order.pagamento.status === 'PAID') {
            return res.status(400).json({ message: 'Este pedido já foi pago.' });
        }

        // Verificar se já existe uma preferência para este pedido
        if (order.pagamento && order.pagamento.idTransacao) {
            // Se já existe, retornar a preferência existente
            return res.status(200).json({
                preferenceId: order.pagamento.idTransacao,
                initPoint: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${order.pagamento.idTransacao}`,
                message: 'Preferência já existe para este pedido.'
            });
        }

        // Criar preferência no Mercado Pago
        const preferenceData = {
            orderId: order.id,
            totalAmount: parseFloat(order.precoTotal),
            description: `Pedido #${order.id} - ${req.lojaId ? 'Loja' : 'Delivery'}`,
            payer: {
                name: order.usuario.nome || 'Cliente',
                email: order.usuario.email,
                phone: order.telefoneEntrega || undefined
            },
            backUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
        };

        const preference = await mercadoPagoService.createPreference(preferenceData);

        // Atualizar o pagamento com o ID da preferência
        if (order.pagamento) {
            await prisma.pagamento.update({
                where: { pedidoId: order.id },
                data: {
                    idTransacao: preference.id,
                    status: 'PENDING'
                }
            });
        } else {
            await prisma.pagamento.create({
                data: {
                    pedidoId: order.id,
                    valor: order.precoTotal,
                    metodo: 'CREDIT_CARD',
                    status: 'PENDING',
                    idTransacao: preference.id
                }
            });
        }

        res.status(200).json({
            preferenceId: preference.id,
            initPoint: preference.init_point,
            sandboxInitPoint: preference.sandbox_init_point
        });
    } catch (error) {
        console.error('❌ Erro ao criar preferência de pagamento:', error);
        res.status(500).json({
            message: 'Erro ao criar preferência de pagamento.',
            error: error.message
        });
    }
});

/**
 * NOTA: A rota /webhook está implementada diretamente no server.js
 * para não usar o tenantMiddleware, pois é chamada pelo Mercado Pago
 */

/**
 * GET /api/payments/status/:orderId
 * Consulta o status de um pagamento
 */
router.get('/status/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await prisma.pedido.findFirst({
            where: {
                id: parseInt(orderId),
                usuarioId: userId,
                lojaId: req.lojaId
            },
            include: {
                pagamento: true
            }
        });

        if (!order) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        if (!order.pagamento || !order.pagamento.idTransacao) {
            return res.status(404).json({ message: 'Pagamento não encontrado para este pedido.' });
        }

        // Buscar status atualizado no Mercado Pago
        try {
            const paymentData = await mercadoPagoService.getPayment(order.pagamento.idTransacao);
            const internalStatus = mercadoPagoService.mapPaymentStatus(paymentData.status);

            // Atualizar status no banco se mudou
            if (internalStatus !== order.pagamento.status) {
                await prisma.pagamento.update({
                    where: { pedidoId: order.id },
                    data: { status: internalStatus }
                });

                // Se foi aprovado, atualizar pedido
                if (internalStatus === 'PAID' && order.status !== 'CONCLUIDO') {
                    await prisma.pedido.update({
                        where: { id: order.id },
                        data: { status: 'CONFIRMADO' }
                    });
                }
            }

            res.status(200).json({
                orderId: order.id,
                paymentStatus: internalStatus,
                mercadoPagoStatus: paymentData.status,
                paymentId: paymentData.id,
                amount: paymentData.transaction_amount
            });
        } catch (mpError) {
            // Se der erro ao buscar no MP, retornar status do banco
            console.warn('⚠️ Erro ao buscar status no Mercado Pago, retornando status do banco:', mpError.message);
            res.status(200).json({
                orderId: order.id,
                paymentStatus: order.pagamento.status,
                paymentId: order.pagamento.idTransacao
            });
        }
    } catch (error) {
        console.error('❌ Erro ao consultar status do pagamento:', error);
        res.status(500).json({
            message: 'Erro ao consultar status do pagamento.',
            error: error.message
        });
    }
});

module.exports = router;

