const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/groups', authorize('panel:role:view'), async (req, res) => {
    const groups = await prisma.group.findMany({ include: { permissions: { include: { permission: true } } } });
    res.json(groups);
});

router.post('/groups', authorize('panel:role:edit'), async (req, res) => {
    const { name, permissionIds } = req.body;
    const newGroup = await prisma.group.create({
        data: {
            name,
            permissions: {
                create: permissionIds.map(id => ({ permissionId: id }))
            }
        }
    });
    res.status(201).json(newGroup);
});



router.put('/groups/:id', authorize('panel:role:edit'), async (req, res) => {
    const groupId = parseInt(req.params.id);
    const { name, permissionIds } = req.body;
    try {
        await prisma.$transaction(async (tx) => {
            await tx.group.update({ where: { id: groupId }, data: { name } });
            await tx.groupPermission.deleteMany({ where: { groupId } });
            if (permissionIds && permissionIds.length > 0) {
                await tx.groupPermission.createMany({
                    data: permissionIds.map(pid => ({ groupId, permissionId: pid })),
                });
            }
        });
        res.status(200).send();
    } catch (error) { res.status(500).json({ error: 'Не удалось обновить группу' }); }
});
router.delete('/groups/:id', authorize('panel:role:edit'), async (req, res) => {
    try {
        await prisma.group.delete({ where: { id: parseInt(req.params.id) } });
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: 'Не удалось удалить группу' }); }
});

router.get('/all', authorize('panel:role:view'), async (req, res) => {
    const permissions = await prisma.permission.findMany({ orderBy: { name: 'asc' } });
    res.json(permissions);
});


router.get('/users/:username', authorize('panel:user:view'), async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { username: req.params.username },
        include: { groups: { include: { group: true } } }
    });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
});

router.post('/users/:username/groups', authorize('panel:user:edit'), async (req, res) => {
    const { groupId } = req.body;
    const user = await prisma.user.upsert({
        where: { username: req.params.username },
        update: {},
        create: { username: req.params.username }
    });
    await prisma.userGroup.create({
        data: { userId: user.id, groupId: parseInt(groupId) }
    });
    res.status(201).send();
});


module.exports = router;