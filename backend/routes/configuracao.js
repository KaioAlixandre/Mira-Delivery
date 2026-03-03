const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authModule = require('./auth');
const { authenticateToken, authorize } = authModule;

const multer = require('multer');
const cloudinary = require('../services/cloudinary');
const streamifier = require('streamifier');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test((file.originalname || '').toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas'));
  }
});

console.log(' [StoreConfigRoutes] Módulo de rotas de configuração da loja carregado');

// Função auxiliar para obter o dia da semana no fuso horário do Brasil (America/Sao_Paulo)
function getDayOfWeekInBrazil() {
  const brasilNow = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });

  const dateInBrazil = new Date(brasilNow);
  return dateInBrazil.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
}

router.post('/logo', authenticateToken, authorize('admin'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado. Use o campo "logo".' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'store-logo', resource_type: 'image' },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const logoUrl = uploadResult.secure_url;

    const config = await prisma.configuracao_loja.upsert({
      where: { lojaId: req.lojaId },
      update: { logoUrl },
      create: {
        lojaId: req.lojaId,
        logoUrl,
        aberto: true,
        horaAbertura: '08:00',
        horaFechamento: '18:00',
        diasAbertos: '2,3,4,5,6,0',
        horaEntregaInicio: '08:00',
        horaEntregaFim: '18:00'
      }
    });

    return res.json({ logoUrl, config });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Buscar configuração da loja - Acessível para todos
router.get('/', async (req, res) => {
  console.log(` [GET /api/store-config] Iniciando busca da configuração (Loja ID: ${req.lojaId})`);
  
  try {
    // MULTI-TENANT: Agora pedimos para o Prisma trazer os dados da Loja junto com a Configuração!
    // 🌟 MULTI-TENANT: Agora pedimos para o Prisma trazer os dados da Loja junto com a Configuração!
    let config = await prisma.configuracao_loja.findUnique({
      where: { lojaId: req.lojaId },
      include: { loja: true } // Traz o nome, subdomínio e cor primária
    });

    if (!config) {
      console.log('⚠️ Nenhuma configuração encontrada, criando configuração padrão...');
      config = await prisma.configuracao_loja.create({
        data: {
          lojaId: req.lojaId,
          aberto: true,
          horaAbertura: '08:00',
          horaFechamento: '18:00',
          diasAbertos: '2,3,4,5,6,0',
          horaEntregaInicio: '08:00',
          horaEntregaFim: '18:00',
          deliveryAtivo: true
        },
        include: { loja: true }
      });
    }
    
    // Garantir que os campos de entrega estejam presentes na resposta
    if (!config.horaEntregaInicio) config.horaEntregaInicio = '08:00';
    if (!config.horaEntregaFim) config.horaEntregaFim = '18:00';
    
    const configResponse = {
      ...config,
      // 🌟 O Front-end agora vai receber o nome exato que o dono cadastrou!
      nomeLoja: config.loja?.nome || 'Delivery', 
      corPrimaria: config.loja?.corPrimaria || '#FF0000',
      chavePix: config.chavePix ?? config.telefoneWhatsapp ?? null,
    };
    
    res.json(configResponse);
  } catch (error) {
    console.error('❌ [GET /api/store-config] Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configuração da loja
router.put('/', authenticateToken, authorize('admin'), async (req, res) => {
  console.log(`📡 [PUT /api/store-config] Atualizando configuração (Loja ID: ${req.lojaId})`);
  
  const { 
    aberto, isOpen, horaAbertura: backendOpeningTime, horaFechamento: backendClosingTime, 
    openTime: frontendOpenTime, closeTime: frontendCloseTime, diasAbertos, nomeLoja,
    telefoneWhatsapp, chavePix, deliveryEnabled, deliveryAtivo, enderecoLoja,
    ruaLoja, bairroLoja, numeroLoja, pontoReferenciaLoja,
    slogan, instagramUrl,
    taxaEntrega, valorPedidoMinimo, raioEntregaKm, estimativaEntrega,
    promocaoTaxaAtiva, promocaoDias, promocaoValorMinimo, deliveryStart,
    deliveryEnd, horaEntregaInicio: backendDeliveryStart, horaEntregaFim: backendDeliveryEnd,
    logoUrl,
    zapApiToken, zapApiInstance, zapApiClientToken
  } = req.body;
  
  let existingConfig = null;
  try {
    // 🌟 MULTI-TENANT: Busca apenas da loja logada (não mais id: 1)
    existingConfig = await prisma.configuracao_loja.findUnique({ 
      where: { lojaId: req.lojaId } 
    });
  } catch (e) {
    existingConfig = null;
  }

  const openingTime = frontendOpenTime || backendOpeningTime || existingConfig?.horaAbertura || '08:00';
  const closingTime = frontendCloseTime || backendClosingTime || existingConfig?.horaFechamento || '18:00';
  const diasAbertosFinal = diasAbertos || existingConfig?.diasAbertos || '2,3,4,5,6,0';
  const abertoFinal = (typeof isOpen === 'boolean') ? isOpen : ((typeof aberto === 'boolean') ? aberto : (existingConfig?.aberto ?? true));
  const horaEntregaInicio = deliveryStart || backendDeliveryStart || existingConfig?.horaEntregaInicio || '08:00';
  const horaEntregaFim = deliveryEnd || backendDeliveryEnd || existingConfig?.horaEntregaFim || '18:00';
  const deliveryAtivoFinal = (typeof deliveryEnabled === 'boolean') ? deliveryEnabled : ((typeof deliveryAtivo === 'boolean') ? deliveryAtivo : (existingConfig?.deliveryAtivo ?? true));
  const promocaoTaxaAtivaFinal = (typeof promocaoTaxaAtiva === 'boolean') ? promocaoTaxaAtiva : (existingConfig?.promocaoTaxaAtiva ?? false);
  const promocaoDiasFinal = (promocaoDias !== undefined) ? (promocaoDias || null) : (existingConfig?.promocaoDias ?? null);
  const promocaoValorMinimoFinal = (promocaoValorMinimo !== undefined) ? (promocaoValorMinimo ? parseFloat(promocaoValorMinimo) : null) : (existingConfig?.promocaoValorMinimo ?? null);

  const taxaEntregaFinal = (taxaEntrega !== undefined)
    ? (taxaEntrega === '' || taxaEntrega === null ? 0 : parseFloat(taxaEntrega))
    : (existingConfig?.taxaEntrega ?? 0);

  const valorPedidoMinimoFinal = (valorPedidoMinimo !== undefined)
    ? (valorPedidoMinimo === '' || valorPedidoMinimo === null ? null : parseFloat(valorPedidoMinimo))
    : (existingConfig?.valorPedidoMinimo ?? null);

  const raioEntregaKmFinal = (raioEntregaKm !== undefined)
    ? (raioEntregaKm === '' || raioEntregaKm === null ? null : parseFloat(raioEntregaKm))
    : (existingConfig?.raioEntregaKm ?? null);

  const estimativaEntregaFinal = (estimativaEntrega !== undefined)
    ? (estimativaEntrega || null)
    : (existingConfig?.estimativaEntrega ?? null);

  const ruaLojaFinal = (ruaLoja !== undefined)
    ? (ruaLoja || null)
    : (existingConfig?.ruaLoja ?? null);

  const bairroLojaFinal = (bairroLoja !== undefined)
    ? (bairroLoja || null)
    : (existingConfig?.bairroLoja ?? null);

  const numeroLojaFinal = (numeroLoja !== undefined)
    ? (numeroLoja || null)
    : (existingConfig?.numeroLoja ?? null);

  const pontoReferenciaLojaFinal = (pontoReferenciaLoja !== undefined)
    ? (pontoReferenciaLoja || null)
    : (existingConfig?.pontoReferenciaLoja ?? null);

  // Compor enderecoLoja a partir dos campos detalhados
  const parts = [ruaLojaFinal, numeroLojaFinal, bairroLojaFinal].filter(Boolean);
  const enderecoLojaFinal = parts.length > 0 ? parts.join(', ') : (existingConfig?.enderecoLoja ?? null);

  const sloganFinal = (slogan !== undefined)
    ? (slogan || null)
    : (existingConfig?.slogan ?? null);

  const instagramUrlFinal = (instagramUrl !== undefined)
    ? (instagramUrl || null)
    : (existingConfig?.instagramUrl ?? null);

  const telefoneWhatsappFinal = (telefoneWhatsapp !== undefined)
    ? (telefoneWhatsapp || null)
    : (existingConfig?.telefoneWhatsapp ?? null);

  const chavePixFinal = (chavePix !== undefined)
    ? (chavePix || null)
    : (existingConfig?.chavePix ?? null);

  const zapApiTokenFinal = (zapApiToken !== undefined)
    ? (zapApiToken || null)
    : (existingConfig?.zapApiToken ?? null);
  const zapApiInstanceFinal = (zapApiInstance !== undefined)
    ? (zapApiInstance || null)
    : (existingConfig?.zapApiInstance ?? null);
  const zapApiClientTokenFinal = (zapApiClientToken !== undefined)
    ? (zapApiClientToken || null)
    : (existingConfig?.zapApiClientToken ?? null);
  
  try {
    // 🌟 MULTI-TENANT: Upsert baseado no lojaId!
    const config = await prisma.configuracao_loja.upsert({
      where: { lojaId: req.lojaId }, // Procura a config desta loja
      update: { 
        aberto: abertoFinal,
        deliveryAtivo: deliveryAtivoFinal,
        taxaEntrega: taxaEntregaFinal,
        valorPedidoMinimo: valorPedidoMinimoFinal,
        raioEntregaKm: raioEntregaKmFinal,
        estimativaEntrega: estimativaEntregaFinal,
        enderecoLoja: enderecoLojaFinal,
        ruaLoja: ruaLojaFinal,
        bairroLoja: bairroLojaFinal,
        numeroLoja: numeroLojaFinal,
        pontoReferenciaLoja: pontoReferenciaLojaFinal,
        slogan: sloganFinal,
        instagramUrl: instagramUrlFinal,
        telefoneWhatsapp: telefoneWhatsappFinal,
        chavePix: chavePixFinal,
        horaAbertura: openingTime, 
        horaFechamento: closingTime, 
        diasAbertos: diasAbertosFinal,
        logoUrl: (logoUrl !== undefined) ? (logoUrl || null) : (existingConfig?.logoUrl ?? null),
        promocaoTaxaAtiva: promocaoTaxaAtivaFinal,
        promocaoDias: promocaoDiasFinal,
        promocaoValorMinimo: promocaoValorMinimoFinal,
        horaEntregaInicio,
        horaEntregaFim,
        zapApiToken: zapApiTokenFinal,
        zapApiInstance: zapApiInstanceFinal,
        zapApiClientToken: zapApiClientTokenFinal
      },
      create: { 
        lojaId: req.lojaId, // 🌟 MULTI-TENANT: Se não existir, cria para esta loja
        aberto: abertoFinal,
        deliveryAtivo: deliveryAtivoFinal,
        taxaEntrega: taxaEntregaFinal,
        valorPedidoMinimo: valorPedidoMinimoFinal,
        raioEntregaKm: raioEntregaKmFinal,
        estimativaEntrega: estimativaEntregaFinal,
        enderecoLoja: enderecoLojaFinal,
        ruaLoja: ruaLojaFinal,
        bairroLoja: bairroLojaFinal,
        numeroLoja: numeroLojaFinal,
        pontoReferenciaLoja: pontoReferenciaLojaFinal,
        slogan: sloganFinal,
        instagramUrl: instagramUrlFinal,
        telefoneWhatsapp: telefoneWhatsappFinal,
        chavePix: chavePixFinal,
        horaAbertura: openingTime, 
        horaFechamento: closingTime, 
        diasAbertos: diasAbertosFinal,
        logoUrl: (logoUrl !== undefined) ? (logoUrl || null) : (existingConfig?.logoUrl ?? null),
        promocaoTaxaAtiva: promocaoTaxaAtivaFinal,
        promocaoDias: promocaoDiasFinal,
        promocaoValorMinimo: promocaoValorMinimoFinal,
        horaEntregaInicio,
        horaEntregaFim,
        zapApiToken: zapApiTokenFinal,
        zapApiInstance: zapApiInstanceFinal,
        zapApiClientToken: zapApiClientTokenFinal
      }
    });
    
    console.log('✅ Configuração atualizada com sucesso!');
    res.json(config);
  } catch (error) {
    console.error('❌ Erro ao atualizar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Verificar se a promoção de frete grátis está ativa hoje
router.get('/promo-frete-check', async (req, res) => {
  try {
    // 🌟 MULTI-TENANT: Busca a config da loja para ver o frete dela
    const config = await prisma.configuracao_loja.findUnique({
      where: { lojaId: req.lojaId }
    });
    
    if (!config || !config.promocaoTaxaAtiva) {
      return res.json({ ativa: false, mensagem: null, valorMinimo: null });
    }
    
    const hoje = getDayOfWeekInBrazil().toString();
    const diasPromo = config.promocaoDias ? config.promocaoDias.split(',') : [];
    
    if (diasPromo.includes(hoje)) {
      const valorMinimo = parseFloat(config.promocaoValorMinimo || 0);
      return res.json({
        ativa: true,
        mensagem: `Promoção de Frete Grátis! Pedidos acima de R$ ${valorMinimo.toFixed(2)} ganham frete grátis hoje!`,
        valorMinimo: valorMinimo
      });
    }
    
    res.json({ ativa: false, mensagem: null, valorMinimo: null });
  } catch (error) {
    console.error('❌ Erro ao verificar promoção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;