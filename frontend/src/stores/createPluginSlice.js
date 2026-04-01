import i18n from '@/i18n';
import { toast } from '@/hooks/use-toast';
import { apiHelper } from '@/lib/api';
import { produce } from 'immer';

const translatePlugins = (key, defaultValue, options = {}) =>
  i18n.t(key, { ns: 'plugins', defaultValue, ...options });

const PLUGIN_UPDATE_COUNT_STORAGE_KEY = 'blockmine-plugin-update-counts';

const loadStoredPluginUpdateCounts = () => {
  try {
    const raw = localStorage.getItem(PLUGIN_UPDATE_COUNT_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const persistPluginUpdateCounts = (counts) => {
  try {
    localStorage.setItem(PLUGIN_UPDATE_COUNT_STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // noop
  }
};

const getGithubAuthorFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  try {
    const trimmed = url.trim();
    const withProtocol = /^github\.com\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
    const parsed = new URL(withProtocol.replace(/^git\+/i, ''));
    if (!['github.com', 'www.github.com'].includes(parsed.hostname.toLowerCase())) return null;

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) return null;

    return pathParts[0] || null;
  } catch {
    return null;
  }
};

const resolveAuthor = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return translatePlugins('labels.unknownAuthor', 'Неизвестный автор');
};

const executePluginOperation = async (get, botId, apiEndpoint, params, successMessage) => {
  try {
    const result = await apiHelper(apiEndpoint, params, successMessage);
    await get().fetchInstalledPlugins(botId, true);
    return result;
  } catch (error) {
    console.error(`[PluginOperation] Failed: ${apiEndpoint}`, {
      botId,
      endpoint: apiEndpoint,
      params: params.body ? JSON.parse(params.body) : {},
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const enrichCatalog = (catalogData = [], statsMap = new Map()) =>
  catalogData
    .map((plugin) => ({
      ...plugin,
      downloads: statsMap.get(plugin.name) || plugin.downloads || 0,
      author: resolveAuthor(plugin.author, getGithubAuthorFromUrl(plugin.repoUrl)),
    }))
    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    .map((plugin, index) => ({
      ...plugin,
      isTop3: index < 3,
      topPosition: index + 1,
    }));

const PLUGIN_STATS_URL = (import.meta.env.VITE_PLUGIN_STATS_URL || '/api/stats').trim();

export const createPluginSlice = (set, get) => {
  const INSTALLED_PLUGINS_CACHE_TTL = 30 * 1000;

  return {
    installedPlugins: {},
    installedPluginsFetchedAt: {},
    pluginTogglePending: {},
    pluginUpdates: {},
    pluginUpdateCounts: loadStoredPluginUpdateCounts(),
    pluginCatalog: [],
    isCatalogLoading: true,

    optimisticallyIncrementDownloadCount: (pluginName) => {
      set((state) => {
        const plugin = state.pluginCatalog.find((item) => item.name === pluginName);
        if (plugin) {
          plugin.downloads = (plugin.downloads || 0) + 1;
        }
      });
    },

    fetchPluginCatalog: async (force = false) => {
      if (!force && get().pluginCatalog.length > 0) {
        set({ isCatalogLoading: false });
        return;
      }

      set({ isCatalogLoading: true });

      try {
        const catalogData = await apiHelper('/api/plugins/catalog');
        set({ pluginCatalog: enrichCatalog(catalogData), isCatalogLoading: false });

        fetch(PLUGIN_STATS_URL)
          .then((response) => (response.ok ? response.json() : null))
          .then((statsData) => {
            if (!statsData) return;

            const statsMap = new Map(
              (statsData?.plugins || []).map((plugin) => [plugin.pluginName, plugin.downloadCount])
            );
            set({ pluginCatalog: enrichCatalog(catalogData, statsMap) });
          })
          .catch((statsError) => {
            console.warn('Не удалось загрузить статистику скачиваний плагинов:', statsError.message);
          });
      } catch (error) {
        console.error('Не удалось загрузить каталог плагинов:', error.message);
        set({ pluginCatalog: [], isCatalogLoading: false });
      }
    },

    fetchInstalledPlugins: async (botId, force = false) => {
      try {
        const lastFetchedAt = get().installedPluginsFetchedAt[botId];
        const hasCachedPlugins = Object.prototype.hasOwnProperty.call(get().installedPlugins, botId);

        if (!force && hasCachedPlugins && lastFetchedAt && Date.now() - lastFetchedAt < INSTALLED_PLUGINS_CACHE_TTL) {
          return;
        }

        const pluginsData = await apiHelper(`/api/plugins/bot/${botId}`);
        const catalogByName = new Map(get().pluginCatalog.map((plugin) => [plugin.name, plugin]));

        const parsedAndEnrichedPlugins = pluginsData.map((pluginData) => {
          let manifest;
          try {
            manifest = pluginData.manifest ? JSON.parse(pluginData.manifest) : {};
          } catch (error) {
            console.error(`Ошибка парсинга манифеста для плагина ${pluginData.name}`);
            manifest = {};
          }

          const catalogPlugin = catalogByName.get(pluginData.name);

          return {
            ...pluginData,
            manifest,
            displayName: catalogPlugin?.displayName || manifest.displayName || pluginData.name,
            author: resolveAuthor(
              catalogPlugin?.author,
              manifest?.author,
              manifest?.metadata?.author,
              getGithubAuthorFromUrl(pluginData.sourceUri)
            ),
            description:
              pluginData.description ||
              manifest.description ||
              translatePlugins('labels.noDescription', 'Нет описания.'),
            commands: pluginData.commands || [],
            eventGraphs: pluginData.eventGraphs || [],
          };
        });

        set((state) => {
          state.installedPlugins[botId] = parsedAndEnrichedPlugins;
          state.installedPluginsFetchedAt[botId] = Date.now();
        });
      } catch (error) {
        console.error('Не удалось загрузить плагины для бота', botId, error);
        set((state) => {
          state.installedPlugins[botId] = [];
          state.installedPluginsFetchedAt[botId] = Date.now();
        });
      }
    },

    togglePlugin: async (botId, pluginId, isEnabled) => {
      if (get().pluginTogglePending[botId]?.[pluginId]) {
        return;
      }

      const statusToast = toast({
        title: translatePlugins('messages.updating', 'Updating...'),
        description: translatePlugins('toasts.statusUpdating', 'Updating plugin status...'),
      });
      const previousEnabled = get().installedPlugins[botId]?.find((item) => item.id === pluginId)?.isEnabled;

      set(
        produce((draft) => {
          if (!draft.pluginTogglePending[botId]) {
            draft.pluginTogglePending[botId] = {};
          }

          draft.pluginTogglePending[botId][pluginId] = true;

          const plugin = draft.installedPlugins[botId]?.find((item) => item.id === pluginId);
          if (plugin) {
            plugin.isEnabled = isEnabled;
          }
        })
      );

      try {
        const updatedPlugin = await apiHelper(`/api/bots/${botId}/plugins/${pluginId}`, {
          method: 'PUT',
          body: JSON.stringify({ isEnabled }),
        });

        set(
          produce((draft) => {
            const plugin = draft.installedPlugins[botId]?.find((item) => item.id === pluginId);
            if (plugin) {
              plugin.isEnabled = typeof updatedPlugin?.isEnabled === 'boolean' ? updatedPlugin.isEnabled : isEnabled;
            }
          })
        );

        statusToast.update({
          title: translatePlugins('ui.success', 'Success'),
          description: translatePlugins('toasts.statusUpdated', 'Plugin status updated.'),
        });

        return updatedPlugin;
      } catch (error) {
        statusToast.dismiss();
        set(
          produce((draft) => {
            const plugin = draft.installedPlugins[botId]?.find((item) => item.id === pluginId);
            if (plugin && typeof previousEnabled === 'boolean') {
              plugin.isEnabled = previousEnabled;
            }
          })
        );
        throw error;
      } finally {
        set(
          produce((draft) => {
            if (!draft.pluginTogglePending[botId]) {
              return;
            }

            delete draft.pluginTogglePending[botId][pluginId];

            if (Object.keys(draft.pluginTogglePending[botId]).length === 0) {
              delete draft.pluginTogglePending[botId];
            }
          })
        );
      }
    },

    deletePlugin: async (botId, pluginId, pluginName) => {
      await apiHelper(
        `/api/bots/${botId}/plugins/${pluginId}`,
        { method: 'DELETE' },
        translatePlugins('toasts.pluginDeleted', 'Плагин "{{name}}" удален.', { name: pluginName })
      );
      await get().fetchInstalledPlugins(botId, true);
    },

    installPluginFromRepo: async (botId, repoUrl, pluginName, tag = null) => {
      if (pluginName) {
        get().optimisticallyIncrementDownloadCount(pluginName);
      }

      try {
        const data = await apiHelper(`/api/bots/${botId}/plugins/install/github`, {
          method: 'POST',
          body: JSON.stringify({ repoUrl, tag }),
        });
        toast({
          title: translatePlugins('ui.success', 'Успех!'),
          description: translatePlugins('toasts.pluginInstalled', 'Плагин "{{name}}" успешно установлен.', {
            name: data.name,
          }),
        });
        await get().fetchInstalledPlugins(botId, true);
        return data;
      } catch (error) {
        await get().fetchPluginCatalog(true);
        throw error;
      }
    },

    installPluginFromPath: async (botId, path) => {
      try {
        const data = await apiHelper(`/api/bots/${botId}/plugins/install/local`, {
          method: 'POST',
          body: JSON.stringify({ path }),
        });
        toast({
          title: translatePlugins('ui.success', 'Успех!'),
          description: translatePlugins('toasts.pluginInstalled', 'Плагин "{{name}}" успешно установлен.', {
            name: data.name,
          }),
        });
        return data;
      } finally {
        await get().fetchInstalledPlugins(botId, true);
        await get().fetchPluginCatalog(true);
      }
    },

    checkForUpdates: async (botId) => {
      try {
        const updatesData = await apiHelper(`/api/plugins/check-updates/${botId}`, { method: 'POST' });
        const updatesMap = updatesData.reduce((accumulator, update) => ({ ...accumulator, [update.id]: update }), {});
        const updatesCount = updatesData.length;
        const previousCount = get().pluginUpdateCounts?.[botId];

        set((state) => {
          state.pluginUpdates[botId] = updatesMap;
          state.pluginUpdateCounts[botId] = updatesCount;
        });

        persistPluginUpdateCounts(get().pluginUpdateCounts);

        if (typeof previousCount === 'number' && previousCount !== updatesCount) {
          toast({
            title: translatePlugins('toasts.updateCheckCompleted', 'Проверка завершена'),
            description: translatePlugins('toasts.updateCheckFound', 'Найдено обновлений: {{count}}', {
              count: updatesCount,
            }),
          });
        }
      } catch (error) {
        console.error('Ошибка проверки обновлений:', error);
      }
    },

    updatePlugin: async (pluginId, botId) => {
      const pluginToUpdate = get().installedPlugins[botId]?.find((plugin) => plugin.id === pluginId);
      const updateInfo = get().pluginUpdates[botId]?.[pluginId] || null;
      const targetTag = updateInfo?.latestTag || null;

      await apiHelper(
        `/api/plugins/update/${pluginId}`,
        {
          method: 'POST',
          body: JSON.stringify({ targetTag, targetRepoUrl: updateInfo?.targetRepoUrl || null }),
        },
        translatePlugins('toasts.pluginUpdated', 'Плагин обновлен. Перезапустите бота.')
      );

      if (pluginToUpdate) {
        set(
          produce((draft) => {
            if (draft.pluginUpdates[botId]?.[pluginId]) {
              delete draft.pluginUpdates[botId][pluginId];
            }
          })
        );
      }

      await get().fetchInstalledPlugins(botId, true);
    },

    createIdePlugin: async (botId, { name, template }) =>
      executePluginOperation(
        get,
        botId,
        `/api/bots/${botId}/plugins/ide/create`,
        {
          method: 'POST',
          body: JSON.stringify({ name, template }),
        },
        translatePlugins('toasts.pluginCreated', 'Плагин "{{name}}" успешно создан.', { name })
      ),

    updatePluginManifest: async (botId, pluginName, manifestData) => {
      set(
        produce((draft) => {
          const plugin = draft.installedPlugins.find((item) => item.name === pluginName && item.botId === botId);
          if (plugin) {
            plugin.name = manifestData.name;
            plugin.version = manifestData.version;
            plugin.description = manifestData.description;
          }
        })
      );
    },

    forkPlugin: async (botId, pluginName) =>
      executePluginOperation(
        get,
        botId,
        `/api/bots/${botId}/plugins/ide/${pluginName}/fork`,
        { method: 'POST' },
        translatePlugins('toasts.pluginForked', 'Плагин "{{name}}" успешно превращен в локальный.', {
          name: pluginName,
        })
      ),

    reloadLocalPlugin: async (botId, pluginId) => {
      await apiHelper(
        `/api/plugins/${pluginId}/reload`,
        { method: 'POST' },
        translatePlugins('toasts.pluginReloaded', 'Плагин перезагружен, настройки сброшены.')
      );
      await get().fetchInstalledPlugins(botId, true);
    },
  };
};
