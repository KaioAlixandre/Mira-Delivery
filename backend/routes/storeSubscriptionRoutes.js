const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mercadoPagoService = require('../services/mercadoPagoService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Preços dos planos
const PLANOS = {
    simples: 97,
    pro: 197,
    plus: 270
};

/**
 * POST /api/store-subscription/create-preference
 * Cria uma preferência de pagamento para cadastro de loja
 */
router.post('/create-preference', async (req, res) => {
    try {
        const { nomeLoja, subdominioDesejado, username, telefone, password, email, planoMensal } = req.body;

        // Validações
        if (!nomeLoja || !subdominioDesejado || !username || !telefone || !password || !planoMensal) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        if (!['simples', 'pro', 'plus'].includes(planoMensal)) {
            return res.status(400).json({ message: 'Plano inválido.' });
        }

        // Verificar se o subdomínio já existe
        const subdominioFormatado = subdominioDesejado
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        if (!subdominioFormatado) {
            return res.status(400).json({ message: 'Subdomínio inválido.' });
        }

        const lojaExistente = await prisma.loja.findUnique({
            where: { subdominio: subdominioFormatado }
        });

        if (lojaExistente) {
            return res.status(409).json({ message: 'Este subdomínio já está em uso. Escolha outro.' });
        }

        // Criar loja temporária (inativa) para vincular a assinatura
        const lojaTemporaria = await prisma.loja.create({
            data: {
                nome: nomeLoja,
                subdominio: subdominioFormatado,
                corPrimaria: '#FF0000',
                planoMensal: planoMensal,
                ativa: false // Loja só será ativada após pagamento confirmado
            }
        });

        // Criar assinatura pendente
        const valorPlano = PLANOS[planoMensal];
        const assinatura = await prisma.assinatura_loja.create({
            data: {
                lojaId: lojaTemporaria.id,
                valor: valorPlano,
                plano: planoMensal,
                status: 'PENDING',
                dadosCadastro: {
                    nomeLoja,
                    subdominioDesejado: subdominioFormatado,
                    username,
                    telefone,
                    password, // Será hashado quando a loja for criada
                    email: email || null
                }
            }
        });

        // Criar preferência no Mercado Pago
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const backUrl = `${frontendUrl}/cadastro`;
        
        console.log('🔗 URL de retorno configurada:', backUrl);

        const preferenceData = {
            orderId: assinatura.id.toString(), // Usar ID da assinatura como referência
            totalAmount: valorPlano,
            description: `Assinatura ${planoMensal.toUpperCase()} - ${nomeLoja}`,
            payer: {
                name: username,
                email: email || `${subdominioFormatado}@miradelivery.com.br`,
                phone: telefone
            },
            backUrl: backUrl
        };

        const preference = await mercadoPagoService.createPreference(preferenceData);

        // Atualizar assinatura com ID da preferência
        await prisma.assinatura_loja.update({
            where: { id: assinatura.id },
            data: { idPreferencia: preference.id }
        });

        res.status(200).json({
            preferenceId: preference.id,
            initPoint: preference.init_point,
            sandboxInitPoint: preference.sandbox_init_point,
            assinaturaId: assinatura.id
        });
    } catch (error) {
        console.error('❌ Erro ao criar preferência de assinatura:', error);
        res.status(500).json({
            message: 'Erro ao criar preferência de pagamento.',
            error: error.message
        });
    }
});

/**
 * GET /api/store-subscription/status/:assinaturaId
 * Consulta o status de uma assinatura e atualiza se necessário
 */
router.get('/status/:assinaturaId', async (req, res) => {
    try {
        const { assinaturaId } = req.params;

        // Validar que assinaturaId é um número válido
        const id = parseInt(assinaturaId, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ 
                message: 'ID de assinatura inválido.',
                received: assinaturaId
            });
        }

        const assinatura = await prisma.assinatura_loja.findUnique({
            where: { id: id },
            include: { loja: true }
        });

        if (!assinatura) {
            return res.status(404).json({ message: 'Assinatura não encontrada.' });
        }

        // Se já foi pago, retornar dados da loja
        if (assinatura.status === 'PAID') {
            return res.status(200).json({
                status: 'PAID',
                loja: {
                    id: assinatura.loja.id,
                    nome: assinatura.loja.nome,
                    subdominio: assinatura.loja.subdominio,
                    ativa: assinatura.loja.ativa
                }
            });
        }

        // Se tem ID de transação, buscar status atualizado no Mercado Pago
        if (assinatura.idTransacao) {
            try {
                const paymentData = await mercadoPagoService.getPayment(assinatura.idTransacao);
                const internalStatus = mercadoPagoService.mapPaymentStatus(paymentData.status);

                // Se o status mudou, atualizar no banco
                if (internalStatus !== assinatura.status) {
                    await prisma.assinatura_loja.update({
                        where: { id: assinatura.id },
                        data: { status: internalStatus }
                    });

                    // Se foi aprovado, processar
                    if (internalStatus === 'PAID') {
                        const dadosCadastro = assinatura.dadosCadastro || {};
                        
                        // Verificar se é upgrade de plano
                        if (dadosCadastro.tipo === 'upgrade') {
                            await prisma.loja.update({
                                where: { id: assinatura.loja.id },
                                data: { planoMensal: assinatura.plano }
                            });
                            console.log(`✅ Plano da loja ${assinatura.loja.nome} atualizado para ${assinatura.plano} após verificação manual.`);
                        }
                        // Se não está ativa, criar a loja completa (cadastro inicial)
                        else if (!assinatura.loja.ativa) {
                            const bcrypt = require('bcrypt');
                            const removePhoneMask = (phone) => phone ? phone.toString().replace(/\D/g, '') : phone;
                            const telefoneLimpo = removePhoneMask(dadosCadastro.telefone);
                            const hashedPassword = await bcrypt.hash(dadosCadastro.password, 10);

                            await prisma.$transaction(async (tx) => {
                                await tx.loja.update({
                                    where: { id: assinatura.loja.id },
                                    data: { ativa: true }
                                });

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

                            console.log(`✅ Loja ${assinatura.loja.nome} ativada após verificação manual de pagamento.`);
                        }
                    }

                    return res.status(200).json({
                        status: internalStatus,
                        updated: true,
                        loja: {
                            id: assinatura.loja.id,
                            nome: assinatura.loja.nome,
                            subdominio: assinatura.loja.subdominio,
                            ativa: internalStatus === 'PAID' ? true : assinatura.loja.ativa
                        }
                    });
                }
            } catch (mpError) {
                console.warn('⚠️ Erro ao buscar status no Mercado Pago:', mpError.message);
            }
        }

        // Se tem preferência mas não tem transação ainda, tentar buscar pagamentos pela referência externa
        if (assinatura.idPreferencia && !assinatura.idTransacao) {
            try {
                // Buscar pagamentos pela referência externa (ID da assinatura)
                const payments = await mercadoPagoService.searchPaymentsByReference(assinatura.id.toString());
                
                if (payments && payments.length > 0) {
                    // Pegar o pagamento mais recente
                    const latestPayment = payments[0];
                    const internalStatus = mercadoPagoService.mapPaymentStatus(latestPayment.status);
                    
                    console.log(`🔍 Pagamento encontrado para assinatura ${assinatura.id}:`, {
                        paymentId: latestPayment.id,
                        status: latestPayment.status,
                        internalStatus: internalStatus
                    });
                    
                    // Atualizar assinatura com ID da transação e status
                    await prisma.assinatura_loja.update({
                        where: { id: assinatura.id },
                        data: {
                            status: internalStatus,
                            idTransacao: latestPayment.id.toString()
                        }
                    });
                    
                    // Se foi aprovado, processar
                    if (internalStatus === 'PAID') {
                        const dadosCadastro = assinatura.dadosCadastro || {};
                        
                        // Verificar se é upgrade de plano
                        if (dadosCadastro.tipo === 'upgrade') {
                            await prisma.loja.update({
                                where: { id: assinatura.loja.id },
                                data: { planoMensal: assinatura.plano }
                            });
                            console.log(`✅ Plano da loja ${assinatura.loja.nome} atualizado para ${assinatura.plano} após busca manual.`);
                        }
                        // Se não está ativa, criar a loja completa (cadastro inicial)
                        else if (!assinatura.loja.ativa) {
                            const bcrypt = require('bcrypt');
                            const removePhoneMask = (phone) => phone ? phone.toString().replace(/\D/g, '') : phone;
                            const telefoneLimpo = removePhoneMask(dadosCadastro.telefone);
                            const hashedPassword = await bcrypt.hash(dadosCadastro.password, 10);

                            await prisma.$transaction(async (tx) => {
                                await tx.loja.update({
                                    where: { id: assinatura.loja.id },
                                    data: { ativa: true }
                                });

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

                            console.log(`✅ Loja ${assinatura.loja.nome} ativada após busca manual de pagamento.`);
                        }
                    }
                    
                    return res.status(200).json({
                        status: internalStatus,
                        updated: true,
                        loja: {
                            id: assinatura.loja.id,
                            nome: assinatura.loja.nome,
                            subdominio: assinatura.loja.subdominio,
                            ativa: internalStatus === 'PAID' ? true : assinatura.loja.ativa
                        }
                    });
                }
            } catch (searchError) {
                console.warn('⚠️ Erro ao buscar pagamentos por referência:', searchError.message);
            }
            
            // Se não encontrou pagamento, retornar status atual
            return res.status(200).json({
                status: assinatura.status,
                preferenceId: assinatura.idPreferencia,
                message: 'Aguardando confirmação de pagamento. Verifique novamente em alguns instantes.',
                loja: {
                    id: assinatura.loja.id,
                    nome: assinatura.loja.nome,
                    subdominio: assinatura.loja.subdominio,
                    ativa: assinatura.loja.ativa
                }
            });
        }

        res.status(200).json({
            status: assinatura.status,
            loja: {
                id: assinatura.loja.id,
                nome: assinatura.loja.nome,
                subdominio: assinatura.loja.subdominio,
                ativa: assinatura.loja.ativa
            }
        });
    } catch (error) {
        console.error('❌ Erro ao consultar status da assinatura:', error);
        res.status(500).json({
            message: 'Erro ao consultar status da assinatura.',
            error: error.message
        });
    }
});

/**
 * POST /api/store-subscription/check-payment/:preferenceId
 * Verifica pagamentos de uma preferência (para casos onde o webhook não foi recebido)
 */
router.post('/check-payment/:preferenceId', async (req, res) => {
    try {
        const { preferenceId } = req.params;

        // Buscar assinatura pela preferência
        const assinatura = await prisma.assinatura_loja.findFirst({
            where: { idPreferencia: preferenceId },
            include: { loja: true }
        });

        if (!assinatura) {
            return res.status(404).json({ message: 'Assinatura não encontrada para esta preferência.' });
        }

        // Buscar pagamentos recentes no Mercado Pago
        // Nota: O Mercado Pago não permite buscar diretamente pela preferência,
        // mas podemos tentar buscar pela referência externa
        try {
            // Se já temos ID de transação, buscar status atualizado
            if (assinatura.idTransacao) {
                const paymentData = await mercadoPagoService.getPayment(assinatura.idTransacao);
                const internalStatus = mercadoPagoService.mapPaymentStatus(paymentData.status);

                if (internalStatus !== assinatura.status) {
                    await prisma.assinatura_loja.update({
                        where: { id: assinatura.id },
                        data: { status: internalStatus }
                    });

                    // Processar ativação se necessário
                    if (internalStatus === 'PAID' && !assinatura.loja.ativa) {
                        const dadosCadastro = assinatura.dadosCadastro;
                        const bcrypt = require('bcrypt');
                        const removePhoneMask = (phone) => phone ? phone.toString().replace(/\D/g, '') : phone;
                        const telefoneLimpo = removePhoneMask(dadosCadastro.telefone);
                        const hashedPassword = await bcrypt.hash(dadosCadastro.password, 10);

                        await prisma.$transaction(async (tx) => {
                            await tx.loja.update({
                                where: { id: assinatura.loja.id },
                                data: { ativa: true }
                            });

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

                        console.log(`✅ Loja ${assinatura.loja.nome} ativada após verificação manual.`);
                    }
                }

                return res.status(200).json({
                    status: internalStatus,
                    updated: true,
                    assinaturaId: assinatura.id,
                    loja: {
                        id: assinatura.loja.id,
                        nome: assinatura.loja.nome,
                        subdominio: assinatura.loja.subdominio,
                        ativa: internalStatus === 'PAID' ? true : assinatura.loja.ativa
                    }
                });
            }
        } catch (mpError) {
            console.warn('⚠️ Erro ao verificar pagamento no Mercado Pago:', mpError.message);
        }

        res.status(200).json({
            status: assinatura.status,
            assinaturaId: assinatura.id,
            loja: {
                id: assinatura.loja.id,
                nome: assinatura.loja.nome,
                subdominio: assinatura.loja.subdominio,
                ativa: assinatura.loja.ativa
            }
        });
    } catch (error) {
        console.error('❌ Erro ao verificar pagamento:', error);
        res.status(500).json({
            message: 'Erro ao verificar pagamento.',
            error: error.message
        });
    }
});

/**
 * GET /api/store-subscription/finalize/:assinaturaId
 * Finaliza o cadastro e retorna token de acesso após pagamento confirmado
 */
router.get('/finalize/:assinaturaId', async (req, res) => {
    try {
        const { assinaturaId } = req.params;

        // Validar que assinaturaId é um número válido
        const id = parseInt(assinaturaId, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ 
                message: 'ID de assinatura inválido.',
                received: assinaturaId
            });
        }

        const assinatura = await prisma.assinatura_loja.findUnique({
            where: { id: id },
            include: { 
                loja: {
                    include: {
                        usuarios: {
                            where: { funcao: 'admin' },
                            take: 1
                        }
                    }
                }
            }
        });

        if (!assinatura) {
            return res.status(404).json({ message: 'Assinatura não encontrada.' });
        }

        if (assinatura.status !== 'PAID') {
            return res.status(400).json({ 
                message: 'Pagamento ainda não foi confirmado.',
                status: assinatura.status
            });
        }

        if (!assinatura.loja.ativa) {
            return res.status(400).json({ 
                message: 'Loja ainda não foi ativada. Aguarde o processamento do pagamento.'
            });
        }

        // Buscar usuário admin da loja
        const adminUser = assinatura.loja.usuarios[0];
        if (!adminUser) {
            return res.status(500).json({ message: 'Usuário admin não encontrado para esta loja.' });
        }

        // Gerar token de login
        const token = jwt.sign(
            { id: adminUser.id, role: adminUser.funcao },
            JWT_SECRET,
            { expiresIn: '365d' }
        );

        res.status(200).json({
            message: 'Cadastro finalizado com sucesso!',
            loja: {
                id: assinatura.loja.id,
                nome: assinatura.loja.nome,
                subdominio: assinatura.loja.subdominio,
                ativa: assinatura.loja.ativa
            },
            token,
            user: {
                id: adminUser.id,
                username: adminUser.nomeUsuario,
                role: adminUser.funcao
            }
        });
    } catch (error) {
        console.error('❌ Erro ao finalizar cadastro:', error);
        res.status(500).json({
            message: 'Erro ao finalizar cadastro.',
            error: error.message
        });
    }
});

/**
 * POST /api/store-subscription/upgrade-plan
 * Cria uma preferência de pagamento para atualização de plano de uma loja existente
 * Requer autenticação e usa req.lojaId do tenantMiddleware
 */
const { authenticateToken } = require('./auth');
router.post('/upgrade-plan', authenticateToken, async (req, res) => {
    try {
        const { novoPlano } = req.body;
        const lojaId = req.lojaId; // Obtido do tenantMiddleware

        // Validações
        if (!novoPlano) {
            return res.status(400).json({ message: 'Novo plano é obrigatório.' });
        }

        if (!['simples', 'pro', 'plus'].includes(novoPlano)) {
            return res.status(400).json({ message: 'Plano inválido.' });
        }

        if (!lojaId) {
            return res.status(400).json({ message: 'Loja não identificada.' });
        }

        // Buscar loja existente
        const loja = await prisma.loja.findUnique({
            where: { id: lojaId },
            include: {
                usuarios: {
                    where: { funcao: 'admin' },
                    take: 1
                }
            }
        });

        if (!loja) {
            return res.status(404).json({ message: 'Loja não encontrada.' });
        }

        if (!loja.ativa) {
            return res.status(400).json({ message: 'Loja não está ativa. Ative a loja primeiro.' });
        }

        // Verificar se já está no mesmo plano
        if (loja.planoMensal === novoPlano) {
            return res.status(400).json({ message: 'A loja já está neste plano.' });
        }

        const adminUser = loja.usuarios[0];
        if (!adminUser) {
            return res.status(400).json({ message: 'Usuário admin não encontrado para esta loja.' });
        }

        // Criar assinatura pendente para upgrade
        const valorPlano = PLANOS[novoPlano];
        const assinatura = await prisma.assinatura_loja.create({
            data: {
                lojaId: loja.id,
                valor: valorPlano,
                plano: novoPlano,
                status: 'PENDING',
                dadosCadastro: {
                    tipo: 'upgrade',
                    planoAnterior: loja.planoMensal,
                    novoPlano: novoPlano
                }
            }
        });

        // Criar preferência no Mercado Pago
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const backUrl = `${frontendUrl}/admin/plano`;
        
        console.log('🔗 URL de retorno configurada para upgrade:', backUrl);

        const preferenceData = {
            orderId: assinatura.id.toString(),
            totalAmount: valorPlano,
            description: `Upgrade de Plano ${novoPlano.toUpperCase()} - ${loja.nome}`,
            payer: {
                name: adminUser.nomeUsuario,
                email: adminUser.email || `${loja.subdominio}@miradelivery.com.br`,
                phone: adminUser.telefone
            },
            backUrl: backUrl
        };

        const preference = await mercadoPagoService.createPreference(preferenceData);

        // Atualizar assinatura com ID da preferência
        await prisma.assinatura_loja.update({
            where: { id: assinatura.id },
            data: { idPreferencia: preference.id }
        });

        res.status(200).json({
            preferenceId: preference.id,
            initPoint: preference.init_point,
            sandboxInitPoint: preference.sandbox_init_point,
            assinaturaId: assinatura.id
        });
    } catch (error) {
        console.error('❌ Erro ao criar preferência de upgrade:', error);
        res.status(500).json({
            message: 'Erro ao criar preferência de pagamento.',
            error: error.message
        });
    }
});

/**
 * GET /api/store-subscription/list
 * Lista todas as assinaturas (útil para debug - encontrar IDs)
 */
router.get('/list', async (req, res) => {
    try {
        const assinaturas = await prisma.assinatura_loja.findMany({
            include: {
                loja: {
                    select: {
                        id: true,
                        nome: true,
                        subdominio: true,
                        ativa: true
                    }
                }
            },
            orderBy: {
                criadoEm: 'desc'
            }
        });

        const resultado = assinaturas.map(assinatura => ({
            id: assinatura.id,
            lojaId: assinatura.lojaId,
            lojaNome: assinatura.loja.nome,
            lojaSubdominio: assinatura.loja.subdominio,
            lojaAtiva: assinatura.loja.ativa,
            status: assinatura.status,
            valor: Number(assinatura.valor),
            plano: assinatura.plano,
            idTransacao: assinatura.idTransacao,
            idPreferencia: assinatura.idPreferencia,
            criadoEm: assinatura.criadoEm.toISOString(),
            atualizadoEm: assinatura.atualizadoEm.toISOString()
        }));

        res.status(200).json({
            total: resultado.length,
            assinaturas: resultado
        });
    } catch (error) {
        console.error('❌ Erro ao listar assinaturas:', error);
        res.status(500).json({
            message: 'Erro ao listar assinaturas.',
            error: error.message
        });
    }
});

module.exports = router;

