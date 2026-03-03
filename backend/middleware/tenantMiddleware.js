const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tenantMiddleware = async (req, res, next) => {
    try {
        const subdominioHeader = req.headers['x-loja-subdominio'];
        let loja;

        if (subdominioHeader) {
            // Se o front-end mandou "pizzaria-do-aleff", procuramos ela!
            loja = await prisma.loja.findUnique({
                where: { subdominio: subdominioHeader }
            });
        } else {
            // ==========================================
            // ⚠️ TRAVA DE SEGURANÇA PARA PRODUÇÃO
            // ==========================================
            // Se estivermos na DigitalOcean (onde geralmente definimos NODE_ENV=production)
            // e o subdomínio não for enviado, bloqueamos o acesso na hora.
            if (process.env.NODE_ENV === 'production') {
                return res.status(400).json({ 
                    message: 'Acesso negado: Subdomínio da loja não fornecido na requisição.' 
                });
            } else {
                // Fallback (Loja 1) permitido APENAS rodando localmente no seu PC
                loja = await prisma.loja.findUnique({
                    where: { id: 1 }
                });
            }
        }

        if (!loja) {
            return res.status(404).json({ message: 'Loja não encontrada ou subdomínio inválido.' });
        }

        // Injeta a loja na requisição e segue o fluxo
        req.lojaId = loja.id;
        req.loja = loja;
        next();
    } catch (error) {
        console.error("Erro no Tenant Middleware:", error);
        res.status(500).json({ message: 'Erro interno ao processar a identificação da loja.' });
    }
};

module.exports = tenantMiddleware;
