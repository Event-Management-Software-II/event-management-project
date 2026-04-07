const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined in environment variables');

const register = async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name)
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const role = await prisma.role.findFirst({ where: { name: 'user' } });
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

    const token = jwt.sign(
      { id: user.id_user, email: user.email, roleId: user.id_role, role: role.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id:        user.id_user,
        email:     user.email,
        full_name: user.full_name,
        roleId:    user.id_role,
        role:      role.name,
      },
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

    // Compatibilidad con hashes $2y$ generados por PHP/Laravel
    const normalizedHash = user.password.replace(/^\$2y\$/, '$2b$');
    const isPasswordValid = await bcrypt.compare(password, normalizedHash);
    if (!isPasswordValid)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id_user, email: user.email, roleId: user.id_role, role: user.role.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id:        user.id_user,
        email:     user.email,
        full_name: user.full_name,
        roleId:    user.id_role,
        role:      user.role.name,
      },
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
  try {
    const user = await prisma.user.findFirst({
      where:   { id_user: req.userId, deleted_at: null },
      include: { role: true },
    });

    if (!user)
      return res.status(404).json({ error: 'User not found' });

    res.json({
      id:        user.id_user,
      email:     user.email,
      full_name: user.full_name,
      roleId:    user.id_role,
      role:      user.role.name,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};

module.exports = { register, login, logout, getCurrentUser };