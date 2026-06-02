const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Sube un buffer de imagen a Cloudinary.
 * @param {Buffer} buffer  - Bytes del archivo recibido por multer
 * @param {string} folder  - Carpeta lógica dentro de Cloudinary (ej. 'events')
 * @returns {Promise<string>} URL pública segura (https)
 */
const uploadImage = (buffer, folder = 'events') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Transforma la imagen a WebP y limita su ancho máximo a 1200px
        transformation: [{ width: 1200, crop: 'limit', fetch_format: 'webp' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Elimina una imagen de Cloudinary a partir de su URL pública.
 * Si la URL no pertenece a Cloudinary, simplemente no hace nada.
 * @param {string} imageUrl
 */
const deleteImage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;

  // Extrae el public_id de la URL (todo lo que está entre /upload/ y la extensión)
  const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  if (!match) return;

  const publicId = match[1];
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // No es crítico si falla la eliminación; solo se loguea
    console.error(
      '[uploadService] Error al eliminar imagen en Cloudinary:',
      err
    );
  }
};

module.exports = { uploadImage, deleteImage };
