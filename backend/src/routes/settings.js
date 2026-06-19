const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await query('SELECT key, value FROM site_settings');
  const settings = result.rows.reduce((all, row) => {
    all[row.key] = row.value;
    return all;
  }, {});
  res.json(settings);
}));

router.put('/', requireAuth, asyncHandler(async (req, res) => {
  const allowed = ['whatsapp_phone', 'artist_name'];
  const updates = Object.entries(req.body).filter(([key]) => allowed.includes(key));

  for (const [key, value] of updates) {
    await query(
      'INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, String(value || '')]
    );
  }

  res.json({ ok: true });
}));

module.exports = router;
