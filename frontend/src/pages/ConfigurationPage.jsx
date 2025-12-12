import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, Loader2, Settings, Puzzle } from 'lucide-react';
import BotForm from "@/components/BotForm";
import PluginSettingsForm from '@/components/PluginSettingsForm';
import { useAppStore } from '@/stores/appStore';
import { apiHelper } from '@/lib/api';

export default function ConfigurationPage() {
    const { t } = useTranslation('configuration');
    const { botId } = useParams();

    const servers = useAppStore((state) => state.servers);
    const proxies = useAppStore((state) => state.proxies);
    const refreshBotList = useAppStore((state) => state.fetchInitialData);
    const hasPermission = useAppStore(state => state.hasPermission);
    
    const [allSettings, setAllSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [changes, setChanges] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const { toast } = useToast();
    const canEditBot = hasPermission('bot:update');
    const canEditPlugin = hasPermission('plugin:settings:edit');

    const fetchAllSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            await refreshBotList();
            const data = await apiHelper(`/api/bots/${botId}/settings/all`);
            setAllSettings(data);
            setChanges({});
        } catch (error) {
            toast({ variant: 'destructive', title: t('messages.error'), description: error.message });
        }
        setIsLoading(false);
    }, [botId, toast, refreshBotList]);

    useEffect(() => {
        fetchAllSettings();
    }, [fetchAllSettings]);
    
    const handleBotFormChange = useCallback((newBotData) => {
        setChanges(prev => ({ ...prev, bot: newBotData }));
    }, []);

    const handlePluginSettingsChange = useCallback((pluginId, newSettings) => {
        setAllSettings(prev => ({
            ...prev,
            plugins: prev.plugins.map(p => p.id === pluginId ? { ...p, settings: newSettings } : p),
        }));
        setChanges(prev => ({
            ...prev,
            plugins: { ...(prev.plugins || {}), [pluginId]: newSettings }
        }));
    }, []);

    const handleSaveAll = async () => {
        setIsSaving(true);
        let updatedBotData = null;
        try {
            if (changes.bot && canEditBot) {
                const dataToSend = { ...allSettings.bot, ...changes.bot };
                if (Array.isArray(dataToSend.owners)) {
                    dataToSend.owners = dataToSend.owners.join(',');
                }
                if (!dataToSend.password) delete dataToSend.password;
                if (!dataToSend.proxyPassword) delete dataToSend.proxyPassword;
                
                updatedBotData = await apiHelper(`/api/bots/${botId}`, {
                    method: 'PUT',
                    body: dataToSend,
                });
            }
            
            if (changes.plugins && canEditPlugin) {
                 await Promise.all(
                    Object.entries(changes.plugins).map(([pluginId, settings]) => 
                        apiHelper(`/api/bots/${botId}/plugins/${pluginId}`, {
                            method: 'PUT',
                            body: JSON.stringify({ settings }),
                        })
                    )
                );
            }

            toast({ title: t('messages.success'), description: t('messages.allSaved') });
            setChanges({});
            setFormErrors({});
            
            if (updatedBotData) {
                setAllSettings(prev => ({...prev, bot: updatedBotData}));
            } else {
                 await fetchAllSettings();
            }
            await refreshBotList();

        } catch (error) {
            console.error('Error saving bot settings:', error);
            
            if (error.message.includes('уже существует')) {
                setFormErrors({ username: error.message });
            } else {
                toast({
                    variant: "destructive",
                    title: t('messages.saveError'),
                    description: error.message || t('messages.unknownError')
                });
            }
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="text-center p-10">{t('loading')}</div>;
    }

    if (!allSettings) {
        return <div className="text-center p-10 text-destructive">{t('loadError')}</div>;
    }

    const hasChanges = Object.keys(changes).length > 0;

    return (
        <div className="h-full flex flex-col">
            <header className="p-6 border-b flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {t('title')}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t('description')}</p>
                </div>
                <Button
                    onClick={handleSaveAll}
                    disabled={!hasChanges || isSaving || (!canEditBot && !canEditPlugin)}
                    size="lg"
                >
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    {t('save')}
                </Button>
            </header>

            <Tabs defaultValue="general" className="flex-grow flex flex-col overflow-hidden">
                <TabsList className="m-6 shrink-0 self-start bg-muted/50 backdrop-blur-sm border border-border/50 rounded-lg">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {t('tabs.general')}
                    </TabsTrigger>
                    <TabsTrigger value="plugins" className="flex items-center gap-2">
                        <Puzzle className="h-4 w-4" />
                        {t('tabs.plugins')}
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="flex-grow overflow-y-auto px-6 pb-6">
                    <div className="mx-auto bg-card rounded-2xl shadow-lg p-8 border border-border/50">
                        <BotForm
                            bot={allSettings.bot}
                            servers={servers}
                            proxies={proxies}
                            onFormChange={handleBotFormChange}
                            showFooter={false}
                            errors={formErrors}
                            readOnly={!canEditBot}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="plugins" className="flex-grow overflow-y-auto px-6 pb-6">
                    {allSettings.plugins.length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-4 max-w-2xl mx-auto">
                            {allSettings.plugins.map(plugin => (
                                <AccordionItem key={plugin.id} value={`plugin-${plugin.id}`} className="border rounded-2xl shadow-md bg-muted/40">
                                    <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline flex items-center gap-3">
                                        <div className="flex items-center gap-3">
                                            <Puzzle className="h-5 w-5 text-purple-500" />
                                            <span>{plugin.name}</span>
                                        </div>
                                        <p className="text-sm font-normal text-muted-foreground ml-4">
                                            {plugin.description || t('plugins.noDescription')}
                                        </p>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-6 border-t pt-6">
                                        <PluginSettingsForm
                                            plugin={plugin}
                                            onSettingsChange={handlePluginSettingsChange}
                                            readOnly={!canEditPlugin}
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center p-10 text-muted-foreground rounded-lg border-2 border-dashed max-w-2xl mx-auto bg-muted/30">
                            {t('plugins.empty')}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}