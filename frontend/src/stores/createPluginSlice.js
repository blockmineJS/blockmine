import { toast } from '@/hooks/use-toast';
import { apiHelper } from '@/lib/api';
import { produce } from 'immer';

const executePluginOperation = async (get, botId, apiEndpoint, params, successMessage) => {
    try {
        const result = await apiHelper(apiEndpoint, params, successMessage);
        await get().fetchInstalledPlugins(botId);
        return result;
    } catch (error) {
        console.error(`[PluginOperation] Failed: ${apiEndpoint}`, {
            botId,
            endpoint: apiEndpoint,
            params: params.body ? JSON.parse(params.body) : {},
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

export const createPluginSlice = (set, get) => {
    const initLastUpdateCheck = () => {
        const result = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('plugin_update_check_')) {
                const botId = key.replace('plugin_update_check_', '');
                const value = localStorage.getItem(key);
                if (value) {
                    result[botId] = parseInt(value, 10);
                }
            }
        }
        return result;
    };

    return {
        installedPlugins: {},
        pluginUpdates: {},
        pluginCatalog: [],
        isCatalogLoading: true,
        lastUpdateCheck: initLastUpdateCheck(),

        optimisticallyIncrementDownloadCount: (pluginName) => {
            set(state => {
                const plugin = state.pluginCatalog.find(p => p.name === pluginName);
                if (plugin) {
                    plugin.downloads = (plugin.downloads || 0) + 1;
                }
            });
        },

        fetchPluginCatalog: async () => {
            if (get().pluginCatalog.length > 0) {
                set({ isCatalogLoading: false });
                return;
            }
            set({ isCatalogLoading: true });
            
            try {
                const catalogData = await apiHelper('/api/plugins/catalog');
                
                let statsMap = new Map();
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const statsResponse = await fetch('http://185.65.200.184:3000/api/stats');
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        statsMap = new Map((statsData?.plugins || []).map(p => [p.pluginName, p.downloadCount]));
                    }
                } catch (statsError) {
                    console.warn("Не удалось загрузить статистику скачиваний плагинов:", statsError.message);
                }

                const sortedPlugins = (catalogData || []).map(plugin => ({
                    ...plugin,
                    downloads: statsMap.get(plugin.name) || 0,
                })).sort((a, b) => (b.downloads || 0) - (a.downloads || 0));

                const enrichedCatalog = sortedPlugins.map((plugin, index) => ({
                    ...plugin,
                    isTop3: index < 3,
                    topPosition: index + 1,
                }));

                set({ pluginCatalog: enrichedCatalog, isCatalogLoading: false });
            } catch (error) {
                console.error("Не удалось загрузить каталог плагинов:", error.message);
                set({ pluginCatalog: [], isCatalogLoading: false });
            }
        },

        fetchInstalledPlugins: async (botId) => {
            try {
                const pluginsData = await apiHelper(`/api/plugins/bot/${botId}`);
                
                const parsedAndEnrichedPlugins = pluginsData.map(p => {
                    let manifest;
                    try {
                        manifest = p.manifest ? JSON.parse(p.manifest) : {};
                    } catch(e) {
                        console.error(`Ошибка парсинга манифеста для плагина ${p.name}`);
                        manifest = {};
                    }
                    
                    const catalogPlugin = get().pluginCatalog.find(cat_p => cat_p.name === p.name);
                    
                    return {
                        ...p,
                        manifest,
                        author: catalogPlugin?.author || manifest.author || 'Неизвестный автор',
                        description: p.description || manifest.description || 'Нет описания',
                        commands: p.commands || [],
                        eventGraphs: p.eventGraphs || [],
                    };
                });

                set(state => {
                    state.installedPlugins[botId] = parsedAndEnrichedPlugins;
                });
            } catch (error) {
                console.error("Не удалось загрузить плагины для бота", botId, error);
                set(state => { state.installedPlugins[botId] = [] });
            }
        },

        togglePlugin: async (botId, pluginId, isEnabled) => {
            await apiHelper(
                `/api/bots/${botId}/plugins/${pluginId}`,
                { method: 'PUT', body: JSON.stringify({ isEnabled }) },
                'Статус плагина обновлен.'
            );
            await get().fetchInstalledPlugins(botId);
        },

        deletePlugin: async (botId, pluginId, pluginName) => {
            await apiHelper(`/api/bots/${botId}/plugins/${pluginId}`, { method: 'DELETE' }, `Плагин "${pluginName}" удален.`);
            await get().fetchInstalledPlugins(botId);
        },

        installPluginFromRepo: async (botId, repoUrl, pluginName) => {
            if (pluginName) {
                get().optimisticallyIncrementDownloadCount(pluginName);
            }
            
            try {
                const data = await apiHelper(
                    `/api/bots/${botId}/plugins/install/github`,
                    { method: 'POST', body: JSON.stringify({ repoUrl }) }
                );
                toast({ title: 'Успех!', description: `Плагин "${data.name}" успешно установлен.` });
                await get().fetchInstalledPlugins(botId);
                return data;
            } catch (error) {
                await get().fetchPluginCatalog(); 
                throw error;
            }
        },

        installPluginFromPath: async (botId, path) => {
             try {
                const data = await apiHelper(
                    `/api/bots/${botId}/plugins/install/local`,
                    { method: 'POST', body: JSON.stringify({ path }) }
                );
                 toast({ title: "Успех!", description: `Плагин "${data.name}" успешно установлен.` });
                 return data;
             } catch(error) {
                 throw error;
             } finally {
                await get().fetchInstalledPlugins(botId);
                await get().fetchPluginCatalog();
             }
        },

        checkForUpdates: async (botId, forceCheck = false) => {
            try {
                const now = Date.now();
                
                const storageKey = `plugin_update_check_${botId}`;
                const lastCheck = localStorage.getItem(storageKey);
                const lastCheckTime = lastCheck ? parseInt(lastCheck, 10) : null;
                
                const cooldownPeriod = 10 * 60 * 1000;
                
                if (!forceCheck && lastCheckTime && (now - lastCheckTime) < cooldownPeriod) {
                    return;
                }
                
                const updatesData = await apiHelper(`/api/plugins/check-updates/${botId}`, { method: 'POST' });
                const updatesMap = updatesData.reduce((acc, u) => ({ ...acc, [u.sourceUri]: u }), {});
                
                localStorage.setItem(storageKey, now.toString());
                
                set(state => {
                    state.pluginUpdates[botId] = updatesMap;
                    state.lastUpdateCheck[botId] = now;
                });
                
                toast({ title: "Проверка завершена", description: `Найдено обновлений: ${updatesData.length}` });
            } catch (error) {
                console.error("Ошибка проверки обновлений:", error);
            }
        },

        updatePlugin: async (pluginId, botId) => {
            const pluginToUpdate = get().installedPlugins[botId]?.find(p => p.id === pluginId);
            
            // Получаем информацию об обновлении, включая тег
            const updateInfo = pluginToUpdate ? get().pluginUpdates[botId]?.[pluginToUpdate.sourceUri] : null;
            const targetTag = updateInfo?.latestTag || null;

            await apiHelper(
                `/api/plugins/update/${pluginId}`, 
                { 
                    method: 'POST',
                    body: JSON.stringify({ targetTag })
                }, 
                'Плагин обновлен. Перезапустите бота.'
            );

            if (pluginToUpdate) {
                set(produce(draft => {
                    if (draft.pluginUpdates[botId]?.[pluginToUpdate.sourceUri]) {
                        delete draft.pluginUpdates[botId][pluginToUpdate.sourceUri];
                    }
                }));
            }
            
            await get().fetchInstalledPlugins(botId);
        },

        createIdePlugin: async (botId, { name, template }) => {
            return executePluginOperation(
                get,
                botId,
                `/api/bots/${botId}/plugins/ide/create`,
                {
                    method: 'POST',
                    body: JSON.stringify({ name, template })
                },
                `Плагин "${name}" успешно создан.`
            );
        },

        updatePluginManifest: async (botId, pluginName, manifestData) => {
            set(produce((draft) => {
                const plugin = draft.installedPlugins.find((p) => p.name === pluginName && p.botId === botId);
                if (plugin) {
                    plugin.name = manifestData.name;
                    plugin.version = manifestData.version;
                    plugin.description = manifestData.description;
                }
            }));
        },

        forkPlugin: async (botId, pluginName) => {
            return executePluginOperation(
                get,
                botId,
                `/api/bots/${botId}/plugins/ide/${pluginName}/fork`,
                { method: 'POST' },
                `Копия плагина "${pluginName}" успешно создана.`
            );
        },
    };
};