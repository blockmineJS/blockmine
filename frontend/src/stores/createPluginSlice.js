import { toast } from '@/hooks/use-toast';
import { apiHelper } from '@/lib/api';

export const createPluginSlice = (set, get) => ({
    installedPlugins: {},
    pluginUpdates: {},
    pluginCatalog: [],
    isCatalogLoading: true,

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
                const statsResponse = await fetch('http://185.65.200.184:3000/api/stats');
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    statsMap = new Map((statsData?.plugins || []).map(p => [p.pluginName, p.downloadCount]));
                }
            } catch (statsError) {
                console.warn("Не удалось загрузить статистику скачиваний плагинов:", statsError.message);
            }

            const enrichedCatalog = (catalogData || []).map(plugin => ({
                ...plugin,
                downloads: statsMap.get(plugin.name) || 0,
            }));

            set({ pluginCatalog: enrichedCatalog, isCatalogLoading: false });
        } catch (error) {
            console.error("Не удалось загрузить каталог плагинов:", error.message);
            set({ pluginCatalog: [], isCatalogLoading: false });
        }
    },

    fetchInstalledPlugins: async (botId) => {
        try {
            const pluginsData = await apiHelper(`/api/bots/${botId}/plugins`);
            
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
                };
            });

            set(state => {
                state.installedPlugins[botId] = parsedAndEnrichedPlugins;
            });
        } catch (error) {
            console.error("Не удалось загрузить плагины для бота", botId, error);
            set(state => { state.installedPlugins[botId] = []; });
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

    checkForUpdates: async (botId) => {
        try {
            const updatesData = await apiHelper(`/api/plugins/check-updates/${botId}`, { method: 'POST' });
            const updatesMap = updatesData.reduce((acc, u) => ({ ...acc, [u.sourceUri]: u }), {});
            set(state => {
                state.pluginUpdates[botId] = updatesMap;
            });
            toast({ title: "Проверка завершена", description: `Найдено обновлений: ${updatesData.length}` });
        } catch (error) {
            console.error("Ошибка проверки обновлений:", error);
        }
    },

    updatePlugin: async (pluginId, botId) => {
         await apiHelper(`/api/plugins/update/${pluginId}`, { method: 'POST' }, 'Плагин обновлен. Перезапустите бота.');
         await get().fetchInstalledPlugins(botId);
         await get().checkForUpdates(botId);
    },

    forkPlugin: async (botId, pluginName) => {
        try {
            const forkedPlugin = await apiHelper(
                `/api/bots/${botId}/plugins/ide/${pluginName}/fork`,
                { method: 'POST' },
                `Плагин "${pluginName}" успешно скопирован.`
            );
            await get().fetchInstalledPlugins(botId);
            return forkedPlugin;
        } catch (error) {
            console.error(`Ошибка при создании копии плагина ${pluginName}:`, error);
            throw error;
        }
    },

    createIdePlugin: async (botId, { name, template }) => {
        try {
            const newPlugin = await apiHelper(
                `/api/bots/${botId}/plugins/ide/create`,
                { 
                    method: 'POST',
                    body: JSON.stringify({ name, template })
                },
                `Плагин "${name}" успешно создан.`
            );
            await get().fetchInstalledPlugins(botId);
            return newPlugin;
        } catch (error) {
            console.error(`Ошибка при создании плагина ${name}:`, error);
            throw error;
        }
    },
});