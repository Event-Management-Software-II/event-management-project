const userService = require('../services/users.service');
const logger = require('../utils/logger');

const getUsers = async (req, res) => {
  try {
    const data = await userService.getUsers();
    res.json(data);
  } catch (err) {
    logger.error('Failed to fetch users', {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

module.exports = { getUsers };
