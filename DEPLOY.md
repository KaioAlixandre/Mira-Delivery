# Deploy no Integrator Host (ou servidor com Docker)

Este projeto está preparado para rodar com **Docker Compose** no Integrator Host ou em qualquer VPS com Docker instalado.

## Pré-requisitos no servidor

- **Docker** e **Docker Compose** instalados
- Portas **80** (HTTP) e **3001** (API, opcional se só acessar via nginx) liberadas
- Domínio (ex.: `miradelivery.com.br`) apontando para o IP do servidor (opcional)

## 1. Variáveis de ambiente

Na **raiz do projeto** (onde está o `docker-compose.yml`), crie ou edite o arquivo **`.env`** com as variáveis abaixo. **Não commite o `.env`** (ele já está no .gitignore).

```env
# Obrigatórias
JWT_SECRET=suaChaveSecretaForteAqui

# Z-API (WhatsApp) - se usar integração
zapApiToken=SEU_TOKEN
zapApiInstance=SUA_INSTANCIA
zapApiClientToken=SEU_CLIENT_TOKEN

# E-mail (recuperação de senha, etc.)
EMAIL_USER=seu-email@dominio.com
EMAIL_PASSWORD=senhaDoEmail

# Cloudinary (upload de imagens)
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# Opcional - link do cardápio (usado no webhook Z-API)
CARDAPIO_LINK=https://miradelivery.com.br
```

A senha do MySQL no compose está fixa como `0000` no `docker-compose.yml` (e o banco é `miradelivery_db`). Para produção, considere trocar `MYSQL_ROOT_PASSWORD` e `DATABASE_URL` no `docker-compose.yml` ou use um `.env` com variáveis e substitua no compose.

## 2. Subir a aplicação

No servidor, na pasta do projeto:

```bash
docker compose up -d --build
```

- **db**: MySQL na porta **3307** (host) → 3306 (container), banco `miradelivery_db`
- **backend**: API na porta **3001**
- **frontend**: Nginx na porta **80** (site + proxy `/api` e `/uploads` para o backend)

## 3. Nginx e domínio

O `Frontend/nginx.conf` está configurado com:

- `server_name`: `miradelivery.com.br` e `www.miradelivery.com.br`
- Proxy de `/api/` e `/uploads/` para o container `backend:3001`

Se o seu domínio for outro, edite `Frontend/nginx.conf` (linha `server_name`) e faça um novo build do frontend:

```bash
docker compose up -d --build frontend
```

No Integrator Host, configure o DNS do domínio para o IP do servidor. Se não tiver domínio, pode acessar pelo IP (ex.: `http://SEU_IP`).

## 4. Primeira execução (banco)

- O entrypoint do backend executa `prisma migrate deploy` e, se não houver migrações, faz `prisma db push` para criar as tabelas.
- Para popular dados iniciais (opcional): entre no container e rode o seed:
  ```bash
  docker compose exec backend node prisma/seed.js
  ```

## 5. Checklist rápido

- [ ] `.env` na raiz preenchido (JWT_SECRET, Cloudinary, e-mail, Z-API se usar)
- [ ] Docker e Docker Compose instalados no servidor
- [ ] `docker compose up -d --build` executado
- [ ] Porta 80 liberada no firewall
- [ ] Se usar domínio: DNS apontando e `server_name` no `nginx.conf` ajustado
- [ ] (Opcional) Seed do banco e troca da senha padrão do MySQL no compose

Após isso, o site deve responder em `http://SEU_IP` ou `http://miradelivery.com.br`, e a API em `/api/` no mesmo host.
