import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from '@/stores/appStore';

const ACTIONS = [
    { value: 'START_BOT', label: 'Запустить бота' },
    { value: 'STOP_BOT', label: 'Остановить бота' },
    { value: 'RESTART_BOT', label: 'Перезапустить бота' },
    { value: 'SEND_COMMAND', label: 'Отправить команду' },
];

const generateCron = (simpleConfig) => {
    const { intervalType, intervalValue, time } = simpleConfig;
    const [hour, minute] = time.split(':').map(Number);

    if (intervalType === 'minutes') {
        const minutePattern = intervalValue === 1 ? '*' : `*/${intervalValue}`;
        if (intervalValue > 0 && intervalValue < 60) return `${minutePattern} * * * *`;
        return '* * * * *';
    }
    if (intervalType === 'hours') {
        const hourPattern = intervalValue === 1 ? '*' : `*/${intervalValue}`;
        if (intervalValue > 0 && intervalValue < 24) return `${minute} ${hourPattern} * * *`;
        return `${minute} * * * *`;
    }
    if (intervalType === 'days') {
        const dayPattern = intervalValue === 1 ? '*' : `*/${intervalValue}`;
        if (intervalValue > 0 && intervalValue < 32) return `${minute} ${hour} ${dayPattern} * *`;
        return `${minute} ${hour} * * *`;
    }
    return '* * * * *';
};

export default function TaskForm({ task, onSubmit, onCancel, isSaving }) {
    const bots = useAppStore(state => state.bots);

    const [name, setName] = useState('');
    const [action, setAction] = useState('');
    const [targetBotIds, setTargetBotIds] = useState([]);
    const [command, setCommand] = useState('');
    const [open, setOpen] = useState(false);
    
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);
    const [cronPattern, setCronPattern] = useState('* * * * *');
    const [simpleConfig, setSimpleConfig] = useState({
        intervalType: 'days',
        intervalValue: 1,
        time: '12:00',
    });

    useEffect(() => {
        if (!isAdvancedMode) {
            setCronPattern(generateCron(simpleConfig));
        }
    }, [simpleConfig, isAdvancedMode]);

    useEffect(() => {
        if (task) {
            setName(task.name);
            setAction(task.action);
            setTargetBotIds(JSON.parse(task.targetBotIds || '[]'));
            setCommand(JSON.parse(task.payload || '{}').command || '');
            setCronPattern(task.cronPattern);
            setIsAdvancedMode(true); 
        } else {
            setName('');
            setAction('SEND_COMMAND');
            setTargetBotIds([]);
            setCommand('');
            setIsAdvancedMode(false);
            const initialSimpleConfig = { intervalType: 'days', intervalValue: 1, time: '12:00' };
            setSimpleConfig(initialSimpleConfig);
            setCronPattern(generateCron(initialSimpleConfig));
        }
    }, [task]);

    const handleSimpleConfigChange = (key, value) => {
        setSimpleConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = action === 'SEND_COMMAND' ? { command } : {};
        onSubmit({
            name,
            cronPattern,
            action,
            targetBotIds: JSON.stringify(targetBotIds),
            payload: JSON.stringify(payload),
        });
    };

    const botOptions = [{ id: 'ALL', username: 'Все боты' }, ...bots];

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{task ? 'Редактировать задачу' : 'Создать новую задачу'}</DialogTitle>
                <DialogDescription>Задачи выполняются по расписанию для выбранных ботов.</DialogDescription>
            </DialogHeader>
            <form id="task-form" onSubmit={handleSubmit} className="space-y-6 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Название задачи</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                
                <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                        <Label>Расписание</Label>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="advanced-mode" className="text-sm">Продвинутый режим</Label>
                            <Switch id="advanced-mode" checked={isAdvancedMode} onCheckedChange={setIsAdvancedMode} />
                        </div>
                    </div>

                    {isAdvancedMode ? (
                        <div>
                            <Input value={cronPattern} onChange={e => setCronPattern(e.target.value)} placeholder="* * * * *" required />
                             <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline mt-1 inline-block">
                                Помощь по cron-паттернам
                            </a>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 items-end">
                             <div className="space-y-1">
                                <Label>Повторять каждые</Label>
                                <Input type="number" min="1" value={simpleConfig.intervalValue} onChange={e => handleSimpleConfigChange('intervalValue', parseInt(e.target.value) || 1)} />
                            </div>
                            <div className="space-y-1">
                                <Label> </Label>
                                <Select value={simpleConfig.intervalType} onValueChange={val => handleSimpleConfigChange('intervalType', val)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="minutes">Минут</SelectItem>
                                        <SelectItem value="hours">Часов</SelectItem>
                                        <SelectItem value="days">Дней</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Время запуска</Label>
                                <Input type="time" value={simpleConfig.time} onChange={e => handleSimpleConfigChange('time', e.target.value)} disabled={simpleConfig.intervalType === 'minutes'} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Действие</Label>
                        <Select value={action} onValueChange={setAction} required>
                            <SelectTrigger><SelectValue placeholder="Выберите действие" /></SelectTrigger>
                            <SelectContent>
                                {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Целевые боты</Label>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                                    {targetBotIds.length > 0 ? `${targetBotIds.length} выбрано` : "Выберите ботов..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Поиск ботов..." />
                                    <CommandList>
                                        <CommandEmpty>Боты не найдены.</CommandEmpty>
                                        <CommandGroup>
                                            {botOptions.map(bot => (
                                                <CommandItem
                                                    key={bot.id}
                                                    value={bot.username}
                                                    onSelect={() => {
                                                        const isSelected = targetBotIds.includes(bot.id);
                                                        if (bot.id === 'ALL') {
                                                            setTargetBotIds(isSelected ? [] : ['ALL']);
                                                        } else {
                                                            let newSelection = isSelected 
                                                                ? targetBotIds.filter(id => id !== bot.id)
                                                                : [...targetBotIds, bot.id];
                                                            newSelection = newSelection.filter(id => id !== 'ALL');
                                                            setTargetBotIds(newSelection);
                                                        }
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", targetBotIds.includes(bot.id) ? "opacity-100" : "opacity-0")} />
                                                    {bot.username}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                {action === 'SEND_COMMAND' && (
                    <div className="space-y-2">
                        <Label htmlFor="command">Команда для отправки</Label>
                        <Input id="command" value={command} onChange={e => setCommand(e.target.value)} placeholder="Привет, мир!" required />
                    </div>
                )}
            </form>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button type="submit" form="task-form" disabled={isSaving}>
                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}