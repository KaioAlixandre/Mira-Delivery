// Serviço para envio de mensagens (WhatsApp/SMS)
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Função auxiliar para obter detalhes de retirada da loja
async function getStorePickupDetails(lojaId) {
  let storeConfig = null;
  try {
    if (lojaId) {
      storeConfig = await prisma.configuracao_loja.findUnique({ where: { lojaId } });
    }
    if (!storeConfig) {
      storeConfig = await prisma.configuracao_loja.findFirst();
    }
  } catch (err) {
    console.warn('⚠️ Erro ao buscar configuração da loja:', err.message);
  }

  const rawStoreName = (storeConfig?.nomeLoja || '').trim();
  const storeName = rawStoreName ? rawStoreName : 'Mira Delivery';
  const ruaLoja = (storeConfig?.ruaLoja || '').trim();
  const numeroLoja = (storeConfig?.numeroLoja || '').trim();
  const bairroLoja = (storeConfig?.bairroLoja || '').trim();
  const pontoRefLoja = (storeConfig?.pontoReferenciaLoja || '').trim();
  const enderecoMontado = [ruaLoja, numeroLoja ? `Nº ${numeroLoja}` : '', bairroLoja].filter(Boolean).join(', ');
  const enderecoLoja = (storeConfig?.enderecoLoja || '').trim();
  const enderecoPartes = enderecoMontado || enderecoLoja;
  const estimativaEntrega = (storeConfig?.estimativaEntrega || '').trim();

  return {
    storeConfig,
    storeName,
    enderecoPartes,
    pontoRefLoja,
    estimativaEntrega,
  };
}

// Função auxiliar para parsear opcoesSelecionadasSnapshot
function parseOptionsSnapshot(snapshot) {
    if (!snapshot) {
        return null;
    }
    
    if (typeof snapshot === 'object' && snapshot !== null) {
        return snapshot;
    }
    
    if (typeof snapshot === 'string') {
        try {
            return JSON.parse(snapshot);
        } catch (err) {
            console.warn('⚠️ Erro ao fazer parse do opcoesSelecionadasSnapshot:', err.message);
            return null;
        }
    }
    
    return null;
}

