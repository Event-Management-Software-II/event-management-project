const prisma = require('../prisma/prisma');

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { deleted_at: null },
      include: { role: true },
      orderBy: { created_at: 'desc' },
    });

    const data = users.map(u => ({
      id:         u.id_user,
      name:       u.fullName,
      email:      u.email,
      role:       u.role.nameRole,
      created_at: u.created_at,
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

module.exports = { getUsers };