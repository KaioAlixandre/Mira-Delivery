# Reverse proxy Nginx – Mira Delivery

Use este arquivo na **VPS** para que `miradelivery.com.br` e `www.miradelivery.com.br` respondam na porta 80 e sejam encaminhados para o container na porta 82.

## 1. Instalar Nginx no host (se ainda não tiver)

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y nginx

# CentOS/RHEL/Rocky
sudo yum install -y nginx
# ou
sudo dnf install -y nginx
```

## 2. Copiar a configuração

```bash
# Na VPS, a partir da pasta do projeto (ou copie o conteúdo de miradelivery.conf)
sudo cp nginx-reverse-proxy/miradelivery.conf /etc/nginx/conf.d/miradelivery.conf
```

Ou criar o arquivo direto:

```bash
sudo nano /etc/nginx/conf.d/miradelivery.conf
```

Cole o conteúdo de `miradelivery.conf` e salve.

## 3. Testar a configuração do Nginx

```bash
sudo nginx -t
```

Saída esperada: `syntax is ok` e `test is successful`.

## 4. Recarregar / reiniciar o Nginx

```bash
# Recarregar sem derrubar conexões
sudo systemctl reload nginx

# Ou reiniciar o serviço
sudo systemctl restart nginx
```

## 5. Verificar se a porta 80 está respondendo

```bash
# Porta 80 em uso pelo nginx
sudo ss -tlnp | grep :80
# ou
sudo netstat -tlnp | grep :80

# Teste local
curl -I http://127.0.0.1/
curl -I -H "Host: miradelivery.com.br" http://127.0.0.1/
```

## 6. (Opcional) Habilitar Nginx no boot

```bash
sudo systemctl enable nginx
```

## Resumo dos comandos

| Ação              | Comando                          |
|-------------------|----------------------------------|
| Testar config     | `sudo nginx -t`                  |
| Recarregar Nginx  | `sudo systemctl reload nginx`    |
| Reiniciar Nginx   | `sudo systemctl restart nginx`   |
| Ver porta 80      | `sudo ss -tlnp | grep :80`        |
| Testar no host    | `curl -I -H "Host: miradelivery.com.br" http://127.0.0.1/` |

## Cloudflare

- DNS: `miradelivery.com.br` e `www` em A (ou CNAME) apontando para o IP da VPS.
- No Nginx, `X-Forwarded-Proto` já é repassado; com proxy laranja (Proxied) no Cloudflare, o usuário acessa em HTTPS e o Nginx recebe HTTP na 80 (ou HTTPS na 443 se configurar SSL no host).
