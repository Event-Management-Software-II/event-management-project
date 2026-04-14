const { Prisma } = require('@prisma/client');
const authService = require('./auth.service');

const validateRegisterInput = ({ email, password, full_name }) => {
  if (!email || !password || !full_name)
    return 'Email, password, and full name are required';
  if (password.length < 6)
    return 'Password must be at least 6 characters';
  return null;
};

const validateLoginInput = ({ email, password }) => {
  if (!email || !password)
    return 'Email and password are required';
  return null;
};

const register = async (req, res) => {
  const validationError = validateRegisterInput(req.body);
  if (validationError)
    return res.status(400).json({ error: validationError });

  try {
    const { token, user } = await authService.registerUser(req.body);
    return res.status(201).json({ message: 'User registered successfully', token, user });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'Email already registered' });
    if (err.message === 'DEFAULT_ROLE_NOT_FOUND')
      return res.status(500).json({ error: 'Default user role not found' });

    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

const login = async (req, res) => {
  const validationError = validateLoginInput(req.body);
  if (validationError)
    return res.status(400).json({ error: validationError });

  try {
    const { token, user } = await authService.loginUser(req.body);
    return res.json({ message: 'Login successful', token, user });
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS')
      return res.status(401).json({ error: 'Invalid email or password' });

    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to login' });
  }
};

const logout = (_req, res) => {
  res.json({ message: 'Logout successful' });
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await authService.getUser(req.userId);
    return res.json(user);
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND')
      return res.status(404).json({ error: 'User not found' });

    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Failed to fetch user data' });
  }
};

module.exports = { register, login, logout, getCurrentUser };
