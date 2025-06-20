import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import Editor from '@monaco-editor/react';

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
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button onClick={handleSave}>Применить и сохранить</Button>
            </DialogFooter>
        </DialogContent>
    );
}


function SettingField({ settingKey, config, value, onChange }) {
    const id = `${settingKey}-${Math.random()}`;
    const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);

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