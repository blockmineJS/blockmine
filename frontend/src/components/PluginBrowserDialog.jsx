import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useToast } from "@/hooks/use-toast";
import PluginStoreCard from './PluginStoreCard';


export default function PluginBrowserDialog({ installedPlugins, onInstallSuccess, open, onClose }) {
    const [catalog, setCatalog] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [installingPluginId, setInstallingPluginId] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchCatalog = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/plugins/catalog');
                if (!response.ok) throw new Error('Failed to fetch catalog');
                const data = await response.json();
                setCatalog(data);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить каталог плагинов.' });
            }
            setIsLoading(false);
        };
        fetchCatalog();
    }, [toast]);

    const handleInstall = async (repoUrl, pluginId) => {
        setInstallingPluginId(pluginId);
        try {
            const response = await fetch('/api/plugins/install/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unknown error');
            toast({ title: 'Успех!', description: `Плагин "${data.name}" успешно установлен.` });
            onInstallSuccess();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка установки', description: error.message });
        }
        setInstallingPluginId(null);
    };

    const installedPluginNames = new Set(installedPlugins.map(p => p.name));
    const installedPluginUrls = new Set(installedPlugins.map(p => p.sourceUri));

    const isPluginInstalled = (plugin) => {
        if (installedPluginUrls.has(plugin.repoUrl)) {
            return true;
        }
        if (installedPluginNames.has(plugin.name)) {
            return true;
        }
        return false;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Обзор официальных плагинов</DialogTitle>
            <DialogContent>
                <p>Выберите плагин для установки. Он будет загружен из официального репозитория GitHub.</p>
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <CircularProgress />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {catalog.map(plugin => (
                            <PluginStoreCard
                                key={plugin.id}
                                plugin={plugin}
                                isInstalled={isPluginInstalled(plugin)}
                                isInstalling={installingPluginId === plugin.id}
                                onInstall={(repoUrl) => handleInstall(repoUrl, plugin.id)}
                            />
                        ))}
                    </div>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Закрыть
                </Button>
            </DialogActions>
        </Dialog>
    );
}
