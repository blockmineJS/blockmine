import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, Loader2 } from 'lucide-react';
import BotForm from "@/components/BotForm";
import PluginSettingsForm from '@/components/PluginSettingsForm';
import { useAppStore } from '@/stores/appStore';

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
            const response = await fetch(`/api/bots/${botId}/settings/all`);
            if (!response.ok) throw new Error('Не удалось загрузить настройки');
            const data = await response.json();
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
    
    const handleBotFormChange = (newBotData) => {
        setChanges(prev => ({ ...prev, bot: newBotData }));
    };

    const handlePluginSettingsChange = (pluginId, newSettings) => {
        setAllSettings(prev => ({
            ...prev,
            plugins: prev.plugins.map(p => p.id === pluginId ? { ...p, settings: newSettings } : p),
        }));
        setChanges(prev => ({
            ...prev,
            plugins: { ...(prev.plugins || {}), [pluginId]: newSettings }
        }));
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            if (changes.bot) {
                const dataToSend = { ...changes.bot };
                
                if (Array.isArray(dataToSend.owners)) {
                    dataToSend.owners = dataToSend.owners.join(',');
                }
                
                if (!dataToSend.password) delete dataToSend.password;
                if (!dataToSend.proxyPassword) delete dataToSend.proxyPassword;
                
                const response = await fetch(`/api/bots/${botId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSend),
                });
                if (!response.ok) throw new Error('Не удалось сохранить настройки бота');
            }
            
            if (changes.plugins) {
                 await Promise.all(
                    Object.entries(changes.plugins).map(([pluginId, settings]) => 
                        fetch(`/api/bots/${botId}/plugins/${pluginId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ settings }),
                        })
                    )
                );
            }

            toast({ title: "Успех!", description: "Все изменения сохранены." });
            setChanges({});
            await refreshBotList();
            await fetchAllSettings();

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
        <div className="h-full flex flex-col">
            <header className="p-4 border-b flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-xl font-bold">Конфигурация бота</h2>
                    <p className="text-sm text-muted-foreground">Все настройки в одном месте. Нажмите "Сохранить всё", чтобы применить изменения.</p>
                </div>
                <Button onClick={handleSaveAll} disabled={!hasChanges || isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Сохранить изменения
                </Button>
            </header>

            <Tabs defaultValue="general" className="flex-grow flex flex-col">
                <TabsList className="m-4 shrink-0 self-start">
                    <TabsTrigger value="general">Общие настройки</TabsTrigger>
                    <TabsTrigger value="plugins">Настройки плагинов</TabsTrigger>
                </TabsList>

                <div className="flex-grow overflow-y-auto px-4 pb-4">
                    <TabsContent value="general">
                        <BotForm 
                            bot={allSettings.bot} 
                            servers={servers} 
                            onFormChange={handleBotFormChange}
                            showFooter={false}
                        />
                    </TabsContent>

                    <TabsContent value="plugins">
                        {allSettings.plugins.length > 0 ? (
                            <Accordion type="multiple" className="w-full space-y-4">
                                {allSettings.plugins.map(plugin => (
                                    <AccordionItem key={plugin.id} value={`plugin-${plugin.id}`} className="border rounded-lg">
                                        <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
                                            <div className="text-left">
                                                {plugin.name}
                                                <p className="text-sm font-normal text-muted-foreground">
                                                    {plugin.description || 'Нет описания.'}
                                                </p>
                                            </div>
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
                            <div className="text-center p-10 text-muted-foreground rounded-lg border-2 border-dashed">
                                У установленных плагинов нет настраиваемых параметров.
                            </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}