import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const routeTitles = (path) => {
	if (path === '/') return 'Дашборд';
	if (path.startsWith('/bots/')) {
		const parts = path.split('/');
		const id = parts[2];
		if (path.endsWith('/console')) return `Консоль бота ${id}`;
		if (path.endsWith('/plugins')) return `Плагины бота ${id}`;
		if (path.endsWith('/settings')) return `Настройки бота ${id}`;
		if (path.endsWith('/events')) return `События бота ${id}`;
		if (path.endsWith('/management')) return `Управление бота ${id}`;
		return `Страница бота ${id}`;
	}
	return path;
};

function sinceText(ts) {
	const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
	if (diffSec < 60) return `${diffSec} сек назад`;
	const m = Math.floor(diffSec / 60);
	return `${m} мин назад`;
}

export default function PresenceButton() {
	const socket = useAppStore((s) => s.socket);
	const [list, setList] = useState([]);
	const [tick, setTick] = useState(0);
	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		if (!socket) return;
		const handler = (payload) => setList(payload || []);
		socket.on('presence:list', handler);
		return () => socket.off('presence:list', handler);
	}, [socket]);

	useEffect(() => {
		if (!socket) return;
		const interval = setInterval(() => socket.emit('presence:heartbeat'), 20000);
		return () => clearInterval(interval);
	}, [socket]);

	useEffect(() => {
		if (!socket) return;
		const cleanPath = location.pathname;
		socket.emit('presence:update', { path: cleanPath });
	}, [socket, location.pathname]);

	useEffect(() => {
		const interval = setInterval(() => setTick((v) => v + 1), 1000);
		return () => clearInterval(interval);
	}, []);

	const count = list.length;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" className="h-9 px-2">
					<Users className="h-4 w-4 mr-2" /> {count}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 max-w-[90vw] p-2">
				<div className="text-sm font-medium mb-2">Онлайн сейчас</div>
				{count === 0 ? (
					<div className="text-xs text-muted-foreground">Никого нет онлайн.</div>
				) : (
					<ul className="space-y-1 max-h-64 overflow-auto">
						{list.map((u) => (
							<li key={u.userId} className="text-sm flex items-center justify-between">
								<div>
									<div className="font-medium">{u.username}</div>
									<div className="text-xs text-muted-foreground truncate">{routeTitles(u.path)}</div>
									<div className="text-[10px] text-muted-foreground">{sinceText(u.lastSeen)}</div>
								</div>
								<Button size="sm" variant="secondary" onClick={() => navigate(u.path)}>Открыть</Button>
							</li>
						))}
					</ul>
				)}
			</PopoverContent>
		</Popover>
	);
} 