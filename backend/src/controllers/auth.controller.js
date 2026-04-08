const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined in environment variables');

const userCache = new NodeCache({ stdTTL: 300 });
const CACHE_KEYS = {
  currentUser: (id) => `auth:user:${id}`,
};

// Configurar tiempos de expiración según rol
const TOKEN_EXPIRY = {
  user: '10m',      // Usuario normal: 10 minutos
  admin: '1h',      // Administrador: 1 hora
  default: '10m',   // Por defecto: 10 minutos
};

const getTokenExpiry = (roleName) => {
  return TOKEN_EXPIRY[roleName?.toLowerCase()] || TOKEN_EXPIRY.default;
};

const invalidateUserCache = (userId) => {
  if (!userId) return;
  userCache.del(CACHE_KEYS.currentUser(userId));
};

const register = async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name)
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const role = await prisma.role.findFirst({ where: { roleName: 'user' } });
    if (!role)
      return res.status(500).json({ error: 'Default user role not found' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        full_name,
        id_role: role.id_role,
      },
      select: {
        id_user:   true,
        email:     true,
        full_name: true,
        id_role:   true,
      },
    });

    const tokenExpiry = getTokenExpiry(role.roleName);
    const token = jwt.sign(
      { id: user.id_user, email: user.email, roleId: user.id_role, role: role.roleName },
      JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    const userResponse = {
      id:        user.id_user,
      email:     user.email,
      full_name: user.full_name,
      roleId:    user.id_role,
      role:      role.roleName,
    };

    userCache.set(CACHE_KEYS.currentUser(user.id_user), userResponse);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResponse,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'Email already registered' });
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await prisma.user.findFirst({
      where:   { email, deleted_at: null },
      include: { role: true },
    });

    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    const normalizedHash = user.password.replace(/^\$2y\$/, '$2b$');
    const isPasswordValid = await bcrypt.compare(password, normalizedHash);
    if (!isPasswordValid)
      return res.status(401).json({ error: 'Invalid email or password' });

    const tokenExpiry = getTokenExpiry(user.role.roleName);
    const token = jwt.sign(
      { id: user.id_user, email: user.email, roleId: user.id_role, role: user.role.roleName },
      JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    const userResponse = {
      id:        user.id_user,
      email:     user.email,
      full_name: user.full_name,
      roleId:    user.id_role,
      role:      user.role.roleName,
    };

    userCache.set(CACHE_KEYS.currentUser(user.id_user), userResponse);

    res.json({
      message: 'Login successful',
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
};

const logout = async (req, res) => {
  res.json({ message: 'Logout successful' });
};

const getCurrentUser = async (req, res) => {
  const cacheKey = CACHE_KEYS.currentUser(req.userId);
  const cachedUser = userCache.get(cacheKey);
  if (cachedUser) return res.json(cachedUser);

  try {
    const user = await prisma.user.findFirst({
      where:   { id_user: req.userId, deleted_at: null },
      include: { role: true },
    });

    if (!user)
      return res.status(404).json({ error: 'User not found' });

    const userResponse = {
      id:        user.id_user,
      email:     user.email,
      full_name: user.full_name,
      roleId:    user.id_role,
      role:      user.role.roleName,
    };

    userCache.set(cacheKey, userResponse);
    res.json(userResponse);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};

module.exports = { register, login, logout, getCurrentUser, invalidateUserCache };
