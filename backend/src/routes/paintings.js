const express = require('express');
const multer = require('multer');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo se aceptan imagenes.'));
    cb(null, true);
  }
});

function paintingRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    technique: row.technique,
    dimensions: row.dimensions,
    imageUrl: `/api/paintings/${row.id}/image`,
    isAvailable: row.is_available,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM paintings ORDER BY created_at DESC');
  res.json(result.rows.map(paintingRow));
}));

router.get('/:id/image', asyncHandler(async (req, res) => {
  const result = await query('SELECT image_data, image_mime FROM paintings WHERE id = $1', [req.params.id]);
  const painting = result.rows[0];
  if (!painting) return res.status(404).send('Imagen no encontrada');

  res.setHeader('Content-Type', painting.image_mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(Buffer.from(painting.image_data, 'base64'));
}));

router.post('/', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Sube una imagen de la pintura.' });

  const { title, description, price, technique, dimensions, isAvailable } = req.body;
  if (!title || !description) {
    return res.status(400).json({ message: 'Titulo y descripcion son obligatorios.' });
  }

  const result = await query(
    `INSERT INTO paintings
      (title, description, price, technique, dimensions, image_data, image_mime, is_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      title.trim(),
      description.trim(),
      Number(price || 0),
      String(technique || '').trim(),
      String(dimensions || '').trim(),
      req.file.buffer.toString('base64'),
      req.file.mimetype,
      isAvailable !== 'false'
    ]
  );

  res.status(201).json(paintingRow(result.rows[0]));
}));

router.put('/:id', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
  const current = await query('SELECT * FROM paintings WHERE id = $1', [req.params.id]);
  if (current.rowCount === 0) return res.status(404).json({ message: 'Pintura no encontrada.' });

  const existing = current.rows[0];
  const imageData = req.file ? req.file.buffer.toString('base64') : existing.image_data;
  const imageMime = req.file ? req.file.mimetype : existing.image_mime;

  const result = await query(
    `UPDATE paintings SET
      title = $1,
      description = $2,
      price = $3,
      technique = $4,
      dimensions = $5,
      image_data = $6,
      image_mime = $7,
      is_available = $8,
      updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [
      String(req.body.title || existing.title).trim(),
      String(req.body.description || existing.description).trim(),
      Number(req.body.price || existing.price),
      String(req.body.technique || existing.technique || '').trim(),
      String(req.body.dimensions || existing.dimensions || '').trim(),
      imageData,
      imageMime,
      req.body.isAvailable !== 'false',
      req.params.id
    ]
  );

  res.json(paintingRow(result.rows[0]));
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  await query('DELETE FROM paintings WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

module.exports = router;
