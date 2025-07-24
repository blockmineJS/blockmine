import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, Code, Trash2, Loader2, Settings, Info } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { apiHelper } from '@/lib/api';
import PluginDetailInfo from './PluginDetailInfo';

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
    
    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Редактор конфигурации JSON</DialogTitle>
                <DialogDescription>Внесите изменения и сохраните.</DialogDescription>
            </DialogHeader>
            <div className="py-4 relative">
                <Editor
                    height="60vh"
                    language="json"
                    value={jsonString}
                    onChange={(value) => setJsonString(value || '')}
                    theme="vs-dark"
                    options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button onClick={handleSave}><Save className="mr-2"/>Применить</Button>
            </DialogFooter>
        </DialogContent>
    );
}

function SettingField({ settingKey, config, value, onChange }) {
    const id = `${settingKey}-input`;
    const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);

    if (!config || !config.type) {
        return null;
    }

    switch (config.type) {
        case 'string':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    <Input id={id} value={value || ''} onChange={(e) => onChange(settingKey, e.target.value)} />
                    {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
                </div>
            );
        case 'string[]':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    <Textarea id={id} value={Array.isArray(value) ? value.join('\n') : ''} onChange={(e) => onChange(settingKey, e.target.value.split('\n'))} />
                     {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
                </div>
            );
        case 'boolean':
             return (
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <Label htmlFor={id} className="cursor-pointer">{config.label}</Label>
                        {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
                    </div>
                    <Switch id={id} checked={!!value} onCheckedChange={(checked) => onChange(settingKey, checked)} />
                </div>
            );
        case 'number':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    <Input id={id} type="number" value={value ?? ''} onChange={(e) => onChange(settingKey, e.target.value === '' ? null : e.target.valueAsNumber)} />
                    {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
                </div>
            );
        case 'json_file':
            return (
                <div className="space-y-2">
                    <Label>{config.label}</Label>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
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

    const isGrouped = useMemo(() => {
        if (Object.keys(manifestSettings).length === 0) return false;
        const firstSettingValue = Object.values(manifestSettings)[0];
        return firstSettingValue && typeof firstSettingValue === 'object' && !firstSettingValue.type && firstSettingValue.label;
    }, [manifestSettings]);
    
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
        } catch (error) { }
    };
    
    const handleClearData = async () => {
        if (confirm(`Вы уверены, что хотите удалить все данные плагина "${plugin.name}"? Это действие необратимо.`)) {
            setIsClearing(true);
            try {
                await apiHelper(`/api/plugins/${plugin.id}/clear-data`, { method: 'POST' }, 'Данные плагина успешно очищены.');
            } catch (error) { } finally {
                setIsClearing(false);
            }
        }
    };

    const renderSettings = () => {
        if (settings === null) return <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>;
        if (Object.keys(manifestSettings).length === 0) return <p className="text-muted-foreground p-4 text-center">У этого плагина нет настроек.</p>;

        if (isGrouped) {
            return (
                 <Accordion type="multiple" className="w-full space-y-2" defaultValue={Object.keys(manifestSettings)}>
                    {Object.entries(manifestSettings).map(([categoryKey, categoryConfig]) => (
                        <AccordionItem key={categoryKey} value={categoryKey} className="border rounded-lg bg-muted/20 px-4">
                            <AccordionTrigger className="text-base font-semibold hover:no-underline">{categoryConfig.label}</AccordionTrigger>
                            <AccordionContent className="pt-4 border-t space-y-4">
                                {Object.entries(categoryConfig).filter(([key]) => key !== 'label').map(([key, config]) => (
                                     <SettingField
                                        key={key}
                                        settingKey={key}
                                        config={config}
                                        value={settings[key]}
                                        onChange={handleSettingChange}
                                    />
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            );
        }

        return (
            <div className="space-y-4">
                {Object.entries(manifestSettings).map(([key, config]) => (
                    <SettingField
                        key={key}
                        settingKey={key}
                        config={config}
                        value={settings[key]}
                        onChange={handleSettingChange}
                    />
                ))}
            </div>
        );
    };

    return (
        <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
                <DialogTitle>Плагин: {plugin.name}</DialogTitle>
                <DialogDescription>Управление настройками и информацией о плагине</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="settings" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="h-4 w-4" />Настройки</TabsTrigger>
                    <TabsTrigger value="info" className="flex items-center gap-2"><Info className="h-4 w-4" />Информация</TabsTrigger>
                </TabsList>

                <TabsContent value="settings">
                    <div className="max-h-[50vh] overflow-y-auto pr-2 py-4">
                        {renderSettings()}
                    </div>
                    <DialogFooter className="justify-between sm:justify-between pt-4 border-t">
                        <Button variant="destructive" onClick={handleClearData} disabled={isClearing}>
                            {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Очистить данные
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button>
                            <Button onClick={handleSave} disabled={settings === null}>
                                <Save className="mr-2 h-4 w-4" />
                                Сохранить
                            </Button>
                        </div>
                    </DialogFooter>
                </TabsContent>

                <TabsContent value="info" className="max-h-[60vh] overflow-y-auto py-4">
                    <PluginDetailInfo plugin={plugin} botId={bot.id} />
                </TabsContent>
            </Tabs>
        </DialogContent>
    );
}