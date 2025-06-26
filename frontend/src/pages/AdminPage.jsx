// File: frontend/src/pages/AdminPage.jsx (ИЗМЕНЕНИЯ)

import React from 'react';
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck } from 'lucide-react';
import PanelUsersManager from '@/components/admin/PanelUsersManager';
import PanelRolesManager from '@/components/admin/PanelRolesManager';
import GlobalSettingsManager from '@/components/admin/GlobalSettingsManager';

export default function AdminPage() {
    return (
        <div className="h-full flex flex-col p-4">
            <CardHeader className="px-0">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                    <div>
                        <CardTitle>Администрирование</CardTitle>
                        <CardDescription>
                            Управление пользователями, ролями и глобальными настройками панели.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <Tabs defaultValue="users" className="flex-grow flex flex-col">
                <TabsList className="mt-2">
                    <TabsTrigger value="users">Пользователи</TabsTrigger>
                    <TabsTrigger value="roles">Роли</TabsTrigger>
                    <TabsTrigger value="settings">Глобальные настройки</TabsTrigger>
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