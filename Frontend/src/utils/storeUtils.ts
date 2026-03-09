export interface HorarioDia {
  aberto: boolean;
  abertura: string;
  fechamento: string;
}

export type HorariosPorDia = Record<string, HorarioDia>;

export interface StoreConfig {
  isOpen: boolean;
  openingTime?: string;
  closingTime?: string;
  openDays?: string; // '1,2,3,4,5' formato (legado)
  horariosPorDia?: HorariosPorDia;
}

export interface StoreStatus {
  isOpen: boolean;
  reason?: string;
  nextOpenTime?: string;
}

export const checkStoreStatus = (config: StoreConfig): StoreStatus => {
  // Se a loja está manualmente fechada
  if (!config.isOpen) {
    return {
      isOpen: false,
      reason: 'A loja está temporariamente fechada. Voltamos em breve!'
    };
  }

  const now = new Date();
  const currentDay = now.getDay().toString(); // 0 = domingo, 1 = segunda, etc.
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  // Usar horariosPorDia se disponível (novo formato)
  if (config.horariosPorDia && Object.keys(config.horariosPorDia).length > 0) {
    const todaySchedule = config.horariosPorDia[currentDay];

    // Se não há configuração para hoje ou o dia está fechado
    if (!todaySchedule || !todaySchedule.aberto) {
      const next = getNextOpenDayFromSchedule(config.horariosPorDia);
      return {
        isOpen: false,
        reason: next || 'Estamos fechados hoje.',
        nextOpenTime: next
      };
    }

    // Verificar se está no horário de funcionamento do dia
    if (todaySchedule.abertura && todaySchedule.fechamento) {
      const isWithinHours = isTimeInRange(currentTime, todaySchedule.abertura, todaySchedule.fechamento);

      if (!isWithinHours) {
        const nextMsg = getNextOpenTimeFromSchedule(currentTime, todaySchedule, config.horariosPorDia);
        return {
          isOpen: false,
          reason: nextMsg,
          nextOpenTime: nextMsg
        };
      }
    }

    return { isOpen: true };
  }

  // Fallback: formato legado com openDays / openingTime / closingTime
  const openDays = config.openDays ? config.openDays.split(',') : [];
  if (openDays.length > 0 && !openDays.includes(currentDay)) {
    const next = getNextOpenDay(openDays, config.openingTime || '08:00');
    return {
      isOpen: false,
      reason: next || 'Estamos fechados hoje.',
      nextOpenTime: next
    };
  }

  if (config.openingTime && config.closingTime) {
    const isWithinHours = isTimeInRange(currentTime, config.openingTime, config.closingTime);
    
    if (!isWithinHours) {
      const nextMsg = getNextOpenTime(config.openingTime, currentTime);
      return {
        isOpen: false,
        reason: nextMsg,
        nextOpenTime: nextMsg
      };
    }
  }

  return {
    isOpen: true
  };
};

const isTimeInRange = (currentTime: string, openTime: string, closeTime: string): boolean => {
  const current = timeToMinutes(currentTime);
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);

  // Se o horário de fechamento é no dia seguinte (ex: 08:00 às 02:00)
  if (close < open) {
    return current >= open || current <= close;
  }

  // Horário normal (ex: 08:00 às 22:00)
  return current >= open && current <= close;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getNextOpenDay = (openDays: string[], openingTime: string): string => {
  const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const today = new Date().getDay();
  
  for (let i = 1; i <= 7; i++) {
    const nextDay = (today + i) % 7;
    if (openDays.includes(nextDay.toString())) {
      const dayName = dayNames[nextDay];
      if (i === 1) {
        return `Abre amanhã às ${formatTime(openingTime)}`;
      }
      return `Abre ${dayName} às ${formatTime(openingTime)}`;
    }
  }
  
  return 'Verifique os dias de funcionamento';
};

const getNextOpenTime = (openingTime: string, currentTime: string): string => {
  const current = timeToMinutes(currentTime);
  const open = timeToMinutes(openingTime);

  if (current < open) {
    return `Abre hoje às ${formatTime(openingTime)}`;
  }

  return `Abre amanhã às ${formatTime(openingTime)}`;
};

const getNextOpenTimeFromSchedule = (
  currentTime: string,
  todaySchedule: HorarioDia,
  horariosPorDia: HorariosPorDia
): string => {
  const current = timeToMinutes(currentTime);
  const open = timeToMinutes(todaySchedule.abertura);

  // Se ainda não abriu hoje
  if (current < open) {
    return `Abre hoje às ${formatTime(todaySchedule.abertura)}`;
  }

  // Já fechou hoje, buscar próximo dia aberto
  return getNextOpenDayFromSchedule(horariosPorDia);
};

