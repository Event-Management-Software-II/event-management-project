const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined in environment variables');

// POST /api/auth/register
const register = async (req, res) => {
  const { email, password, fullName } = req.body;

  // Validations
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Get default 'user' role
    const roleResult = await pool.query(`SELECT "id_role" FROM "Role" WHERE "nameRole" = 'user'`);
    if (roleResult.rowCount === 0) {
      return res.status(500).json({ error: 'Default user role not found' });
    }

    const roleId = roleResult.rows[0].id_role;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO "User" ("email", "password", "fullName", "id_role")
       VALUES ($1, $2, $3, $4)
       RETURNING "id_user", "email", "fullName", "id_role"`,
      [email, hashedPassword, fullName, roleId]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id_user, email: user.email, roleId: user.id_role, role: roleResult.rows[0].nameRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id_user,
        email: user.email,
        fullName: user.fullName,
        roleId: user.id_role,
        role: roleResult.rows[0].nameRole
      }
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  // Validations
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user
    const result = await pool.query(
      `SELECT u."id_user", u."email", u."password", u."fullName", u."id_role", r."nameRole"
       FROM "User" u
       JOIN "Role" r ON u."id_role" = r."id_role"
       WHERE u."email" = $1 AND u."deleted_at" IS NULL`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const normalizedHash = user.password.replace(/^\$2y\$/, '$2b$');
    const isPasswordValid = await bcrypt.compare(password, normalizedHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id_user, email: user.email, roleId: user.id_role, role: user.nameRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id_user,
        email: user.email,
        fullName: user.fullName,
        roleId: user.id_role,
        role: user.nameRole
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// POST /api/auth/logout (optional - mainly used on frontend)
const logout = async (req, res) => {
  res.json({ message: 'Logout successful' });
};

// GET /api/auth/me - Get current user info
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      `SELECT u."id_user", u."email", u."fullName", u."id_role", r."nameRole"
       FROM "User" u
       JOIN "Role" r ON u."id_role" = r."id_role"
       WHERE u."id_user" = $1 AND u."deleted_at" IS NULL`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id_user,
      email: user.email,
      fullName: user.fullName,
      roleId: user.id_role,
      role: user.nameRole
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};

module.exports = { register, login, logout, getCurrentUser };
