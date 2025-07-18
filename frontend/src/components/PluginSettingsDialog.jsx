import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, Code, Trash2, Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { apiHelper } from '@/lib/api';

function JsonEditorDialog({ initialValue, onSave, onCancel }) {
    const [jsonString, setJsonString] = useState('');
    
    useEffect(() => {
        try {
            const formatted = JSON.stringify(initialValue, null, 2);
            setJsonString(formatted);
        } catch {
            setJsonString(Array.isArray(initialValue) ? '[]' : '{}');
        }
    }, [initialValue]);

    const handleSave = () => {
        try {
            const parsed = JSON.parse(jsonString);
            onSave(parsed);
        } catch (e) {
            alert('Ошибка: Невалидный JSON. Проверьте синтаксис.');
        }
    };
    
    const handleFormatCode = () => {
        try {
            const parsed = JSON.parse(jsonString);
            const formatted = JSON.stringify(parsed, null, 2);
            setJsonString(formatted);
        } catch (e) {
        }
    }

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Редактор конфигурации JSON</DialogTitle>
                <DialogDescription>
                    Внесите изменения и сохраните. Редактор подсветит синтаксические ошибки.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 relative">
                <Editor
                    height="60vh"
                    language="json"
                    value={jsonString}
                    onChange={(value) => setJsonString(value || '')}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        automaticLayout: true,
                    }}
                />
            </div>
            <DialogFooter className="justify-between sm:justify-between">
                <Button variant="outline" onClick={handleFormatCode}><Code className="mr-2"/>Форматировать</Button>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                    <Button onClick={handleSave}><Save className="mr-2"/>Применить и сохранить</Button>
                </div>
            </DialogFooter>
        </DialogContent>
    );
}

function SettingField({ settingKey, config, value, onChange }) {
    const id = `${settingKey}-input`;
    const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);

    switch (config.type) {
        case 'string':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    <Input id={id} value={value || ''} onChange={(e) => onChange(settingKey, e.target.value)} />
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
            );
        case 'string[]':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    <Textarea id={id} value={Array.isArray(value) ? value.join('\n') : ''} onChange={(e) => onChange(settingKey, e.target.value.split('\n'))} />
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
            );
        case 'boolean':
             return (
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <Label htmlFor={id} className="cursor-pointer">{config.label}</Label>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                    <Switch id={id} checked={!!value} onCheckedChange={(checked) => onChange(settingKey, checked)} />
                </div>
            );
        case 'number':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    <Input id={id} type="number" value={value ?? ''} onChange={(e) => onChange(settingKey, e.target.value === '' ? null : e.target.valueAsNumber)} />
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
            );
        case 'json':
        case 'json_file':
            return (
                <div className="space-y-2">
                    <Label>{config.label}</Label>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                        <Dialog open={isJsonEditorOpen} onOpenChange={setIsJsonEditorOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Редактировать</Button>
                            </DialogTrigger>
                            <JsonEditorDialog 
                                initialValue={value}
                                onSave={(newValue) => { onChange(settingKey, newValue); setIsJsonEditorOpen(false); }}
                                onCancel={() => setIsJsonEditorOpen(false)}
                            />
                        </Dialog>
                    </div>
                </div>
            );
        default:
            return <p className="text-destructive">Неизвестный тип настройки: {config.type}</p>;
    }
}


export default function PluginSettingsDialog({ bot, plugin, onOpenChange, onSaveSuccess }) {
    const [settings, setSettings] = useState(null);
    const [isClearing, setIsClearing] = useState(false);
    const { toast } = useToast();
    const manifestSettings = plugin.manifest?.settings || {};

    useEffect(() => {
        const fetchSettings = async () => {
            setSettings(null);
            try {
                const data = await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/settings`);
                setSettings(data);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
                setSettings({});
            }
        };
        fetchSettings();
    }, [bot.id, plugin.id, toast]);

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        try {
            await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}`, {
                method: 'PUT',
                body: JSON.stringify({ settings }),
            }, 'Настройки плагина сохранены.');
            
            onSaveSuccess();
            onOpenChange(false);
        } catch (error) {
        }
    };

    const handleClearData = async () => {
        if (confirm(`Вы уверены, что хотите удалить все данные плагина "${plugin.name}"? Это действие необратимо.`)) {
            setIsClearing(true);
            try {
                await apiHelper(`/api/plugins/${plugin.id}/clear-data`, { method: 'POST' }, 'Данные плагина успешно очищены.');
            } catch (error) {
            } finally {
                setIsClearing(false);
            }
        }
    };

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Настройки плагина: {plugin.name}</DialogTitle>
                <DialogDescription>Изменения вступят в силу после перезапуска бота.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {settings === null ? <p>Загрузка настроек...</p> : (
                    Object.keys(manifestSettings).length > 0 ? (
                        Object.entries(manifestSettings).map(([key, config]) => (
                            <SettingField
                                key={key}
                                settingKey={key}
                                config={config}
                                value={settings[key]}
                                onChange={handleSettingChange}
                            />
                        ))
                    ) : (
                        <p>У этого плагина нет настраиваемых параметров.</p>
                    )
                )}
            </div>
            <DialogFooter className="sm:justify-between">
                <Button 
                    variant="destructive"
                    onClick={handleClearData}
                    disabled={isClearing}
                >
                    {isClearing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Очистить данные
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button>
                    <Button onClick={handleSave}>Сохранить</Button>
                </div>
            </DialogFooter>
        </DialogContent>
    );
}