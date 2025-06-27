const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const bots = await prisma.bot.findMany({
      where: {
        OR: [
          { username: { contains: query } },
          { 
            AND: [
              { note: { not: null } },
              { note: { contains: query } }
            ]
          },
        ],
      },
    });

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
        },
      },
    });

    const plugins = await prisma.installedPlugin.findMany({
      where: {
        name: {
          contains: query,
        },
      },
    });

    res.json({
      bots,
      users,
      plugins,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;