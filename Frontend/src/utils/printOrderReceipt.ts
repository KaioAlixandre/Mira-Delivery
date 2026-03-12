import { Order, Flavor } from '../types';
import apiService from '../services/api';

interface PrintOrderReceiptOptions {
  order: Order;
  user?: {
    nomeUsuario?: string;
    telefone?: string;
    email?: string;
  };
  storeInfo?: {
    name?: string;
    address?: string;
    cnpj?: string;
    phone?: string;
    pixKey?: string;
  };
  flavors?: Flavor[];
}

/**
 * Formata data para exibição
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formata método de pagamento
 */
const formatPaymentMethod = (method?: string): string => {
  switch (method) {
    case 'CREDIT_CARD':
      return 'Cartão de Crédito';
    case 'PIX':
      return 'PIX';
    case 'CASH_ON_DELIVERY':
      return 'Dinheiro na Entrega';
    default:
      return method || 'Não informado';
  }
};

/**
 * Formata tipo de entrega
 */
const formatDeliveryType = (type?: string): string => {
  return type === 'delivery' ? 'Entrega em Casa' : 'Retirada no Local';
};

/**
 * Gera e imprime a nota do pedido
 */
export const printOrderReceipt = (options: PrintOrderReceiptOptions) => {
  const { order, user, storeInfo, flavors = [] } = options;

  const loadStoreName = async (): Promise<string | undefined> => {
    const fromOptions = (storeInfo?.name || '').trim();
    if (fromOptions) return fromOptions;
    try {
      const config = await apiService.getStoreConfig();
      const nome = (config?.nomeLoja || '').trim();
      return nome || undefined;
    } catch {
      return undefined;
    }
  };

  const loadStorePixKey = async (): Promise<string | undefined> => {
    const fromOptions = (storeInfo?.pixKey || '').trim();
    if (fromOptions) return fromOptions;
    try {
      const config = await apiService.getStoreConfig();
      const pix = (config?.chavePix || config?.telefoneWhatsapp || '').trim();
      return pix || undefined;
    } catch {
      return undefined;
    }
  };

  const loadStoreAddress = async (): Promise<string | undefined> => {
    const fromOptions = (storeInfo?.address || '').trim();
    if (fromOptions) return fromOptions;
    try {
      const config = await apiService.getStoreConfig();
      const endereco = (config?.enderecoLoja || '').trim();
      return endereco || undefined;
    } catch {
      return undefined;
    }
  };

  // Função auxiliar para obter sabores do item
  const getItemFlavors = (item: any): Flavor[] => {
    if (!item.selectedOptionsSnapshot || !flavors.length) return [];

    let selectedFlavors: any = {};
    
    if (item.selectedOptionsSnapshot.selectedFlavors) {
      selectedFlavors = item.selectedOptionsSnapshot.selectedFlavors;
    } else if (item.selectedOptionsSnapshot.flavors) {
      selectedFlavors = item.selectedOptionsSnapshot.flavors;
    } else {
      return [];
    }

    if (Object.keys(selectedFlavors).length === 0) {
      return [];
    }

    const flavorIds: number[] = [];
    Object.values(selectedFlavors).forEach((ids: any) => {
      if (Array.isArray(ids)) {
        flavorIds.push(...ids.map((id: any) => Number(id)));
      }
    });

    return flavors.filter(flavor => flavorIds.includes(flavor.id));
  };

  // Calcular subtotal
  const subtotal = (order.orderitem || []).reduce((sum, item: any) => {
    const basePrice = Number(item.priceAtOrder ?? 0);
    const additionalsTotal = Array.isArray(item.additionals)
      ? item.additionals.reduce((acc: number, a: any) => acc + (Number(a.value || 0) * Number(a.quantity || 0)), 0)
      : 0;
    const unitTotal = basePrice + additionalsTotal;
    return sum + (unitTotal * Number(item.quantity || 0));
  }, 0);

  const buildAndPrint = async () => {
    const resolvedStoreName = await loadStoreName();
    await loadStorePixKey();
    const resolvedStoreAddress = await loadStoreAddress();

    // Gerar HTML da nota
    const receiptHTML = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nota do Pedido #${order.dailyNumber ?? order.id}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          padding: 5mm;
          color: #000;
          background: white;
          margin: 0;
          font-size: 10pt;
          font-weight: bold;
        }
        
        * {
          font-weight: bold;
        }
        
        .receipt {
          max-width: 68mm;
          margin: 0 auto;
          background: white;
          width: 100%;
        }
        
        .header {
          text-align: center;
          border-bottom: 1px solid #000;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        
        .header h1 {
          font-size: 14pt;
          font-weight: bold;
          color: #000;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        
        .header p {
          font-size: 8pt;
          color: #000;
          margin: 1px 0;
          line-height: 1.2;
        }
        
        .section {
          margin-bottom: 10px;
        }
        
        .section-title {
          font-size: 10pt;
          font-weight: bold;
          color: #000;
          margin-bottom: 6px;
          border-bottom: 1px solid #000;
          padding-bottom: 2px;
          text-align: center;
        }
        
        .info-grid {
          display: block;
          margin-bottom: 8px;
        }
        
        .info-item {
          font-size: 9pt;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        
        .info-label {
          color: #000;
          font-size: 8pt;
          margin-bottom: 1px;
        }
        
        .info-value {
          font-weight: bold;
          color: #000;
          font-size: 9pt;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5px;
          font-size: 8pt;
        }
        
        table thead {
          border-bottom: 1px solid #000;
        }
        
        table th {
          padding: 3px 2px;
          text-align: left;
          font-weight: bold;
          font-size: 8pt;
          color: #000;
        }
        
        table th.text-center {
          text-align: center;
        }
        
        table th.text-right {
          text-align: right;
        }
        
        table td {
          padding: 3px 2px;
          border-bottom: 1px dotted #666;
          font-size: 8pt;
          line-height: 1.2;
        }
        
        table td.text-center {
          text-align: center;
        }
        
        table td.text-right {
          text-align: right;
        }
        
        .item-name {
          font-weight: bold;
          color: #000;
          font-size: 8pt;
        }
        
        .item-complements {
          font-size: 7pt;
          color: #000;
          margin-top: 1px;
          font-style: italic;
        }
        
        .summary {
          margin-top: 10px;
          border-top: 1px solid #000;
          padding-top: 6px;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          font-size: 9pt;
          line-height: 1.3;
        }
        
        .summary-row.total {
          border-top: 1px solid #000;
          margin-top: 4px;
          padding-top: 6px;
          font-size: 11pt;
          font-weight: bold;
        }
        
        .summary-label {
          color: #000;
        }
        
        .summary-value {
          font-weight: bold;
          color: #000;
        }
        
        .summary-value.total {
          color: #000;
          font-size: 12pt;
        }
        
        .footer {
          text-align: center;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #000;
          color: #000;
          font-size: 8pt;
          line-height: 1.3;
        }
        
        .notes {
          border: 1px solid #000;
          padding: 5px;
          margin-top: 8px;
          font-size: 8pt;
        }
        
        .notes-title {
          font-weight: bold;
          color: #000;
          margin-bottom: 3px;
          font-size: 8pt;
        }
        
        .notes-content {
          color: #000;
          font-size: 8pt;
          white-space: pre-wrap;
          line-height: 1.3;
        }
        
        @media print {
          body {
            padding: 0;
            margin: 0;
            font-weight: bold;
          }
          
          .receipt {
            max-width: 68mm;
            width: 68mm;
          }
          
          @page {
            size: 80mm auto;
            margin: 0;
            padding: 0;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            font-weight: bold !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Cabeçalho -->
        <div class="header">
          <h1>${resolvedStoreName || storeInfo?.name || 'Mira Delivery'}</h1>
          <p>${resolvedStoreAddress || storeInfo?.address || 'Endereço não configurado'}</p>
          ${storeInfo?.cnpj ? `<p>CNPJ: ${storeInfo.cnpj}</p>` : ''}
        </div>

        <!-- Informações do Pedido -->
        <div class="section">
          <h2 class="section-title">NOTA DO PEDIDO</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Número do Pedido</div>
              <div class="info-value">#${order.dailyNumber ?? order.id}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Data/Hora</div>
              <div class="info-value">${formatDate(order.createdAt)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Tipo de Entrega</div>
              <div class="info-value">${formatDeliveryType(order.deliveryType)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Forma de Pagamento</div>
              <div class="info-value">${formatPaymentMethod((order as any).paymentMethod || order.payment?.method)}</div>
            </div>
            ${order.precisaTroco && order.valorTroco ? `
            <div class="info-item">
              <div class="info-label">Troco Necessário</div>
              <div class="info-value">Cliente pagará com: R$ ${Number(order.valorTroco).toFixed(2)}</div>
              <div class="info-value" style="font-size: 8pt; margin-top: 2px;">Troco de: R$ ${(Number(order.valorTroco) - Number(order.totalPrice)).toFixed(2)}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Informações do Cliente -->
        ${user || (order as any).nomeClienteAvulso ? `
        <div class="section">
          <h2 class="section-title">DADOS DO CLIENTE</h2>
          <div class="info-grid">
            ${(order as any).nomeClienteAvulso ? `
            <div class="info-item">
              <div class="info-label">Nome</div>
              <div class="info-value">${(order as any).nomeClienteAvulso}</div>
            </div>
            ` : user?.nomeUsuario ? `
            <div class="info-item">
              <div class="info-label">Nome</div>
              <div class="info-value">${user.nomeUsuario}</div>
            </div>
            ` : ''}
            ${user?.telefone ? `
            <div class="info-item">
              <div class="info-label">Telefone</div>
              <div class="info-value">${user.telefone}</div>
            </div>
            ` : ''}
            ${user?.email ? `
            <div class="info-item">
              <div class="info-label">E-mail</div>
              <div class="info-value">${user.email}</div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Endereço de Entrega -->
        ${order.deliveryType === 'delivery' && order.shippingStreet ? `
        <div class="section">
          <h2 class="section-title">ENDEREÇO DE ENTREGA</h2>
          <div class="info-item">
            <div class="info-value">
              ${order.shippingStreet}, ${order.shippingNumber}
              ${order.shippingComplement ? ` - ${order.shippingComplement}` : ''}
            </div>
            <div class="info-value" style="margin-top: 5px;">${order.shippingNeighborhood}</div>
            ${order.shippingPhone ? `<div class="info-value" style="margin-top: 5px;">Telefone: ${order.shippingPhone}</div>` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Itens do Pedido -->
        <div class="section">
          <h2 class="section-title">ITENS DO PEDIDO</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-center">Qtd</th>
                <th class="text-right">Unit.</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(order.orderitem || []).map((item) => {
                const isCustomAcai = item.selectedOptionsSnapshot?.customAcai;
                const isCustomSorvete = item.selectedOptionsSnapshot?.customSorvete;
                const isCustomProduct = item.selectedOptionsSnapshot?.customProduct;
                const customData = isCustomAcai || isCustomSorvete || isCustomProduct;

                const basePrice = Number(item.priceAtOrder ?? 0);
                const additionalsTotal = Array.isArray((item as any).additionals)
                  ? (item as any).additionals.reduce((acc: number, a: any) => acc + (Number(a.value || 0) * Number(a.quantity || 0)), 0)
                  : 0;
                const unitTotal = basePrice + additionalsTotal;
                const lineTotal = unitTotal * Number(item.quantity || 0);
                
                const complementos = [];
                if (item.complements && item.complements.length > 0) {
                  complementos.push(...item.complements.map(c => c.name));
                }
                if (customData?.complementNames && Array.isArray(customData.complementNames)) {
                  complementos.push(...customData.complementNames);
                }

                const adicionais = [];
                if ((item as any).additionals && Array.isArray((item as any).additionals) && (item as any).additionals.length > 0) {
                  adicionais.push(
                    ...(item as any).additionals.map((a: any) => {
                      const qty = Number(a.quantity || 1);
                      const name = a.name || 'Adicional';
                      const value = Number(a.value || 0);
                      return `${qty}x ${name} (+R$ ${value.toFixed(2)})`;
                    })
                  );
                }

                // Obter sabores do item
                const itemFlavors = getItemFlavors(item);
                const sabores = itemFlavors.map(f => f.name);
                
                const observacao = String((item as any).observacao || item.selectedOptionsSnapshot?.observacao || '').trim();
                
                return `
                  <tr>
                    <td>
                      <div class="item-name">${item.product?.name || 'Produto'}</div>
                      ${customData ? '<div class="item-complements">(Personalizado)</div>' : ''}
                      ${complementos.length > 0 ? `<div class="item-complements">+ ${complementos.join(', ')}</div>` : ''}
                      ${adicionais.length > 0 ? `<div class="item-complements">Adicionais: ${adicionais.join(', ')}</div>` : ''}
                      ${sabores.length > 0 ? `<div class="item-complements">Sabores: ${sabores.join(', ')}</div>` : ''}
                      ${observacao ? `<div class="item-complements">Obs: ${observacao}</div>` : ''}
                    </td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">R$ ${unitTotal.toFixed(2)}</td>
                    <td class="text-right"><strong>R$ ${lineTotal.toFixed(2)}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Observações -->
        ${order.notes && order.notes.trim() ? `
        <div class="section">
          <div class="notes">
            <div class="notes-title">OBSERVAÇÕES DO CLIENTE</div>
            <div class="notes-content">${order.notes}</div>
          </div>
        </div>
        ` : ''}

        <!-- Resumo Financeiro -->
        <div class="section">
          <div class="summary">
            <div class="summary-row">
              <span class="summary-label">Subtotal:</span>
              <span class="summary-value">R$ ${subtotal.toFixed(2)}</span>
            </div>
            ${order.deliveryType === 'delivery' ? `
            <div class="summary-row">
              <span class="summary-label">Taxa de Entrega:</span>
              <span class="summary-value">R$ ${Number(order.deliveryFee || 0).toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="summary-row total">
              <span class="summary-label">TOTAL:</span>
              <span class="summary-value total">R$ ${Number(order.totalPrice).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Rodapé -->
        <div class="footer">
          <p style="margin-bottom: 10px; font-weight: bold;">Obrigado pela sua preferência!</p>
          <p>Volte sempre à ${resolvedStoreName || storeInfo?.name || 'Loja'}</p>
          <p style="margin-top: 15px; font-size: 11px; color: #9ca3af;">
            Esta é uma nota de pedido. Guarde para seu controle.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir a nota.');
      return;
    }

    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Aguardar o carregamento e imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Fechar a janela após impressão (opcional)
        // printWindow.close();
      }, 250);
    };
  };

  void buildAndPrint();
};

