import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { apiHelper } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Loader2, Save, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GlobalSettingsManager() {
    const { t } = useTranslation('admin');
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiHelper('/api/panel/settings');
            setSettings({
                server: data.server || { allowExternalAccess: false },
                telemetry: data.telemetry || { enabled: true }
            });
        } catch (error) {
            toast({ variant: 'destructive', title: t('common.error'), description: t('settings.loadError') });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleToggleChange = (keyPath, value) => {
        const [section, key] = keyPath.split('.');
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiHelper('/api/panel/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    allowExternalAccess: settings.server.allowExternalAccess,
                    telemetryEnabled: settings.telemetry.enabled,
                }),
            }, t('settings.saveSuccess'));
        } catch(error) {
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !settings) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.title')}</CardTitle>
                <CardDescription>
                    {t('settings.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>{t('settings.restartRequired')}</AlertTitle>
                    <AlertDescription>
                        <Trans i18nKey="settings.restartDescription" t={t} components={{ code: <code /> }} />
                    </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <Label htmlFor="external-access" className="text-base font-medium">{t('settings.externalAccess')}</Label>
                        <p className="text-sm text-muted-foreground">
                            {t('settings.externalAccessDescription')}
                        </p>
                    </div>
                    <Switch
                        id="external-access"
                        checked={settings.server.allowExternalAccess}
                        onCheckedChange={(checked) => handleToggleChange('server.allowExternalAccess', checked)}
                    />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <Label htmlFor="telemetry" className="text-base font-medium">{t('settings.telemetry')}</Label>
                        <p className="text-sm text-muted-foreground">
                            {t('settings.telemetryDescription')}
                        </p>
                    </div>
                    <Switch
                        id="telemetry"
                        checked={settings.telemetry.enabled}
                        onCheckedChange={(checked) => handleToggleChange('telemetry.enabled', checked)}
                    />
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        {t('settings.save')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}