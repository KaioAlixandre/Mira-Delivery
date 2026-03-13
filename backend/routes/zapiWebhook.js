const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendWhatsAppMessageZApi } = require('../services/messageService');

function normalizeText(input) {
  return (input || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function extractIncomingText(body) {
  if (!body || typeof body !== 'object') return '';

  // Tentar múltiplos formatos de payload da Z-API
  const candidates = [
    // Formato Z-API específico (text.message, text.body, text.content)
    body?.text?.message,
    body?.text?.body,
    body?.text?.content,
    body?.text?.text,
    // Campos diretos (verificar se são strings, não objetos)
    typeof body.text === 'string' ? body.text : null,
    typeof body.message === 'string' ? body.message : null,
    typeof body.body === 'string' ? body.body : null,
    typeof body.content === 'string' ? body.content : null,
    body.messageText,
    body.textMessage,
    body.messageContent,
    // Data direto
    body?.data?.text,
    body?.data?.message,
    body?.data?.body,
    body?.data?.content,
    body?.data?.messageText,
    // Message object
    body?.message?.text,
    body?.message?.body,
    body?.message?.content,
    body?.message?.messageText,
    body?.message?.message,
    // Messages array
    body?.messages?.[0]?.text,
    body?.messages?.[0]?.message,
    body?.messages?.[0]?.body,
    body?.messages?.[0]?.content,
    body?.messages?.[0]?.messageText,
    // Conversation
    body?.conversation?.message?.text,
    body?.conversation?.message?.body,
    body?.conversation?.message?.content,
    body?.conversation?.message?.messageText,
    // Formato Z-API comum - data.message
    body?.data?.message?.text,
    body?.data?.message?.body,
    body?.data?.message?.content,
    body?.data?.message?.messageText,
    // Formato Z-API - extendedTextMessage (mensagens longas)
    body?.data?.message?.extendedTextMessage?.text,
    body?.data?.message?.extendedTextMessage?.content,
    body?.message?.extendedTextMessage?.text,
    body?.message?.extendedTextMessage?.content,
    body?.messages?.[0]?.extendedTextMessage?.text,
    body?.messages?.[0]?.extendedTextMessage?.content,
    // Formato Z-API - conversation (mensagens de texto simples)
    body?.data?.message?.conversation,
    body?.message?.conversation,
    body?.messages?.[0]?.conversation,
    // Formato Z-API - textMessage
    body?.data?.message?.textMessage,
    body?.message?.textMessage,
    body?.messages?.[0]?.textMessage,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  // Se não encontrou, tentar extrair de objetos aninhados recursivamente
  function findTextInObject(obj, depth = 0) {
    if (depth > 3 || !obj || typeof obj !== 'object') return null;
    
    if (typeof obj === 'string' && obj.trim()) {
      return obj;
    }
    
    for (const key in obj) {
      if (key.toLowerCase().includes('text') || 
          key.toLowerCase().includes('message') || 
          key.toLowerCase().includes('body') ||
          key.toLowerCase().includes('content')) {
        const value = obj[key];
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
        if (typeof value === 'object' && value !== null) {
          const found = findTextInObject(value, depth + 1);
          if (found) return found;
        }
      }
    }
    
    return null;
  }

  const foundText = findTextInObject(body);
  if (foundText) return foundText;

  return '';
}

function extractIncomingPhone(body) {
  if (!body || typeof body !== 'object') return '';

  // Tentar múltiplos formatos de payload da Z-API
  const candidates = [
    body.phone,
    body.phoneNumber,
    body.from,
    body.sender,
    body.remoteJid,
    body.contact,
    body?.data?.phone,
    body?.data?.phoneNumber,
    body?.data?.from,
    body?.data?.sender,
    body?.data?.remoteJid,
    body?.data?.contact,
    body?.message?.from,
    body?.message?.phone,
    body?.message?.phoneNumber,
    body?.message?.remoteJid,
    body?.message?.contact,
    body?.messages?.[0]?.from,
    body?.messages?.[0]?.phone,
    body?.messages?.[0]?.phoneNumber,
    body?.messages?.[0]?.remoteJid,
    body?.messages?.[0]?.contact,
    body?.conversation?.phone,
    body?.conversation?.phoneNumber,
    body?.conversation?.from,
    body?.conversation?.remoteJid,
    body?.conversation?.contact,
    // Formato Z-API comum
    body?.data?.message?.from,
    body?.data?.message?.phone,
    body?.data?.message?.phoneNumber,
  ];

  for (const candidate of candidates) {
    if (candidate) {
      // Limpar o número (remover @s.whatsapp.net se presente)
      const cleaned = String(candidate)
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '')
        .replace('@g.us', '')
        .replace(/[^0-9]/g, '') // Remove tudo que não é número
        .trim();
      if (cleaned && cleaned.length >= 10) return cleaned; // Mínimo 10 dígitos para ser um telefone válido
    }
  }

  return '';
}

function extractFromMeFlag(body) {
  if (!body || typeof body !== 'object') return false;

  const candidates = [
    body.fromMe,
    body?.data?.fromMe,
    body?.message?.fromMe,
    body?.messages?.[0]?.fromMe,
    body?.isFromMe,
    body?.data?.isFromMe
  ];

  return candidates.some(v => v === true || v === 'true' || v === 1 || v === '1');
}

function timeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const parts = hhmm.split(':');
  if (parts.length < 2) return null;
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function isWithinWindow(nowMinutes, openMinutes, closeMinutes) {
  if (openMinutes == null || closeMinutes == null) return true;

  if (openMinutes === closeMinutes) return true;

  if (closeMinutes > openMinutes) {
    return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  }

  return nowMinutes >= openMinutes || nowMinutes <= closeMinutes;
}

function getNowInSaoPaulo() {
  const brasilNowString = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  return new Date(brasilNowString);
}

function isGreeting(text) {
  const t = normalizeText(text);
  if (!t) return false;

  const greetings = [
    'oi',
    'ola',
    'olá',
    'bom dia',
    'boa tarde',
    'boa noite',
    'eai',
    'ei',
    'opa',
    'tudo bem',
    'tudo bom',
    'menu',
    'cardapio',
    'cardápio'
  ].map(normalizeText);

  return greetings.some(g => t === g || t.startsWith(`${g} `));
}

async function resolveLojaId(req) {
  const lojaIdParam = req.query?.lojaId;
  if (lojaIdParam && Number.isFinite(Number(lojaIdParam))) {
    return Number(lojaIdParam);
  }

  const subdominio = req.query?.subdominio;
  if (subdominio) {
    const loja = await prisma.loja.findUnique({ where: { subdominio: subdominio.toString() } });
    if (loja?.id) return loja.id;
  }

  const headerLojaId = req.headers['x-loja-id'];
  if (headerLojaId && Number.isFinite(Number(headerLojaId))) {
    return Number(headerLojaId);
  }

  return 1;
}

async function getStoreOpenStatus(lojaId) {
  const config = await prisma.configuracao_loja.findUnique({ where: { lojaId } });

  const aberto = (config?.aberto ?? true) === true;
  if (!aberto) return { open: false, config };

  const now = getNowInSaoPaulo();
  const day = now.getDay();

  const dias = (config?.diasAbertos || '').toString().split(',').map(s => s.trim()).filter(Boolean);
  if (dias.length > 0 && !dias.includes(String(day))) {
    return { open: false, config };
  }

  const openMinutes = timeToMinutes(config?.horaAbertura);
  const closeMinutes = timeToMinutes(config?.horaFechamento);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const within = isWithinWindow(nowMinutes, openMinutes, closeMinutes);
  return { open: within, config };
}

// Rota de teste para verificar se o webhook está acessível
router.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Webhook Z-API está funcionando!',
    lojaId: req.query?.lojaId || 'não informado',
    timestamp: new Date().toISOString()
  });
});

