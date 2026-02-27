const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, authorize } = require('./auth');

// Função auxiliar para obter início e fim do dia (usando fuso horário do Brasil - America/Sao_Paulo)
function getStartAndEndOfDay(date = new Date(), day = null, month = null, year = null) {
  let targetYear, targetMonth, targetDay;
  
  // Se day, month e year foram fornecidos, usar esses valores
  if (day !== null && month !== null && year !== null) {
    targetYear = year;
    targetMonth = month; // month é 0-indexed (0 = Janeiro, 11 = Dezembro)
    targetDay = day;
  } else {
    // Obter a data atual no fuso horário do Brasil
    const brasilNow = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    targetYear = brasilNow.getFullYear();
    targetMonth = brasilNow.getMonth();
    targetDay = brasilNow.getDate();
  }
  
  // Criar strings de data no formato ISO para o fuso horário do Brasil
  const startBrasilISO = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}T00:00:00-03:00`;
  const endBrasilISO = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}T23:59:59.999-03:00`;
  
  // Criar objetos Date representando início e fim do dia em São Paulo (UTC-3)
  // O JavaScript automaticamente converte para UTC ao criar o Date
  const start = new Date(startBrasilISO);
  const end = new Date(endBrasilISO);
  
  return { start, end };
}

// Função auxiliar para obter início e fim da semana (usando fuso horário do Brasil)
function getStartAndEndOfWeek(date = new Date()) {
  // Obter a data atual no fuso horário do Brasil
  const brasilNow = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  // Calcular o início da semana (segunda-feira)
  const day = brasilNow.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  const diff = brasilNow.getDate() - day + (day === 0 ? -6 : 1); // Segunda-feira
  
  const year = brasilNow.getFullYear();
  const month = brasilNow.getMonth();
  const mondayDate = new Date(year, month, diff);
  const sundayDate = new Date(year, month, diff + 6);
  
  // Criar início da semana (segunda-feira 00:00:00) no fuso horário do Brasil
  const startBrasilISO = `${year}-${String(mondayDate.getMonth() + 1).padStart(2, '0')}-${String(mondayDate.getDate()).padStart(2, '0')}T00:00:00-03:00`;
  
  // Criar fim da semana (domingo 23:59:59.999) no fuso horário do Brasil
  const endBrasilISO = `${year}-${String(sundayDate.getMonth() + 1).padStart(2, '0')}-${String(sundayDate.getDate()).padStart(2, '0')}T23:59:59.999-03:00`;
  
  // Converter para UTC
  const start = new Date(startBrasilISO);
  const end = new Date(endBrasilISO);
  
  return { start, end };
}

// Função auxiliar para obter início e fim do mês (usando fuso horário do Brasil)
function getStartAndEndOfMonth(date = new Date(), month = null, year = null) {
  let targetYear, targetMonth;
  
  // Se month e year foram fornecidos, usar esses valores, senão usar a data atual
  if (month !== null && year !== null) {
    targetYear = year;
    targetMonth = month; // month é 0-indexed (0 = Janeiro, 11 = Dezembro)
  } else {
    // Obter a data atual no fuso horário do Brasil
    const brasilNow = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    targetYear = brasilNow.getFullYear();
    targetMonth = brasilNow.getMonth();
  }
  
  // Criar início do mês (dia 1, 00:00:00) no fuso horário do Brasil
  const startBrasilISO = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01T00:00:00-03:00`;
  
  // Criar fim do mês (último dia, 23:59:59.999) no fuso horário do Brasil
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const endBrasilISO = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999-03:00`;
  
  // Converter para UTC
  const start = new Date(startBrasilISO);
  const end = new Date(endBrasilISO);
  
  return { start, end };
}

