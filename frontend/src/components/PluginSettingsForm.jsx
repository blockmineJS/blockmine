import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Edit } from 'lucide-react';

function SettingField({ settingKey, config, value, onChange }) {
    const id = `${settingKey}-${Math.random()}`;

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
                    <Textarea id={id} value={Array.isArray(value) ? value.join('\n') : ''} onChange={(e) => onChange(settingKey, e.target.value.split('\n'))} rows={3} />
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
        case 'json':
        case 'json_file':
             return (
                <div className="space-y-2">
                    <Label>{config.label}</Label>
                    <Textarea value={JSON.stringify(value, null, 2)} rows={5} readOnly className="font-mono bg-muted"/>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
            );
        default:
            return <p className="text-destructive">Неизвестный тип настройки: {config.type}</p>;
    }
}


export default function PluginSettingsForm({ plugin, onSettingsChange }) {
    
    const handleFieldChange = (key, value) => {
        const newSettings = {
            ...plugin.settings,
            [key]: value
        };
        onSettingsChange(plugin.id, newSettings);
    };

    return (
        <div className="space-y-6">
            {Object.entries(plugin.manifest.settings).map(([key, config]) => (
                <SettingField
                    key={key}
                    settingKey={key}
                    config={config}
                    value={plugin.settings[key]}
                    onChange={handleFieldChange}
                />
            ))}
        </div>
    );
}