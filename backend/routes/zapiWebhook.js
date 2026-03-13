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
    // Saudações básicas
    'oi',
    'ola',
    'olá',
    'eai',
    'ei',
    'epa',
    'epa',
    'opa',
    'eae',
    'e aí',
    'e ai',
    'fala',
    'fala ai',
    'fala aí',
    'salve',
    'blz',
    'beleza',
    'beleza?',
    'belezaa',
    'belezaaa',
    
    // Saudações formais
    'bom dia',
    'boa tarde',
    'boa noite',
    'bom diaa',
    'boa tardee',
    'boa noitee',
    'bom dia!',
    'boa tarde!',
    'boa noite!',
    
    // Perguntas de bem-estar
    'tudo bem',
    'tudo bom',
    'tudo bem?',
    'tudo bom?',
    'td bem',
    'td bom',
    'tdb',
    'como vai',
    'como vai?',
    'como esta',
    'como está',
    'como esta?',
    'como está?',
    'tudo certo',
    'tudo certo?',
    'tudo ok',
    'tudo ok?',
    
    // Menu e cardápio
    'menu',
    'cardapio',
    'cardápio',
    'cardapio?',
    'cardápio?',
    'ver cardapio',
    'ver cardápio',
    'ver menu',
    'mostrar cardapio',
    'mostrar cardápio',
    'mostrar menu',
    'quero ver o cardapio',
    'quero ver o cardápio',
    'quero ver o menu',
    'preciso ver o cardapio',
    'preciso ver o cardápio',
    'preciso ver o menu',
    'tem cardapio',
    'tem cardápio',
    'tem menu',
    'tem cardapio?',
    'tem cardápio?',
    'tem menu?',
    'quero cardapio',
    'quero cardápio',
    'quero menu',
    'preciso do cardapio',
    'preciso do cardápio',
    'preciso do menu',
    'manda o cardapio',
    'manda o cardápio',
    'manda o menu',
    'envia o cardapio',
    'envia o cardápio',
    'envia o menu',
    'me manda o cardapio',
    'me manda o cardápio',
    'me manda o menu',
    'me envia o cardapio',
    'me envia o cardápio',
    'me envia o menu',
    
    // Variações comuns
    'oi, tudo bem',
    'oi tudo bem',
    'oi, tudo bom',
    'oi tudo bom',
    'ola, tudo bem',
    'ola tudo bem',
    'olá, tudo bem',
    'olá tudo bem',
    'bom dia, tudo bem',
    'bom dia tudo bem',
    'boa tarde, tudo bem',
    'boa tarde tudo bem',
    'boa noite, tudo bem',
    'boa noite tudo bem',
    
    // Saudações informais
    'fala ai, tudo bem',
    'fala aí, tudo bem',
    'fala ai tudo bem',
    'fala aí tudo bem',
    'eai, tudo bem',
    'e aí, tudo bem',
    'eai tudo bem',
    'e aí tudo bem',
    'opa, tudo bem',
    'opa tudo bem',
    'salve, tudo bem',
    'salve tudo bem',
    
    // Outras variações
    'hey',
    'hey!',
    'hi',
    'hi!',
    'alô',
    'alo',
    'alo?',
    'alô?',
    'olá, bom dia',
    'ola, bom dia',
    'olá, boa tarde',
    'ola, boa tarde',
    'olá, boa noite',
    'ola, boa noite',
    'oi, bom dia',
    'oi, boa tarde',
    'oi, boa noite',
    'oi bom dia',
    'oi boa tarde',
    'oi boa noite'
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

async function getLojaSubdomain(lojaId) {
  try {
    const loja = await prisma.loja.findUnique({ 
      where: { id: lojaId },
      select: { subdominio: true }
    });
    return loja?.subdominio || null;
  } catch (err) {
    console.error('❌ [Z-API Webhook] Erro ao buscar subdomínio da loja:', err);
    return null;
  }
}

function buildMenuLink(subdominio) {
  if (!subdominio) return null;
  
  const baseDomain = process.env.BASE_DOMAIN || 'miradelivery.com.br';
  const protocol = process.env.PROTOCOL || 'https';
  
  return `${protocol}://${subdominio}.${baseDomain}`;
}

