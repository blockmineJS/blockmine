import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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


const generateCron = (simpleConfig) => {
    const { intervalType, intervalValue, time } = simpleConfig;
    const [hour, minute] = time.split(':').map(Number);

    if (intervalType === 'minutes') {
        if (intervalValue === 1) return '* * * * *';
        if (intervalValue === 60) return `${minute} * * * *`; // каждые 60 минут = каждый час
        if (intervalValue > 0 && intervalValue < 60) return `*/${intervalValue} * * * *`;
        return '* * * * *';
    }
    if (intervalType === 'hours') {
        if (intervalValue === 1) return `${minute} * * * *`;
        if (intervalValue > 0 && intervalValue < 24) return `${minute} */${intervalValue} * * *`;
        return `${minute} * * * *`;
    }
    if (intervalType === 'days') {
        if (intervalValue === 1) return `${minute} ${hour} * * *`;
        if (intervalValue > 0 && intervalValue < 32) return `${minute} ${hour} */${intervalValue} * *`;
        return `${minute} ${hour} * * *`;
    }
    return '* * * * *';
};

export default function TaskForm({ task, onSubmit, onCancel, isSaving }) {
    const { t } = useTranslation('tasks');
    const bots = useAppStore(state => state.bots);

    const ALL_ACTIONS = [
        { value: 'START_BOT', label: t('actions.startBot') },
        { value: 'STOP_BOT', label: t('actions.stopBot') },
        { value: 'RESTART_BOT', label: t('actions.restartBot') },
        { value: 'SEND_COMMAND', label: t('actions.sendCommand') },
    ];

    const STARTUP_ACTIONS = [
        { value: 'START_BOT', label: t('actions.startBot') },
    ];

    const [name, setName] = useState('');
    const [action, setAction] = useState('');
    const [targetBotIds, setTargetBotIds] = useState([]);
    const [command, setCommand] = useState('');
    const [open, setOpen] = useState(false);
    const [runOnStartup, setRunOnStartup] = useState(false);
    
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
        if (runOnStartup) {
            setAction('START_BOT');
        }
    }, [runOnStartup]);

    useEffect(() => {
        if (task) {
            setName(task.name);
            setAction(task.action);
            setTargetBotIds(JSON.parse(task.targetBotIds || '[]'));
            setCommand(JSON.parse(task.payload || '{}').command || '');
            setCronPattern(task.cronPattern);
            setRunOnStartup(task.runOnStartup || false);
            setIsAdvancedMode(!!task.cronPattern); 
        } else {
            setName('');
            setAction('SEND_COMMAND');
            setTargetBotIds([]);
            setCommand('');
            setRunOnStartup(false);
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
            cronPattern: runOnStartup ? null : cronPattern,
            action,
            targetBotIds: JSON.stringify(targetBotIds),
            payload: JSON.stringify(payload),
            runOnStartup,
        });
    };

    const botOptions = [{ id: 'ALL', username: t('form.allBots') }, ...bots];
    const availableActions = runOnStartup ? STARTUP_ACTIONS : ALL_ACTIONS;

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{task ? t('form.titleEdit') : t('form.titleCreate')}</DialogTitle>
                <DialogDescription>
                    {runOnStartup
                        ? t('form.descriptionStartup')
                        : t('form.descriptionSchedule')
                    }
                </DialogDescription>
            </DialogHeader>
            <form id="task-form" onSubmit={handleSubmit} className="space-y-6 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">{t('form.taskName')}</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                
                <div className="flex items-center space-x-2 rounded-lg border p-3 shadow-sm">
                    <Switch
                        id="runOnStartup"
                        checked={runOnStartup}
                        onCheckedChange={setRunOnStartup}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="runOnStartup">
                            {t('form.runOnStartup')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {t('form.runOnStartupDescription')}
                        </p>
                    </div>
                </div>
                
                {!runOnStartup && (
                    <div className="space-y-3 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <Label>{t('form.schedule')}</Label>
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="advanced-mode" className="text-sm">{t('form.advancedMode')}</Label>
                                <Switch id="advanced-mode" checked={isAdvancedMode} onCheckedChange={setIsAdvancedMode} />
                            </div>
                        </div>

                        {isAdvancedMode ? (
                            <div>
                                <Input value={cronPattern} onChange={e => setCronPattern(e.target.value)} placeholder="* * * * *" required />
                                <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline mt-1 inline-block">
                                    {t('form.cronHelp')}
                                </a>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2 items-end">
                                <div className="space-y-1">
                                    <Label>{t('form.repeatEvery')}</Label>
                                    <Input type="number" min="1" value={simpleConfig.intervalValue} onChange={e => handleSimpleConfigChange('intervalValue', parseInt(e.target.value) || 1)} />
                                </div>
                                <div className="space-y-1">
                                    <Label> </Label>
                                    <Select value={simpleConfig.intervalType} onValueChange={val => handleSimpleConfigChange('intervalType', val)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="minutes">{t('form.minutes')}</SelectItem>
                                            <SelectItem value="hours">{t('form.hours')}</SelectItem>
                                            <SelectItem value="days">{t('form.days')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('form.startTime')}</Label>
                                    <Input type="time" value={simpleConfig.time} onChange={e => handleSimpleConfigChange('time', e.target.value)} disabled={simpleConfig.intervalType === 'minutes'} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('form.action')}</Label>
                        <Select value={action} onValueChange={setAction} required disabled={runOnStartup}>
                            <SelectTrigger><SelectValue placeholder={t('form.selectAction')} /></SelectTrigger>
                            <SelectContent>
                                {availableActions.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('form.targetBots')}</Label>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                                    {targetBotIds.length > 0 ? t('form.selectedCount', { count: targetBotIds.length }) : t('form.selectBots')}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder={t('form.searchBots')} />
                                    <CommandList>
                                        <CommandEmpty>{t('form.noBotsFound')}</CommandEmpty>
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
                        <Label htmlFor="command">{t('form.commandToSend')}</Label>
                        <Input id="command" value={command} onChange={e => setCommand(e.target.value)} placeholder={t('form.commandPlaceholder')} required />
                    </div>
                )}
            </form>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>{t('form.cancel')}</Button>
                <Button type="submit" form="task-form" disabled={isSaving}>
                    {isSaving ? t('form.saving') : t('form.save')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}