const getNextOpenDayFromSchedule = (horariosPorDia: HorariosPorDia): string => {
  const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const today = new Date().getDay();

  for (let i = 1; i <= 7; i++) {
    const nextDay = (today + i) % 7;
    const schedule = horariosPorDia[String(nextDay)];
    if (schedule && schedule.aberto) {
      const dayName = dayNames[nextDay];
      if (i === 1) {
        return `Abre amanhã às ${formatTime(schedule.abertura)}`;
      }
      return `Abre ${dayName} às ${formatTime(schedule.abertura)}`;
    }
  }

  return 'Verifique os dias de funcionamento';
};

export interface DeliveryConfig {
  deliveryAtivo?: boolean;
  horaEntregaInicio?: string;
  horaEntregaFim?: string;
  deliveryStart?: string;
  deliveryEnd?: string;
  horarioDeliveryPorDia?: HorariosPorDia;
}

export interface DeliveryStatus {
  disponivel: boolean;
  reason?: string;
}

export const checkDeliveryStatus = (config: DeliveryConfig): DeliveryStatus => {
  // Se o delivery está desativado
  if (config.deliveryAtivo === false) {
    return {
      disponivel: false,
      reason: 'Entrega em casa desativada pela loja'
    };
  }

  const now = new Date();
  const currentDay = now.getDay().toString();
  const currentTime = now.toTimeString().slice(0, 5);

  // Usar horarioDeliveryPorDia se disponível (novo formato)
  if (config.horarioDeliveryPorDia && Object.keys(config.horarioDeliveryPorDia).length > 0) {
    const todaySchedule = config.horarioDeliveryPorDia[currentDay];

    if (!todaySchedule || !todaySchedule.aberto) {
      const next = getNextDeliveryDayFromSchedule(config.horarioDeliveryPorDia);
      return {
        disponivel: false,
        reason: next || 'Sem delivery hoje.'
      };
    }

    if (todaySchedule.abertura && todaySchedule.fechamento) {
      const isWithinHours = isTimeInRange(currentTime, todaySchedule.abertura, todaySchedule.fechamento);

      if (!isWithinHours) {
        const current = timeToMinutes(currentTime);
        const open = timeToMinutes(todaySchedule.abertura);

        if (current < open) {
          return {
            disponivel: false,
            reason: `Delivery inicia às ${formatTime(todaySchedule.abertura)}`
          };
        }

        const next = getNextDeliveryDayFromSchedule(config.horarioDeliveryPorDia);
        return {
          disponivel: false,
          reason: `Horário de delivery encerrado. ${next}`
        };
      }
    }

    return { disponivel: true };
  }

  // Fallback: formato legado com horaEntregaInicio / horaEntregaFim
  const startTime = config.deliveryStart || config.horaEntregaInicio;
  const endTime = config.deliveryEnd || config.horaEntregaFim;

  if (!startTime && !endTime) return { disponivel: true };

  if (startTime) {
    const current = timeToMinutes(currentTime);
    const start = timeToMinutes(startTime);
    if (current < start) {
      return {
        disponivel: false,
        reason: `Delivery inicia às ${formatTime(startTime)}`
      };
    }
  }

  if (endTime) {
    const current = timeToMinutes(currentTime);
    const end = timeToMinutes(endTime);
    if (current > end) {
      return {
        disponivel: false,
        reason: `Horário de delivery encerrado (${formatTime(endTime)})`
      };
    }
  }

  return { disponivel: true };
};

const getNextDeliveryDayFromSchedule = (horariosPorDia: HorariosPorDia): string => {
  const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const today = new Date().getDay();

  for (let i = 1; i <= 7; i++) {
    const nextDay = (today + i) % 7;
    const schedule = horariosPorDia[String(nextDay)];
    if (schedule && schedule.aberto) {
      const dayName = dayNames[nextDay];
      if (i === 1) {
        return `Delivery volta amanhã às ${formatTime(schedule.abertura)}`;
      }
      return `Delivery volta ${dayName} às ${formatTime(schedule.abertura)}`;
    }
  }

  return 'Verifique os dias de delivery';
};

const formatTime = (time: string): string => {
  if (!time) return '';
  const [h, m] = time.split(':');
  if (m === '00') return `${h}h`;
  return `${h}h${m}`;
};