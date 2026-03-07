const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, authorize } = require('./auth');
const { sendDeliveryNotifications, sendPickupNotification, sendPaymentConfirmationNotification, sendCookNotification, sendDeliveredConfirmationNotification, sendOrderCancellationNotification, sendOrderEditNotification } = require('../services/messageService');
const axios = require('axios');

// Função auxiliar para parsear opcoesSelecionadasSnapshot corretamente
// Garante que o JSON seja sempre parseado, mesmo quando vem como string do MySQL/Prisma
function parseOptionsSnapshot(snapshot) {
    if (!snapshot) {
        return null;
    }
    
    // Se já é um objeto, retornar diretamente
    if (typeof snapshot === 'object' && snapshot !== null) {
        return snapshot;
    }
    
    // Se é uma string, tentar fazer parse
    if (typeof snapshot === 'string') {
        try {
            return JSON.parse(snapshot);
        } catch (err) {
            console.warn('⚠️ Erro ao fazer parse do opcoesSelecionadasSnapshot:', err.message, 'Snapshot:', snapshot);
            return null;
        }
    }
    
    return null;
}

// Função auxiliar para obter credenciais Z-API da loja (DB) com fallback para env vars
async function getZApiCredentials(lojaId) {
  try {
    if (lojaId) {
      const config = await prisma.configuracao_loja.findUnique({ where: { lojaId } });
      if (config?.zapApiToken && config?.zapApiInstance && config?.zapApiClientToken) {
        return {
          zapApiToken: config.zapApiToken,
          zapApiInstance: config.zapApiInstance,
          zapApiClientToken: config.zapApiClientToken,
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ [Z-API] Erro ao buscar credenciais da loja, usando env vars:', err.message);
  }
  return {
    zapApiToken: process.env.zapApiToken,
    zapApiInstance: process.env.zapApiInstance,
    zapApiClientToken: process.env.zapApiClientToken,
  };
}

// Função para enviar mensagem via WhatsApp usando a Z-API (com client-token no header)
async function sendWhatsAppMessageZApi(phone, message, lojaId) {
  const cleanPhone = phone.replace(/\D/g, '');
  const { zapApiToken, zapApiInstance, zapApiClientToken } = await getZApiCredentials(lojaId);
  const zapApiUrl = `https://api.z-api.io/instances/${zapApiInstance}/token/${zapApiToken}/send-text`;

  await axios.post(
    zapApiUrl,
    {
      phone: `55${cleanPhone}`,
      message
    },
    {
      headers: {
        'client-token': zapApiClientToken
      }
    }
  );
}

// Função para enviar mensagem com botão de copiar código (OTP Button) usando a Z-API
async function sendWhatsAppButtonOtpZApi(phone, message, code, lojaId, buttonText) {
  const cleanPhone = phone.replace(/\D/g, '');
  const { zapApiToken, zapApiInstance, zapApiClientToken } = await getZApiCredentials(lojaId);
  const zapApiUrl = `https://api.z-api.io/instances/${zapApiInstance}/token/${zapApiToken}/send-button-otp`;

  const body = {
    phone: `55${cleanPhone}`,
    message,
    code: String(code ?? '')
  };

  if (buttonText) {
    body.buttonText = buttonText;
  }

  console.log('📱 [Z-API] Enviando send-button-otp para:', `55${cleanPhone}`);
  console.log('📱 [Z-API] Body:', JSON.stringify(body, null, 2));

  const response = await axios.post(
    zapApiUrl,
    body,
    {
      headers: {
        'client-token': zapApiClientToken,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('✅ [Z-API] send-button-otp resposta:', response.status, JSON.stringify(response.data));
  return response;
}

// Função auxiliar para formatar item do carrinho com sabores e complementos
async function formatCartItemForMessage(item, allFlavors = []) {
    try {
        const productName = item.produto?.nome || 'Produto';
        const quantity = item.quantidade || 1;
        
        // Buscar complementos
        const complementosList = [];
        if (item.complementos && item.complementos.length > 0) {
            item.complementos.forEach(ic => {
                const complementName = ic.complemento?.nome;
                if (complementName) {
                    complementosList.push(complementName);
                }
            });
        }

        // Buscar adicionais
        const adicionaisList = [];
        if (item.adicionais && item.adicionais.length > 0) {
            item.adicionais.forEach(ia => {
                const additionalName = ia.adicional?.nome;
                const additionalQty = Number(ia.quantidade || 1);
                if (additionalName) {
                    adicionaisList.push(`${additionalQty}x ${additionalName}`);
                }
            });
        }
        
        // Buscar sabores do opcoesSelecionadas
        const saboresList = [];
        const optionsSnapshot = item.opcoesSelecionadas;
        const parsedSnapshot = parseOptionsSnapshot(optionsSnapshot);
        
        if (parsedSnapshot && allFlavors.length > 0) {
            let selectedFlavors = {};
            
            if (parsedSnapshot.selectedFlavors) {
                selectedFlavors = parsedSnapshot.selectedFlavors;
            } else if (parsedSnapshot.flavors) {
                selectedFlavors = parsedSnapshot.flavors;
            }
            
            if (Object.keys(selectedFlavors).length > 0) {
                const flavorIds = [];
                Object.values(selectedFlavors).forEach((ids) => {
                    if (Array.isArray(ids)) {
                        flavorIds.push(...ids.map(id => Number(id)));
                    }
                });
                
                // Mapear IDs para nomes dos sabores
                const flavors = allFlavors.filter(flavor => 
                    flavorIds.includes(flavor.id) || flavorIds.includes(Number(flavor.id))
                );
                
                flavors.forEach(flavor => {
                    const flavorName = flavor.nome || flavor.name;
                    if (flavorName) {
                        saboresList.push(flavorName);
                    }
                });
            }
        }
        
        // Formatar string do item
        let itemText = `• ${quantity}x ${productName}`;
        
        if (saboresList.length > 0) {
            itemText += `\n  Sabores: ${saboresList.join(', ')}`;
        }
        
        if (complementosList.length > 0) {
            itemText += `\n  Complementos: ${complementosList.join(', ')}`;
        }

        if (adicionaisList.length > 0) {
            itemText += `\n  Adicionais: ${adicionaisList.join(', ')}`;
        }
        
        return itemText;
    } catch (error) {
        console.error('❌ Erro ao formatar item do carrinho:', error);
        const productName = item.produto?.nome || 'Produto';
        const quantity = item.quantidade || 1;
        return `• ${quantity}x ${productName}`;
    }
}

// Rota para criar um pedido a partir do carrinho
router.post('/', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { paymentMethod, tipoEntrega, deliveryType, taxaEntrega, deliveryFee, notes, addressId, precisaTroco, valorTroco } = req.body;
    
    // Aceitar tanto deliveryType (do frontend) quanto tipoEntrega
    const tipo = deliveryType || tipoEntrega || 'delivery';
    
    // Aceitar tanto deliveryFee (do frontend) quanto taxaEntrega
    let taxa = deliveryFee || taxaEntrega || 0;
    
    if (!paymentMethod) {
        return res.status(400).json({ message: 'Forma de pagamento não informada.' });
    }
    console.log(`[POST /api/orders] Recebida requisição para criar um pedido. Usuário ID: ${userId}, Tipo: ${tipo}, Taxa: R$ ${taxa}${notes ? ', Observações: Sim' : ''}${addressId ? `, Endereço ID: ${addressId}` : ''}`);

    try {
        if (tipo === 'delivery') {
            const storeConfig = await prisma.configuracao_loja.findUnique({
                where: { lojaId: req.lojaId }
            });
            const deliveryEnabled = (storeConfig?.deliveryAtivo ?? true);
            if (!deliveryEnabled) {
                return res.status(400).json({
                    message: 'Entrega em casa está desativada no momento. Selecione retirada no local.',
                    deliveryDisabled: true
                });
            }
        }

        // Encontrar o carrinho e o usuário com seus endereços em uma única busca
        const [cart, user] = await Promise.all([
            prisma.carrinho.findUnique({
                where: { usuarioId: userId },
                include: {
                    itens: {
                        include: {
                            produto: true,
                            complementos: {
                                include: {
                                    complemento: true
                                }
                            },
                            adicionais: {
                                include: {
                                    adicional: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.usuario.findUnique({
                where: { id: userId },
                include: {
                    enderecos: true
                }
            })
        ]);

        if (!user || user.lojaId !== req.lojaId) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        if (cart && cart.lojaId !== req.lojaId) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        if (!cart || cart.itens.length === 0) {
            console.warn(`[POST /api/orders] Carrinho do usuário ${userId} está vazio.`);
            return res.status(400).json({ message: 'Carrinho vazio. Adicione itens antes de criar um pedido.' });
        }

        // Para entrega, verificar se tem endereço
        let shippingAddress = null;
        if (tipo === 'delivery') {
            // Se foi fornecido um addressId, usar esse endereço específico
            if (addressId) {
                shippingAddress = user.enderecos.find(addr => addr.id === parseInt(addressId));
                if (!shippingAddress) {
                    console.warn(`[POST /api/orders] Endereço ID ${addressId} não encontrado para o usuário ${userId}.`);
                    return res.status(400).json({
                        message: 'Endereço selecionado não encontrado. Por favor, selecione um endereço válido.',
                        redirectPath: '/checkout'
                    });
                }
                console.log(`[POST /api/orders] Usando endereço selecionado ID: ${addressId}`);
            } else {
                // Fallback: usar endereço padrão ou o primeiro disponível
            shippingAddress = user.enderecos.find(addr => addr.padrao) || user.enderecos[0];
                console.log(`[POST /api/orders] Usando endereço padrão ou primeiro disponível`);
            }
            
            if (!shippingAddress) {
                console.warn(`[POST /api/orders] Usuário ${userId} não possui endereço de entrega cadastrado.`);
                return res.status(400).json({
                    message: 'Nenhum endereço de entrega encontrado. Por favor, cadastre um para continuar.',
                    redirectPath: '/api/auth/profile/enderecos'
                });
            }
        }
        
        // Calcular o preço total do pedido (SEM taxa de entrega ainda)
        const subprecoTotal = cart.itens.reduce((acc, item) => {
            // Verificar se é produto personalizado
            let itemPrice = item.produto.preco;
            if (item.opcoesSelecionadas) {
                if (item.opcoesSelecionadas.customAcai) {
                    itemPrice = item.opcoesSelecionadas.customAcai.value;
                } else if (item.opcoesSelecionadas.customSorvete) {
                    itemPrice = item.opcoesSelecionadas.customSorvete.value;
                } else if (item.opcoesSelecionadas.customProduct) {
                    itemPrice = item.opcoesSelecionadas.customProduct.value;
                }
            }

            const adicionaisTotal = (item.adicionais && item.adicionais.length > 0)
                ? item.adicionais.reduce((sum, a) => {
                    const value = Number(a.adicional?.valor || 0);
                    const qty = Number(a.quantidade || 1);
                    return sum + (value * qty);
                }, 0)
                : 0;

            const unitTotal = Number(itemPrice || 0) + Number(adicionaisTotal || 0);
            return acc + (Number(item.quantidade || 0) * unitTotal);
        }, 0);
        
        // Verificar se há promoção de frete grátis ativa
        let freteGratis = false;
        if (tipo === 'delivery' && taxa > 0) {
            const storeConfig = await prisma.configuracao_loja.findUnique({
                where: { lojaId: req.lojaId }
            });
            if (storeConfig && storeConfig.promocaoTaxaAtiva) {
                // Função auxiliar para obter o dia da semana no fuso horário do Brasil
                const getDayOfWeekInBrazil = () => {
                    const brasilNow = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
                    const dateInBrazil = new Date(brasilNow);
                    return dateInBrazil.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
                };
                
                const hoje = getDayOfWeekInBrazil().toString(); // 0 = domingo, 1 = segunda, etc. (horário do Brasil)
                const diasPromo = storeConfig.promocaoDias ? storeConfig.promocaoDias.split(',') : [];
                
                // Verificar se hoje é um dia de promoção
                if (diasPromo.includes(hoje)) {
                    const valorMinimo = parseFloat(storeConfig.promocaoValorMinimo || 0);
                    // Verificar se o subtotal atinge o valor mínimo
                    if (subprecoTotal >= valorMinimo) {
                        taxa = 0; // Frete grátis!
                        freteGratis = true;
                        console.log(`🎉 [POST /api/orders] PROMOÇÃO APLICADA! Frete grátis para pedido acima de R$ ${valorMinimo.toFixed(2)}. Subtotal: R$ ${subprecoTotal.toFixed(2)}`);
                    }
                }
            }
        }
        
        const precoTotal = subprecoTotal + (tipo === 'delivery' ? taxa : 0);

        console.log(`[POST /api/orders] Criando pedido para o usuário ${userId} com preço total de ${precoTotal.toFixed(2)} (${tipo}, Taxa: R$ ${taxa}${freteGratis ? ' - FRETE GRÁTIS' : ''}).`);

        // Determinar status inicial antes da transação
        const initialStatus = (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'CASH_ON_DELIVERY') ? 'being_prepared' : 'pending_payment';

        const storeConfig = await prisma.configuracao_loja.findUnique({
            where: { lojaId: req.lojaId }
        });
        const storeName = storeConfig?.nomeLoja || req.loja?.nome || 'Delivery';
        const ruaLoja = storeConfig?.ruaLoja || '';
        const numeroLoja = storeConfig?.numeroLoja || '';
        const bairroLoja = storeConfig?.bairroLoja || '';
        const pontoRefLoja = storeConfig?.pontoReferenciaLoja || '';
        const estimativaEntrega = storeConfig?.estimativaEntrega || '';
        const storeAddressText = [
            ruaLoja,
            numeroLoja ? `Nº ${numeroLoja}` : '',
            bairroLoja
        ].filter(Boolean).join(', ') || null;
        const storePixKey = storeConfig?.chavePix || storeConfig?.telefoneWhatsapp || null;

        const userData = user;
        const allFlavors = await prisma.sabor.findMany({
            where: { lojaId: req.lojaId }
        });

        const newOrder = await prisma.$transaction(async (tx) => {
            const createdOrder = await tx.pedido.create({
                data: {
                    lojaId: req.lojaId,
                    usuarioId: userId,
                    status: initialStatus,
                    precoTotal: precoTotal,
                    complementoEntrega: shippingAddress?.complemento || null,
                    bairroEntrega: shippingAddress?.bairro || null,
                    numeroEntrega: shippingAddress?.numero || null,
                    ruaEntrega: shippingAddress?.rua || null,
                    telefoneEntrega: userData?.telefone || null,
                    taxaEntrega: tipo === 'delivery' ? taxa : 0,
                    tipoEntrega: tipo,
                    metodoPagamento: paymentMethod,
                    observacoes: notes || null,
                    precisaTroco: precisaTroco || false,
                    valorTroco: valorTroco ? parseFloat(valorTroco) : null,
                    pagamento: {
                        create: {
                            valor: precoTotal,
                            metodo: paymentMethod,
                            status: paymentMethod === 'PIX' ? 'PENDING' : 'PAID',
                            idTransacao: null
                        }
                    },
                    itens_pedido: {
                        create: cart.itens.map((item) => {
                            let itemPrice = item.produto.preco;
                            if (item.opcoesSelecionadas) {
                                if (item.opcoesSelecionadas.customAcai) itemPrice = item.opcoesSelecionadas.customAcai.value;
                                else if (item.opcoesSelecionadas.customSorvete) itemPrice = item.opcoesSelecionadas.customSorvete.value;
                                else if (item.opcoesSelecionadas.customProduct) itemPrice = item.opcoesSelecionadas.customProduct.value;
                            }

                            return {
                                produtoId: item.produtoId,
                                quantidade: item.quantidade,
                                precoNoPedido: itemPrice,
                                opcoesSelecionadasSnapshot: item.opcoesSelecionadas || undefined,
                                complementos: item.complementos && item.complementos.length > 0
                                    ? {
                                        create: item.complementos.map((c) => ({ complementoId: c.complementoId }))
                                    }
                                    : undefined,
                                adicionais: item.adicionais && item.adicionais.length > 0
                                    ? {
                                        create: item.adicionais.map((a) => ({ adicionalId: a.adicionalId, quantidade: a.quantidade || 1 }))
                                    }
                                    : undefined
                            };
                        })
                    }
                },
                include: {
                    itens_pedido: true,
                    pagamento: true
                }
            });

            await tx.item_carrinho_adicional.deleteMany({
                where: { itemCarrinho: { carrinhoId: cart.id } }
            });
            await tx.item_carrinho_complemento.deleteMany({
                where: { itemCarrinho: { carrinhoId: cart.id } }
            });
            await tx.item_carrinho.deleteMany({
                where: { carrinhoId: cart.id }
            });

            return createdOrder;
        });

        const newOrderWithParsedOptions = {
            ...newOrder,
            itens_pedido: (newOrder.itens_pedido || []).map(item => ({
                ...item,
                opcoesSelecionadasSnapshot: parseOptionsSnapshot(item.opcoesSelecionadasSnapshot)
            }))
        };

        // Formatar itens com sabores e complementos
        const itens = await Promise.all(
            cart.itens.map(item => formatCartItemForMessage(item, allFlavors))
        );
        const itensText = itens.join('\n');

        const estimativaEntregaText = estimativaEntrega && String(estimativaEntrega).trim()
            ? `\n⏱️ *Estimativa:* ${String(estimativaEntrega).trim()}`
            : '';

        // Informações de entrega/retirada
        const deliveryInfo = tipo === 'pickup' 
            ? `📍 *Retirada no local*\n🏪 *Local:* ${storeName}${estimativaEntregaText}`
            : `*Entrega em casa*${estimativaEntregaText}\n📍 Endereço: ${shippingAddress.rua}, ${shippingAddress.numero}${shippingAddress.complemento ? ` - ${shippingAddress.complemento}` : ''}\nBairro: ${shippingAddress.bairro}${shippingAddress.pontoReferencia ? `\n*Referência:* ${shippingAddress.pontoReferencia}` : ''}`;
            
            // Adicionar observações se houver
            const notesSection = notes && notes.trim() ? `\n\n📝 *Observações:*\n${notes.trim()}` : '';
            
            let message;
            
            if (paymentMethod === 'CREDIT_CARD') {
                message =
                    ` *Pedido Confirmado!* 🎉\n\n` +
                    ` *Pedido Nº:* ${newOrder.id}\n\n` +
                    ` *Itens:*\n${itensText}\n\n` +
                    `💰 *Total:* R$ ${Number(newOrder.precoTotal).toFixed(2)}\n` +
                    `💳 *Forma de pagamento:* Cartão de Crédito/Debito\n\n` +
                    `${deliveryInfo}` +
                    notesSection + `\n\n` +
                    ` *Seu pedido já está sendo preparado!*\n` +
                    (tipo === 'pickup' ? ` Você pode retirar em breve!` : ` Em breve será enviado para entrega.`) + `\n\n` +
                    ` *Obrigado pela preferência! *\n`;
            } else if (paymentMethod === 'CASH_ON_DELIVERY') {
                // Adicionar informação de troco se necessário
                const trocoInfo = precisaTroco && valorTroco 
                    ? `\n💰 *Troco para:* R$ ${parseFloat(valorTroco).toFixed(2)}`
                    : '';
                
                message =
                    ` *Pedido Confirmado!* 🎉\n\n` +
                    ` *Pedido Nº:* ${newOrder.id}\n\n` +
                    ` *Itens:*\n${itensText}\n\n` +
                    `💰 *Total:* R$ ${Number(newOrder.precoTotal).toFixed(2)}${trocoInfo}\n` +
                    `💵 *Forma de pagamento:* Dinheiro ${tipo === 'pickup' ? 'na Retirada' : 'na Entrega'}\n\n` +
                    `${deliveryInfo}` +
                    notesSection + `\n\n` +
                    ` *Seu pedido já está sendo preparado!*\n` +
                    (tipo === 'pickup' ? `Tenha o dinheiro trocado em mãos na retirada.` : `Tenha o dinheiro trocado em mãos na entrega.`) + `\n\n` +
                    ` *Obrigado pela preferência!*\n`;
            } else {
                message =
                    ` *Pedido Confirmado!* 🎉\n\n` +
                    ` *Pedido Nº:* ${newOrder.id}\n\n` +
                    ` *Itens:*\n${itensText}\n\n` +
                    `💰 *Total:* R$ ${Number(newOrder.precoTotal).toFixed(2)}\n` +
                    `💸 *Forma de pagamento:* PIX\n` +
                    (storePixKey ? `🔑 *Chave Pix:* (use o botão abaixo para copiar)\n\n` : '') +
                    `${deliveryInfo}` +
                    notesSection + `\n\n` +
                    `📸 *Após o pagamento, por favor envie o comprovante aqui.*\n\n` +
                    ` *Obrigado pela preferência! *\n`;
            }

            try {
                if (paymentMethod === 'PIX' && storePixKey) {
                    try {
                        await sendWhatsAppButtonOtpZApi(
                            userData.telefone,
                            message,
                            storePixKey,
                            req.lojaId,
                            'Copiar chave Pix'
                        );
                        console.log('✅ Mensagem PIX (button-otp) enviada para:', userData.telefone);
                    } catch (otpErr) {
                        console.error('⚠️ Falha no send-button-otp, usando send-text como fallback:', otpErr.response?.data || otpErr.message);
                        const fallbackMessage = message + `\n\n🔑 *Chave Pix:* ${storePixKey}`;
                        await sendWhatsAppMessageZApi(userData.telefone, fallbackMessage, req.lojaId);
                        console.log('✅ Mensagem PIX (fallback send-text) enviada para:', userData.telefone);
                    }
                } else {
                    await sendWhatsAppMessageZApi(userData.telefone, message, req.lojaId);
                    console.log('✅ Mensagem enviada para:', userData.telefone);
                }
            } catch (err) {
                console.error('❌ Erro ao enviar mensagem via Z-API:', err.response?.data || err.message);
            }

        // Se o pedido já está em preparo (cartão ou dinheiro), notificar cozinheiro
        if (initialStatus === 'being_prepared') {
            try {
                // Buscar um cozinheiro ativo
                const cozinheiroAtivo = await prisma.cozinheiro.findFirst({
                    where: { ativo: true, lojaId: req.lojaId },
                    orderBy: { criadoEm: 'asc' } // Pega o mais antigo (FIFO)
                });

                if (cozinheiroAtivo) {
                    // Buscar pedido completo com relacionamentos
                    const pedidoCompleto = await prisma.pedido.findFirst({
                        where: { id: newOrder.id, lojaId: req.lojaId },
                        include: {
                            usuario: true,
                            itens_pedido: {
                                include: {
                                    produto: true,
                                    complementos: {
                                        include: {
                                            complemento: true
                                        }
                                    },
                                    adicionais: {
                                        include: {
                                            adicional: true
                                        }
                                    }
                                }
                            }
                        }
                    });

                    console.log(`👨‍🍳 Notificando cozinheiro: ${cozinheiroAtivo.nome}`);
                    await sendCookNotification(pedidoCompleto, cozinheiroAtivo);
                } else {
                    console.log('⚠️ Nenhum cozinheiro ativo encontrado para notificar');
                }
            } catch (err) {
                console.error('❌ Erro ao notificar cozinheiro:', err);
            }
        }

        res.status(201).json({ message: 'Pedido criado com sucesso!', order: newOrderWithParsedOptions });
    } catch (err) {
        console.error(`[POST /api/orders] Erro ao criar o pedido para o usuário ${userId}:`, err.message);
        res.status(500).json({ message: 'Erro ao criar o pedido.', error: err.message });
    }
});

// Rota para ver o histórico de pedidos do usuário
router.get('/history', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    console.log(`[GET /api/orders/history] Recebida requisição para o histórico de pedidos. Usuário ID: ${userId}`);
    
    try {
        const orders = await prisma.pedido.findMany({
            where: { usuarioId: userId, lojaId: req.lojaId },
            include: {
                itens_pedido: {
                    include: {
                        produto: {
                            include: {
                                imagens_produto: true
                            }
                        },
                        complementos: {
                            include: {
                                complemento: true
                            }
                        },
                        adicionais: {
                            include: {
                                adicional: true
                            }
                        }
                    }
                },
                pagamento: true
            },
            orderBy: {
                criadoEm: 'desc'
            }
        });

        // Transformar os dados para o formato esperado pelo frontend
        const transformedOrders = orders.map(order => ({
            id: order.id,
            userId: order.usuarioId,
            totalPrice: order.precoTotal,
            status: order.status,
            deliveryType: order.tipoEntrega,
            createdAt: order.criadoEm,
            shippingStreet: order.ruaEntrega,
            shippingNumber: order.numeroEntrega,
            shippingComplement: order.complementoEntrega,
            shippingNeighborhood: order.bairroEntrega,
            shippingPhone: order.telefoneEntrega,
            deliveryFee: order.taxaEntrega,
            notes: order.observacoes,
            precisaTroco: order.precisaTroco || false,
            valorTroco: order.valorTroco ? Number(order.valorTroco) : null,
            orderitem: order.itens_pedido.map(item => {
                // Parsear opcoesSelecionadasSnapshot para garantir que seja sempre um objeto
                const parsedSnapshot = parseOptionsSnapshot(item.opcoesSelecionadasSnapshot);
                
                return {
                    id: item.id,
                    orderId: item.pedidoId,
                    productId: item.produtoId,
                    quantity: item.quantidade,
                    priceAtOrder: item.precoNoPedido,
                    selectedOptionsSnapshot: parsedSnapshot,
                    complements: item.complementos ? item.complementos.map(c => ({
                        id: c.complemento.id,
                        name: c.complemento.nome,
                        imageUrl: c.complemento.imagemUrl,
                        isActive: c.complemento.ativo
                    })) : [],
                    additionals: item.adicionais ? item.adicionais.map(a => ({
                        id: a.adicional.id,
                        name: a.adicional.nome,
                        value: Number(a.adicional.valor),
                        quantity: a.quantidade || 1,
                        imageUrl: a.adicional.imagemUrl,
                        isActive: a.adicional.ativo
                    })) : [],
                product: {
                    id: item.produto.id,
                    name: item.produto.nome,
                    price: item.produto.preco,
                    description: item.produto.descricao,
                    isActive: item.produto.ativo,
                    createdAt: item.produto.criadoEm,
                    categoryId: item.produto.categoriaId,
                    images: item.produto.imagens_produto?.map(img => ({
                        id: img.id,
                        url: img.url,
                        altText: img.textoAlt,
                        productId: img.produtoId
                    })) || []
                }
                };
            }),
            payment: order.pagamento ? {
                id: order.pagamento.id,
                amount: order.pagamento.valor,
                method: order.pagamento.metodo,
                status: order.pagamento.status,
                transactionId: order.pagamento.idTransacao,
                createdAt: order.pagamento.criadoEm,
                updatedAt: order.pagamento.atualizadoEm,
                orderId: order.pagamento.pedidoId
            } : null
        }));

        console.log(`[GET /api/orders/history] Histórico de pedidos do usuário ${userId} buscado com sucesso. Total de pedidos: ${transformedOrders.length}`);
        res.status(200).json(transformedOrders);
    } catch (err) {
        console.error(`[GET /api/orders/history] Erro ao buscar o histórico de pedidos para o usuário ${userId}:`, err.message);
        res.status(500).json({ message: 'Erro ao buscar o histórico de pedidos.', error: err.message });
    }
});

// Rota para atualizar o status de um pedido (apenas para administradores)
router.put('/status/:orderId', authenticateToken, authorize('admin'), async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { status, delivererId } = req.body;
    console.log(`[PUT /api/orders/status/${orderId}] Recebida requisição de admin para atualizar status para: "${status}"`);

    // Adicione uma validação para garantir que o status é válido
    const validStatuses = ['pending_payment', 'being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered', 'canceled'];
    if (!validStatuses.includes(status)) {
        console.warn(`[PUT /api/orders/status/${orderId}] Tentativa de usar status inválido: "${status}".`);
        return res.status(400).json({ message: 'Status inválido. Por favor, use um dos seguintes: ' + validStatuses.join(', ') });
    }

    try {
        // Buscar o pedido atual primeiro para comparar o status
        const currentOrder = await prisma.pedido.findFirst({
            where: { id: orderId, lojaId: req.lojaId },
            include: {
                pagamento: {
                    select: {
                        metodo: true
                    }
                }
            }
        });

        if (!currentOrder) {
            console.error(`[PUT /api/orders/status/${orderId}] Erro: Pedido não encontrado.`);
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        // Verificar se o entregador existe e está ativo (se fornecido)
        if (delivererId) {
            const deliverer = await prisma.entregador.findFirst({
                where: { id: parseInt(delivererId), lojaId: req.lojaId }
            });
            
            if (!deliverer || !deliverer.ativo) {
                console.warn(`[PUT /api/orders/status/${orderId}] Entregador não encontrado ou inativo. ID: ${delivererId}`);
                return res.status(400).json({ message: 'Entregador não encontrado ou inativo' });
            }
        }

        const updatedOrder = await prisma.pedido.update({
            where: { id: orderId },
            data: { 
                status: status,
                entregadorId: delivererId ? parseInt(delivererId) : undefined,
                atualizadoEm: new Date()
            },
            include: {
                itens_pedido: {
                    include: {
                        produto: true,
                        complementos: {
                            include: {
                                complemento: true
                            }
                        }
                    }
                },
                usuario: {
                    select: {
                        id: true,
                        nomeUsuario: true,
                        email: true,
                        telefone: true
                    }
                },
                entregador: {
                    select: {
                        id: true,
                        nome: true,
                        telefone: true
                    }
                },
                pagamento: {
                    select: {
                        metodo: true
                    }
                }
            }
        });

        // Enviar notificação de pagamento confirmado se mudou de "pending_payment" para "being_prepared" (PIX)
        if (currentOrder.status === 'pending_payment' && status === 'being_prepared') {
            try {
                console.log('💳 Enviando notificação de pagamento confirmado...');
                // Buscar referência do endereço usado no pedido (não o padrão)
                // O endereço já está salvo no pedido, buscar a referência correspondente
                let referenciaEntrega = null;
                if (updatedOrder.ruaEntrega && updatedOrder.numeroEntrega) {
                    const enderecoUsado = await prisma.endereco.findFirst({
                        where: {
                            usuarioId: updatedOrder.usuarioId,
                            rua: updatedOrder.ruaEntrega,
                            numero: updatedOrder.numeroEntrega,
                            bairro: updatedOrder.bairroEntrega
                    }
                });
                    referenciaEntrega = enderecoUsado?.pontoReferencia || null;
                }
                const orderWithReference = {
                    ...updatedOrder,
                    referenciaEntrega: referenciaEntrega
                };
                await sendPaymentConfirmationNotification(orderWithReference);
                
                // Notificar cozinheiro quando pedido entra em preparo
                const cozinheiroAtivo = await prisma.cozinheiro.findFirst({
                    where: { ativo: true, lojaId: req.lojaId },
                    orderBy: { criadoEm: 'asc' }
                });

                if (cozinheiroAtivo) {
                    console.log(`👨‍🍳 Notificando cozinheiro: ${cozinheiroAtivo.nome}`);
                    await sendCookNotification(updatedOrder, cozinheiroAtivo);
                } else {
                    console.log('⚠️ Nenhum cozinheiro ativo encontrado para notificar');
                }
            } catch (error) {
                console.error('❌ Erro ao enviar notificação de pagamento confirmado:', error);
                // Não falha a operação se as notificações falharem
            }
        }

        // Enviar notificações se o status mudou para "on_the_way" e há um entregador
        if (status === 'on_the_way' && updatedOrder.entregador) {
            try {
                console.log('📱 Enviando notificações de entrega...');
                // Buscar referência do endereço usado no pedido (não o padrão)
                let referenciaEntrega = null;
                if (updatedOrder.ruaEntrega && updatedOrder.numeroEntrega) {
                    const enderecoUsado = await prisma.endereco.findFirst({
                        where: {
                            usuarioId: updatedOrder.usuarioId,
                            rua: updatedOrder.ruaEntrega,
                            numero: updatedOrder.numeroEntrega,
                            bairro: updatedOrder.bairroEntrega
                    }
                });
                    referenciaEntrega = enderecoUsado?.pontoReferencia || null;
                }
                
                // Mapear campos para compatibilidade com messageService
                const orderForNotification = {
                    ...updatedOrder,
                    totalPrice: updatedOrder.precoTotal,
                    user: updatedOrder.usuario ? {
                        username: updatedOrder.usuario.nomeUsuario,
                        phone: updatedOrder.usuario.telefone
                    } : null,
                    orderItems: updatedOrder.itens_pedido.map(item => ({
                        ...item,
                        product: item.produto // garantir campo 'product' (inglês)
                    })),
                    shippingStreet: updatedOrder.ruaEntrega,
                    shippingNumber: updatedOrder.numeroEntrega,
                    shippingComplement: updatedOrder.complementoEntrega,
                    shippingNeighborhood: updatedOrder.bairroEntrega,
                    shippingReference: referenciaEntrega,
                    shippingPhone: updatedOrder.usuario?.telefone
                };
                await sendDeliveryNotifications(orderForNotification, updatedOrder.entregador);
            } catch (error) {
                console.error('❌ Erro ao enviar notificações:', error);
                // Não falha a operação se as notificações falharem
            }
        }

        // Enviar notificação de cancelamento se o status mudou para "canceled"
        if (status === 'canceled' && currentOrder.status !== 'canceled') {
            try {
                console.log('❌ Enviando notificação de cancelamento ao cliente...');
                await sendOrderCancellationNotification(updatedOrder);
            } catch (error) {
                console.error('❌ Erro ao enviar notificação de cancelamento:', error);
                // Não falha a operação se a notificação falhar
            }
        }

        // Garantir que opcoesSelecionadasSnapshot seja parseado em todos os itens antes de retornar
        const orderWithParsedOptions = {
            ...updatedOrder,
            itens_pedido: updatedOrder.itens_pedido.map(item => ({
                ...item,
                opcoesSelecionadasSnapshot: parseOptionsSnapshot(item.opcoesSelecionadasSnapshot)
            }))
        };
        
        console.log(`[PUT /api/orders/status/${orderId}] Status do pedido atualizado com sucesso para "${updatedOrder.status}".`);
        res.status(200).json({ message: 'Status do pedido atualizado com sucesso!', order: orderWithParsedOptions });
    } catch (err) {
        if (err.code === 'P2025') { // Erro de registro não encontrado
            console.error(`[PUT /api/orders/status/${orderId}] Erro: Pedido não encontrado.`);
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        console.error(`[PUT /api/orders/status/${orderId}] Erro ao atualizar o status do pedido:`, err.message);
        res.status(500).json({ message: 'Erro ao atualizar o status do pedido.', error: err.message });
    }
});

// Rota para atualizar o valor total do pedido (apenas admin) - DEVE VIR ANTES DA ROTA GENÉRICA
router.put('/:orderId/update-total', authenticateToken, authorize('admin'), async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { totalPrice } = req.body;
    console.log(`[PUT /api/orders/${orderId}/update-total] Atualizando valor total do pedido para: R$ ${totalPrice}`);

    try {
        if (!totalPrice || totalPrice <= 0) {
            return res.status(400).json({ message: 'Valor total inválido' });
        }

        const order = await prisma.pedido.findFirst({
            where: { id: orderId, lojaId: req.lojaId },
            include: {
                itens_pedido: {
                    include: {
                        produto: true,
                        complementos: {
                            include: {
                                complemento: true
                            }
                        }
                    }
                },
                usuario: {
                    select: {
                        id: true,
                        nomeUsuario: true,
                        email: true,
                        telefone: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ message: 'Pedido não encontrado' });
        }

        // Capturar valor antigo antes de atualizar
        const oldTotal = parseFloat(order.precoTotal);
        const newTotal = parseFloat(totalPrice);

        // Atualizar valor do pedido e pagamento
        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Atualizar pedido
            const updated = await tx.pedido.update({
                where: { id: orderId },
                data: {
                    precoTotal: newTotal,
                    atualizadoEm: new Date()
                },
                include: {
                    itens_pedido: {
                        include: {
                            produto: true,
                            complementos: {
                                include: {
                                    complemento: true
                                }
                            }
                        }
                    },
                    usuario: {
                        select: {
                            id: true,
                            nomeUsuario: true,
                            email: true,
                            telefone: true
                        }
                    },
                    pagamento: true
                }
            });

            // Atualizar pagamento se existir
            if (updated.pagamento) {
                await tx.pagamento.update({
                    where: { pedidoId: orderId },
                    data: {
                        valor: newTotal,
                        atualizadoEm: new Date()
                    }
                });
            }

            return updated;
        });

        // Enviar notificação ao cliente se o valor foi alterado
        if (oldTotal !== newTotal) {
            try {
                console.log(`📱 [PUT /api/orders/${orderId}/update-total] Enviando notificação de edição ao cliente...`);
                const editReason = `O valor do pedido foi ajustado de R$ ${oldTotal.toFixed(2)} para R$ ${newTotal.toFixed(2)}.`;
                await sendOrderEditNotification(updatedOrder, oldTotal, newTotal, editReason);
            } catch (error) {
                console.error('❌ Erro ao enviar notificação de edição:', error);
                // Não falha a operação se a notificação falhar
            }
        }

        // Garantir que opcoesSelecionadasSnapshot seja parseado em todos os itens antes de retornar
        const orderWithParsedOptions = {
            ...updatedOrder,
            itens_pedido: updatedOrder.itens_pedido.map(item => ({
                ...item,
                opcoesSelecionadasSnapshot: parseOptionsSnapshot(item.opcoesSelecionadasSnapshot)
            }))
        };
        
        console.log(`[PUT /api/orders/${orderId}/update-total] Valor atualizado com sucesso`);
        res.status(200).json({ message: 'Valor do pedido atualizado com sucesso!', data: orderWithParsedOptions });
    } catch (error) {
        console.error(`[PUT /api/orders/${orderId}/update-total] Erro:`, error.message);
        res.status(500).json({ message: 'Erro ao atualizar valor do pedido', error: error.message });
    }
});

// Rota para adicionar item ao pedido (apenas admin) - DEVE VIR ANTES DA ROTA GENÉRICA
router.post('/:orderId/add-item', authenticateToken, authorize('admin'), async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { productId, quantity, complementIds, price } = req.body;
    console.log(`[POST /api/orders/${orderId}/add-item] Adicionando item ao pedido`);

    try {
        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Dados inválidos' });
        }

        const order = await prisma.pedido.findFirst({
            where: { id: orderId, lojaId: req.lojaId },
            include: { itens_pedido: true }
        });

        if (!order) {
            return res.status(404).json({ message: 'Pedido não encontrado' });
        }

        // Verificar se o produto existe
        const product = await prisma.produto.findFirst({
            where: { id: productId, lojaId: req.lojaId }
        });

        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        // Usar preço fornecido ou preço do produto
        const itemPrice = price ? parseFloat(price) : parseFloat(product.preco);
        
        // Capturar valor antigo antes de atualizar
        const oldTotal = parseFloat(order.precoTotal);

        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Adicionar item ao pedido
            const newItem = await tx.item_pedido.create({
                data: {
                    pedidoId: orderId,
                    produtoId: productId,
                    quantidade: parseInt(quantity),
                    precoNoPedido: itemPrice
                }
            });

            // Adicionar complementos se fornecidos
            if (complementIds && Array.isArray(complementIds) && complementIds.length > 0) {
                await Promise.all(
                    complementIds.map(complementId =>
                        tx.item_pedido_complemento.create({
                            data: {
                                itemPedidoId: newItem.id,
                                complementoId: complementId
                            }
                        })
                    )
                );
            }

            // Somar o valor do novo item ao valor atual do pedido (que pode ter sido editado manualmente)
            const itemValue = itemPrice * parseInt(quantity);
            const currentTotal = parseFloat(order.precoTotal);
            const newTotal = currentTotal + itemValue;

            // Atualizar pedido
            const updated = await tx.pedido.update({
                where: { id: orderId },
                data: {
                    precoTotal: newTotal,
                    atualizadoEm: new Date()
                },
                include: {
                    itens_pedido: {
                        include: {
                            produto: true,
                            complementos: {
                                include: {
                                    complemento: true
                                }
                            }
                        }
                    },
                    usuario: {
                        select: {
                            id: true,
                            nomeUsuario: true,
                            email: true,
                            telefone: true
                        }
                    },
                    pagamento: true
                }
            });

            // Atualizar pagamento se existir
            if (updated.pagamento) {
                await tx.pagamento.update({
                    where: { pedidoId: orderId },
                    data: {
                        valor: newTotal,
                        atualizadoEm: new Date()
                    }
                });
            }

            return updated;
        });

        // Enviar notificação ao cliente se o valor foi alterado
        const newTotal = parseFloat(updatedOrder.precoTotal);
        if (oldTotal !== newTotal) {
            try {
                console.log(`📱 [POST /api/orders/${orderId}/add-item] Enviando notificação de edição ao cliente...`);
                const editReason = `Um item foi adicionado ao seu pedido. O valor foi ajustado de R$ ${oldTotal.toFixed(2)} para R$ ${newTotal.toFixed(2)}.`;
                await sendOrderEditNotification(updatedOrder, oldTotal, newTotal, editReason);
            } catch (error) {
                console.error('❌ Erro ao enviar notificação de edição:', error);
                // Não falha a operação se a notificação falhar
            }
        }

        // Garantir que opcoesSelecionadasSnapshot seja parseado em todos os itens antes de retornar
        const orderWithParsedOptions = {
            ...updatedOrder,
            itens_pedido: updatedOrder.itens_pedido.map(item => ({
                ...item,
                opcoesSelecionadasSnapshot: parseOptionsSnapshot(item.opcoesSelecionadasSnapshot)
            }))
        };
        
        console.log(`[POST /api/orders/${orderId}/add-item] Item adicionado com sucesso`);
        res.status(200).json({ message: 'Item adicionado ao pedido com sucesso!', data: orderWithParsedOptions });
    } catch (error) {
        console.error(`[POST /api/orders/${orderId}/add-item] Erro:`, error.message);
        res.status(500).json({ message: 'Erro ao adicionar item ao pedido', error: error.message });
    }
});

// Rota para remover item do pedido (apenas admin) - DEVE VIR ANTES DA ROTA GENÉRICA
router.delete('/:orderId/remove-item/:itemId', authenticateToken, authorize('admin'), async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const itemId = parseInt(req.params.itemId);
    console.log(`[DELETE /api/orders/${orderId}/remove-item/${itemId}] Removendo item do pedido`);

    try {
        const order = await prisma.pedido.findUnique({
            where: { id: orderId },
            include: { itens_pedido: true }
        });

        if (!order) {
            return res.status(404).json({ message: 'Pedido não encontrado' });
        }

        const item = order.itens_pedido.find(i => i.id === itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item não encontrado no pedido' });
        }

        // Capturar valor antigo antes de atualizar
        const oldTotal = parseFloat(order.precoTotal);

        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Remover complementos do item primeiro
            await tx.item_pedido_complemento.deleteMany({
                where: { itemPedidoId: itemId }
            });

            // Calcular o valor do item que será removido antes de removê-lo
            const itemValue = parseFloat(item.precoNoPedido) * item.quantidade;
            
            // Remover item
            await tx.item_pedido.delete({
                where: { id: itemId }
            });

            // Subtrair o valor do item removido do total atual do pedido (que pode ter sido editado manualmente)
            const currentTotal = parseFloat(order.precoTotal);
            const newTotal = currentTotal - itemValue;

            // Atualizar pedido
            const updated = await tx.pedido.update({
                where: { id: orderId },
                data: {
                    precoTotal: newTotal,
                    atualizadoEm: new Date()
                },
                include: {
                    itens_pedido: {
                        include: {
                            produto: true,
                            complementos: {
                                include: {
                                    complemento: true
                                }
                            }
                        }
                    },
                    usuario: {
                        select: {
                            id: true,
                            nomeUsuario: true,
                            email: true,
                            telefone: true
                        }
                    },
                    pagamento: true
                }
            });

            // Atualizar pagamento se existir
            if (updated.pagamento) {
                await tx.pagamento.update({
                    where: { pedidoId: orderId },
                    data: {
                        valor: newTotal,
                        atualizadoEm: new Date()
                    }
                });
            }

            return updated;
        });

        // Enviar notificação ao cliente se o valor foi alterado
        const newTotal = parseFloat(updatedOrder.precoTotal);
        if (oldTotal !== newTotal) {
            try {
                console.log(`📱 [DELETE /api/orders/${orderId}/remove-item/${itemId}] Enviando notificação de edição ao cliente...`);
                const editReason = `Um item foi removido do seu pedido. O valor foi ajustado de R$ ${oldTotal.toFixed(2)} para R$ ${newTotal.toFixed(2)}.`;
                await sendOrderEditNotification(updatedOrder, oldTotal, newTotal, editReason);
            } catch (error) {
                console.error('❌ Erro ao enviar notificação de edição:', error);
                // Não falha a operação se a notificação falhar
            }
        }

        // Garantir que opcoesSelecionadasSnapshot seja parseado em todos os itens antes de retornar
        const orderWithParsedOptions = {
            ...updatedOrder,
            itens_pedido: updatedOrder.itens_pedido.map(item => ({
                ...item,
                opcoesSelecionadasSnapshot: parseOptionsSnapshot(item.opcoesSelecionadasSnapshot)
            }))
        };
        
        console.log(`[DELETE /api/orders/${orderId}/remove-item/${itemId}] Item removido com sucesso`);
        res.status(200).json({ message: 'Item removido do pedido com sucesso!', data: orderWithParsedOptions });
    } catch (error) {
        console.error(`[DELETE /api/orders/${orderId}/remove-item/${itemId}] Erro:`, error.message);
        res.status(500).json({ message: 'Erro ao remover item do pedido', error: error.message });
    }
});

// Nova rota PUT para compatibilidade com o frontend (/orders/:orderId)
router.put('/:orderId', authenticateToken, authorize('admin'), async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { status, delivererId } = req.body;
    console.log(`[PUT /api/orders/${orderId}] Recebida requisição de admin para atualizar pedido. Status: "${status}", Entregador: ${delivererId}`);

    try {
        // Verificar se o pedido existe
        const existingOrder = await prisma.pedido.findFirst({
            where: { id: orderId, lojaId: req.lojaId }
        });

        if (!existingOrder) {
            console.error(`[PUT /api/orders/${orderId}] Erro: Pedido não encontrado.`);
            return res.status(404).json({ message: 'Pedido não encontrado' });
        }

        // Mapear status do frontend para formato do banco
        const statusMapping = {
            'pending_payment': 'pending_payment',
            'being_prepared': 'being_prepared', 
            'on_the_way': 'on_the_way',
            'delivered': 'delivered',
            'canceled': 'canceled'
        };

        let dbStatus = status;
        if (status && statusMapping[status]) {
            dbStatus = statusMapping[status];
            console.log(`[PUT /api/orders/${orderId}] Status validado: "${status}" -> "${dbStatus}"`);
        }

        // Validar status se fornecido
        const validStatuses = ['pending_payment', 'being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered', 'canceled'];
        if (dbStatus && !validStatuses.includes(dbStatus)) {
            console.warn(`[PUT /api/orders/${orderId}] Status inválido: "${dbStatus}".`);
            return res.status(400).json({ message: 'Status inválido' });
        }

        // Validar entregador se fornecido
        if (delivererId) {
            const deliverer = await prisma.entregador.findFirst({
                where: { id: parseInt(delivererId), lojaId: req.lojaId }
            });
            
            if (!deliverer || !deliverer.ativo) {
                console.warn(`[PUT /api/orders/${orderId}] Entregador não encontrado ou inativo. ID: ${delivererId}`);
                return res.status(400).json({ message: 'Entregador não encontrado ou inativo' });
            }
        }

        // Validação: NENHUM pedido pode ser cancelado se estiver a caminho, pronto para retirada ou entregue
        if (dbStatus === 'canceled' && (existingOrder.status === 'on_the_way' || existingOrder.status === 'ready_for_pickup' || existingOrder.status === 'delivered')) {
            console.warn(`[PUT /api/orders/${orderId}] Não é possível cancelar. Status atual: "${existingOrder.status}".`);
            return res.status(400).json({ message: `Não é possível cancelar um pedido com o status "${existingOrder.status}".` });
        }

        // Atualizar pedido
        const order = await prisma.pedido.update({
            where: { id: orderId },
            data: {
                status: dbStatus || existingOrder.status,
                entregadorId: delivererId !== undefined ? (delivererId ? parseInt(delivererId) : null) : existingOrder.entregadorId,
                atualizadoEm: new Date()
            },
            include: {
                itens_pedido: {
                    include: {
                        produto: true,
                        complementos: {
                            include: {
                                complemento: true
                            }
                        }
                    }
                },
                usuario: {
                    select: {
                        id: true,
                        nomeUsuario: true,
                        email: true,
                        telefone: true
                    }
                },
                entregador: {
                    select: {
                        id: true,
                        nome: true,
                        telefone: true
                    }
                },
                pagamento: {
                    select: {
                        metodo: true
                    }
                }
            }
        });

        // Enviar notificação de pagamento confirmado se mudou de "pending_payment" para "being_prepared" (PIX)
        if (existingOrder.status === 'pending_payment' && dbStatus === 'being_prepared') {
            try {
                console.log('💳 Enviando notificação de pagamento confirmado...');
                // Buscar referência do endereço usado no pedido (não o padrão)
                let referenciaEntrega = null;
                if (order.ruaEntrega && order.numeroEntrega) {
                    const enderecoUsado = await prisma.endereco.findFirst({
                        where: {
                            usuarioId: order.usuarioId,
                            rua: order.ruaEntrega,
                            numero: order.numeroEntrega,
                            bairro: order.bairroEntrega
                    }
                });
                    referenciaEntrega = enderecoUsado?.pontoReferencia || null;
                }
                const orderWithReference = {
                    ...order,
                    referenciaEntrega: referenciaEntrega
                };
                await sendPaymentConfirmationNotification(orderWithReference);
                // Notificar cozinheiro quando pedido entra em preparo
                const cozinheiroAtivo = await prisma.cozinheiro.findFirst({
                    where: { ativo: true },
                    orderBy: { criadoEm: 'asc' }
                });
                if (cozinheiroAtivo) {
                    console.log(`👨‍🍳 Notificando cozinheiro: ${cozinheiroAtivo.nome}`);
                    await sendCookNotification(order, cozinheiroAtivo);
                } else {
                    console.log('⚠️ Nenhum cozinheiro ativo encontrado para notificar');
                }
            } catch (error) {
                console.error('❌ Erro ao enviar notificação de pagamento confirmado:', error);
                // Não falha a operação se as notificações falharem
            }
        }

        // Enviar confirmação de entrega ao cliente se status for 'delivered'
        if (dbStatus === 'delivered') {
            try {
                console.log('📦 Enviando confirmação de entrega ao cliente...');
                await sendDeliveredConfirmationNotification(order);
            } catch (error) {
                console.error('❌ Erro ao enviar confirmação de entrega:', error);
            }
        }

        // Enviar notificação de cancelamento se o status mudou para "canceled"
        if (dbStatus === 'canceled' && existingOrder.status !== 'canceled') {
            try {
                console.log('❌ Enviando notificação de cancelamento ao cliente...');
                // Buscar dados completos do pedido com itens e complementos
                const orderWithItems = await prisma.pedido.findFirst({
                    where: { id: orderId, lojaId: req.lojaId },
                    include: {
                        itens_pedido: {
                            include: {
                                produto: true,
                                complementos: {
                                    include: {
                                        complemento: true
                                    }
                                }
                            }
                        },
                        usuario: {
                            select: {
                                id: true,
                                nomeUsuario: true,
                                email: true,
                                telefone: true
                            }
                        },
                        pagamento: {
                            select: {
                                metodo: true
                            }
                        }
                    }
                });
                await sendOrderCancellationNotification(orderWithItems);
            } catch (error) {
                console.error('❌ Erro ao enviar notificação de cancelamento:', error);
                // Não falha a operação se a notificação falhar
            }
        }

        // Enviar notificações baseadas no tipo de pedido e status
        if (dbStatus === 'on_the_way' && order.entregador && order.tipoEntrega === 'delivery') {
            // Notificação para entrega com entregador
            try {
                console.log('📱 Enviando notificações de entrega...');
                // Buscar referência do endereço usado no pedido (não o padrão)
                let referenciaEntrega = null;
                if (order.ruaEntrega && order.numeroEntrega) {
                    const enderecoUsado = await prisma.endereco.findFirst({
                        where: {
                            usuarioId: order.usuarioId,
                            rua: order.ruaEntrega,
                            numero: order.numeroEntrega,
                            bairro: order.bairroEntrega
                    }
                });
                    referenciaEntrega = enderecoUsado?.pontoReferencia || null;
                }
                
                // Mapear campos para compatibilidade com messageService
                const orderForNotification = {
                    ...order,
                    totalPrice: order.precoTotal,
                    user: order.usuario ? {
                        username: order.usuario.nomeUsuario,
                        phone: order.usuario.telefone
                    } : null,
                    orderItems: order.itens_pedido.map(item => ({
                        ...item,
                        product: item.produto // garantir campo 'product' (inglês)
                    })),
                    shippingStreet: order.ruaEntrega,
                    shippingNumber: order.numeroEntrega,
                    shippingComplement: order.complementoEntrega,
                    shippingNeighborhood: order.bairroEntrega,
                    shippingReference: referenciaEntrega,
                    shippingPhone: order.usuario?.telefone
                };
                await sendDeliveryNotifications(orderForNotification, order.entregador);
            } catch (error) {
                console.error('❌ Erro ao enviar notificações de entrega:', error);
            }
        } else if (dbStatus === 'ready_for_pickup' && order.tipoEntrega === 'pickup') {
                        // Notificação para retirada
                        try {
                                console.log('🏪 Enviando notificação de retirada...');
                                // Mapear campos para compatibilidade com messageService
                                const orderForNotification = {
                                    ...order,
                                    totalPrice: order.precoTotal,
                                    deliveryType: order.tipoEntrega,
                                    paymentMethod: order.metodoPagamento,
                                    user: order.usuario ? {
                                        username: order.usuario.nomeUsuario,
                                        phone: order.usuario.telefone
                                    } : null,
                                    orderItems: order.itens_pedido,
                                    shippingStreet: order.ruaEntrega,
                                    shippingNumber: order.numeroEntrega,
                                    shippingComplement: order.complementoEntrega,
                                    shippingNeighborhood: order.bairroEntrega,
                                    shippingPhone: order.usuario?.telefone
                                };
                                await sendPickupNotification(orderForNotification);
                        } catch (error) {
                                console.error('❌ Erro ao enviar notificação de retirada:', error);
                        }
        }

        // Garantir que opcoesSelecionadasSnapshot seja parseado em todos os itens antes de retornar
        const orderWithParsedOptions = {
            ...order,
            itens_pedido: order.itens_pedido.map(item => ({
                ...item,
                opcoesSelecionadasSnapshot: parseOptionsSnapshot(item.opcoesSelecionadasSnapshot)
            }))
        };
        
        console.log(`[PUT /api/orders/${orderId}] Pedido atualizado com sucesso.`);
        res.json(orderWithParsedOptions);
    } catch (error) {
        console.error(`[PUT /api/orders/${orderId}] Erro ao atualizar pedido:`, error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Rota para cancelar um pedido
router.put('/cancel/:orderId', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.funcao; // Corrigido: usar 'funcao' em vez de 'role'
    const orderId = parseInt(req.params.orderId);
    console.log(`[PUT /api/orders/cancel/${orderId}] Recebida requisição para cancelar pedido. Usuário ID: ${userId}, Função: ${userRole}`);

    try {
        const order = await prisma.pedido.findFirst({
            where: { id: orderId, lojaId: req.lojaId },
        });

        if (!order) {
            console.warn(`[PUT /api/orders/cancel/${orderId}] Pedido não encontrado.`);
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        // Verifica se o usuário é o dono do pedido ou um administrador
        if (order.usuarioId !== userId && userRole !== 'admin' && userRole !== 'master') {
            console.warn(`[PUT /api/orders/cancel/${orderId}] Acesso negado. Usuário ID ${userId} (${userRole}) tentou cancelar pedido que não lhe pertence (pedido do usuário ${order.usuarioId}).`);
            return res.status(403).json({ message: 'Acesso negado: você não tem permissão para cancelar este pedido.' });
        }
        
        // Se o pedido já está cancelado, não há nada a fazer
        if (order.status === 'canceled') {
            console.warn(`[PUT /api/orders/cancel/${orderId}] Pedido já está cancelado.`);
            return res.status(400).json({ message: 'Este pedido já está cancelado.' });
        }
        
        // Verifica se o status do pedido permite o cancelamento
        // NENHUM pedido pode ser cancelado se estiver a caminho, pronto para retirada ou entregue (mesmo por admins)
        if (order.status === 'on_the_way' || order.status === 'ready_for_pickup' || order.status === 'delivered') {
            console.warn(`[PUT /api/orders/cancel/${orderId}] Não é possível cancelar. Status atual: "${order.status}".`);
            return res.status(400).json({ message: `Não é possível cancelar um pedido com o status "${order.status}".` });
        }

        const updatedOrder = await prisma.pedido.update({
            where: { id: orderId },
            data: { 
                status: 'canceled',
                atualizadoEm: new Date()
            },
            include: {
                itens_pedido: {
                    include: {
                        produto: true,
                        complementos: {
                            include: {
                                complemento: true
                            }
                        }
                    }
                },
                usuario: {
                    select: {
                        id: true,
                        nomeUsuario: true,
                        email: true,
                        telefone: true
                    }
                },
                pagamento: {
                    select: {
                        metodo: true
                    }
                }
            }
        });

        // Enviar notificação de cancelamento ao cliente
        try {
            console.log('❌ Enviando notificação de cancelamento ao cliente...');
            await sendOrderCancellationNotification(updatedOrder);
        } catch (error) {
            console.error('❌ Erro ao enviar notificação de cancelamento:', error);
            // Não falha a operação se a notificação falhar
        }

        // Garantir que opcoesSelecionadasSnapshot seja parseado em todos os itens antes de retornar
        const orderWithParsedOptions = {
            ...updatedOrder,
            itens_pedido: updatedOrder.itens_pedido.map(item => ({
                ...item,
                opcoesSelecionadasSnapshot: parseOptionsSnapshot(item.opcoesSelecionadasSnapshot)
            }))
        };
        
        console.log(`[PUT /api/orders/cancel/${orderId}] Pedido cancelado com sucesso. Pedido ID: ${updatedOrder.id}`);
        res.status(200).json({ message: 'Pedido cancelado com sucesso!', order: orderWithParsedOptions });
    } catch (err) {
        console.error(`[PUT /api/orders/cancel/${orderId}] Erro ao cancelar o pedido:`, err.message);
        res.status(500).json({ message: 'Erro ao cancelar o pedido.', error: err.message });
    }
});

// Listar todos os pedidos (apenas admin)
router.get('/orders', authenticateToken, authorize('admin'), async (req, res) => {
    console.log('[API] /api/orders/orders chamada por:', req.user ? req.user.email : 'desconhecido', 'em', new Date().toISOString());
    try {
        const orders = await prisma.pedido.findMany({
            where: { lojaId: req.lojaId },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nomeUsuario: true,
                        email: true,
                        telefone: true,
                        enderecos: {
                            where: {
                                padrao: true
                            },
                            select: {
                                id: true,
                                rua: true,
                                numero: true,
                                complemento: true,
                                bairro: true,
                                padrao: true
                            }
                        }
                    }
                },
                itens_pedido: {
                    include: { 
                        produto: {
                            include: {
                                imagens_produto: true
                            }
                        },
                        complementos: {
                            include: {
                                complemento: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        imagemUrl: true
                                    }
                                }
                            }
                        },
                        adicionais: {
                            include: {
                                adicional: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        valor: true,
                                        imagemUrl: true,
                                        ativo: true
                                    }
                                }
                            }
                        }
                    }
                },
                pagamento: true
            },
            orderBy: {
                criadoEm: 'desc'
            }
        });

        // Transformar os dados para o formato esperado pelo frontend
        const transformedOrders = orders.map(order => ({
            id: order.id,
            userId: order.usuarioId,
            totalPrice: order.precoTotal,
            status: order.status,
            deliveryType: order.tipoEntrega,
            paymentMethod: order.metodoPagamento,
            createdAt: order.criadoEm,
            shippingStreet: order.ruaEntrega,
            shippingNumber: order.numeroEntrega,
            shippingComplement: order.complementoEntrega,
            shippingNeighborhood: order.bairroEntrega,
            shippingPhone: order.telefoneEntrega,
            deliveryFee: order.taxaEntrega,
            notes: order.observacoes,
            precisaTroco: order.precisaTroco || false,
            valorTroco: order.valorTroco ? Number(order.valorTroco) : null,
            user: order.usuario ? {
                id: order.usuario.id,
                username: order.usuario.nomeUsuario,
                email: order.usuario.email,
                phone: order.usuario.telefone,
                enderecos: order.usuario.enderecos ? order.usuario.enderecos.map(addr => ({
                    id: addr.id,
                    street: addr.rua,
                    number: addr.numero,
                    complement: addr.complemento,
                    neighborhood: addr.bairro,
                    isDefault: addr.padrao
                })) : []
            } : null,
            orderitem: order.itens_pedido.map(item => {
                // Parsear opcoesSelecionadasSnapshot para garantir que seja sempre um objeto
                const parsedSnapshot = parseOptionsSnapshot(item.opcoesSelecionadasSnapshot);
                
                // Log de debug para identificar problemas (apenas se houver sabores)
                if (parsedSnapshot && parsedSnapshot.selectedFlavors) {
                    console.log(`🔍 [GET /api/orders/orders] Pedido ${order.id}, Item ${item.id}: opcoesSelecionadasSnapshot parseado com sucesso. Tipo original: ${typeof item.opcoesSelecionadasSnapshot}, Sabores:`, JSON.stringify(parsedSnapshot.selectedFlavors));
                }
                
                return {
                    id: item.id,
                    orderId: item.pedidoId,
                    productId: item.produtoId,
                    quantity: item.quantidade,
                    priceAtOrder: item.precoNoPedido,
                    selectedOptionsSnapshot: parsedSnapshot,
                    complements: item.complementos ? item.complementos.map(comp => ({
                        id: comp.complemento.id,
                        name: comp.complemento.nome,
                        imageUrl: comp.complemento.imagemUrl
                    })) : [],
                    additionals: item.adicionais ? item.adicionais.map(a => ({
                        id: a.adicional.id,
                        name: a.adicional.nome,
                        value: Number(a.adicional.valor),
                        quantity: a.quantidade || 1,
                        imageUrl: a.adicional.imagemUrl,
                        isActive: a.adicional.ativo
                    })) : [],
                product: item.produto ? {
                    id: item.produto.id,
                    name: item.produto.nome,
                    description: item.produto.descricao,
                    price: item.produto.preco,
                    categoryId: item.produto.categoriaId,
                    isActive: item.produto.ativo,
                    images: item.produto.imagens_produto ? item.produto.imagens_produto.map(img => ({
                        id: img.id,
                        productId: img.produtoId,
                        url: img.url,
                        isPrimary: img.principal
                    })) : []
                } : null
                };
            }),
            payment: order.pagamento ? {
                id: order.pagamento.id,
                orderId: order.pagamento.pedidoId,
                method: order.pagamento.metodo,
                status: order.pagamento.status,
                amount: order.pagamento.valor,
                paidAt: order.pagamento.pagoEm
            } : null
        }));

        console.log('[API] /api/orders/orders retornando', transformedOrders.length, 'pedidos. Mais recente:', transformedOrders[0]?.id);
        res.json(transformedOrders);
    } catch (err) {
        console.error('Erro ao buscar pedidos:', err);
        res.status(500).json({ error: 'Erro ao buscar pedidos.' });
    }
});

router.get('/pending-count', authenticateToken, authorize('admin'), async (req, res) => {
  const count = await prisma.pedido.count({
    where: {
      lojaId: req.lojaId,
      status: { in: ['pending_payment', 'being_prepared'] }
    }
  });
  res.json({ count });
});

module.exports = router;