function formatDaysOfWeek(diasAbertos) {
  if (!diasAbertos || typeof diasAbertos !== 'string') return '';
  
  const dias = diasAbertos.toString().split(',').map(s => s.trim()).filter(Boolean);
  if (dias.length === 0) return '';
  
  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Mapear números dos dias (0=domingo, 1=segunda, etc.) para nomes
  const diasFormatados = dias
    .map(d => {
      const dayNum = parseInt(d);
      if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) return null;
      return dayNames[dayNum];
    })
    .filter(Boolean);
  
  if (diasFormatados.length === 0) return '';
  if (diasFormatados.length === 1) return diasFormatados[0];
  if (diasFormatados.length === 7) return 'Todos os dias';
  
  // Formatar lista: "Segunda-feira, Terça-feira e Quarta-feira"
  if (diasFormatados.length === 2) {
    return diasFormatados.join(' e ');
  }
  
  const lastDay = diasFormatados.pop();
  return `${diasFormatados.join(', ')} e ${lastDay}`;
}

async function getStoreOpenStatus(lojaId) {
  const config = await prisma.configuracao_loja.findUnique({ where: { lojaId } });

  const aberto = (config?.aberto ?? true) === true;
  if (!aberto) {
    return { open: false, config, reason: 'closed_by_config' };
  }

  const now = getNowInSaoPaulo();
  const day = now.getDay();

  // Verificar se tem horários por dia configurados
  let horarioDoDia = null;
  if (config?.horariosPorDia && typeof config.horariosPorDia === 'object') {
    horarioDoDia = config.horariosPorDia[String(day)];
  }

  // Se tem horário por dia, usar ele; senão usar os dias gerais
  if (horarioDoDia) {
    // Se o dia específico está fechado
    if (!horarioDoDia.aberto) {
      return { open: false, config, reason: 'closed_by_day', horarioDoDia };
    }
    
    // Usar horários do dia específico
    const openMinutes = timeToMinutes(horarioDoDia.abertura);
    const closeMinutes = timeToMinutes(horarioDoDia.fechamento);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const within = isWithinWindow(nowMinutes, openMinutes, closeMinutes);
    if (!within) {
      return { open: false, config, reason: 'closed_by_time', horarioDoDia };
    }
    
    return { open: true, config, horarioDoDia };
  }

  // Fallback: usar configuração geral de dias
  const dias = (config?.diasAbertos || '').toString().split(',').map(s => s.trim()).filter(Boolean);
  
  const isClosedByDay = dias.length > 0 && !dias.includes(String(day));
  
  if (isClosedByDay) {
    return { open: false, config, reason: 'closed_by_day' };
  }

  const openMinutes = timeToMinutes(config?.horaAbertura);
  const closeMinutes = timeToMinutes(config?.horaFechamento);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const within = isWithinWindow(nowMinutes, openMinutes, closeMinutes);
  if (!within) {
    return { open: false, config, reason: 'closed_by_time' };
  }
  
  return { open: true, config };
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
    console.log('🔔 [Z-API Webhook] Requisição POST recebida');

    // Responder imediatamente para evitar timeout da Z-API
    res.status(200).json({ ok: true, received: true });

    const fromMe = extractFromMeFlag(req.body);
    if (fromMe) {
      console.log('⏭️ [Z-API Webhook] Ignorando mensagem (fromMe=true)');
      return;
    }

    const lojaId = await resolveLojaId(req);
    console.log('🏪 [Z-API Webhook] Loja ID:', lojaId);

    const text = extractIncomingText(req.body);
    const phone = extractIncomingPhone(req.body);
    console.log('📱 [Z-API Webhook] Telefone:', phone);
    console.log('💬 [Z-API Webhook] Texto:', text || '(VAZIO)');

    if (!phone) {
      console.log('⚠️ [Z-API Webhook] Telefone não encontrado no payload');
      return;
    }

    const normalizedText = normalizeText(text);
    const isGreetingResult = isGreeting(text);

    if (!isGreetingResult) {
      console.log('⚠️ [Z-API Webhook] Texto não é uma saudação reconhecida');
      return;
    }

    const { open, config, reason } = await getStoreOpenStatus(lojaId);
    console.log('🕐 [Z-API Webhook] Loja:', open ? 'Aberta' : 'Fechada', reason ? `(${reason})` : '');

    // Buscar subdomínio da loja e construir o link do cardápio
    const subdominio = await getLojaSubdomain(lojaId);
    const menuLink = subdominio ? buildMenuLink(subdominio) : null;

    if (!open) {
      // Usar horário do dia específico se disponível, senão usar geral
      const now = getNowInSaoPaulo();
      const day = now.getDay();
      let openingTime, closingTime;
      
      if (config?.horariosPorDia && typeof config.horariosPorDia === 'object') {
        const horarioDoDia = config.horariosPorDia[String(day)];
        if (horarioDoDia && horarioDoDia.abertura && horarioDoDia.fechamento) {
          openingTime = horarioDoDia.abertura;
          closingTime = horarioDoDia.fechamento;
        } else {
          openingTime = config?.horaAbertura || '08:00';
          closingTime = config?.horaFechamento || '18:00';
        }
      } else {
        openingTime = config?.horaAbertura || '08:00';
        closingTime = config?.horaFechamento || '18:00';
      }
      
      // Para os dias de funcionamento, usar horariosPorDia se disponível
      let diasFormatados = '';
      if (config?.horariosPorDia && typeof config.horariosPorDia === 'object') {
        // Extrair dias que estão abertos do horariosPorDia
        const diasAbertosComHorario = [];
        const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        
        for (let i = 0; i <= 6; i++) {
          const horario = config.horariosPorDia[String(i)];
          if (horario && horario.aberto) {
            diasAbertosComHorario.push(dayNames[i]);
          }
        }
        
        if (diasAbertosComHorario.length > 0) {
          if (diasAbertosComHorario.length === 1) {
            diasFormatados = diasAbertosComHorario[0];
          } else if (diasAbertosComHorario.length === 2) {
            diasFormatados = diasAbertosComHorario.join(' e ');
          } else {
            const lastDay = diasAbertosComHorario.pop();
            diasFormatados = `${diasAbertosComHorario.join(', ')} e ${lastDay}`;
          }
        }
      }
      
      // Fallback: usar diasAbertos se não tiver horariosPorDia
      if (!diasFormatados) {
        const diasAbertos = config?.diasAbertos || '';
        diasFormatados = formatDaysOfWeek(diasAbertos);
      }
      
      let message = 'Olá! No momento estamos fechados.\n\n';
      
      // Informar dias de funcionamento se estiver fechado por dia
      if (reason === 'closed_by_day' && diasFormatados) {
        message += `Funcionamos nos seguintes dias: ${diasFormatados}.\n`;
        message += `Horário: ${openingTime} até ${closingTime}.`;
      } 
      // Informar apenas horário se estiver fechado por horário
      else if (reason === 'closed_by_time') {
        message += `Nosso horário de funcionamento é de ${openingTime} até ${closingTime}.`;
        if (diasFormatados) {
          message += `\nFuncionamos: ${diasFormatados}.`;
        }
      }
      // Se estiver fechado por configuração geral
      else {
        message += `Nosso horário é de ${openingTime} até ${closingTime}.`;
        if (diasFormatados) {
          message += `\nFuncionamos: ${diasFormatados}.`;
        }
      }
      
      const result = await sendWhatsAppMessageZApi(phone, message, lojaId);
      console.log('✅ [Z-API Webhook] Mensagem de loja fechada enviada');
      return;
    }

    const baseMessage = menuLink
      ? `Olá! Segue o link do nosso cardápio:\n${menuLink}`
      : 'Olá! No momento não conseguimos enviar o link do cardápio. Por favor, tente novamente em instantes.';

    const result = await sendWhatsAppMessageZApi(phone, baseMessage, lojaId);
    console.log('✅ [Z-API Webhook] Mensagem com cardápio enviada');

  } catch (err) {
    console.error('❌ [Z-API Webhook] Erro:', err.message);
  }
});

module.exports = router;
