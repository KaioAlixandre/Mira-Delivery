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
    body.text,
    body.message,
    body.body,
    body.content,
    body?.data?.text,
    body?.data?.message,
    body?.data?.body,
    body?.data?.content,
    body?.message?.text,
    body?.message?.body,
    body?.message?.content,
    body?.messages?.[0]?.text,
    body?.messages?.[0]?.message,
    body?.messages?.[0]?.body,
    body?.messages?.[0]?.content,
    body?.conversation?.message?.text,
    body?.conversation?.message?.body,
    body?.conversation?.message?.content,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return '';
}

function extractIncomingPhone(body) {
  if (!body || typeof body !== 'object') return '';

  // Tentar múltiplos formatos de payload da Z-API
  const candidates = [
    body.phone,
    body.from,
    body.sender,
    body.remoteJid,
    body?.data?.phone,
    body?.data?.from,
    body?.data?.sender,
    body?.data?.remoteJid,
    body?.message?.from,
    body?.message?.phone,
    body?.message?.remoteJid,
    body?.messages?.[0]?.from,
    body?.messages?.[0]?.phone,
    body?.messages?.[0]?.remoteJid,
    body?.conversation?.phone,
    body?.conversation?.from,
    body?.conversation?.remoteJid,
  ];

  for (const candidate of candidates) {
    if (candidate) {
      // Limpar o número (remover @s.whatsapp.net se presente)
      const cleaned = String(candidate).replace('@s.whatsapp.net', '').replace('@c.us', '').trim();
      if (cleaned) return cleaned;
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
    console.log('🔔 [Z-API Webhook] Requisição recebida');
    console.log('📦 [Z-API Webhook] Body completo:', JSON.stringify(req.body, null, 2));
    console.log('🔍 [Z-API Webhook] Query params:', req.query);
    console.log('🔍 [Z-API Webhook] Headers:', req.headers);

    const fromMe = extractFromMeFlag(req.body);
    console.log('🔍 [Z-API Webhook] fromMe:', fromMe);
    if (fromMe) {
      console.log('⏭️ [Z-API Webhook] Ignorando mensagem (fromMe=true)');
      return res.json({ ok: true, ignored: 'fromMe' });
    }

    const lojaId = await resolveLojaId(req);
    console.log('🏪 [Z-API Webhook] Loja ID resolvido:', lojaId);

    const text = extractIncomingText(req.body);
    const phone = extractIncomingPhone(req.body);
    console.log('📱 [Z-API Webhook] Telefone extraído:', phone);
    console.log('💬 [Z-API Webhook] Texto extraído:', text);

    if (!phone) {
      console.log('⚠️ [Z-API Webhook] Telefone não encontrado no payload');
      return res.json({ ok: true, ignored: 'no_phone' });
    }

    const normalizedText = normalizeText(text);
    const isGreetingResult = isGreeting(text);
    console.log('💬 [Z-API Webhook] Texto normalizado:', normalizedText);
    console.log('👋 [Z-API Webhook] É saudação?', isGreetingResult);

    if (!isGreetingResult) {
      console.log('⚠️ [Z-API Webhook] Texto não é uma saudação reconhecida');
      return res.json({ ok: true, ignored: 'not_greeting' });
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
      const result = await sendWhatsAppMessageZApi(phone, message, lojaId);
      console.log('📤 [Z-API Webhook] Resultado do envio:', result);
      return res.json({ ok: true, replied: 'closed' });
    }

    const baseMessage = menuLink
      ? `Olá! Segue o link do nosso cardápio:\n${menuLink}`
      : 'Olá! No momento não conseguimos enviar o link do cardápio. Por favor, tente novamente em instantes.';

    console.log('📤 [Z-API Webhook] Enviando mensagem com cardápio');
    console.log('💬 [Z-API Webhook] Mensagem a ser enviada:', baseMessage);
    const result = await sendWhatsAppMessageZApi(phone, baseMessage, lojaId);
    console.log('📤 [Z-API Webhook] Resultado do envio:', result);
    return res.json({ ok: true, replied: 'menu' });

  } catch (err) {
    console.error('❌ [Z-API Webhook] Erro:', err);
    console.error('❌ [Z-API Webhook] Stack:', err.stack);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
