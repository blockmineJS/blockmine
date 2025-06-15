import { toast } from '@/hooks/use-toast';

const apiCall = async (url, options = {}, successMessage) => {
    try {
        const response = await fetch(url, options);
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            if (successMessage) toast({ title: "Успех!", description: successMessage });
            return true;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Произошла неизвестная ошибка на сервере');
        if (successMessage) toast({ title: "Успех!", description: successMessage });
        return data;
    } catch (error) {
        toast({ variant: "destructive", title: "Ошибка", description: error.message });
        throw error;
    }
};

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
            const [catalogData, statsData] = await Promise.all([
                apiCall('/api/plugins/catalog'),
                fetch('http://185.65.200.184:3000/api/stats').then(res => {
                    if (!res.ok) throw new Error('Статистика недоступна');
                    return res.json();
                })
            ]);

            const statsMap = new Map((statsData?.plugins || []).map(p => [p.pluginName, p.downloadCount]));

            const enrichedCatalog = (catalogData || []).map(plugin => ({
                ...plugin,
                downloads: statsMap.get(plugin.name) || 0,
            }));

            set({ pluginCatalog: enrichedCatalog, isCatalogLoading: false });
        } catch (error) {
            console.error("Не удалось загрузить каталог плагинов или статистику:", error.message);
            try {
                const catalogData = await apiCall('/api/plugins/catalog');
                const plainCatalog = (catalogData || []).map(plugin => ({...plugin, downloads: 0 }));
                set({ pluginCatalog: plainCatalog, isCatalogLoading: false });
            } catch (catalogError) {
                 set({ pluginCatalog: [], isCatalogLoading: false });
            }
        }
    },

    fetchInstalledPlugins: async (botId) => {
        try {
            const pluginsData = await apiCall(`/api/bots/${botId}/plugins`);
            
            const parsedAndEnrichedPlugins = pluginsData.map(p => {
                let manifest;
                try {
                    manifest = p.manifest ? JSON.parse(p.manifest) : {};
                } catch(e) {
                    console.error(`Ошибка парсинга манифеста для плагина ${p.name}`);
                    manifest = {};
                }
                
                return {
                    ...p,
                    manifest,
                    author: manifest.author || 'Локальный',
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
        await apiCall(
            `/api/bots/${botId}/plugins/${pluginId}`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isEnabled }) },
            'Статус плагина обновлен.'
        );
        await get().fetchInstalledPlugins(botId);
    },

    deletePlugin: async (botId, pluginId, pluginName) => {
        await apiCall(`/api/bots/${botId}/plugins/${pluginId}`, { method: 'DELETE' }, `Плагин "${pluginName}" удален.`);
        await get().fetchInstalledPlugins(botId);
    },

    installPluginFromRepo: async (botId, repoUrl, pluginName) => {
        if (pluginName) {
            get().optimisticallyIncrementDownloadCount(pluginName);
        }
        
        try {
            const data = await apiCall(
                `/api/bots/${botId}/plugins/install/github`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoUrl }) }
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
            const data = await apiCall(
                `/api/bots/${botId}/plugins/register/local`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) }
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
            const updatesData = await apiCall(`/api/plugins/check-updates/${botId}`, { method: 'POST' });
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
         await apiCall(`/api/plugins/update/${pluginId}`, { method: 'POST' }, 'Плагин обновлен. Перезапустите бота.');
         await get().fetchInstalledPlugins(botId);
         await get().checkForUpdates(botId);
    },
});