// Função auxiliar para formatar item com sabores e complementos
async function formatOrderItem(item, allFlavors = []) {
    try {
        const productName = item.produto?.nome || item.product?.name || 'Produto';
        const quantity = item.quantidade || item.quantity || 1;
        
        // Buscar complementos (pode estar em diferentes estruturas)
        const complementosList = [];
        if (item.complementos) {
            item.complementos.forEach(ic => {
                const complementName = ic.complemento?.nome || ic.complemento?.name || ic.nome || ic.name;
                if (complementName) {
                    complementosList.push(complementName);
                }
            });
        }
        if (item.item_pedido_complementos) {
            item.item_pedido_complementos.forEach(ic => {
                const complementName = ic.complemento?.nome || ic.complemento?.name;
                if (complementName) {
                    complementosList.push(complementName);
                }
            });
        }
        
        // Buscar sabores do opcoesSelecionadasSnapshot
        const saboresList = [];
        const optionsSnapshot = item.opcoesSelecionadasSnapshot || item.selectedOptionsSnapshot;
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
        
        return itemText;
    } catch (error) {
        console.error('❌ Erro ao formatar item:', error);
        const productName = item.produto?.nome || item.product?.name || 'Produto';
        const quantity = item.quantidade || item.quantity || 1;
        return `• ${quantity}x ${productName}`;
    }
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

// Função para verificar se um número possui WhatsApp usando a Z-API
async function checkPhoneExistsWhatsApp(phone, lojaId) {
  try {
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Garantir que o número tem o código do país (55) apenas uma vez
    // Se já começar com 55, não adicionar novamente
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    
    const { zapApiToken, zapApiInstance, zapApiClientToken } = await getZApiCredentials(lojaId);
    // Usar o número como path parameter conforme documentação
    const zapApiUrl = `https://api.z-api.io/instances/${zapApiInstance}/token/${zapApiToken}/phone-exists/${cleanPhone}`;

    console.log(`🔍 [Z-API] Verificando se número possui WhatsApp: ${cleanPhone}`);
    console.log(`🔍 [Z-API] URL: ${zapApiUrl}`);

    const response = await axios.get(zapApiUrl, {
      headers: {
        'client-token': zapApiClientToken
      }
    });

    console.log(`📋 [Z-API] Resposta completa:`, JSON.stringify(response.data, null, 2));
    
    const exists = response.data?.exists === true;
    console.log(`✅ [Z-API] Número ${exists ? 'possui' : 'não possui'} WhatsApp: ${cleanPhone}`);
    
    return { 
      success: true, 
      exists,
      response: response.data 
    };
  } catch (error) {
    console.error('❌ [Z-API] Erro ao verificar número:', error.response?.data || error.message);
    console.error('❌ [Z-API] Detalhes do erro:', error.response?.status, error.response?.statusText);
    return { 
      success: false, 
      exists: false, 
      error: error.message 
    };
  }
}

// Função para enviar mensagem via WhatsApp usando a Z-API
async function sendWhatsAppMessageZApi(phone, message, lojaId) {
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const { zapApiToken, zapApiInstance, zapApiClientToken } = await getZApiCredentials(lojaId);
    const zapApiUrl = `https://api.z-api.io/instances/${zapApiInstance}/token/${zapApiToken}/send-text`;

    console.log(`📱 [Z-API] Enviando mensagem para: 55${cleanPhone}`);

    const response = await axios.post(
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

    console.log('✅ [Z-API] Mensagem enviada com sucesso:', response.status);
    return { success: true, response: response.data };
  } catch (error) {
    console.error('❌ [Z-API] Erro ao enviar mensagem:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Serviço para notificação de confirmação de entrega
const sendDeliveredConfirmationNotification = async (order) => {
  try {
    console.log('📦 [MessageService] Enviando confirmação de entrega ao cliente');
    
    // Buscar todos os sabores para mapear IDs para nomes
    const allFlavors = await prisma.sabor.findMany({ where: { ativo: true } });
    
    // Construir lista de itens com sabores e complementos
    const itemsList = order.itens_pedido?.length > 0
      ? await Promise.all(order.itens_pedido.map(item => formatOrderItem(item, allFlavors)))
      : ['Itens não disponíveis'];
    
    const itemsListText = Array.isArray(itemsList) ? itemsList.join('\n') : itemsList;

    const customerMessage = `*Seu pedido #${order.id} foi entregue com sucesso!*\n\nAgradecemos pela preferência!`;

    // Buscar telefone do usuário (preferencial) ou telefone de entrega
    const customerPhone = order.usuario?.telefone || order.telefoneEntrega;
    if (customerPhone) {
      console.log('\n📦 ENVIANDO CONFIRMAÇÃO DE ENTREGA:');
      console.log(customerMessage);
      const result = await sendWhatsAppMessageZApi(customerPhone, customerMessage, order?.lojaId);
      if (result.success) {
        console.log('✅ Confirmação de entrega enviada com sucesso!');
      } else {
        console.log('❌ Falha ao enviar confirmação de entrega');
      }
      return {
        success: result.success,
        customerMessage,
        result
      };
    } else {
      console.log('⚠️ Telefone do cliente não disponível para confirmação de entrega');
      return {
        success: false,
        error: 'Telefone do cliente não disponível'
      };
    }
  } catch (error) {
    console.error('❌ Erro ao enviar confirmação de entrega:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Serviço para notificação de pedido pronto para retirada
const sendPickupNotification = async (order) => {
  try {
    console.log('🏪 [MessageService] Enviando notificação de retirada');
    console.log('📋 [MessageService] Dados do pedido:', {
      id: order.id,
      totalPrice: order.totalPrice,
      user: order.user?.username,
      deliveryType: order.deliveryType
    });

    // Buscar todos os sabores para mapear IDs para nomes
    const allFlavors = await prisma.sabor.findMany({ where: { ativo: true } });
    
    // Construir lista de itens com sabores e complementos
    const itemsList = order.itens_pedido?.length > 0
      ? await Promise.all(order.itens_pedido.map(item => formatOrderItem(item, allFlavors)))
      : ['Itens não disponíveis'];
    
    const itemsListText = Array.isArray(itemsList) ? itemsList.join('\n') : itemsList;

    const { storeName, enderecoPartes, pontoRefLoja, estimativaEntrega } = await getStorePickupDetails(order?.lojaId);

    // Verificar se precisa de troco
    const trocoInfo = order.precisaTroco && order.valorTroco 
      ? `\n💰 *Troco para:* R$ ${parseFloat(order.valorTroco).toFixed(2)}`
      : '';

    const customerMessage = `
 *Seu pedido #${order.id} está pronto para retirada!*

 🏪 *Local de retirada:* ${storeName}${enderecoPartes ? `\n📍 *Endereço:* ${enderecoPartes}` : ''}${pontoRefLoja ? `\n📌 *Referência:* ${pontoRefLoja}` : ''}

 💰 *Valor:* R$ ${parseFloat(order.totalPrice || 0).toFixed(2)}${trocoInfo}
 *Itens:*
 ${itemsListText}

 ${order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Pagamento na retirada' : 'Pedido já pago'}


    `.trim();

    console.log('📱 Enviando notificação de retirada via Z-API...');
    
    // Enviar mensagem para o cliente
    const customerPhone = order.user?.phone || order.shippingPhone;
    if (customerPhone) {
      console.log('\n🏪 ENVIANDO NOTIFICAÇÃO DE RETIRADA:');
      console.log(customerMessage);
      const result = await sendWhatsAppMessageZApi(customerPhone, customerMessage, order?.lojaId);
      
      if (result.success) {
        console.log('✅ Notificação de retirada enviada com sucesso!');
      } else {
        console.log('❌ Falha ao enviar notificação de retirada');
      }

      return {
        success: result.success,
        customerMessage,
        result
      };
    } else {
      console.log('⚠️ Telefone do cliente não disponível para notificação de retirada');
      return {
        success: false,
        error: 'Telefone do cliente não disponível'
      };
    }

  } catch (error) {
    console.error('❌ Erro ao enviar notificação de retirada:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const sendDeliveryNotifications = async (order, deliverer) => {
  try {
    console.log('📱 [MessageService] Iniciando envio de notificações');
    console.log('📋 [MessageService] Dados do pedido:', {
      id: order.id,
      totalPrice: order.totalPrice,
      user: order.user?.username,
      deliverer: deliverer?.nome,
      itemsCount: order.orderItems?.length
    });
 
    const allFlavors = await prisma.sabor.findMany({ where: { ativo: true } });
 
    const itemsList = order.itens_pedido?.length > 0
      ? await Promise.all(order.itens_pedido.map(item => formatOrderItem(item, allFlavors)))
      : ['Itens não disponíveis'];
 
    const itemsListText = Array.isArray(itemsList) ? itemsList.join('\n') : itemsList;
 
    const addressParts = [
      order.shippingStreet,
      order.shippingNumber,
      order.shippingComplement,
      order.shippingNeighborhood
    ].filter(Boolean);
 
    if (order.shippingReference) {
      addressParts.push(`Ref: ${order.shippingReference}`);
    }
 
    const address = addressParts.join(', ');
 
    const trocoInfo = order.precisaTroco && order.valorTroco
      ? `\n💰 *Troco para:* R$ ${parseFloat(order.valorTroco).toFixed(2)}`
      : '';
 
    const paymentMethod = order.pagamento?.metodo || order.metodoPagamento || order.paymentMethod || '';
    let paymentInfo = '';
    if (paymentMethod === 'PIX') {
      paymentInfo = '*💳 Pagamento:* PIX - Pedido pago';
    } else if (paymentMethod === 'CREDIT_CARD') {
      paymentInfo = '*💳 Pagamento:* Cartão de Crédito/Debito';
    } else if (paymentMethod === 'CASH_ON_DELIVERY') {
      paymentInfo = '*💵 Pagamento:* Dinheiro na entrega';
    } else if (paymentMethod) {
      paymentInfo = `*💳 Pagamento:* ${paymentMethod}`;
    }
 
    const delivererMessage = `
 *📋 Pedido: #${order.id}*
 
 *Cliente:* ${order.user?.username || 'N/A'}
 *Telefone:* ${order.user?.phone || order.shippingPhone || 'N/A'}
 
 *📍 Endereço:* ${address || 'Endereço não informado'}
 
 *Itens:*
 ${itemsListText}
 
 💰 *Valor:* R$ ${parseFloat(order.totalPrice || 0).toFixed(2)}${trocoInfo}
 ${paymentInfo ? `\n${paymentInfo}` : ''}
 
     `.trim();
 
    const trocoInfoCliente = order.precisaTroco && order.valorTroco
      ? `\n💰 *Troco para:* R$ ${parseFloat(order.valorTroco).toFixed(2)}`
      : '';
 
    const customerMessage = `
 *Seu pedido #${order.id} está a caminho!*
 
 *Entregador:* ${deliverer?.nome || 'N/A'}
 *Contato:* ${deliverer?.telefone || 'N/A'}
 
 *📍 Endereço:* ${address || 'Endereço não informado'}
 
 💰 *Valor:* R$ ${parseFloat(order.totalPrice || 0).toFixed(2)}${trocoInfoCliente}
 
 *Obrigado pela preferência!*
     `.trim();
 
    const results = {
      deliverer: { success: false },
      customer: { success: false }
    };
 
    if (deliverer?.telefone) {
      results.deliverer = await sendWhatsAppMessageZApi(deliverer.telefone, delivererMessage, order?.lojaId);
    }
 
    const customerPhone = order.user?.phone || order.shippingPhone;
    if (customerPhone) {
      results.customer = await sendWhatsAppMessageZApi(customerPhone, customerMessage, order?.lojaId);
    }
 
    return {
      success: results.deliverer.success || results.customer.success,
      delivererMessage,
      customerMessage,
      results
    };
 
   } catch (error) {
     console.error('❌ Erro ao enviar notificações:', error);
     return {
       success: false,
       error: error.message
     };
   }
 };

// Serviço para notificação de pagamento confirmado (PIX)
const sendPaymentConfirmationNotification = async (order) => {
  try {
    console.log('💳 [MessageService] Enviando notificação de pagamento confirmado');
    console.log('📋 [MessageService] Dados do pedido:', {
      id: order.id,
      precoTotal: order.precoTotal,
      usuario: order.usuario?.nomeUsuario,
      tipoEntrega: order.tipoEntrega
    });

    // Buscar todos os sabores para mapear IDs para nomes
    const allFlavors = await prisma.sabor.findMany({ where: { ativo: true } });
    
    // Construir lista de itens com sabores e complementos
    const itemsList = order.itens_pedido?.length > 0
      ? await Promise.all(order.itens_pedido.map(item => formatOrderItem(item, allFlavors)))
      : ['Itens não disponíveis'];
    
    const itemsListText = Array.isArray(itemsList) ? itemsList.join('\n') : itemsList;

    // Verificar se precisa de troco
    const trocoInfo = order.precisaTroco && order.valorTroco 
      ? `\n💰 *Troco para:* R$ ${parseFloat(order.valorTroco).toFixed(2)}`
      : '';

    const { storeName, enderecoPartes, pontoRefLoja, estimativaEntrega } = await getStorePickupDetails(order?.lojaId);

    const pickupInfo = `🏪 *Retirar em:* ${storeName}${estimativaEntrega ? `\n⏱️ *Estimativa:* ${estimativaEntrega}` : ''}\n*Aguarde a notificação para retirada*`;

    const customerMessage = `
*Seu pagamento foi confirmado com sucesso!✅*

*Pedido #${order.id}*
💰 *Valor:* R$ ${parseFloat(order.precoTotal || 0).toFixed(2)}${trocoInfo}

*Itens:*
${itemsListText}

*Seu pedido já está em preparo!*

${order.tipoEntrega === 'delivery' ? 
  `*Será entregue em:* ${order.ruaEntrega}, ${order.numeroEntrega}${order.complementoEntrega ? ` - ${order.complementoEntrega}` : ''} - ${order.bairroEntrega}${order.referenciaEntrega ? `\n*Referência:* ${order.referenciaEntrega}` : ''}` :
  pickupInfo
}`.trim();

    console.log('📱 Enviando notificação de pagamento confirmado via Z-API...');
    // Buscar telefone do usuário (preferencial) ou telefone de entrega
    const customerPhone = order.usuario?.telefone || order.telefoneEntrega;
    if (customerPhone) {
      console.log('\n💳 ENVIANDO NOTIFICAÇÃO DE PAGAMENTO CONFIRMADO:');
      console.log(customerMessage);
      const result = await sendWhatsAppMessageZApi(customerPhone, customerMessage, order?.lojaId);
      
      if (result.success) {
        console.log('✅ Notificação de pagamento confirmado enviada com sucesso!');
      } else {
        console.log('❌ Falha ao enviar notificação de pagamento confirmado');
      }

      return {
        success: result.success,
        customerMessage,
        result
      };
    } else {
      console.log('⚠️ Telefone do cliente não disponível para notificação de pagamento');
      return {
        success: false,
        error: 'Telefone do cliente não disponível'
      };
    }

  } catch (error) {
    console.error('❌ Erro ao enviar notificação de pagamento confirmado:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Serviço para notificação de pedido em preparo para cozinheiro
const sendCookNotification = async (order, cook) => {
  try {
    console.log('👨‍🍳 [MessageService] Enviando notificação para cozinheiro');
    console.log('📋 [MessageService] Dados do pedido:', {
      id: order.id,
      totalPrice: order.totalPrice,
      cook: cook?.nome,
      itemsCount: order.itens_pedido?.length
    });

    // Buscar todos os sabores para mapear IDs para nomes
    const allFlavors = await prisma.sabor.findMany({ where: { ativo: true } });
    
    // Construir lista de itens com sabores e complementos
    const itemsList = order.itens_pedido?.length > 0
      ? await Promise.all(order.itens_pedido.map(item => formatOrderItem(item, allFlavors)))
      : ['Itens não disponíveis'];
    
    const itemsListText = Array.isArray(itemsList) ? itemsList.join('\n') : itemsList;

    // Verificar se precisa de troco
    const trocoInfo = order.precisaTroco && order.valorTroco 
      ? `\n💰 *Troco para:* R$ ${parseFloat(order.valorTroco).toFixed(2)}`
      : '';

    const { storeName, enderecoPartes, pontoRefLoja, estimativaEntrega } = await getStorePickupDetails(order?.lojaId);

    const pickupLine = `🏪 RETIRADA NO LOCAL\n🏪 *Local:* ${storeName}${estimativaEntrega ? `\n⏱️ *Estimativa:* ${estimativaEntrega}` : ''}`;

    // Mensagem para o cozinheiro
    const cookMessage = `
 *NOVO PEDIDO PARA PREPARAR*

 *Pedido:* #${order.id}
 *Cliente:* ${order.usuario?.nomeUsuario || 'N/A'}
${order.tipoEntrega === 'delivery' ? '🚚 ENTREGA' : pickupLine}
💰 *Valor:* R$ ${parseFloat(order.precoTotal || 0).toFixed(2)}${trocoInfo}

*🍽️ ITENS DO PEDIDO:*
${itemsListText}

${order.observacoes ? ` *OBSERVAÇÕES DO CLIENTE:*\n${order.observacoes}\n` : ''}
    `.trim();

    console.log('📱 Enviando notificação para cozinheiro via Z-API...');
    
    // Enviar mensagem para o cozinheiro
    if (cook?.telefone) {
      console.log('\n👨‍🍳 ENVIANDO MENSAGEM PARA COZINHEIRO:');
      console.log(cookMessage);
      const result = await sendWhatsAppMessageZApi(cook.telefone, cookMessage, order?.lojaId);
      
      if (result.success) {
        console.log('✅ Notificação para cozinheiro enviada com sucesso!');
      } else {
        console.log('❌ Falha ao enviar notificação para cozinheiro');
      }

      return {
        success: result.success,
        cookMessage,
        result
      };
    } else {
      console.log('⚠️ Telefone do cozinheiro não disponível');
      return {
        success: false,
        error: 'Telefone do cozinheiro não disponível'
      };
    }

  } catch (error) {
    console.error('❌ Erro ao enviar notificação para cozinheiro:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Serviço para notificação de cancelamento de pedido para o cliente
const sendOrderCancellationNotification = async (order, reason) => {
  try {
    console.log('❌ [MessageService] Enviando notificação de cancelamento ao cliente');
    console.log('📋 [MessageService] Dados do pedido:', {
      id: order.id,
      precoTotal: order.precoTotal || order.totalPrice,
      usuario: order.usuario?.nomeUsuario || order.user?.username
    });

    // Buscar todos os sabores para mapear IDs para nomes
    const allFlavors = await prisma.sabor.findMany({ where: { ativo: true } });
    
    // Construir lista de itens com sabores e complementos
    const itemsList = order.itens_pedido?.length > 0
      ? await Promise.all(order.itens_pedido.map(item => formatOrderItem(item, allFlavors)))
      : ['Itens não disponíveis'];
    
    const itemsListText = Array.isArray(itemsList) ? itemsList.join('\n') : itemsList;

    const totalPrice = order.precoTotal || order.totalPrice || 0;
    
    // Verificar método de pagamento (pode estar em diferentes lugares)
    const paymentMethod = order.pagamento?.metodo || order.metodoPagamento || order.paymentMethod || '';

    const customerMessage = `
*Seu pedido #${order.id} foi cancelado* ❌

💰 *Valor do pedido:* R$ ${parseFloat(totalPrice).toFixed(2)}
*Itens:*
${itemsListText}

${paymentMethod === 'PIX' ? 
  '*Entre em contato conosco para solicitar o reembolso, ou realize outro pedido.*' : 
  '*Entre em contato conosco para mais informações sobre o reembolso.*'}

* Estamos à disposição para ajudar!*
    `.trim();

    // Buscar telefone do usuário (preferencial) ou telefone de entrega
    const customerPhone = order.usuario?.telefone || order.user?.phone || order.telefoneEntrega || order.shippingPhone;
    if (customerPhone) {
      console.log('\n❌ ENVIANDO NOTIFICAÇÃO DE CANCELAMENTO:');
      console.log(customerMessage);
      const result = await sendWhatsAppMessageZApi(customerPhone, customerMessage, order?.lojaId);
      if (result.success) {
        console.log('✅ Notificação de cancelamento enviada com sucesso!');
      } else {
        console.log('❌ Falha ao enviar notificação de cancelamento');
      }
      return {
        success: result.success,
        customerMessage,
        result
      };
    } else {
      console.log('⚠️ Telefone do cliente não disponível para notificação de cancelamento');
      return {
        success: false,
        error: 'Telefone do cliente não disponível'
      };
    }
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de cancelamento:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Serviço para notificação de edição de pedido
const sendOrderEditNotification = async (order, oldTotal, newTotal, editReason) => {
  try {
    console.log('✏️ [MessageService] Enviando notificação de edição de pedido ao cliente');
    console.log('📋 [MessageService] Dados do pedido:', {
      id: order.id,
      oldTotal: oldTotal,
      newTotal: newTotal,
      usuario: order.usuario?.nomeUsuario || order.user?.username
    });

    // Buscar todos os sabores para mapear IDs para nomes
    const allFlavors = await prisma.sabor.findMany({ where: { ativo: true } });
    
    // Construir lista de itens com sabores e complementos
    const itemsList = order.itens_pedido?.length > 0
      ? await Promise.all(order.itens_pedido.map(item => formatOrderItem(item, allFlavors)))
      : ['Itens não disponíveis'];
    
    const itemsListText = Array.isArray(itemsList) ? itemsList.join('\n') : itemsList;

    const difference = parseFloat(newTotal) - parseFloat(oldTotal);
    const differenceText = difference > 0 
      ? `+R$ ${Math.abs(difference).toFixed(2)}` 
      : `-R$ ${Math.abs(difference).toFixed(2)}`;

    const customerMessage = `
*Seu pedido #${order.id} foi editado* ✏️

💰 *Valor anterior:* R$ ${parseFloat(oldTotal).toFixed(2)}
💰 *Novo valor:* R$ ${parseFloat(newTotal).toFixed(2)}
💰 *Diferença:* ${differenceText}

${editReason ? `*Motivo da alteração:*\n${editReason}\n` : ''}

*Itens do pedido:*
${itemsListText}

*Se tiver alguma dúvida, entre em contato conosco!*
    `.trim();

    // Buscar telefone do usuário (preferencial) ou telefone de entrega
    const customerPhone = order.usuario?.telefone || order.user?.phone || order.telefoneEntrega || order.shippingPhone;
    if (customerPhone) {
      console.log('\n✏️ ENVIANDO NOTIFICAÇÃO DE EDIÇÃO DE PEDIDO:');
      console.log(customerMessage);
      const result = await sendWhatsAppMessageZApi(customerPhone, customerMessage, order?.lojaId);
      if (result.success) {
        console.log('✅ Notificação de edição de pedido enviada com sucesso!');
      } else {
        console.log('❌ Falha ao enviar notificação de edição de pedido');
      }
      return {
        success: result.success,
        customerMessage,
        result
      };
    } else {
      console.log('⚠️ Telefone do cliente não disponível para notificação de edição');
      return {
        success: false,
        error: 'Telefone do cliente não disponível'
      };
    }
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de edição de pedido:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendDeliveryNotifications,
  sendPickupNotification,
  sendPaymentConfirmationNotification,
  sendCookNotification,
  sendDeliveredConfirmationNotification,
  sendOrderCancellationNotification,
  sendOrderEditNotification,
  sendWhatsAppMessageZApi,
  checkPhoneExistsWhatsApp
};
