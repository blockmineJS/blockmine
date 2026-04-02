import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Editor from '@monaco-editor/react';
import { Code, Edit, Info, Loader2, Plus, RefreshCw, Save, Search, Settings, Trash2 } from 'lucide-react';
import { apiHelper } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';
import { shouldShowField } from '@/lib/pluginSettingsUtils';
import PluginDetailInfo from './PluginDetailInfo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function JsonEditorDialog({ initialValue, onSave, onCancel }) {
    const { t } = useTranslation('plugins');
    const [jsonString, setJsonString] = useState('');

    useEffect(() => {
        try {
            setJsonString(JSON.stringify(initialValue, null, 2));
        } catch {
            setJsonString(Array.isArray(initialValue) ? '[]' : '{}');
        }
    }, [initialValue]);

    const handleSave = () => {
        try {
            onSave(JSON.parse(jsonString));
        } catch {
            alert(t('settingsDialog.jsonEditor.invalidJson'));
        }
    };

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>{t('settingsDialog.jsonEditor.title')}</DialogTitle>
                <DialogDescription>{t('settingsDialog.jsonEditor.description')}</DialogDescription>
            </DialogHeader>
            <div className="relative py-4">
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
                <Button variant="ghost" onClick={onCancel}>{t('actions.cancel')}</Button>
                <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    {t('settingsDialog.jsonEditor.apply')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function ProxySettingField({ settingKey, config, value, onChange, readOnly }) {
    const { t } = useTranslation('plugins');
    const proxies = useAppStore((state) => state.proxies);
    const [isCustom, setIsCustom] = useState(() => value?.enabled && !value?.proxyId && value?.host);
    const proxyValue = value || { enabled: false };
    const currentSelectValue = !proxyValue.enabled ? 'none' : (isCustom ? 'custom' : (proxyValue.proxyId?.toString() || 'none'));

    const handleSelectChange = (selectValue) => {
        if (readOnly) return;
        if (selectValue === 'none') {
            onChange(settingKey, { enabled: false });
            setIsCustom(false);
            return;
        }
        if (selectValue === 'custom') {
            onChange(settingKey, { enabled: true, host: '', port: '', type: 'socks5', username: '', password: '' });
            setIsCustom(true);
            return;
        }
        const selectedProxy = proxies.find((proxy) => proxy.id.toString() === selectValue);
        if (selectedProxy) {
            onChange(settingKey, {
                enabled: true,
                proxyId: selectedProxy.id,
                host: selectedProxy.host,
                port: selectedProxy.port,
                type: selectedProxy.type || 'socks5',
                username: selectedProxy.username || '',
                password: selectedProxy.password || '',
            });
        }
        setIsCustom(false);
    };

    const handleFieldChange = (field, fieldValue) => {
        if (readOnly) return;
        onChange(settingKey, { ...proxyValue, [field]: fieldValue });
    };

    return (
        <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
                <Label>{config.label}</Label>
                {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
            </div>

            <Select value={currentSelectValue} onValueChange={handleSelectChange} disabled={readOnly}>
                <SelectTrigger>
                    <SelectValue placeholder={t('settingsDialog.proxy.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">{t('settingsDialog.proxy.none')}</SelectItem>
                    <SelectItem value="custom">{t('settingsDialog.proxy.custom')}</SelectItem>
                    {proxies?.map((proxy) => (
                        <SelectItem key={proxy.id} value={proxy.id.toString()}>
                            {proxy.name} ({proxy.host}:{proxy.port})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {proxyValue.enabled && isCustom && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                        <Label>{t('settingsDialog.proxy.host')}</Label>
                        <Input value={proxyValue.host || ''} onChange={(e) => handleFieldChange('host', e.target.value)} placeholder="127.0.0.1" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('settingsDialog.proxy.port')}</Label>
                        <Input type="number" value={proxyValue.port || ''} onChange={(e) => handleFieldChange('port', e.target.value)} placeholder="1080" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('settingsDialog.proxy.type')}</Label>
                        <Select value={proxyValue.type || 'socks5'} onValueChange={(newValue) => handleFieldChange('type', newValue)} disabled={readOnly}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="socks5">SOCKS5</SelectItem>
                                <SelectItem value="socks4">SOCKS4</SelectItem>
                                <SelectItem value="http">HTTP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('settingsDialog.proxy.username')}</Label>
                        <Input value={proxyValue.username || ''} onChange={(e) => handleFieldChange('username', e.target.value)} placeholder={t('settingsDialog.proxy.optional')} disabled={readOnly} />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label>{t('settingsDialog.proxy.password')}</Label>
                        <PasswordInput value={proxyValue.password || ''} onChange={(e) => handleFieldChange('password', e.target.value)} placeholder={t('settingsDialog.proxy.optional')} disabled={readOnly} />
                    </div>
                </div>
            )}
        </div>
    );
}

function SettingField({ settingKey, config, value, onChange, readOnly }) {
    const { t } = useTranslation('plugins');
    const id = `${settingKey}-input`;
    const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);

    if (!config?.type) return null;

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
                    <Textarea
                        id={id}
                        value={Array.isArray(value) ? value.join('\n') : ''}
                        onChange={(e) => onChange(settingKey, e.target.value === '' ? [] : e.target.value.split(/\r?\n/))}
                        disabled={readOnly}
                    />
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
                    <Select value={value ?? config.default ?? ''} onValueChange={readOnly ? undefined : ((newValue) => onChange(settingKey, newValue))} disabled={readOnly}>
                        <SelectTrigger id={id}>
                            <SelectValue placeholder={t('settingsDialog.selectPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            {(config.options || []).map((option) => {
                                const optionValue = typeof option === 'string' ? option : option.value;
                                const optionLabel = typeof option === 'string' ? option : option.label;
                                return <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>;
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
                                    <Button variant="outline" disabled={readOnly}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        {t('actions.edit')}
                                    </Button>
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
            return <p className="text-destructive">{t('settingsDialog.unknownSettingType', { type: config.type })}</p>;
    }
}

export default function PluginSettingsDialog({ bot, plugin, onOpenChange, onSaveSuccess, readOnly }) {
    const { t } = useTranslation('plugins');
    const { toast } = useToast();
    const manifestSettings = plugin.manifest?.settings || {};
    const [settings, setSettings] = useState(null);
    const [isClearing, setIsClearing] = useState(false);
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
                setSettings(await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/settings`));
            } catch (error) {
                toast({ variant: 'destructive', title: t('ui.error'), description: error.message || t('settingsDialog.loadError') });
                setSettings({});
            }
        };
        fetchSettings();
    }, [bot.id, plugin.id, t, toast]);

    useEffect(() => {
        const fetchDataItems = async () => {
            setDataItems(null);
            try {
                setDataItems(await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/data`));
            } catch {
                setDataItems([]);
            }
        };
        fetchDataItems();
    }, [bot.id, plugin.id]);

    const handleSettingChange = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        if (readOnly) return;
        try {
            await apiHelper(
                `/api/bots/${bot.id}/plugins/${plugin.id}`,
                { method: 'PUT', body: JSON.stringify({ settings }) },
                t('settingsDialog.toasts.savedSettings'),
            );
            onSaveSuccess();
            onOpenChange(false);
        } catch {
        }
    };

    const handleClearData = async () => {
        if (!confirm(t('settingsDialog.confirmClearData', { name: plugin.name }))) return;
        setIsClearing(true);
        try {
            await apiHelper(`/api/plugins/${plugin.id}/clear-data`, { method: 'POST' }, t('settingsDialog.toasts.clearedData'));
            setDataItems([]);
        } catch {
        } finally {
            setIsClearing(false);
        }
    };

    const handleDeleteKey = async (key) => {
        if (!confirm(t('settingsDialog.confirmDeleteKey', { key }))) return;
        if (readOnly) return;
        try {
            await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/data/${encodeURIComponent(key)}`, { method: 'DELETE' }, t('settingsDialog.toasts.entryDeleted'));
            setDataItems((prev) => (prev || []).filter((item) => item.key !== key));
        } catch {
        }
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
        if (!dataFormKey) {
            toast({ variant: 'destructive', title: t('ui.error'), description: t('settingsDialog.validation.emptyKey') });
            return;
        }
        setIsSavingKey(dataFormKey);
        let parsed;
        try {
            parsed = dataFormValue ? JSON.parse(dataFormValue) : null;
        } catch {
            setIsSavingKey(null);
            toast({ variant: 'destructive', title: t('ui.error'), description: t('settingsDialog.validation.invalidJsonValue') });
            return;
        }
        try {
            await apiHelper(
                `/api/bots/${bot.id}/plugins/${plugin.id}/data/${encodeURIComponent(dataFormKey)}`,
                { method: 'PUT', body: JSON.stringify({ value: parsed }) },
                t('settingsDialog.toasts.entrySaved'),
            );
            setDataItems(await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/data`));
            setIsDataDialogOpen(false);
        } finally {
            setIsSavingKey(null);
        }
    };

    const renderSettings = () => {
        if (settings === null) {
            return <div className="p-4 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
        }
        if (Object.keys(manifestSettings).length === 0) {
            return <p className="p-4 text-center text-muted-foreground">{t('settingsDialog.emptySettings')}</p>;
        }
        if (isGrouped) {
            return (
                <Accordion type="multiple" className="w-full space-y-2" defaultValue={Object.keys(manifestSettings)}>
                    {Object.entries(manifestSettings).map(([categoryKey, categoryConfig]) => (
                        <AccordionItem key={categoryKey} value={categoryKey} className="rounded-lg border bg-muted/20 px-4">
                            <AccordionTrigger className="text-base font-semibold hover:no-underline">{categoryConfig.label}</AccordionTrigger>
                            <AccordionContent className="space-y-4 border-t pt-4">
                                {Object.entries(categoryConfig)
                                    .filter(([key]) => key !== 'label')
                                    .filter(([key, config]) => shouldShowField(key, config, settings))
                                    .map(([key, config]) => (
                                        <SettingField key={key} settingKey={key} config={config} value={settings[key]} onChange={handleSettingChange} readOnly={readOnly} />
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
                        <SettingField key={key} settingKey={key} config={config} value={settings[key]} onChange={handleSettingChange} readOnly={readOnly} />
                    ))}
            </div>
        );
    };

    const renderData = () => {
        if (dataItems === null) {
            return <div className="p-4 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
        }
        const filtered = (dataItems || []).filter((item) => item.key.toLowerCase().includes(searchTerm.toLowerCase()));
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-8" placeholder={t('settingsDialog.data.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={async () => setDataItems(await apiHelper(`/api/bots/${bot.id}/plugins/${plugin.id}/data`))}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('settingsDialog.data.refresh')}
                    </Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button onClick={openCreateDialog} disabled={readOnly}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('settingsDialog.data.addEntry')}
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            {readOnly && <TooltipContent>{t('settingsDialog.permissions.addEntries')}</TooltipContent>}
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <div className="grid grid-cols-[1fr,160px,180px] gap-0 bg-muted/40 px-3 py-2 text-xs font-semibold">
                        <div>{t('settingsDialog.data.columns.key')}</div>
                        <div>{t('settingsDialog.data.columns.updated')}</div>
                        <div className="pr-1 text-right">{t('settingsDialog.data.columns.actions')}</div>
                    </div>
                    <div className="max-h-[44vh] divide-y overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground">{t('settingsDialog.data.empty')}</div>
                        ) : filtered.map((item) => (
                            <div key={item.key} className="grid grid-cols-[1fr,160px,180px] items-start gap-0 px-3 py-2">
                                <div className="pr-3 font-mono text-xs break-all">
                                    {item.key}
                                    <pre className="mt-2 max-h-36 overflow-auto rounded bg-muted/30 p-2 text-[11px]">{JSON.stringify(item.value, null, 2)}</pre>
                                </div>
                                <div className="pt-1 text-[11px] text-muted-foreground">{new Date(item.updatedAt).toLocaleString()}</div>
                                <div className="flex justify-end gap-2 pt-1">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span>
                                                    <Button variant="outline" onClick={() => openEditDialog(item)} disabled={readOnly}>{t('actions.edit')}</Button>
                                                </span>
                                            </TooltipTrigger>
                                            {readOnly && <TooltipContent>{t('settingsDialog.permissions.generic')}</TooltipContent>}
                                        </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span>
                                                    <Button variant="destructive" onClick={() => handleDeleteKey(item.key)} disabled={readOnly}>{t('actions.delete')}</Button>
                                                </span>
                                            </TooltipTrigger>
                                            {readOnly && <TooltipContent>{t('settingsDialog.permissions.generic')}</TooltipContent>}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Dialog open={isDataDialogOpen} onOpenChange={setIsDataDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? t('settingsDialog.data.editEntry') : t('settingsDialog.data.newEntry')}</DialogTitle>
                            <DialogDescription>{isEditMode ? t('settingsDialog.data.editEntryDescription') : t('settingsDialog.data.newEntryDescription')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Label className="w-24">{t('settingsDialog.data.keyLabel')}</Label>
                                <Input value={dataFormKey} onChange={(e) => setDataFormKey(e.target.value)} disabled={isEditMode} placeholder={t('settingsDialog.data.keyPlaceholder')} />
                            </div>
                            <div>
                                <Label className="mb-1 block">{t('settingsDialog.data.jsonValue')}</Label>
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
                            <Button variant="ghost" onClick={() => setIsDataDialogOpen(false)}>{t('actions.cancel')}</Button>
                            <Button onClick={handleSaveData} disabled={!!isSavingKey}>
                                {isSavingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {t('ui.save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    };

    return (
        <DialogContent className="max-h-[80vh] max-w-4xl">
            <DialogHeader>
                <DialogTitle>{t('settingsDialog.title', { name: plugin.name })}</DialogTitle>
                <DialogDescription>{t('settingsDialog.description')}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="settings" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="h-4 w-4" />{t('settingsDialog.tabs.settings')}</TabsTrigger>
                    <TabsTrigger value="data" className="flex items-center gap-2"><Code className="h-4 w-4" />{t('settingsDialog.tabs.data')}</TabsTrigger>
                    <TabsTrigger value="info" className="flex items-center gap-2"><Info className="h-4 w-4" />{t('settingsDialog.tabs.info')}</TabsTrigger>
                </TabsList>

                <TabsContent value="settings">
                    <div className="max-h-[50vh] overflow-y-auto py-4 pr-2">{renderSettings()}</div>
                    <DialogFooter className="justify-between border-t pt-4 sm:justify-between">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <Button variant="destructive" onClick={handleClearData} disabled={isClearing || readOnly}>
                                            {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                            {t('settingsDialog.clearData')}
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                {readOnly && <TooltipContent>{t('settingsDialog.permissions.editData')}</TooltipContent>}
                            </Tooltip>
                        </TooltipProvider>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <Button onClick={handleSave} disabled={settings === null || readOnly}>
                                                <Save className="mr-2 h-4 w-4" />
                                                {t('ui.save')}
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    {readOnly && <TooltipContent>{t('settingsDialog.permissions.save')}</TooltipContent>}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </DialogFooter>
                </TabsContent>

                <TabsContent value="data" className="max-h-[60vh] overflow-y-auto py-4">{renderData()}</TabsContent>
                <TabsContent value="info" className="max-h-[60vh] overflow-y-auto py-4">
                    <PluginDetailInfo plugin={plugin} botId={bot.id} />
                </TabsContent>
            </Tabs>
        </DialogContent>
    );
}
