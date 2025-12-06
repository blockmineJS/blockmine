import { useState, useCallback } from 'react';
import { PROVIDERS, DEFAULT_MODELS, STORAGE_KEYS, DEFAULT_API_ENDPOINT, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from '../utils/constants';

export function useAISettings() {
    const getDefaultModel = (prov) => DEFAULT_MODELS[prov] || DEFAULT_MODELS[PROVIDERS.OPENROUTER];

    const [provider, setProviderState] = useState(
        localStorage.getItem(STORAGE_KEYS.PROVIDER) || PROVIDERS.OPENROUTER
    );

    const [apiKey, setApiKey] = useState(
        localStorage.getItem(STORAGE_KEYS.API_KEY) || ''
    );

    const [apiEndpoint, setApiEndpoint] = useState(
        localStorage.getItem(STORAGE_KEYS.API_ENDPOINT) || DEFAULT_API_ENDPOINT
    );

    const [model, setModel] = useState(() => {
        const savedProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER) || PROVIDERS.OPENROUTER;
        const storageKey = `${STORAGE_KEYS.MODEL_PREFIX}${savedProvider}`;
        return localStorage.getItem(storageKey) || getDefaultModel(savedProvider);
    });

    const [useCustomModel, setUseCustomModel] = useState(
        localStorage.getItem(STORAGE_KEYS.USE_CUSTOM_MODEL) === 'true'
    );

    const [customModel, setCustomModel] = useState(
        localStorage.getItem(STORAGE_KEYS.CUSTOM_MODEL) || ''
    );

    const [proxy, setProxy] = useState(
        localStorage.getItem(STORAGE_KEYS.PROXY) || ''
    );

    const [temperature, setTemperature] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.TEMPERATURE);
        return saved ? parseFloat(saved) : DEFAULT_TEMPERATURE;
    });

    const [maxTokens, setMaxTokens] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.MAX_TOKENS);
        return saved ? parseInt(saved) : DEFAULT_MAX_TOKENS;
    });

    const [systemPrompt, setSystemPrompt] = useState(
        localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT) || ''
    );

    const [autoFormat, setAutoFormat] = useState(
        localStorage.getItem(STORAGE_KEYS.AUTO_FORMAT) === 'true'
    );

    const [autoCreateFolders, setAutoCreateFolders] = useState(
        localStorage.getItem(STORAGE_KEYS.AUTO_CREATE_FOLDERS) !== 'false' // По умолчанию true
    );

    const setProvider = useCallback((newProvider) => {
        setProviderState(newProvider);
        const storageKey = `${STORAGE_KEYS.MODEL_PREFIX}${newProvider}`;
        const savedModel = localStorage.getItem(storageKey);
        setModel(savedModel || getDefaultModel(newProvider));
    }, []);

    const saveSettings = useCallback(() => {
        localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
        localStorage.setItem(STORAGE_KEYS.API_ENDPOINT, apiEndpoint);
        localStorage.setItem(`${STORAGE_KEYS.MODEL_PREFIX}${provider}`, model);
        localStorage.setItem(STORAGE_KEYS.USE_CUSTOM_MODEL, useCustomModel.toString());
        localStorage.setItem(STORAGE_KEYS.CUSTOM_MODEL, customModel);
        localStorage.setItem(STORAGE_KEYS.PROXY, proxy);
        localStorage.setItem(STORAGE_KEYS.TEMPERATURE, temperature.toString());
        localStorage.setItem(STORAGE_KEYS.MAX_TOKENS, maxTokens.toString());
        localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, systemPrompt);
        localStorage.setItem(STORAGE_KEYS.AUTO_FORMAT, autoFormat.toString());
        localStorage.setItem(STORAGE_KEYS.AUTO_CREATE_FOLDERS, autoCreateFolders.toString());
    }, [provider, apiKey, apiEndpoint, model, useCustomModel, customModel, proxy, temperature, maxTokens, systemPrompt, autoFormat, autoCreateFolders]);

    const getEffectiveModel = useCallback(() => {
        return useCustomModel && customModel ? customModel : model;
    }, [useCustomModel, customModel, model]);

    return {
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
        setAutoCreateFolders,
        saveSettings,
        getEffectiveModel
    };
}
