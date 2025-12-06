import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PROVIDERS, OPENROUTER_MODELS, GOOGLE_MODELS, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '../utils/constants';
import { cn } from '@/lib/utils';

export function SettingsPanel({ settings, onSave }) {
    const [showAdvanced, setShowAdvanced] = useState(false);

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
        setProxy,
        temperature,
        setTemperature,
        maxTokens,
        setMaxTokens,
        systemPrompt,
        setSystemPrompt,
        autoFormat,
        setAutoFormat,
        autoCreateFolders,
        setAutoCreateFolders
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

            <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2"
            >
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Расширенные настройки
            </button>

            {showAdvanced && (
                <div className="space-y-3 pt-2 border-t">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-medium">Температура</label>
                            <span className="text-sm text-muted-foreground">{temperature}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Точный (0)</span>
                            <span>Креативный (2)</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Макс. токенов</label>
                        <Input
                            type="number"
                            min="256"
                            max="32768"
                            step="256"
                            value={maxTokens}
                            onChange={(e) => setMaxTokens(parseInt(e.target.value) || DEFAULT_MAX_TOKENS)}
                            placeholder={DEFAULT_MAX_TOKENS.toString()}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Максимальное количество токенов в ответе (256-32768)
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Системный промпт</label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Дополнительные инструкции для AI..."
                            className="w-full p-2 rounded-md border bg-background text-sm min-h-[80px] resize-y"
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Дополнительные инструкции, которые будут добавлены к каждому запросу
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium block">Автоматические действия</label>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="autoFormat"
                                checked={autoFormat}
                                onChange={(e) => setAutoFormat(e.target.checked)}
                                className="rounded"
                            />
                            <label htmlFor="autoFormat" className="text-sm">
                                Авто-форматирование кода
                            </label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                            Автоматически форматировать JS код после изменений
                        </p>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="autoCreateFolders"
                                checked={autoCreateFolders}
                                onChange={(e) => setAutoCreateFolders(e.target.checked)}
                                className="rounded"
                            />
                            <label htmlFor="autoCreateFolders" className="text-sm">
                                Авто-создание папок
                            </label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                            Автоматически создавать папки при создании файлов
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setTemperature(DEFAULT_TEMPERATURE);
                            setMaxTokens(DEFAULT_MAX_TOKENS);
                            setSystemPrompt('');
                            setAutoFormat(false);
                            setAutoCreateFolders(true);
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                        Сбросить расширенные настройки
                    </button>
                </div>
            )}

            <Button onClick={onSave} className="w-full">
                Сохранить настройки
            </Button>
        </div>
    );
}