// Função auxiliar para obter início e fim do ano (usando fuso horário do Brasil)
function getStartAndEndOfYear(date = new Date(), year = null) {
  let targetYear;
  
  // Se year foi fornecido, usar esse valor, senão usar o ano da data fornecida
  if (year !== null) {
    targetYear = year;
  } else {
    // Obter a data atual no fuso horário do Brasil
    const brasilNow = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    targetYear = brasilNow.getFullYear();
  }
  
  // Criar início do ano (1º de janeiro, 00:00:00) no fuso horário do Brasil
  const startBrasilISO = `${targetYear}-01-01T00:00:00-03:00`;
  
  // Criar fim do ano (31 de dezembro, 23:59:59.999) no fuso horário do Brasil
  const endBrasilISO = `${targetYear}-12-31T23:59:59.999-03:00`;
  
  // Converter para UTC
  const start = new Date(startBrasilISO);
  const end = new Date(endBrasilISO);
  
  return { start, end };
}

// Rota para obter métricas do dashboard
router.get('/metrics', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    console.log('[Dashboard] Iniciando busca de métricas...');
    const today = new Date();
    const { start: dayStart, end: dayEnd } = getStartAndEndOfDay(today);
    const { start: weekStart, end: weekEnd } = getStartAndEndOfWeek(today);

    // Log para debug - verificar se as datas estão corretas
    console.log('[Dashboard] Data atual:', today.toISOString());
    console.log('[Dashboard] Início do dia (local):', dayStart.toISOString());
    console.log('[Dashboard] Fim do dia (local):', dayEnd.toISOString());
    console.log('[Dashboard] Início do dia (formato local):', dayStart.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    console.log('[Dashboard] Fim do dia (formato local):', dayEnd.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

    console.log('[Dashboard] Buscando faturamento do dia...');
    // 1. Faturamento do dia
    const dailyRevenue = await prisma.pedido.aggregate({
      where: {
        lojaId: req.lojaId,
        criadoEm: {
          gte: dayStart,
          lte: dayEnd
        },
        status: {
          in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
        }
      },
      _sum: {
        precoTotal: true
      }
    });

    // 2. Número de vendas do dia
    const dailySales = await prisma.pedido.count({
      where: {
        lojaId: req.lojaId,
        criadoEm: {
          gte: dayStart,
          lte: dayEnd
        },
        status: {
          in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
        }
      }
    });

    // 3. Ticket médio do dia
    const dailyTicketAverage = dailySales > 0 ? 
      parseFloat((parseFloat(dailyRevenue._sum.precoTotal || 0) / dailySales).toFixed(2)) : 0;

    // 4. Vendas da semana (por dia)
    const weeklyStats = await prisma.pedido.groupBy({
      by: ['criadoEm'],
      where: {
        lojaId: req.lojaId,
        criadoEm: {
          gte: weekStart,
          lte: weekEnd
        },
        status: {
          in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
        }
      },
      _sum: {
        precoTotal: true
      },
      _count: {
        id: true
      }
    });

    // 5. Produtos mais vendidos (acumulativo - todos os tempos)
    const topProducts = await prisma.item_pedido.groupBy({
      by: ['produtoId'],
      where: {
        pedido: {
          lojaId: req.lojaId,
          status: {
            in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
          }
        }
      },
      _sum: {
        quantidade: true
      },
      _count: {
        produtoId: true
      },
      orderBy: {
        _sum: {
          quantidade: 'desc'
        }
      },
      take: 5
    });

    // Buscar detalhes dos produtos mais vendidos e garantir campo 'name'
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.produto.findUnique({
          where: { id: item.produtoId },
          select: { id: true, nome: true, preco: true }
        });
        // Se o produto não existir, retornar dados padrão
        if (!product) {
          return {
            id: item.produtoId,
            name: 'Produto não encontrado',
            price: 0,
            quantitySold: Number(item._sum.quantidade) || 0,
            orderCount: Number(item._count.produtoId) || 0
          };
        }
        return {
          id: product.id,
          name: product.nome, // garantir campo 'name' para o frontend
          price: Number(product.preco) || 0, // Converter Decimal para número e mapear para 'price'
          quantitySold: Number(item._sum.quantidade) || 0,
          orderCount: Number(item._count.produtoId) || 0
        };
      })
    );

    // 6. Faturamento da semana
    const weeklyRevenue = await prisma.pedido.aggregate({
      where: {
        lojaId: req.lojaId,
        criadoEm: {
          gte: weekStart,
          lte: weekEnd
        },
        status: {
          in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
        }
      },
      _sum: {
        precoTotal: true
      }
    });

    // 7. Total de pedidos pendentes
    const pendingOrders = await prisma.pedido.count({
      where: {
        lojaId: req.lojaId,
        status: {
          in: ['pending_payment', 'being_prepared', 'ready_for_pickup', 'on_the_way']
        }
      }
    });

    // 8. Status dos pedidos de hoje
    const todayOrdersStatus = await prisma.pedido.groupBy({
      by: ['status'],
      where: {
        lojaId: req.lojaId,
        criadoEm: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      _count: {
        id: true
      }
    });

    // 9. Comparação com ontem
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const { start: yesterdayStart, end: yesterdayEnd } = getStartAndEndOfDay(yesterday);

    const yesterdayRevenue = await prisma.pedido.aggregate({
      where: {
        lojaId: req.lojaId,
        criadoEm: {
          gte: yesterdayStart,
          lte: yesterdayEnd
        },
        status: {
          in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
        }
      },
      _sum: {
        precoTotal: true
      }
    });

    const yesterdayOrders = await prisma.pedido.count({
      where: {
        lojaId: req.lojaId,
        criadoEm: {
          gte: yesterdayStart,
          lte: yesterdayEnd
        },
        status: {
          in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
        }
      }
    });

    // Calcular variações percentuais
    const revenueChange = yesterdayRevenue._sum.precoTotal ? 
      parseFloat((((parseFloat(dailyRevenue._sum.precoTotal || 0) - parseFloat(yesterdayRevenue._sum.precoTotal || 0)) / parseFloat(yesterdayRevenue._sum.precoTotal || 0)) * 100).toFixed(1)) : 0;
    
    const ordersChange = yesterdayOrders ? 
      parseFloat((((dailySales - yesterdayOrders) / yesterdayOrders) * 100).toFixed(1)) : 0;

    // 10. Preparar dados da semana para gráfico
    const weeklyData = [];
    const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    
    // Obter a data atual no fuso horário do Brasil
    const todayBrasil = new Date(today.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    // Calcular o início da semana (segunda-feira) no fuso horário do Brasil
    const dayOfWeek = todayBrasil.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Dias desde segunda-feira
    const mondayBrasil = new Date(todayBrasil);
    mondayBrasil.setDate(todayBrasil.getDate() - daysFromMonday);
    mondayBrasil.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      // Calcular cada dia da semana no fuso horário do Brasil
      const currentDayBrasil = new Date(mondayBrasil);
      currentDayBrasil.setDate(mondayBrasil.getDate() + i);
      
      // Verificar o dia da semana real para garantir correspondência
      const realDayOfWeek = currentDayBrasil.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
      const dayIndex = realDayOfWeek === 0 ? 6 : realDayOfWeek - 1; // Converter para índice: 0 = segunda, 6 = domingo
      
      // Converter para UTC para usar em getStartAndEndOfDay
      const offsetHours = 3; // UTC-3
      const currentDayUTC = new Date(currentDayBrasil.getTime() + (offsetHours * 60 * 60 * 1000));
      const { start: dayStart, end: dayEnd } = getStartAndEndOfDay(currentDayUTC);
      
      const dayStats = await prisma.pedido.aggregate({
        where: {
          lojaId: req.lojaId,
          criadoEm: {
            gte: dayStart,
            lte: dayEnd
          },
          status: {
            in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
          }
        },
        _sum: {
          precoTotal: true
        },
        _count: {
          id: true
        }
      });
      
      weeklyData.push({
        day: daysOfWeek[dayIndex],
        revenue: parseFloat(dayStats._sum.precoTotal || 0),
        orders: dayStats._count.id || 0,
        date: currentDayBrasil.toISOString().split('T')[0]
      });
    }

    res.json({
      daily: {
        revenue: parseFloat(dailyRevenue._sum.precoTotal || 0),
        sales: dailySales,
        ticketAverage: parseFloat(dailyTicketAverage),
        revenueChange: parseFloat(revenueChange),
        ordersChange: parseFloat(ordersChange)
      },
      weekly: {
        revenue: parseFloat(weeklyRevenue._sum.precoTotal || 0),
        data: weeklyData
      },
      topProducts: topProductsWithDetails,
      pendingOrders,
      todayOrdersStatus: todayOrdersStatus.map(status => ({
        status: status.status,
        count: status._count.id
      }))
    });

  } catch (error) {
    console.error('[Dashboard] Erro ao buscar métricas do dashboard:');
    console.error('[Dashboard] Error name:', error.name);
    console.error('[Dashboard] Error message:', error.message);
    console.error('[Dashboard] Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message 
    });
  }
});

