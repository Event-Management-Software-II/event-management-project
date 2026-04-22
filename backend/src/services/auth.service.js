const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET)
  throw new Error('JWT_SECRET is not defined in environment variables');

const userCache = new NodeCache({ stdTTL: 300 });

const CACHE_KEYS = {
  currentUser: (id) => `auth:user:${id}`,
};

const TOKEN_EXPIRY = {
  user: '10m',
  admin: '1h',
  default: '10m',
};

const getTokenExpiry = (roleName) =>
  TOKEN_EXPIRY[roleName?.toLowerCase()] || TOKEN_EXPIRY.default;

const buildUserResponse = (user, roleName) => ({
  id: user.id_user,
  email: user.email,
  full_name: user.full_name,
  roleId: user.id_role,
  role: roleName,
});

const signToken = (user, roleName) =>
  jwt.sign(
    {
      id: user.id_user,
      email: user.email,
      roleId: user.id_role,
      role: roleName,
    },
    JWT_SECRET,
    { expiresIn: getTokenExpiry(roleName) }
  );

const invalidateUserCache = (userId) => {
  if (!userId) return;
  userCache.del(CACHE_KEYS.currentUser(userId));
};

const registerUser = async ({ email, password, full_name }) => {
  const role = await prisma.role.findFirst({ where: { roleName: 'user' } });
  if (!role) throw new Error('DEFAULT_ROLE_NOT_FOUND');

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, full_name, id_role: role.id_role },
    select: { id_user: true, email: true, full_name: true, id_role: true },
  });

  const userResponse = buildUserResponse(user, role.roleName);
  const token = signToken(user, role.roleName);

  userCache.set(CACHE_KEYS.currentUser(user.id_user), userResponse);

  return { token, user: userResponse };
};

const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
    include: { role: true },
  });

  if (!user) throw new Error('INVALID_CREDENTIALS');

  const normalizedHash = user.password.replace(/^\$2y\$/, '$2b$');
  const isPasswordValid = await bcrypt.compare(password, normalizedHash);
  if (!isPasswordValid) throw new Error('INVALID_CREDENTIALS');

  const userResponse = buildUserResponse(user, user.role.roleName);
  const token = signToken(user, user.role.roleName);

  userCache.set(CACHE_KEYS.currentUser(user.id_user), userResponse);

  return { token, user: userResponse };
};

const getUser = async (userId) => {
  const cacheKey = CACHE_KEYS.currentUser(userId);
  const cached = userCache.get(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findFirst({
    where: { id_user: userId, deleted_at: null },
    include: { role: true },
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  const userResponse = buildUserResponse(user, user.role.roleName);
  userCache.set(cacheKey, userResponse);

  return userResponse;
};

module.exports = { registerUser, loginUser, getUser, invalidateUserCache };
