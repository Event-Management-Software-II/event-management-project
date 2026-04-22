const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const userCache = new NodeCache({ stdTTL: 300 });
const CACHE_KEYS = {
  admin: 'users:admin',
};

const invalidateUserCache = () => userCache.del(CACHE_KEYS.admin);

const getUsers = async () => {
  const cached = userCache.get(CACHE_KEYS.admin);
  if (cached) return cached;

  const users = await prisma.user.findMany({
    where: { deleted_at: null },
    include: { role: true },
    orderBy: { created_at: 'desc' },
  });

  const data = users.map((u) => ({
    id: u.id_user,
    name: u.full_name,
    email: u.email,
    role: u.role.roleName,
    created_at: u.created_at,
  }));

  userCache.set(CACHE_KEYS.admin, data);
  return data;
};

module.exports = { getUsers, invalidateUserCache };
