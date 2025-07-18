import React, { useState, useEffect, useCallback } from 'react';
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
    const { botId } = useParams();
    
    const servers = useAppStore((state) => state.servers);
    const refreshBotList = useAppStore((state) => state.fetchInitialData);
    
    const [allSettings, setAllSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [changes, setChanges] = useState({});
    const { toast } = useToast();

    const fetchAllSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiHelper(`/api/bots/${botId}/settings/all`);
            setAllSettings(data);
            setChanges({});
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
        }
        setIsLoading(false);
    }, [botId, toast]);

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
            if (changes.bot) {
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
            
            if (changes.plugins) {
                 await Promise.all(
                    Object.entries(changes.plugins).map(([pluginId, settings]) => 
                        apiHelper(`/api/bots/${botId}/plugins/${pluginId}`, {
                            method: 'PUT',
                            body: JSON.stringify({ settings }),
                        })
                    )
                );
            }

            toast({ title: "Успех!", description: "Все изменения сохранены." });
            setChanges({});
            
            if (updatedBotData) {
                setAllSettings(prev => ({...prev, bot: updatedBotData}));
            } else {
                 await fetchAllSettings();
            }
            await refreshBotList();

        } catch (error) {
            toast({ variant: "destructive", title: "Ошибка сохранения", description: error.message });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="text-center p-10">Загрузка конфигурации...</div>;
    }

    if (!allSettings) {
        return <div className="text-center p-10 text-destructive">Не удалось загрузить данные.</div>;
    }

    const hasChanges = Object.keys(changes).length > 0;

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
            <header className="p-6 border-b flex justify-between items-center shrink-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-sm opacity-20" />
                        <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
                            <Settings className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Конфигурация бота
                        </h2>
                        <p className="text-sm text-muted-foreground">Все настройки в одном месте. Нажмите "Сохранить", чтобы применить изменения.</p>
                    </div>
                </div>
                <Button 
                    onClick={handleSaveAll} 
                    disabled={!hasChanges || isSaving}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all"
                    size="lg"
                >
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Сохранить
                </Button>
            </header>

            <Tabs defaultValue="general" className="flex-grow flex flex-col overflow-hidden">
                <TabsList className="m-6 shrink-0 self-start bg-muted/50 backdrop-blur-sm border border-border/50 rounded-lg">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Общие
                    </TabsTrigger>
                    <TabsTrigger value="plugins" className="flex items-center gap-2">
                        <Puzzle className="h-4 w-4" />
                        Плагины
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="flex-grow overflow-y-auto px-6 pb-6">
                    <div className="mx-auto bg-card rounded-2xl shadow-lg p-8 border border-border/50">
                        <BotForm
                            bot={allSettings.bot}
                            servers={servers}
                            onFormChange={handleBotFormChange}
                            showFooter={false}
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
                                            {plugin.description || 'Нет описания.'}
                                        </p>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-6 border-t pt-6">
                                        <PluginSettingsForm
                                            plugin={plugin}
                                            onSettingsChange={handlePluginSettingsChange}
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center p-10 text-muted-foreground rounded-lg border-2 border-dashed max-w-2xl mx-auto bg-muted/30">
                            У установленных плагинов нет настраиваемых параметров.
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}