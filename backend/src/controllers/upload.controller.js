const { uploadImage } = require('../services/upload.service');
const logger = require('../utils/logger');

const uploadEventImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    const url = await uploadImage(req.file.buffer, 'events');
    logger.info('Event image uploaded', { url, userId: req.userId });
    return res.status(201).json({ ok: true, url });
  } catch (err) {
    if (err.message === 'INVALID_FILE_TYPE') {
      return res
        .status(415)
        .json({ error: 'Tipo de archivo no permitido. Usa JPG, PNG o WebP.' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(413)
        .json({ error: 'El archivo supera el límite de 5 MB.' });
    }
    logger.error('Failed to upload event image', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'Error al subir la imagen.' });
  }
};

module.exports = { uploadEventImage };
