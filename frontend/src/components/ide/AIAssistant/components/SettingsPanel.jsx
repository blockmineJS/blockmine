import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROVIDERS, OPENROUTER_MODELS, GOOGLE_MODELS } from '../utils/constants';

export function SettingsPanel({ settings, onSave }) {
    const {
        provider,
        setProvider,
        apiKey,
        setApiKey,
        apiEndpoint,
        setApiEndpoint,
        model,
        setModel,
        useCustomModel,
        setUseCustomModel,
        customModel,
        setCustomModel,
        proxy,
        setProxy
    } = settings;

    return (
        <div className="p-4 border-b bg-muted/30 space-y-3">
            <div>
                <label className="text-sm font-medium mb-1 block">AI Провайдер</label>
                <select
                    className="w-full p-2 rounded-md border bg-background"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                >
                    <option value={PROVIDERS.OPENROUTER}>OpenRouter</option>
                    <option value={PROVIDERS.GOOGLE}>Google Gemini</option>
                </select>
            </div>

            <div>
                <label className="text-sm font-medium mb-1 block">API Ключ</label>
                <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={provider === PROVIDERS.GOOGLE ? 'Google API Key' : 'OpenRouter API Key'}
                />
            </div>

            {provider === PROVIDERS.OPENROUTER && (
                <div>
                    <label className="text-sm font-medium mb-1 block">API Endpoint (опционально)</label>
                    <Input
                        type="text"
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        placeholder="https://openrouter.ai/api/v1"
                    />
                </div>
            )}

            <div>
                <label className="text-sm font-medium mb-1 block">Модель</label>
                <select
                    className="w-full p-2 rounded-md border bg-background"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={useCustomModel}
                >
                    {provider === PROVIDERS.OPENROUTER ? (
                        OPENROUTER_MODELS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))
                    ) : (
                        GOOGLE_MODELS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))
                    )}
                </select>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="useCustomModel"
                    checked={useCustomModel}
                    onChange={(e) => setUseCustomModel(e.target.checked)}
                    className="rounded"
                />
                <label htmlFor="useCustomModel" className="text-sm">Использовать кастомную модель</label>
            </div>

            {useCustomModel && (
                <div>
                    <label className="text-sm font-medium mb-1 block">Кастомная модель</label>
                    <Input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="anthropic/claude-sonnet-4"
                    />
                </div>
            )}

            <div>
                <label className="text-sm font-medium mb-1 block">Прокси (опционально)</label>
                <Input
                    type="text"
                    value={proxy}
                    onChange={(e) => setProxy(e.target.value)}
                    placeholder="login:password@ip:port"
                />
            </div>

            <Button onClick={onSave} className="w-full">
                Сохранить настройки
            </Button>
        </div>
    );
}