// Rota para obter métricas por período (daily, weekly, monthly, yearly)
router.get('/metrics/:period', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { period } = req.params; // daily, weekly, monthly, yearly
    const { month, year } = req.query; // month (0-11) e year para período monthly
    const today = new Date();
    
    let start, end;
    let periodName = '';
    
    switch (period) {
      case 'daily':
        // Se day, month e year foram fornecidos, usar esses valores
        if (req.query.day !== undefined && req.query.month !== undefined && req.query.year !== undefined) {
          const dayNum = parseInt(req.query.day, 10);
          const monthNum = parseInt(req.query.month, 10);
          const yearNum = parseInt(req.query.year, 10);
          
          // Validações básicas
          if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum) || 
              monthNum < 0 || monthNum > 11 || dayNum < 1 || dayNum > 31) {
            return res.status(400).json({ error: 'Data inválida. Dia deve ser 1-31, mês 0-11 e ano um número válido' });
          }
          
          // Verificar se a data é válida (ex: não permitir 31 de fevereiro)
          const testDate = new Date(yearNum, monthNum, dayNum);
          if (testDate.getDate() !== dayNum || testDate.getMonth() !== monthNum || testDate.getFullYear() !== yearNum) {
            return res.status(400).json({ error: 'Data inválida. Verifique se o dia existe no mês selecionado' });
          }
          
          ({ start, end } = getStartAndEndOfDay(today, dayNum, monthNum, yearNum));
          const formattedDate = new Date(yearNum, monthNum, dayNum).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          periodName = formattedDate;
        } else {
          ({ start, end } = getStartAndEndOfDay(today));
          periodName = 'Dia';
        }
        break;
      case 'weekly':
        ({ start, end } = getStartAndEndOfWeek(today));
        periodName = 'Semana';
        break;
      case 'monthly':
        // Se month e year foram fornecidos, usar esses valores
        if (month !== undefined && year !== undefined) {
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 0 || monthNum > 11) {
            return res.status(400).json({ error: 'Mês deve ser entre 0-11 e ano deve ser um número válido' });
          }
          ({ start, end } = getStartAndEndOfMonth(today, monthNum, yearNum));
          const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                             'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          periodName = `${monthNames[monthNum]} ${yearNum}`;
        } else {
          ({ start, end } = getStartAndEndOfMonth(today));
          periodName = 'Mês';
        }
        break;
      case 'yearly':
        // Se year foi fornecido, usar esse valor
        if (req.query.year !== undefined) {
          const yearNum = parseInt(req.query.year, 10);
          if (isNaN(yearNum)) {
            return res.status(400).json({ error: 'Ano deve ser um número válido' });
          }
          ({ start, end } = getStartAndEndOfYear(today, yearNum));
          periodName = yearNum.toString();
        } else {
          ({ start, end } = getStartAndEndOfYear(today));
          periodName = 'Ano';
        }
        break;
      default:
        return res.status(400).json({ error: 'Período inválido. Use: daily, weekly, monthly ou yearly' });
    }

    console.log(`[Dashboard] Buscando métricas para período: ${periodName}`);
    console.log(`[Dashboard] Data início (UTC): ${start.toISOString()}`);
    console.log(`[Dashboard] Data fim (UTC): ${end.toISOString()}`);
    console.log(`[Dashboard] Data início (Brasil): ${start.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`[Dashboard] Data fim (Brasil): ${end.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);

    // Faturamento do período
    const periodRevenue = await prisma.pedido.aggregate({
      where: {
        criadoEm: {
          gte: start,
          lte: end
        },
        status: {
          in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
        }
      },
      _sum: {
        precoTotal: true
      }
    });

    // Número de vendas do período
    const periodSales = await prisma.pedido.count({
      where: {
        criadoEm: {
          gte: start,
          lte: end
        },
        status: {
          in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
        }
      }
    });

    console.log(`[Dashboard] Receita encontrada: ${periodRevenue._sum.precoTotal || 0}`);
    console.log(`[Dashboard] Pedidos encontrados: ${periodSales}`);

    // Ticket médio do período
    const periodTicketAverage = periodSales > 0 ? 
      parseFloat((parseFloat(periodRevenue._sum.precoTotal || 0) / periodSales).toFixed(2)) : 0;

    res.json({
      period: periodName,
      revenue: parseFloat(periodRevenue._sum.precoTotal || 0),
      sales: periodSales,
      ticketAverage: periodTicketAverage
    });

  } catch (error) {
    console.error('[Dashboard] Erro ao buscar métricas do período:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message 
    });
  }
});

