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

  return (
    body.text ||
    body.message ||
    body.body ||
    body?.data?.text ||
    body?.data?.message ||
    body?.data?.body ||
    body?.message?.text ||
    body?.message?.body ||
    body?.messages?.[0]?.text ||
    body?.messages?.[0]?.message ||
    body?.messages?.[0]?.body ||
    ''
  );
}

function extractIncomingPhone(body) {
  if (!body || typeof body !== 'object') return '';

  return (
    body.phone ||
    body.from ||
    body.sender ||
    body?.data?.phone ||
    body?.data?.from ||
    body?.data?.sender ||
    body?.message?.from ||
    body?.message?.phone ||
    body?.messages?.[0]?.from ||
    body?.messages?.[0]?.phone ||
    ''
  );
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

router.post('/', async (req, res) => {
  try {
    const fromMe = extractFromMeFlag(req.body);
    if (fromMe) return res.json({ ok: true, ignored: 'fromMe' });

    const lojaId = await resolveLojaId(req);

    const text = extractIncomingText(req.body);
    const phone = extractIncomingPhone(req.body);

    if (!phone) return res.json({ ok: true, ignored: 'no_phone' });
    if (!isGreeting(text)) return res.json({ ok: true, ignored: 'not_greeting' });

    const { open, config } = await getStoreOpenStatus(lojaId);

    const menuLink = process.env.CARDAPIO_LINK || process.env.CARDAPIO_URL || '';

    if (!open) {
      const openingTime = config?.horaAbertura || '08:00';
      const closingTime = config?.horaFechamento || '18:00';
      const message = `Olá! No momento estamos fora do horário de funcionamento.\n\nNosso horário é de ${openingTime} até ${closingTime}.`;
      await sendWhatsAppMessageZApi(phone, message, lojaId);
      return res.json({ ok: true, replied: 'closed' });
    }

    const baseMessage = menuLink
      ? `Olá! Segue o link do nosso cardápio:\n${menuLink}`
      : 'Olá! No momento não conseguimos enviar o link do cardápio. Por favor, tente novamente em instantes.';

    await sendWhatsAppMessageZApi(phone, baseMessage, lojaId);
    return res.json({ ok: true, replied: 'menu' });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
