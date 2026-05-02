const { Router } = require('express');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const { uploadEventImage } = require('../controllers/upload.controller');

const router = Router();

// Multer valida tipo y tamaño antes de que llegue al controlador.
// "image" es el nombre del campo en el FormData del frontend.
router.post(
  '/event-image',
  authenticateAdmin,
  upload.single('image'),
  uploadEventImage
);

module.exports = router;