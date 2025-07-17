const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const file = path.resolve(__dirname, '../../../../CHANGELOG.md');
    const data = await fs.promises.readFile(file, 'utf8');
    res.type('text/markdown').send(data);
  } catch (e) {
    res.status(500).json({ error: 'changelog_not_found' });
  }
});

module.exports = router;
