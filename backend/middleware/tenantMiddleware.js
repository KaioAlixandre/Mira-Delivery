const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tenantMiddleware = async (req, res, next) => {
    try {
        if (
            req.path === '/auth/register-store' ||
            (typeof req.originalUrl === 'string' && req.originalUrl.startsWith('/api/auth/register-store'))
        ) {
            return next();
        }

        const subdominioHeader = req.headers['x-loja-subdominio'];
        let loja;

        if (subdominioHeader) {
            // Se o front-end mandou "pizzaria-do-aleff", procuramos ela!
            loja = await prisma.loja.findUnique({
                where: { subdominio: subdominioHeader }
            });
        } else {
            // 🌟 MODO DESENVOLVIMENTO:
            // Se você acessar 'localhost:5173' puro, ele joga pra Loja 1 (Matriz)
            loja = await prisma.loja.findUnique({
                where: { id: 1 }
            });
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
        res.status(500).json({ message: 'Erro ao processar identificação da loja' });
    }
};

module.exports = tenantMiddleware;