router.post('/', async (req, res) => {
  try {
    console.log('🔔 [Z-API Webhook] ============================================');
    console.log('🔔 [Z-API Webhook] Requisição POST recebida');
    console.log('📦 [Z-API Webhook] Body completo:', JSON.stringify(req.body, null, 2));
    console.log('🔍 [Z-API Webhook] Query params:', JSON.stringify(req.query, null, 2));
    console.log('🔍 [Z-API Webhook] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 [Z-API Webhook] Content-Type:', req.headers['content-type']);
    console.log('🔍 [Z-API Webhook] Method:', req.method);

    // Responder imediatamente para evitar timeout da Z-API
    res.status(200).json({ ok: true, received: true });

    const fromMe = extractFromMeFlag(req.body);
    console.log('🔍 [Z-API Webhook] fromMe:', fromMe);
    if (fromMe) {
      console.log('⏭️ [Z-API Webhook] Ignorando mensagem (fromMe=true)');
      return;
    }

    const lojaId = await resolveLojaId(req);
    console.log('🏪 [Z-API Webhook] Loja ID resolvido:', lojaId);

    // Log detalhado de todos os campos do body para debug
    console.log('🔍 [Z-API Webhook] Análise detalhada do body:');
    console.log('🔍 [Z-API Webhook] Body keys:', Object.keys(req.body || {}));
    if (req.body?.data) {
      console.log('🔍 [Z-API Webhook] Body.data keys:', Object.keys(req.body.data || {}));
    }
    if (req.body?.message) {
      console.log('🔍 [Z-API Webhook] Body.message keys:', Object.keys(req.body.message || {}));
      console.log('🔍 [Z-API Webhook] Body.message completo:', JSON.stringify(req.body.message, null, 2));
    }
    if (req.body?.messages && Array.isArray(req.body.messages) && req.body.messages[0]) {
      console.log('🔍 [Z-API Webhook] Body.messages[0] keys:', Object.keys(req.body.messages[0] || {}));
      console.log('🔍 [Z-API Webhook] Body.messages[0] completo:', JSON.stringify(req.body.messages[0], null, 2));
    }

    const text = extractIncomingText(req.body);
    const phone = extractIncomingPhone(req.body);
    console.log('📱 [Z-API Webhook] Telefone extraído:', phone);
    console.log('💬 [Z-API Webhook] Texto extraído:', text || '(VAZIO)');

    if (!phone) {
      console.log('⚠️ [Z-API Webhook] Telefone não encontrado no payload');
      console.log('⚠️ [Z-API Webhook] Tentando extrair de todos os campos do body...');
      console.log('⚠️ [Z-API Webhook] Body keys:', Object.keys(req.body || {}));
      return;
    }

    const normalizedText = normalizeText(text);
    const isGreetingResult = isGreeting(text);
    console.log('💬 [Z-API Webhook] Texto normalizado:', normalizedText);
    console.log('👋 [Z-API Webhook] É saudação?', isGreetingResult);

    if (!isGreetingResult) {
      console.log('⚠️ [Z-API Webhook] Texto não é uma saudação reconhecida');
      console.log('⚠️ [Z-API Webhook] Texto recebido:', text);
      console.log('⚠️ [Z-API Webhook] Texto normalizado:', normalizedText);
      return;
    }

    const { open, config } = await getStoreOpenStatus(lojaId);
    console.log('🕐 [Z-API Webhook] Loja aberta?', open);
    console.log('⚙️ [Z-API Webhook] Config:', config);

    const menuLink = process.env.CARDAPIO_LINK || process.env.CARDAPIO_URL || '';
    console.log('🔗 [Z-API Webhook] Link do cardápio:', menuLink || 'NÃO CONFIGURADO');

    if (!open) {
      const openingTime = config?.horaAbertura || '08:00';
      const closingTime = config?.horaFechamento || '18:00';
      const message = `Olá! No momento estamos fora do horário de funcionamento.\n\nNosso horário é de ${openingTime} até ${closingTime}.`;
      console.log('📤 [Z-API Webhook] Enviando mensagem de loja fechada');
      console.log('📱 [Z-API Webhook] Para:', phone);
      console.log('💬 [Z-API Webhook] Mensagem:', message);
      const result = await sendWhatsAppMessageZApi(phone, message, lojaId);
      console.log('📤 [Z-API Webhook] Resultado do envio:', JSON.stringify(result, null, 2));
      console.log('✅ [Z-API Webhook] Mensagem de loja fechada enviada com sucesso');
      return;
    }

    const baseMessage = menuLink
      ? `Olá! Segue o link do nosso cardápio:\n${menuLink}`
      : 'Olá! No momento não conseguimos enviar o link do cardápio. Por favor, tente novamente em instantes.';

    console.log('📤 [Z-API Webhook] Enviando mensagem com cardápio');
    console.log('📱 [Z-API Webhook] Para:', phone);
    console.log('💬 [Z-API Webhook] Mensagem a ser enviada:', baseMessage);
    const result = await sendWhatsAppMessageZApi(phone, baseMessage, lojaId);
    console.log('📤 [Z-API Webhook] Resultado do envio:', JSON.stringify(result, null, 2));
    console.log('✅ [Z-API Webhook] Mensagem com cardápio enviada com sucesso');

  } catch (err) {
    console.error('❌ [Z-API Webhook] Erro:', err);
    console.error('❌ [Z-API Webhook] Stack:', err.stack);
    console.error('❌ [Z-API Webhook] Body que causou erro:', JSON.stringify(req.body, null, 2));
  } finally {
    console.log('🔔 [Z-API Webhook] ============================================');
  }
});

module.exports = router;