// Rota para obter produtos mais vendidos (acumulativo - padrão)
router.get('/top-products', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    // Não aplica filtro de data (acumulativo)
    const whereFilter = {
      pedido: {
        status: {
          in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
        }
      }
    };
    
    // Buscar produtos mais vendidos
    const topProducts = await prisma.item_pedido.groupBy({
      by: ['produtoId'],
      where: whereFilter,
      _sum: {
        quantidade: true
      },
      _count: {
        produtoId: true
      },
      orderBy: {
        _sum: {
          quantidade: 'desc'
        }
      },
      take: 5
    });
    
    // Buscar detalhes dos produtos
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.produto.findUnique({
          where: { id: item.produtoId },
          select: { id: true, nome: true, preco: true }
        });
        
        if (!product) {
          return {
            id: item.produtoId,
            name: 'Produto não encontrado',
            price: 0,
            quantitySold: Number(item._sum.quantidade) || 0,
            orderCount: Number(item._count.produtoId) || 0
          };
        }
        
        return {
          id: product.id,
          name: product.nome,
          price: Number(product.preco) || 0,
          quantitySold: Number(item._sum.quantidade) || 0,
          orderCount: Number(item._count.produtoId) || 0
        };
      })
    );
    
    res.json(topProductsWithDetails);
    
  } catch (error) {
    console.error('[Dashboard] Erro ao buscar produtos mais vendidos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message 
    });
  }
});

