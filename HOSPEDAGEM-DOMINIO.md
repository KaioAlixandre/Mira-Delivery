# Checklist: Hospedagem com domínio miradelivery.com.br

## Configurações já prontas no projeto

| Item | Status | Detalhe |
|------|--------|---------|
| **Nginx (Frontend)** | ✅ | `server_name miradelivery.com.br www.miradelivery.com.br _` em `Frontend/nginx.conf` |
| **API no mesmo domínio** | ✅ | Build com `VITE_API_URL=""`; frontend usa `/api` e o nginx faz proxy para o backend |
| **Subdomínios (lojas)** | ✅ | `App.tsx` trata `miradelivery.com.br` e `www` como portal; `loja1.miradelivery.com.br` como loja |
| **URLs de loja** | ✅ | Cadastro/Login lojista usam `BASE_DOMAIN = miradelivery.com.br` para links (ex.: `minhaloja.miradelivery.com.br`) |
| **CORS (backend)** | ✅ | `app.use(cors())` aceita qualquer origem |
| **.env.example** | ✅ | `CARDAPIO_LINK=https://miradelivery.com.br` como exemplo |

## O que conferir na VPS / DNS

1. **DNS**
   - Registro **A** para `miradelivery.com.br` → IP do servidor (ex.: 216.22.5.245)
   - Registro **A** para `www.miradelivery.com.br` → mesmo IP
   - Registro **A** para `*` (wildcard) → mesmo IP, para subdomínios das lojas

2. **Porta do site**
   - Frontend está na porta **82** (ex.: `http://216.22.5.245:82`).
   - Para acessar **sem porta** com o domínio:
     - **Opção A:** Usar `http://miradelivery.com.br:82` (funciona assim que o DNS estiver correto).
     - **Opção B:** Colocar um Nginx (ou outro proxy) no **host** escutando na porta **80** e encaminhando `miradelivery.com.br` para o container na 82.

3. **.env na raiz (produção)**
   - Definir `CARDAPIO_LINK=https://miradelivery.com.br` (ou a URL final do cardápio) se usar Z-API.

## URLs esperadas após DNS e (opcional) proxy na 80

- **Portal (login/cadastro lojista):** `http://miradelivery.com.br` ou `http://miradelivery.com.br:82`
- **Loja (ex.: subdomínio “mira”):** `http://mira.miradelivery.com.br` ou `http://mira.miradelivery.com.br:82`
- **API:** no mesmo host, em `/api/` (ex.: `http://miradelivery.com.br/api/...`)

## Resumo

As configurações do projeto estão prontas para usar o domínio **miradelivery.com.br**. Basta garantir DNS apontando para o servidor e, se quiser acesso sem `:82`, configurar um proxy na porta 80 no host.
