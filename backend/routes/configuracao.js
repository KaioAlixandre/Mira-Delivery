const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authModule = require('./auth');
const { authenticateToken, authorize } = authModule;

console.log('🚀 [StoreConfigRoutes] Módulo de rotas de configuração da loja carregado');

// Função auxiliar para obter o dia da semana no fuso horário do Brasil (America/Sao_Paulo)
function getDayOfWeekInBrazil() {
  // Obter a data atual no fuso horário do Brasil
  const brasilNow = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const dateInBrazil = new Date(brasilNow);
  return dateInBrazil.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
}

// Buscar configuração da loja - Acessível para todos (não requer admin)
router.get('/', async (req, res) => {
  console.log('🔍 [GET /api/store-config] Iniciando busca da configuração da loja');
  console.log('🔑 [GET /api/store-config] Headers recebidos:', req.headers);
  
  try {
    console.log(' [GET /api/store-config] Procurando configuração existente no banco...');
    let config = await prisma.configuracao_loja.findFirst();
    if (!config) {
      console.log(' [GET /api/store-config] Nenhuma configuração encontrada, criando configuração padrão...');
      config = await prisma.configuracao_loja.create({
        data: {
          aberto: true,
          horaAbertura: '08:00',
          horaFechamento: '18:00',
          diasAbertos: '2,3,4,5,6,0',
          horaEntregaInicio: '08:00',
          horaEntregaFim: '18:00',
          nomeLoja: null,
          telefoneWhatsapp: null,
          enderecoLoja: null,
          taxaEntrega: null,
          raioEntregaKm: null
        }
      });
      console.log(' [GET /api/store-config] Configuração padrão criada:', config);
    } else {
      console.log(' [GET /api/store-config] Configuração encontrada:', config);
    }
    
    // Garantir que os campos de entrega estejam presentes na resposta
    if (!config.horaEntregaInicio) config.horaEntregaInicio = '08:00';
    if (!config.horaEntregaFim) config.horaEntregaFim = '18:00';
    console.log(' [GET /api/store-config] Enviando resposta com configuração');
    res.json(config);
  } catch (error) {
    console.error(' [GET /api/store-config] Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configuração da loja
router.put('/', authenticateToken, authorize('admin'), async (req, res) => {
  console.log(' [PUT /api/store-config] Iniciando atualização da configuração da loja');
  console.log(' [PUT /api/store-config] Dados recebidos:', req.body);
  
  // Aceitar tanto os nomes do frontend (openTime/closeTime) quanto do backend (openingTime/closingTime)
  const { 
    aberto, 
    horaAbertura: backendOpeningTime, 
    horaFechamento: backendClosingTime, 
    openTime: frontendOpenTime,
    closeTime: frontendCloseTime,
    diasAbertos,
    nomeLoja,
    telefoneWhatsapp,
    enderecoLoja,
    taxaEntrega,
    raioEntregaKm,
    promocaoTaxaAtiva,
    promocaoDias,
    promocaoValorMinimo,
    deliveryStart,
    deliveryEnd,
    horaEntregaInicio: backendDeliveryStart,
    horaEntregaFim: backendDeliveryEnd
  } = req.body;
  
  // Buscar config atual para garantir campos obrigatórios quando não vierem no body
  let existingConfig = null;
  try {
    existingConfig = await prisma.configuracao_loja.findUnique({ where: { id: 1 } });
  } catch (e) {
    existingConfig = null;
  }

  // Usar os valores do frontend se disponíveis, senão usar os do backend, senão usar valor atual/default
  const openingTime = frontendOpenTime || backendOpeningTime || existingConfig?.horaAbertura || '08:00';
  const closingTime = frontendCloseTime || backendClosingTime || existingConfig?.horaFechamento || '18:00';
  const diasAbertosFinal = diasAbertos || existingConfig?.diasAbertos || '2,3,4,5,6,0';
  const abertoFinal = (typeof aberto === 'boolean') ? aberto : (existingConfig?.aberto ?? true);
  const horaEntregaInicio = deliveryStart || backendDeliveryStart || existingConfig?.horaEntregaInicio || '08:00';
  const horaEntregaFim = deliveryEnd || backendDeliveryEnd || existingConfig?.horaEntregaFim || '18:00';

  const promocaoTaxaAtivaFinal = (typeof promocaoTaxaAtiva === 'boolean')
    ? promocaoTaxaAtiva
    : (existingConfig?.promocaoTaxaAtiva ?? false);
  const promocaoDiasFinal = (promocaoDias !== undefined) ? (promocaoDias || null) : (existingConfig?.promocaoDias ?? null);
  const promocaoValorMinimoFinal = (promocaoValorMinimo !== undefined)
    ? (promocaoValorMinimo ? parseFloat(promocaoValorMinimo) : null)
    : (existingConfig?.promocaoValorMinimo ?? null);
  
  console.log(' [PUT /api/store-config] Dados extraídos e mapeados:', {
    aberto: abertoFinal,
    openingTime,
    closingTime,
    diasAbertos: diasAbertosFinal,
    nomeLoja,
    telefoneWhatsapp,
    enderecoLoja,
    taxaEntrega,
    raioEntregaKm,
    promocaoTaxaAtiva: promocaoTaxaAtivaFinal,
    promocaoDias: promocaoDiasFinal,
    promocaoValorMinimo: promocaoValorMinimoFinal,
    horaEntregaInicio,
    horaEntregaFim,
    'fonte-openingTime': frontendOpenTime ? 'frontend (openTime)' : 'backend (horaAbertura)',
    'fonte-closingTime': frontendCloseTime ? 'frontend (closeTime)' : 'backend (horaFechamento)',
    'fonte-horaEntregaInicio': deliveryStart ? 'frontend (deliveryStart)' : 'backend (horaEntregaInicio)',
    'fonte-horaEntregaFim': deliveryEnd ? 'frontend (deliveryEnd)' : 'backend (horaEntregaFim)'
  });
  
  try {
    console.log(' [PUT /api/store-config] Executando upsert no banco de dados...');
    const config = await prisma.configuracao_loja.upsert({
      where: { id: 1 },
      update: { 
        aberto: abertoFinal,
        horaAbertura: openingTime, 
        horaFechamento: closingTime, 
        diasAbertos: diasAbertosFinal,
        nomeLoja: nomeLoja ?? null,
        telefoneWhatsapp: telefoneWhatsapp ?? null,
        enderecoLoja: enderecoLoja ?? null,
        taxaEntrega: (taxaEntrega === '' || taxaEntrega === undefined || taxaEntrega === null) ? null : parseFloat(taxaEntrega),
        raioEntregaKm: (raioEntregaKm === '' || raioEntregaKm === undefined || raioEntregaKm === null) ? null : parseFloat(raioEntregaKm),
        promocaoTaxaAtiva: promocaoTaxaAtivaFinal,
        promocaoDias: promocaoDiasFinal,
        promocaoValorMinimo: promocaoValorMinimoFinal,
        horaEntregaInicio,
        horaEntregaFim
      },
      create: { 
        aberto: abertoFinal,
        horaAbertura: openingTime, 
        horaFechamento: closingTime, 
        diasAbertos: diasAbertosFinal,
        nomeLoja: nomeLoja ?? null,
        telefoneWhatsapp: telefoneWhatsapp ?? null,
        enderecoLoja: enderecoLoja ?? null,
        taxaEntrega: (taxaEntrega === '' || taxaEntrega === undefined || taxaEntrega === null) ? null : parseFloat(taxaEntrega),
        raioEntregaKm: (raioEntregaKm === '' || raioEntregaKm === undefined || raioEntregaKm === null) ? null : parseFloat(raioEntregaKm),
        promocaoTaxaAtiva: promocaoTaxaAtivaFinal,
        promocaoDias: promocaoDiasFinal,
        promocaoValorMinimo: promocaoValorMinimoFinal,
        horaEntregaInicio,
        horaEntregaFim
      }
    });
    
    console.log(' [PUT /api/store-config] Configuração atualizada com sucesso:', config);
    console.log(' [PUT /api/store-config] Enviando resposta');
    res.json(config);
  } catch (error) {
    console.error(' [PUT /api/store-config] Erro ao atualizar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Verificar se a promoção de frete grátis está ativa hoje
router.get('/promo-frete-check', async (req, res) => {
  console.log('🎉 [GET /api/store-config/promo-frete-check] Verificando promoção de frete grátis');
  
  try {
    const config = await prisma.configuracao_loja.findFirst();
    
    if (!config || !config.promocaoTaxaAtiva) {
      return res.json({
        ativa: false,
        mensagem: null,
        valorMinimo: null
      });
    }
    
    const hoje = getDayOfWeekInBrazil().toString(); // 0 = domingo, 1 = segunda, etc. (horário do Brasil)
    const diasPromo = config.promocaoDias ? config.promocaoDias.split(',') : [];
    
    if (diasPromo.includes(hoje)) {
      const valorMinimo = parseFloat(config.promocaoValorMinimo || 0);
      return res.json({
        ativa: true,
        mensagem: `Promoção de Frete Grátis! Pedidos acima de R$ ${valorMinimo.toFixed(2)} ganham frete grátis hoje!`,
        valorMinimo: valorMinimo
      });
    }
    
    res.json({
      ativa: false,
      mensagem: null,
      valorMinimo: null
    });
  } catch (error) {
    console.error('❌ [GET /api/store-config/promo-frete-check] Erro ao verificar promoção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;