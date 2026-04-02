import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import Editor from '@monaco-editor/react';
import { useAppStore } from '@/stores/appStore';
import { shouldShowField } from '@/lib/pluginSettingsUtils';

function JsonEditorDialog({ initialValue, onSave, onCancel }) {
    const { t } = useTranslation('plugins');
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
        } catch {
            alert(t('settingsDialog.jsonEditor.invalidJson', {
                defaultValue: 'Ошибка: Невалидный JSON. Проверьте синтаксис.',
            }));
        }
    };

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>{t('settingsDialog.jsonEditor.title', { defaultValue: 'Редактор конфигурации JSON' })}</DialogTitle>
                <DialogDescription>
                    {t('settingsDialog.jsonEditor.descriptionWithSyntax', {
                        defaultValue: 'Внесите изменения и сохраните. Редактор подсветит синтаксические ошибки.',
                    })}
                </DialogDescription>
            </DialogHeader>
            <div className="relative py-4">
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
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>
                    {t('actions.cancel', { defaultValue: 'Отмена' })}
                </Button>
                <Button onClick={handleSave}>
                    {t('settingsDialog.jsonEditor.applyAndSave', { defaultValue: 'Применить и сохранить' })}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function ProxySettingField({ settingKey, config, value, onChange, readOnly }) {
    const { t } = useTranslation('plugins');
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
                    <SelectValue placeholder={t('settingsDialog.proxy.selectPlaceholder', { defaultValue: 'Выберите прокси' })} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">{t('settingsDialog.proxy.none', { defaultValue: 'Без прокси' })}</SelectItem>
                    <SelectItem value="custom">{t('settingsDialog.proxy.custom', { defaultValue: 'Настроить вручную' })}</SelectItem>
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
                        <Label>{t('settingsDialog.proxy.host', { defaultValue: 'Хост' })}</Label>
                        <Input value={proxyValue.host || ''} onChange={(e) => handleFieldChange('host', e.target.value)} placeholder="127.0.0.1" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('settingsDialog.proxy.port', { defaultValue: 'Порт' })}</Label>
                        <Input type="number" value={proxyValue.port || ''} onChange={(e) => handleFieldChange('port', e.target.value)} placeholder="1080" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('settingsDialog.proxy.type', { defaultValue: 'Тип' })}</Label>
                        <Select value={proxyValue.type || 'socks5'} onValueChange={(newValue) => handleFieldChange('type', newValue)} disabled={readOnly}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="socks5">SOCKS5</SelectItem>
                                <SelectItem value="socks4">SOCKS4</SelectItem>
                                <SelectItem value="http">HTTP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('settingsDialog.proxy.username', { defaultValue: 'Имя пользователя' })}</Label>
                        <Input
                            value={proxyValue.username || ''}
                            onChange={(e) => handleFieldChange('username', e.target.value)}
                            placeholder={t('settingsDialog.proxy.optional', { defaultValue: 'Опционально' })}
                            disabled={readOnly}
                        />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label>{t('settingsDialog.proxy.password', { defaultValue: 'Пароль' })}</Label>
                        <PasswordInput
                            value={proxyValue.password || ''}
                            onChange={(e) => handleFieldChange('password', e.target.value)}
                            placeholder={t('settingsDialog.proxy.optional', { defaultValue: 'Опционально' })}
                            disabled={readOnly}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function SettingField({ settingKey, config, value, onChange, readOnly }) {
    const { t } = useTranslation('plugins');
    const id = `${settingKey}-config-field`;
    const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);

    switch (config.type) {
        case 'string':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    {config.secret ? (
                        <PasswordInput
                            id={id}
                            value={value || ''}
                            onChange={(e) => onChange(settingKey, e.target.value)}
                            disabled={readOnly}
                        />
                    ) : (
                        <Input
                            id={id}
                            type="text"
                            value={value || ''}
                            onChange={(e) => onChange(settingKey, e.target.value)}
                            disabled={readOnly}
                        />
                    )}
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
                        rows={3}
                        disabled={readOnly}
                    />
                    {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
                </div>
            );
        case 'boolean':
            return (
                <div className="flex items-center justify-between rounded-lg border p-3">
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
                    <Input
                        id={id}
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => onChange(settingKey, e.target.value === '' ? null : e.target.valueAsNumber)}
                        disabled={readOnly}
                    />
                    {config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
                </div>
            );
        case 'select':
            return (
                <div className="space-y-2">
                    <Label htmlFor={id}>{config.label}</Label>
                    <Select value={value ?? config.default ?? ''} onValueChange={readOnly ? undefined : ((newValue) => onChange(settingKey, newValue))} disabled={readOnly}>
                        <SelectTrigger id={id}>
                            <SelectValue placeholder={t('settingsDialog.selectPlaceholder', { defaultValue: 'Выберите значение' })} />
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
        case 'json':
        case 'json_file':
            return (
                <div className="space-y-2">
                    <Label>{config.label}</Label>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                        <Dialog open={isJsonEditorOpen} onOpenChange={setIsJsonEditorOpen}>
                            <DialogTrigger asChild>
                                <span>
                                    <Button variant="outline" disabled={readOnly}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        {t('actions.edit', { defaultValue: 'Редактировать' })}
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
            return <p className="text-destructive">{t('settingsDialog.unknownSettingType', { type: config.type, defaultValue: 'Неизвестный тип настройки: {{type}}' })}</p>;
    }
}

export default function PluginSettingsForm({ plugin, onSettingsChange, readOnly = false }) {
    const handleFieldChange = (key, value) => {
        if (readOnly) return;

        const newSettings = {
            ...plugin.settings,
            [key]: value,
        };

        onSettingsChange(plugin.id, newSettings);
    };

    return (
        <div className="space-y-6">
            {Object.entries(plugin.manifest.settings)
                .filter(([key, config]) => shouldShowField(key, config, plugin.settings))
                .map(([key, config]) => (
                    <SettingField
                        key={key}
                        settingKey={key}
                        config={config}
                        value={plugin.settings[key]}
                        onChange={handleFieldChange}
                        readOnly={readOnly}
                    />
                ))}
        </div>
    );
}
