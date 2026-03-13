const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Função para remover máscara do telefone (garantir apenas dígitos)
const removePhoneMask = (phone) => {
    if (!phone) return phone;
    return phone.toString().replace(/\D/g, '');
};

const authenticateToken = async (req, res, next) => {
    console.log('🔗 [Auth Route: authenticateToken] Verificando token de autenticação...');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        console.warn('⚠️ [Auth Route: authenticateToken] Token não fornecido. Acesso negado.');
        return res.status(401).json({ message: 'Token não fornecido.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 🌟 MULTI-TENANT: Usar findFirst para garantir que o usuário pertence à loja acessada
        const user = await prisma.usuario.findFirst({
            where: { 
                id: decoded.id,
                lojaId: req.lojaId // Impede usar o token de uma loja em outra!
            },
            select: { id: true, funcao: true, nomeUsuario: true }
        });
        
        if (!user) {
            console.error('❌ [Auth Route: authenticateToken] Usuário não encontrado nesta loja para o token fornecido.');
            return res.status(401).json({ message: 'Token inválido para esta loja.' });
        }
        
        req.user = user;
        console.log(`✅ [Auth Route: authenticateToken] Autenticação bem-sucedida para o usuário ID: ${req.user.id}, Nome: ${req.user.nomeUsuario}, Função: ${req.user.funcao}`);
        next();
    } catch (err) {
        console.error('🚫 [Auth Route: authenticateToken] Token inválido:', err.message);
        return res.status(403).json({ message: 'Token inválido.' });
    }
};

const authorize = (role) => {
    return (req, res, next) => {
        console.log(`🔗 [Auth Route: authorize] Verificando se o usuário tem o papel '${role}'.`);
        console.log(`🔗 [Auth Route: authorize] Usuário atual:`, {
            id: req.user?.id,
            username: req.user?.nomeUsuario,
            role: req.user?.funcao
        });

        const allowedRoles = role === 'admin' ? ['admin', 'master'] : [role];

        if (!req.user || !allowedRoles.includes(req.user.funcao)) {
            console.warn(`🚫 [Auth Route: authorize] Acesso negado. Papel necessário: '${role}', Papel do usuário: '${req.user ? req.user.funcao : 'não autenticado'}'`);
            return res.status(403).json({ message: 'Acesso negado: você não tem permissão para realizar esta ação.' });
        }
        
        console.log(`✅ [Auth Route: authorize] Autorização bem-sucedida para o papel '${role}'.`);
        next();
    };
};

router.post('/login', async (req, res) => {
    const { telefone, password } = req.body;
    const telefoneLimpo = removePhoneMask(telefone);
    console.log(`🔐 [POST /auth/login] Tentativa de login para telefone: ${telefoneLimpo} na Loja ID: ${req.lojaId}`);
    
    try {
        // 🌟 MULTI-TENANT: Busca o usuário pelo telefone E pela loja atual
        const user = await prisma.usuario.findFirst({ 
            where: { 
                telefone: telefoneLimpo,
                lojaId: req.lojaId 
            } 
        });

        if (!user || !(await bcrypt.compare(password, user.senha))) {
            console.warn(`⚠️ [POST /auth/login] Credenciais inválidas para telefone: ${telefone}`);
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }
        
        // Token com expiração de 30 dias para manter usuário logado
        const token = jwt.sign({ id: user.id, role: user.funcao }, JWT_SECRET, { expiresIn: '365d' });
        console.log(`✅ [POST /auth/login] Login realizado com sucesso para usuário: ${user.nomeUsuario} (ID: ${user.id})`);
        res.json({ token, user: { id: user.id, username: user.nomeUsuario, role: user.funcao } });
    } catch (err) {
        console.error('❌ [POST /auth/login] Erro interno ao fazer login:', err);
        res.status(500).json({ message: 'Erro ao fazer login.' });
    }
});

// ======================================================================
//  ROTA SAAS: LOGIN DO DONO DA LOJA APENAS COM TELEFONE + SENHA
//  - Não depende de subdomínio nem de req.lojaId
//  - Identifica a loja automaticamente a partir do usuário admin/master
// ======================================================================
router.post('/login-store-admin', async (req, res) => {
    const { telefone, password } = req.body;
    const telefoneLimpo = removePhoneMask(telefone);

    console.log(`🔐 [POST /auth/login-store-admin] Tentativa de login SaaS para telefone: ${telefoneLimpo}`);

    if (!telefoneLimpo || !password) {
        return res.status(400).json({ message: 'Telefone e senha são obrigatórios.' });
    }

    try {
        // Busca um usuário ADMIN ou MASTER com esse telefone, em qualquer loja
        const user = await prisma.usuario.findFirst({
            where: {
                telefone: telefoneLimpo,
                funcao: { in: ['admin', 'master'] }
            },
            include: {
                loja: true
            }
        });

        if (!user || !(await bcrypt.compare(password, user.senha))) {
            console.warn(`⚠️ [POST /auth/login-store-admin] Credenciais inválidas para telefone: ${telefone}`);
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        if (!user.loja) {
            console.error(`❌ [POST /auth/login-store-admin] Usuário admin encontrado, mas sem loja vinculada. ID: ${user.id}`);
            return res.status(500).json({ message: 'Erro ao localizar a loja deste usuário.' });
        }

        // Gera o token da mesma forma que o login normal
        const token = jwt.sign({ id: user.id, role: user.funcao }, JWT_SECRET, { expiresIn: '365d' });

        console.log(`✅ [POST /auth/login-store-admin] Login SaaS bem-sucedido para usuário: ${user.nomeUsuario} (Loja: ${user.loja.subdominio})`);

        return res.json({
            token,
            user: { id: user.id, username: user.nomeUsuario, role: user.funcao },
            subdominio: user.loja.subdominio
        });
    } catch (err) {
        console.error('❌ [POST /auth/login-store-admin] Erro interno ao fazer login SaaS do lojista:', err);
        return res.status(500).json({ message: 'Erro ao fazer login. Tente novamente mais tarde.' });
    }
});

router.post('/register', async (req, res) => {
    const { username, telefone, password } = req.body;
    
    // Validação: loja (tenant) deve estar definida pelo middleware
    if (req.lojaId == null || req.lojaId === undefined) {
        console.warn('⚠️ [POST /auth/register] Requisição sem loja (subdomínio não informado ou inválido).');
        return res.status(400).json({ message: 'Acesso negado: acesse pelo link da loja para criar sua conta.' });
    }
    
    if (!username || !telefone || !password) {
        return res.status(400).json({ message: 'Nome, telefone e senha são obrigatórios.' });
    }
    
    const telefoneLimpo = removePhoneMask(telefone);
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        return res.status(400).json({ message: 'Telefone inválido. Informe DDD e número (10 ou 11 dígitos).' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
    }
    
    console.log(`👤 [POST /auth/register] Tentativa de registro para usuário: ${username}, telefone: ${telefoneLimpo} na Loja ID: ${req.lojaId}`);
    
    try {
        // 🌟 MULTI-TENANT: Verifica se o telefone já existe NESTA loja
        const existingUser = await prisma.usuario.findFirst({ 
            where: { 
                telefone: telefoneLimpo,
                lojaId: req.lojaId
            } 
        });

        if (existingUser) {
            console.warn(`⚠️ [POST /auth/register] Telefone já existe nesta loja: ${telefoneLimpo}`);
            return res.status(400).json({ message: 'Telefone já cadastrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 🌟 MULTI-TENANT: Salva o novo usuário vinculado ao ID da loja
        const newUser = await prisma.usuario.create({
            data: { 
                lojaId: req.lojaId,
                nomeUsuario: username.trim(), 
                telefone: telefoneLimpo, 
                senha: hashedPassword 
            }
        });
        
        console.log(`✅ [POST /auth/register] Usuário cadastrado com sucesso: ${username} (ID: ${newUser.id})`);
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
    } catch (err) {
        console.error('❌ [POST /auth/register] Erro interno ao cadastrar usuário:', err);
        const message = err.code === 'P2002' 
            ? 'Já existe uma conta com este telefone nesta loja.' 
            : 'Erro ao cadastrar usuário. Tente novamente.';
        res.status(500).json({ message });
    }
});

// ======================================================================
//  ROTA SAAS: CRIAR UMA NOVA LOJA (CADASTRO DO DONO DO RESTAURANTE)
// ======================================================================
router.post('/register-store', async (req, res) => {
    const { nomeLoja, subdominioDesejado, username, telefone, password, email, planoMensal } = req.body;
    const telefoneLimpo = removePhoneMask(telefone);
    const planoSelecionado = ['simples', 'pro', 'plus'].includes(planoMensal) ? planoMensal : 'simples';

    console.log(` [POST /auth/register-store] Iniciando criação da loja: ${nomeLoja}`);

    // 1. Limpar e formatar o subdomínio (ex: "Sushi do Zé" vira "sushi-do-ze")
    const subdominioFormatado = subdominioDesejado
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-z0-9-]/g, '-') // substitui espaços por hífen
        .replace(/-+/g, '-') // remove hífens duplicados
        .replace(/^-|-$/g, ''); // remove hífen no começo ou fim

    if (!subdominioFormatado) {
        return res.status(400).json({ message: 'Subdomínio inválido.' });
    }

    try {
        // 2. Verificar se o subdomínio já foi pego por outro cliente seu
        const lojaExistente = await prisma.loja.findUnique({
            where: { subdominio: subdominioFormatado }
        });

        if (lojaExistente) {
            console.warn(` [POST /auth/register-store] Tentativa de criar subdomínio já existente: ${subdominioFormatado}`);
            return res.status(409).json({ message: 'Este subdomínio já está em uso. Escolha outro.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. TRANSACTION: Cria a Loja, Configurações e Usuário de uma vez só!
        const resultado = await prisma.$transaction(async (tx) => {
            
            // A. Cria a nova loja
            const novaLoja = await tx.loja.create({
                data: {
                    nome: nomeLoja,
                    subdominio: subdominioFormatado,
                    corPrimaria: '#FF0000',
                    planoMensal: planoSelecionado,
                }
            });

            // B. Cria a configuração padrão para a loja
            await tx.configuracao_loja.create({
                data: {
                    lojaId: novaLoja.id,
                    aberto: true,
                    horaAbertura: '18:00',
                    horaFechamento: '23:59',
                    diasAbertos: '0,1,2,3,4,5,6',
                    horaEntregaInicio: '18:00',
                    horaEntregaFim: '23:59'
                }
            });

            // C. Cria o dono da loja vinculado apenas a esta nova loja
            const novoUsuario = await tx.usuario.create({
                data: {
                    lojaId: novaLoja.id,
                    nomeUsuario: username,
                    telefone: telefoneLimpo,
                    email: email || null,
                    senha: hashedPassword,
                    funcao: 'admin' // 🌟 MUDANÇA AQUI: Agora ele é admin da loja dele!
                }
            });

            return { novaLoja, novoUsuario };
        });

        // 4. Gerar o token de login
        const token = jwt.sign(
            { id: resultado.novoUsuario.id, role: resultado.novoUsuario.funcao }, 
            JWT_SECRET, 
            { expiresIn: '365d' }
        );

        console.log(`🎉 [SUCESSO] Loja criada: ${resultado.novaLoja.nome} (URL: ${subdominioFormatado}.miradelivery.com.br)`);

        // Responde com sucesso
        res.status(201).json({ 
            message: 'Sua loja foi criada com sucesso!',
            loja: resultado.novaLoja,
            token, 
            user: { 
                id: resultado.novoUsuario.id, 
                username: resultado.novoUsuario.nomeUsuario, 
                role: resultado.novoUsuario.funcao 
            } 
        });

    } catch (err) {
        console.error('❌ [POST /auth/register-store] Erro interno ao criar a loja:', err);
        res.status(500).json({ message: 'Erro interno ao criar a loja.' });
    }
});

router.get('/profile', authenticateToken, async (req, res) => {
    console.log(`👤 [GET /auth/profile] Buscando perfil do usuário ID: ${req.user.id}`);
    
    try {
        const user = await prisma.usuario.findUnique({
            where: { id: req.user.id }, // Como o ID é PK e validamos no token, findUnique continua seguro
            select: {
                id: true,
                nomeUsuario: true,
                email: true,
                funcao: true,
                telefone: true,
                enderecos: {
                    select: {
                        id: true, rua: true, numero: true, complemento: true,
                        bairro: true, pontoReferencia: true, padrao: true
                    },
                    orderBy: { padrao: 'desc' }
                }
            }
        });
        console.log(`✅ [GET /auth/profile] Perfil encontrado para usuário: ${user.nomeUsuario}`);
        res.json(user);
    } catch (err) {
        console.error('❌ [GET /auth/profile] Erro interno ao buscar perfil:', err);
        res.status(500).json({ message: 'Erro ao buscar perfil.' });
    }
});

router.get('/users', authenticateToken, authorize('admin'), async (req, res) => {
    console.log(`👥 [GET /auth/users] Admin ${req.user.id} solicitando lista de usuários da Loja ID: ${req.lojaId}`);
    
    try {
        // 🌟 MULTI-TENANT: Lista apenas os usuários da loja atual
        const users = await prisma.usuario.findMany({
            where: { lojaId: req.lojaId },
            select: {
                id: true, nomeUsuario: true, email: true, funcao: true,
                telefone: true, criadoEm: true,
                pedidos: {
                    select: {
                        id: true, precoTotal: true, status: true, criadoEm: true,
                        itens_pedido: {
                            select: {
                                id: true, quantidade: true, precoNoPedido: true,
                                produto: { select: { id: true, nome: true } },
                                complementos: {
                                    select: {
                                        complemento: { select: { id: true, nome: true, imagemUrl: true } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const transformedUsers = users.map(user => ({
            id: user.id,
            nomeUsuario: user.nomeUsuario,
            email: user.email,
            funcao: user.funcao,
            telefone: user.telefone,
            criadoEm: user.criadoEm,
            order: (user.pedidos || []).map(pedido => ({
                id: pedido.id,
                totalPrice: Number(pedido.precoTotal) || 0,
                status: pedido.status,
                createdAt: pedido.criadoEm ? pedido.criadoEm.toISOString() : new Date().toISOString()
            }))
        }));
        
        console.log(`✅ [GET /auth/users] ${users.length} usuários encontrados`);
        res.json(transformedUsers);
    } catch (err) {
        console.error('❌ [GET /auth/users] Erro interno ao buscar usuários:', err);
        res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
});

// GET /auth/profile/addresses - Listar endereços do usuário
router.get('/profile/addresses', authenticateToken, async (req, res) => {
    console.log(`🏠 [GET /auth/profile/addresses] Buscando endereços do usuário ID: ${req.user.id}`);
    try {
        const addresses = await prisma.endereco.findMany({
            where: { usuarioId: req.user.id }, // Seguro: usuarioId já está atrelado ao tenant
            orderBy: { padrao: 'desc' }
        });
        
        const transformedAddresses = addresses.map(addr => ({
            id: addr.id, street: addr.rua, number: addr.numero,
            complement: addr.complemento, neighborhood: addr.bairro,
            reference: addr.pontoReferencia, isDefault: addr.padrao,
            userId: addr.usuarioId
        }));
        
        res.json(transformedAddresses);
    } catch (err) {
        console.error('❌ Erro ao buscar endereços:', err);
        res.status(500).json({ error: 'Erro ao buscar endereços.' });
    }
});

// POST /auth/profile/address - Adicionar endereço
router.post('/profile/address', authenticateToken, async (req, res) => {
    const { street, number, complement, neighborhood, reference, isDefault } = req.body;
    const userId = req.user.id;

    if (!street || !number || !neighborhood) {
        return res.status(400).json({ message: 'Rua, número e bairro são obrigatórios.' });
    }

    try {
        if (isDefault) {
            await prisma.endereco.updateMany({
                where: { usuarioId: userId },
                data: { padrao: false }
            });
        }

        const newAddress = await prisma.endereco.create({
            data: {
                rua: street, numero: number, complemento: complement || null,
                bairro: neighborhood, pontoReferencia: reference || null,
                padrao: isDefault || false, usuarioId: userId
            }
        });

        const updatedUser = await prisma.usuario.findUnique({
            where: { id: userId }, include: { enderecos: true }
        });

        res.status(201).json({ user: updatedUser });
    } catch (err) {
        console.error('❌ Erro interno:', err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// PUT /auth/profile/address/:addressId - Atualizar endereço
router.put('/profile/address/:addressId', authenticateToken, async (req, res) => {
    const { addressId } = req.params;
    const { street, number, complement, neighborhood, reference, isDefault } = req.body;
    const userId = req.user.id;

    if (!street || !number || !neighborhood) {
        return res.status(400).json({ message: 'Rua, número e bairro são obrigatórios.' });
    }

    try {
        const existingAddress = await prisma.endereco.findFirst({
            where: { id: parseInt(addressId), usuarioId: userId }
        });

        if (!existingAddress) return res.status(404).json({ message: 'Endereço não encontrado.' });

        if (isDefault) {
            await prisma.endereco.updateMany({
                where: { usuarioId: userId, id: { not: parseInt(addressId) } },
                data: { padrao: false }
            });
        }

        const updatedAddress = await prisma.endereco.update({
            where: { id: parseInt(addressId) },
            data: {
                rua: street, numero: number, complemento: complement || null,
                bairro: neighborhood, pontoReferencia: reference || null,
                padrao: isDefault || false
            }
        });

        res.json(updatedAddress);
    } catch (err) {
        console.error('❌ Erro interno:', err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// PUT /auth/profile/phone - Atualizar telefone do usuário autenticado
router.put('/profile/phone', authenticateToken, async (req, res) => {
    const { phone } = req.body;
    const userId = req.user.id;
    const telefoneLimpo = removePhoneMask(phone);

    if (!telefoneLimpo) return res.status(400).json({ message: 'Telefone é obrigatório.' });

    try {
        const updatedUser = await prisma.usuario.update({
            where: { id: userId },
            data: { telefone: telefoneLimpo },
            select: {
                id: true, nomeUsuario: true, email: true, telefone: true,
                funcao: true, enderecos: true
            }
        });

        res.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error('❌ Erro interno:', err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// DELETE /auth/profile/address/:addressId - Excluir endereço
router.delete('/profile/address/:addressId', authenticateToken, async (req, res) => {
    const { addressId } = req.params;
    const userId = req.user.id;

    try {
        const existingAddress = await prisma.endereco.findFirst({
            where: { id: parseInt(addressId), usuarioId: userId }
        });

        if (!existingAddress) return res.status(404).json({ message: 'Endereço não encontrado.' });

        const userAddressCount = await prisma.endereco.count({
            where: { usuarioId: userId }
        });

        if (userAddressCount === 1) {
            return res.status(400).json({ message: 'Não é possível excluir o último endereço.' });
        }

        await prisma.endereco.delete({ where: { id: parseInt(addressId) } });

        if (existingAddress.padrao) {
            const firstRemainingAddress = await prisma.endereco.findFirst({
                where: { usuarioId: userId }, orderBy: { id: 'asc' }
            });

            if (firstRemainingAddress) {
                await prisma.endereco.update({
                    where: { id: firstRemainingAddress.id }, data: { padrao: true }
                });
            }
        }

        const updatedAddresses = await prisma.endereco.findMany({
            where: { usuarioId: userId },
            orderBy: [{ padrao: 'desc' }, { id: 'asc' }]
        });

        res.json({ message: 'Endereço excluído com sucesso.', addresses: updatedAddresses });
    } catch (err) {
        console.error('❌ Erro interno:', err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// PUT /auth/profile - Atualizar perfil do admin (nome, email, senha)
router.put('/profile', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { nomeUsuario, email, senhaAtual, novaSenha } = req.body;

    try {
        const user = await prisma.usuario.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

        const updateData = {};

        if (nomeUsuario && nomeUsuario !== user.nomeUsuario) {
            updateData.nomeUsuario = nomeUsuario;
        }

        if (email !== undefined && email !== user.email) {
            updateData.email = email || null;
        }

        if (novaSenha) {
            if (!senhaAtual) {
                return res.status(400).json({ message: 'Informe a senha atual para alterar a senha.' });
            }
            const senhaValida = await bcrypt.compare(senhaAtual, user.senha);
            if (!senhaValida) {
                return res.status(400).json({ message: 'Senha atual incorreta.' });
            }
            updateData.senha = await bcrypt.hash(novaSenha, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return res.json({ message: 'Nenhuma alteração detectada.', user: { id: user.id, nomeUsuario: user.nomeUsuario, email: user.email, funcao: user.funcao, telefone: user.telefone } });
        }

        const updatedUser = await prisma.usuario.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, nomeUsuario: true, email: true, funcao: true, telefone: true }
        });

        res.json({ message: 'Perfil atualizado com sucesso!', user: updatedUser });
    } catch (err) {
        console.error('❌ [PUT /auth/profile] Erro:', err);
        if (err.code === 'P2002') {
            return res.status(409).json({ message: 'Nome de usuário ou email já está em uso.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

module.exports = {
    router,
    authenticateToken,
    authorize
};