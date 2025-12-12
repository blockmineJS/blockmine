// File: frontend/src/pages/AdminPage.jsx (ИЗМЕНЕНИЯ)

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck } from 'lucide-react';
import PanelUsersManager from '@/components/admin/PanelUsersManager';
import PanelRolesManager from '@/components/admin/PanelRolesManager';
import GlobalSettingsManager from '@/components/admin/GlobalSettingsManager';

export default function AdminPage() {
    const { t } = useTranslation('admin');
    return (
        <div className="h-full flex flex-col p-4">
            <CardHeader className="px-0">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                    <div>
                        <CardTitle>{t('title')}</CardTitle>
                        <CardDescription>
                            {t('description')}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <Tabs defaultValue="users" className="flex-grow flex flex-col">
                <TabsList className="mt-2">
                    <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
                    <TabsTrigger value="roles">{t('tabs.roles')}</TabsTrigger>
                    <TabsTrigger value="settings">{t('tabs.settings')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="users" className="flex-grow min-h-0 mt-4">
                    <PanelUsersManager />
                </TabsContent>
                <TabsContent value="roles" className="flex-grow min-h-0 mt-4">
                    <PanelRolesManager />
                </TabsContent>
                 <TabsContent value="settings" className="flex-grow min-h-0 mt-4">
                    <GlobalSettingsManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}