/**
 * Utilitário para validação de números de telefone usando NumLookupAPI
 */

interface PhoneValidationResult {
  valid: boolean;
  formatted?: string;
  carrier?: string;
  lineType?: string;
  country?: string;
  error?: string;
}

const getNumLookupApiKey = (): string => {
  try {
    const metaEnvKey = (typeof import.meta !== 'undefined'
      ? (import.meta as any)?.env?.VITE_NUMLOOKUP_API_KEY
      : undefined) as unknown;

    if (typeof metaEnvKey === 'string' && metaEnvKey.trim()) {
      return metaEnvKey.trim();
    }

    const processEnvKey = (typeof process !== 'undefined'
      ? (process as any)?.env?.REACT_APP_NUMLOOKUP_API_KEY
      : undefined) as unknown;

    if (typeof processEnvKey === 'string' && processEnvKey.trim()) {
      return processEnvKey.trim();
    }
  } catch {
    // ignore
  }

  return '';
};

/**
 * Formata número de telefone brasileiro para o formato internacional
 * @param phone Número de telefone (pode estar em qualquer formato)
 * @returns Número formatado no padrão internacional (ex: 5511999999999)
 */
export const formatPhoneForAPI = (phone: string): string => {
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se já começa com 55 (código do Brasil), retorna como está
  if (cleaned.startsWith('55')) {
    return cleaned;
  }
  
  // Se começa com 0, remove o 0
  const withoutZero = cleaned.startsWith('0') ? cleaned.substring(1) : cleaned;
  
  // Adiciona código do país (55) se não tiver
  return `55${withoutZero}`;
};

/**
 * Formata número de telefone para exibição no formato brasileiro
 * @param phone Número de telefone
 * @returns Número formatado (ex: (11) 99999-9999)
 */
export const formatPhoneForDisplay = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  // Remove código do país se existir
  const withoutCountry = cleaned.startsWith('55') ? cleaned.substring(2) : cleaned;
  
  // Remove zero inicial se existir
  const withoutZero = withoutCountry.startsWith('0') ? withoutCountry.substring(1) : withoutCountry;
  
  // Formata baseado no tamanho
  if (withoutZero.length === 10) {
    // Telefone fixo: (11) 1234-5678
    return `(${withoutZero.substring(0, 2)}) ${withoutZero.substring(2, 6)}-${withoutZero.substring(6)}`;
  } else if (withoutZero.length === 11) {
    // Celular: (11) 99999-9999
    return `(${withoutZero.substring(0, 2)}) ${withoutZero.substring(2, 7)}-${withoutZero.substring(7)}`;
  }
  
  return phone;
};

/**
 * Valida número de telefone usando NumLookupAPI
 * @param phone Número de telefone a ser validado
 * @returns Resultado da validação
 */
export const validatePhoneWithAPI = async (phone: string): Promise<PhoneValidationResult> => {
  try {
    // Formatar telefone para a API
    const formattedPhone = formatPhoneForAPI(phone);
    
    // Verificar se o telefone tem o tamanho mínimo (DDD + número)
    if (formattedPhone.length < 12) { // 55 (país) + 2 (DDD) + 8 ou 9 (número)
      return {
        valid: false,
        error: 'Número de telefone inválido. Verifique o DDD e o número.'
      };
    }
    
    // Chamar a API NumLookupAPI
    // Nota: Você precisará adicionar sua API key nas variáveis de ambiente
    // Por enquanto, vamos usar a API pública (sem autenticação) se disponível
    const apiKey = getNumLookupApiKey();
    const apiUrl = apiKey 
      ? `https://api.numlookupapi.com/v1/validate/${formattedPhone}?apikey=${apiKey}`
      : `https://api.numlookupapi.com/v1/validate/${formattedPhone}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // Se a API retornar erro, fazer validação básica local
      return validatePhoneLocal(phone);
    }
    
    const data = await response.json();
    
    // Verificar se o número é válido
    if (data.valid === false) {
      return {
        valid: false,
        error: 'Número de telefone inválido ou não encontrado.'
      };
    }
    
    return {
      valid: true,
      formatted: data.number?.international_format || formatPhoneForDisplay(phone),
      carrier: data.carrier,
      lineType: data.line_type,
      country: data.country?.name || 'Brasil'
    };
    
  } catch (error: any) {
    console.warn('Erro ao validar telefone com API, usando validação local:', error);
    // Em caso de erro na API, fazer validação local como fallback
    return validatePhoneLocal(phone);
  }
};

/**
 * Validação local de telefone brasileiro (fallback)
 * @param phone Número de telefone
 * @returns Resultado da validação
 */
export const validatePhoneLocal = (phone: string): PhoneValidationResult => {
  const cleaned = phone.replace(/\D/g, '');
  
  // Remove código do país se existir
  const withoutCountry = cleaned.startsWith('55') ? cleaned.substring(2) : cleaned;
  
  // Remove zero inicial se existir
  const withoutZero = withoutCountry.startsWith('0') ? withoutCountry.substring(1) : withoutCountry;
  
  // DDDs válidos no Brasil (11-99, exceto alguns números reservados)
  const validDDDs = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
    '21', '22', '24', // RJ, ES
    '27', '28', // ES
    '31', '32', '33', '34', '35', '37', '38', // MG
    '41', '42', '43', '44', '45', '46', // PR
    '47', '48', '49', // SC
    '51', '53', '54', '55', // RS
    '61', // DF
    '62', '64', // GO
    '63', // TO
    '65', '66', // MT
    '67', // MS
    '68', // AC
    '69', // RO
    '71', '73', '74', '75', '77', // BA
    '79', // SE
    '81', '87', // PE
    '82', // AL
    '83', // PB
    '84', // RN
    '85', '88', // CE
    '86', '89', // PI
    '91', '93', '94', // PA
    '92', '97', // AM
    '95', // RR
    '96', // AP
    '98', '99' // MA
  ];
  
  // Verificar se tem DDD válido
  if (withoutZero.length < 10 || withoutZero.length > 11) {
    return {
      valid: false,
      error: 'Número de telefone deve ter 10 ou 11 dígitos (com DDD).'
    };
  }
  
  const ddd = withoutZero.substring(0, 2);
  if (!validDDDs.includes(ddd)) {
    return {
      valid: false,
      error: 'DDD inválido. Verifique o código de área.'
    };
  }
  
  // Verificar se o número não é uma sequência de números iguais
  const number = withoutZero.substring(2);
  if (/^(\d)\1+$/.test(number)) {
    return {
      valid: false,
      error: 'Número de telefone inválido.'
    };
  }
  
  return {
    valid: true,
    formatted: formatPhoneForDisplay(phone)
  };
};

/**
 * Aplica máscara de telefone brasileiro enquanto o usuário digita
 * @param value Valor digitado
 * @returns Valor formatado
 */
export const applyPhoneMask = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length <= 2) {
    return cleaned ? `(${cleaned}` : '';
  } else if (cleaned.length <= 7) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
  } else if (cleaned.length <= 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  } else {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
  }
};

/**
 * Remove máscara do telefone, retornando apenas os dígitos
 * @param phone Número de telefone com ou sem máscara
 * @returns Apenas os dígitos do telefone
 */
export const removePhoneMask = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

