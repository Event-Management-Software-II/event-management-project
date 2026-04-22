const { Router } = require('express');
const { getUsers } = require('../controllers/users.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', authenticateAdmin, getUsers);

module.exports = router;
