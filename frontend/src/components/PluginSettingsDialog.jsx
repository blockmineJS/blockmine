import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, Code, Trash2, Loader2, Settings, Info, Plus, RefreshCw, Search } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { apiHelper } from '@/lib/api';
import PluginDetailInfo from './PluginDetailInfo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from '@/stores/appStore';
import { shouldShowField } from '@/lib/pluginSettingsUtils';

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

function ProxySettingField({ settingKey, config, value, onChange, readOnly }) {
    const proxies = useAppStore((state) => state.proxies);
    const [isCustom, setIsCustom] = useState(() => {
        return value?.enabled && !value?.proxyId && value?.host;
    });

    const proxyValue = value || { enabled: false };

    const handleSelectChange = (selectValue) => {
        if (readOnly) return;
        if (selectValue === 'none') {
            onChange(settingKey, { enabled: false });
            setIsCustom(false);
        } else if (selectValue === 'custom') {
            onChange(settingKey, { enabled: true, host: '', port: '', type: 'socks5', username: '', password: '' });
            setIsCustom(true);
        } else {
            const selectedProxy = proxies.find(p => p.id.toString() === selectValue);
            if (selectedProxy) {
                onChange(settingKey, {
                    enabled: true,
                    proxyId: selectedProxy.id,
                    host: selectedProxy.host,
                    port: selectedProxy.port,
                    type: selectedProxy.type || 'socks5',
                    username: selectedProxy.username || '',
                    password: selectedProxy.password || ''
                });
            }
            setIsCustom(false);
        }
    };

    const handleFieldChange = (field, fieldValue) => {
        if (readOnly) return;
        onChange(settingKey, { ...proxyValue, [field]: fieldValue });
    };

    const currentSelectValue = !proxyValue.enabled ? 'none' : (isCustom ? 'custom' : (proxyValue.proxyId?.toString() || 'none'));

    return (
        <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
                <Label>{config.label}</Label>
                {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
            </div>

            <Select value={currentSelectValue} onValueChange={handleSelectChange} disabled={readOnly}>
                <SelectTrigger>
                    <SelectValue placeholder="Выберите прокси" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">Без прокси</SelectItem>
                    <SelectItem value="custom">Настроить вручную</SelectItem>
                    {proxies?.map(proxy => (
                        <SelectItem key={proxy.id} value={proxy.id.toString()}>
                            {proxy.name} ({proxy.host}:{proxy.port})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {proxyValue.enabled && isCustom && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                        <Label>Хост</Label>
                        <Input value={proxyValue.host || ''} onChange={(e) => handleFieldChange('host', e.target.value)} placeholder="127.0.0.1" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                        <Label>Порт</Label>
                        <Input type="number" value={proxyValue.port || ''} onChange={(e) => handleFieldChange('port', e.target.value)} placeholder="1080" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                        <Label>Тип</Label>
                        <Select value={proxyValue.type || 'socks5'} onValueChange={(v) => handleFieldChange('type', v)} disabled={readOnly}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="socks5">SOCKS5</SelectItem>
                                <SelectItem value="socks4">SOCKS4</SelectItem>
                                <SelectItem value="http">HTTP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Имя пользователя</Label>
                        <Input value={proxyValue.username || ''} onChange={(e) => handleFieldChange('username', e.target.value)} placeholder="Опционально" disabled={readOnly} />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label>Пароль</Label>
                        <Input type="password" value={proxyValue.password || ''} onChange={(e) => handleFieldChange('password', e.target.value)} placeholder="Опционально" disabled={readOnly} />
                    </div>
                </div>
            )}
        </div>
    );
}

function SettingField({ settingKey, config, value, onChange, readOnly }) {
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
                    <Input id={id} value={value || ''} onChange={(e) => onChange(settingKey, e.target.value)} disabled={readOnly} />
                    {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
                </div>
            );
        case 'string[]':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    <Textarea id={id} value={Array.isArray(value) ? value.join('\n') : ''} onChange={(e) => onChange(settingKey, e.target.value.split('\n'))} disabled={readOnly} />
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
                    <Switch id={id} checked={!!value} onCheckedChange={readOnly ? undefined : ((checked) => onChange(settingKey, checked))} disabled={readOnly} />
                </div>
            );
        case 'number':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    <Input id={id} type="number" value={value ?? ''} onChange={(e) => onChange(settingKey, e.target.value === '' ? null : e.target.valueAsNumber)} disabled={readOnly} />
                    {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
                </div>
            );
        case 'select':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    <Select value={value || config.default || ''} onValueChange={readOnly ? undefined : ((newValue) => onChange(settingKey, newValue))} disabled={readOnly}>
                        <SelectTrigger id={id}>
                            <SelectValue placeholder="Выберите значение" />
                        </SelectTrigger>
                        <SelectContent>
                            {(config.options || []).map((option) => {
                                const optionValue = typeof option === 'string' ? option : option.value;
                                const optionLabel = typeof option === 'string' ? option : option.label;
                                return (
                                    <SelectItem key={optionValue} value={optionValue}>
                                        {optionLabel}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
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
                                <span>
                                <Button variant="outline" disabled={readOnly}><Edit className="mr-2 h-4 w-4" /> Редактировать</Button>
                                </span>
                            </DialogTrigger>
                            {!readOnly && (
                                <JsonEditorDialog 
                                    initialValue={value}
                                    onSave={(newValue) => { onChange(settingKey, newValue); setIsJsonEditorOpen(false); }}
                                    onCancel={() => setIsJsonEditorOpen(false)}
                                />
                            )}
                        </Dialog>
                    </div>
                </div>
            );
        case 'proxy':
            return <ProxySettingField settingKey={settingKey} config={config} value={value} onChange={onChange} readOnly={readOnly} />;
        default:
            return <p className="text-destructive">Неизвестный тип настройки: {config.type}</p>;
    }
}

export default function PluginSettingsDialog({ bot, plugin, onOpenChange, onSaveSuccess, readOnly }) {
    const [settings, setSettings] = useState(null);
    const [isClearing, setIsClearing] = useState(false);
    const { toast } = useToast();
    const manifestSettings = plugin.manifest?.settings || {};

    const [dataItems, setDataItems] = useState(null);
    const [isSavingKey, setIsSavingKey] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDataDialogOpen, setIsDataDialogOpen] = useState(false);
    const [dataFormKey, setDataFormKey] = useState('');
    const [dataFormValue, setDataFormValue] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);

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

    useEffect(() => {
        const fetchDataItems = async () => {
            setDataItems(null);
            try {
                const list = await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/data`);
                setDataItems(list);
            } catch (error) {
                setDataItems([]);
            }
        };
        fetchDataItems();
    }, [bot.id, plugin.id]);

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        try {
            if (readOnly) return;
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
                setDataItems([]);
            } catch (error) { } finally {
                setIsClearing(false);
            }
        }
    };

    const handleDeleteKey = async (key) => {
        if (!confirm(`Удалить ключ "${key}"?`)) return;
        try {
            if (readOnly) return;
            await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/data/${encodeURIComponent(key)}`, { method: 'DELETE' }, 'Запись удалена');
            setDataItems(prev => (prev || []).filter(i => i.key !== key));
        } catch {}
    };

    const openCreateDialog = () => {
        if (readOnly) return;
        setIsEditMode(false);
        setDataFormKey('');
        setDataFormValue('{\n  "foo": "bar"\n}');
        setIsDataDialogOpen(true);
    };

    const openEditDialog = async (item) => {
        if (readOnly) return;
        setIsEditMode(true);
        try {
            const full = await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/data/${encodeURIComponent(item.key)}`);
            setDataFormKey(full.key);
            setDataFormValue(JSON.stringify(full.value, null, 2));
        } catch {
            setDataFormKey(item.key);
            setDataFormValue(JSON.stringify(item.value, null, 2));
        }
        setIsDataDialogOpen(true);
    };

    const handleSaveData = async () => {
        if (readOnly) return;
        if (!dataFormKey) return toast({ variant: 'destructive', title: 'Ошибка', description: 'Ключ не может быть пустым' });
        setIsSavingKey(dataFormKey);
        let parsed;
        try {
            parsed = dataFormValue ? JSON.parse(dataFormValue) : null;
        } catch {
            setIsSavingKey(null);
            return toast({ variant: 'destructive', title: 'Ошибка', description: 'Значение должно быть валидным JSON' });
        }
        try {
            await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/data/${encodeURIComponent(dataFormKey)}`, {
                method: 'PUT',
                body: JSON.stringify({ value: parsed })
            }, 'Запись сохранена');
            const updatedList = await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/data`);
            setDataItems(updatedList);
            setIsDataDialogOpen(false);
        } finally {
            setIsSavingKey(null);
        }
    };

    // Функция для проверки, показывать ли поле (импортирована из utils)
    // shouldShowField теперь принимает settings как третий аргумент

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
                                {Object.entries(categoryConfig)
                                    .filter(([key]) => key !== 'label')
                                    .filter(([key, config]) => shouldShowField(key, config, settings))
                                    .map(([key, config]) => (
                                        <SettingField
                                            key={key}
                                            settingKey={key}
                                            config={config}
                                            value={settings[key]}
                                            onChange={handleSettingChange}
                                            readOnly={readOnly}
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
                {Object.entries(manifestSettings)
                    .filter(([key, config]) => shouldShowField(key, config, settings))
                    .map(([key, config]) => (
                        <SettingField
                            key={key}
                            settingKey={key}
                            config={config}
                            value={settings[key]}
                            onChange={handleSettingChange}
                            readOnly={readOnly}
                        />
                    ))}
            </div>
        );
    };

    const renderData = () => {
        if (dataItems === null) return <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>;
        const filtered = (dataItems || []).filter(i => i.key.toLowerCase().includes(searchTerm.toLowerCase()));
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-8" placeholder="Поиск по ключу" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={async () => setDataItems(await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/data`))}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>
                    <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                    <span>
                    <Button onClick={openCreateDialog} disabled={readOnly}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить запись
                    </Button>
                    </span>
                    </TooltipTrigger>
                    {readOnly && <TooltipContent>Недостаточно прав для добавления записей</TooltipContent>}
                    </Tooltip>
                    </TooltipProvider>
                </div>

                <div className="rounded-lg border overflow-hidden">
                    <div className="grid grid-cols-[1fr,160px,180px] gap-0 bg-muted/40 px-3 py-2 text-xs font-semibold">
                        <div>Ключ</div>
                        <div>Обновлено</div>
                        <div className="text-right pr-1">Действия</div>
                    </div>
                    <div className="max-h-[44vh] overflow-y-auto divide-y">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground">Нет данных</div>
                        ) : filtered.map(item => (
                            <div key={item.key} className="grid grid-cols-[1fr,160px,180px] items-start gap-0 px-3 py-2">
                                <div className="font-mono text-xs break-all pr-3">
                                    {item.key}
                                    <pre className="mt-2 bg-muted/30 rounded p-2 text-[11px] overflow-auto max-h-36">{JSON.stringify(item.value, null, 2)}</pre>
                                </div>
                                <div className="text-[11px] text-muted-foreground pt-1">{new Date(item.updatedAt).toLocaleString()}</div>
                                <div className="flex justify-end gap-2 pt-1">
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild><span>
                                    <Button variant="outline" onClick={() => openEditDialog(item)} disabled={readOnly}>Редактировать</Button>
                                    </span></TooltipTrigger>{readOnly && <TooltipContent>Недостаточно прав</TooltipContent>}</Tooltip></TooltipProvider>
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild><span>
                                    <Button variant="destructive" onClick={() => handleDeleteKey(item.key)} disabled={readOnly}>Удалить</Button>
                                    </span></TooltipTrigger>{readOnly && <TooltipContent>Недостаточно прав</TooltipContent>}</Tooltip></TooltipProvider>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Dialog open={isDataDialogOpen} onOpenChange={setIsDataDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? 'Редактировать запись' : 'Новая запись'}</DialogTitle>
                            <DialogDescription>{isEditMode ? 'Измените JSON значение и сохраните.' : 'Укажите ключ и JSON значение.'}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Label className="w-24">Ключ</Label>
                                <Input value={dataFormKey} onChange={(e) => setDataFormKey(e.target.value)} disabled={isEditMode} placeholder="Например, state" />
                            </div>
                            <div>
                                <Label className="mb-1 block">JSON значение</Label>
                                <Editor
                                    height="50vh"
                                    language="json"
                                    value={dataFormValue}
                                    onChange={(value) => setDataFormValue(value || '')}
                                    theme="vs-dark"
                                    options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDataDialogOpen(false)}>Отмена</Button>
                            <Button onClick={handleSaveData} disabled={!!isSavingKey}>
                                {isSavingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Сохранить
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="h-4 w-4" />Настройки</TabsTrigger>
                    <TabsTrigger value="data" className="flex items-center gap-2"><Code className="h-4 w-4" />Данные</TabsTrigger>
                    <TabsTrigger value="info" className="flex items-center gap-2"><Info className="h-4 w-4" />Информация</TabsTrigger>
                </TabsList>

                <TabsContent value="settings">
                    <div className="max-h-[50vh] overflow-y-auto pr-2 py-4">
                        {renderSettings()}
                    </div>
                    <DialogFooter className="justify-between sm:justify-between pt-4 border-t">
                        <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                        <span>
                        <Button variant="destructive" onClick={handleClearData} disabled={isClearing || readOnly}>
                            {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Очистить данные
                        </Button>
                        </span>
                        </TooltipTrigger>
                        {readOnly && <TooltipContent>Недостаточно прав для изменения данных</TooltipContent>}
                        </Tooltip>
                        </TooltipProvider>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button>
                            <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                            <span>
                            <Button onClick={handleSave} disabled={settings === null || readOnly}>
                                <Save className="mr-2 h-4 w-4" />
                                Сохранить
                            </Button>
                            </span>
                            </TooltipTrigger>
                            {readOnly && <TooltipContent>Недостаточно прав для сохранения настроек</TooltipContent>}
                            </Tooltip>
                            </TooltipProvider>
                        </div>
                    </DialogFooter>
                </TabsContent>

                <TabsContent value="data" className="max-h-[60vh] overflow-y-auto py-4">
                    {renderData()}
                </TabsContent>

                <TabsContent value="info" className="max-h-[60vh] overflow-y-auto py-4">
                    <PluginDetailInfo plugin={plugin} botId={bot.id} />
                </TabsContent>
            </Tabs>
        </DialogContent>
    );
}