const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Проверяет доступ текущего panelUser (из req.user.userId) к botId из params
 * Если у пользователя allBots=true (или поля нет), доступ разрешен.
 * Иначе проверяется наличие записи в PanelUserBotAccess.
 */
async function checkBotAccess(req, res, next) {
	try {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).json({ error: 'Неавторизовано' });

		const botIdRaw = req.params.botId ?? req.params.id;
		const botId = parseInt(botIdRaw, 10);
		if (isNaN(botId)) return res.status(400).json({ error: 'Некорректный botId' });

		const user = await prisma.panelUser.findUnique({
			where: { id: userId },
			include: { botAccess: { select: { botId: true } } }
		});
		if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

		// Если поле allBots отсутствует (старый клиент) — считаем true
		if (user.allBots !== false) {
			return next();
		}
		const allowed = user.botAccess.some((a) => a.botId === botId);
		if (!allowed) {
			return res.status(403).json({ error: 'Доступ к боту запрещен' });
		}
		return next();
	} catch (e) {
		console.error('[checkBotAccess] error', e);
		return res.status(500).json({ error: 'Ошибка проверки доступа' });
	}
}

module.exports = { checkBotAccess };