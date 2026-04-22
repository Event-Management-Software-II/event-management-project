const userService = require('../services/users.service');

const getUsers = async (req, res) => {
  try {
    const data = await userService.getUsers();
    res.json(data);
  } catch (err) {
    console.error('Error in getUsers:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

module.exports = { getUsers };
