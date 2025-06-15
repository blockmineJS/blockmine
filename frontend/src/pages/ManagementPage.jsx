import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';

import UsersManager from '@/components/management/UsersManager';
import GroupsManager from '@/components/management/GroupsManager';
import PermissionsManager from '@/components/management/PermissionsManager';
import CommandsManager from '@/components/management/CommandsManager';

export default function ManagementPage() {
    const { botId } = useParams();
    const { bots } = useAppStore();
    const bot = useMemo(() => bots.find(b => b.id === parseInt(botId)), [bots, botId]);

    const [managementData, setManagementData] = useState({ users: [], groups: [], permissions: [], commands: [] }); 
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        if (!bot) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/bots/${bot.id}/management-data`);
            if (!response.ok) throw new Error('Failed to fetch management data');
            const data = await response.json();
            setManagementData(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить данные управления.' });
        }
        setIsLoading(false);
    }, [bot, toast]);

    useEffect(() => {
        if (bot) {
            fetchData();
        }
    }, [bot, fetchData]);
    
    return (
        <div className="h-full flex flex-col p-4">
            <Tabs defaultValue="groups" className="flex-grow flex flex-col">
                <CardHeader className="px-0">
                    <CardTitle>Управление ботом</CardTitle>
                    <CardDescription>
                        Настройте пользователей, группы, права и команды для бота {bot?.username}.
                    </CardDescription>
                    <TabsList className="mt-2">
                        <TabsTrigger value="users">Пользователи</TabsTrigger>
                        <TabsTrigger value="groups">Группы</TabsTrigger>
                        <TabsTrigger value="permissions">Права</TabsTrigger>
                        <TabsTrigger value="commands">Команды</TabsTrigger>
                    </TabsList>
                </CardHeader>
                <TabsContent value="users" className="flex-grow min-h-0">
                    <UsersManager 
                        users={managementData.users} 
                        groups={managementData.groups}
                        botId={bot?.id}
                        isLoading={isLoading}
                        onDataChange={fetchData}
                    />
                </TabsContent>
                <TabsContent value="groups" className="flex-grow min-h-0">
                    <GroupsManager 
                        groups={managementData.groups} 
                        allPermissions={managementData.permissions}
                        botId={bot?.id}
                        isLoading={isLoading}
                        onDataChange={fetchData} 
                    />
                </TabsContent>
                 <TabsContent value="permissions" className="flex-grow min-h-0">
                    <PermissionsManager 
                        permissions={managementData.permissions} 
                        botId={bot?.id}
                        isLoading={isLoading}
                        onDataChange={fetchData}
                    />
                </TabsContent>
                <TabsContent value="commands" className="flex-grow min-h-0">
                    <CommandsManager
                        commands={managementData.commands}
                        allPermissions={managementData.permissions}
                        botId={bot?.id}
                        isLoading={isLoading}
                        onDataChange={fetchData}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}