// Rota para obter produtos mais vendidos por período específico
router.get('/top-products/:period', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const period = req.params.period; // daily, weekly, monthly, yearly
    const { day, month, year } = req.query;
    const today = new Date();
    
    let start = null, end = null;
    
    // Determinar as datas baseado no período
    switch (period) {
      case 'daily':
        if (day !== undefined && month !== undefined && year !== undefined) {
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          
          if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum) || 
              monthNum < 0 || monthNum > 11 || dayNum < 1 || dayNum > 31) {
            return res.status(400).json({ error: 'Data inválida' });
          }
          
          const testDate = new Date(yearNum, monthNum, dayNum);
          if (testDate.getDate() !== dayNum || testDate.getMonth() !== monthNum || testDate.getFullYear() !== yearNum) {
            return res.status(400).json({ error: 'Data inválida' });
          }
          
          ({ start, end } = getStartAndEndOfDay(today, dayNum, monthNum, yearNum));
        } else {
          ({ start, end } = getStartAndEndOfDay(today));
        }
        break;
      case 'weekly':
        ({ start, end } = getStartAndEndOfWeek(today));
        break;
      case 'monthly':
        if (month !== undefined && year !== undefined) {
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 0 || monthNum > 11) {
            return res.status(400).json({ error: 'Mês e ano inválidos' });
          }
          ({ start, end } = getStartAndEndOfMonth(today, monthNum, yearNum));
        } else {
          ({ start, end } = getStartAndEndOfMonth(today));
        }
        break;
      case 'yearly':
        if (year !== undefined) {
          const yearNum = parseInt(year, 10);
          if (isNaN(yearNum)) {
            return res.status(400).json({ error: 'Ano inválido' });
          }
          ({ start, end } = getStartAndEndOfYear(today, yearNum));
        } else {
          ({ start, end } = getStartAndEndOfYear(today));
        }
        break;
      default:
        return res.status(400).json({ error: 'Período inválido. Use: daily, weekly, monthly ou yearly' });
    }
    
    // Construir filtro de where
    const whereFilter = {
      pedido: {
        status: {
          in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
        },
        criadoEm: {
          gte: start,
          lte: end
        }
      }
    };
    
    // Buscar produtos mais vendidos
    const topProducts = await prisma.item_pedido.groupBy({
      by: ['produtoId'],
      where: whereFilter,
      _sum: {
        quantidade: true
      },
      _count: {
        produtoId: true
      },
      orderBy: {
        _sum: {
          quantidade: 'desc'
        }
      },
      take: 5
    });
    
    // Buscar detalhes dos produtos
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.produto.findUnique({
          where: { id: item.produtoId },
          select: { id: true, nome: true, preco: true }
        });
        
        if (!product) {
          return {
            id: item.produtoId,
            name: 'Produto não encontrado',
            price: 0,
            quantitySold: Number(item._sum.quantidade) || 0,
            orderCount: Number(item._count.produtoId) || 0
          };
        }
        
        return {
          id: product.id,
          name: product.nome,
          price: Number(product.preco) || 0,
          quantitySold: Number(item._sum.quantidade) || 0,
          orderCount: Number(item._count.produtoId) || 0
        };
      })
    );
    
    res.json(topProductsWithDetails);
    
  } catch (error) {
    console.error('[Dashboard] Erro ao buscar produtos mais vendidos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message 
    });
  }
});

// Rota para obter histórico de vendas (últimos 30 dias)
router.get('/sales-history', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesHistory = [];
    
    for (let i = 0; i < 30; i++) {
      const currentDay = new Date(thirtyDaysAgo);
      currentDay.setDate(thirtyDaysAgo.getDate() + i);
      const { start: dayStart, end: dayEnd } = getStartAndEndOfDay(currentDay);
      
      const dayStats = await prisma.pedido.aggregate({
        where: {
          criadoEm: {
            gte: dayStart,
            lte: dayEnd
          },
          status: {
            in: ['being_prepared', 'ready_for_pickup', 'on_the_way', 'delivered']
          }
        },
        _sum: {
          precoTotal: true
        },
        _count: {
          id: true
        }
      });
      
      salesHistory.push({
        date: currentDay.toISOString().split('T')[0],
        revenue: parseFloat(dayStats._sum.precoTotal || 0),
        orders: dayStats._count.id || 0
      });
    }

    res.json(salesHistory);
  } catch (error) {
    console.error('Erro ao buscar histórico de vendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;