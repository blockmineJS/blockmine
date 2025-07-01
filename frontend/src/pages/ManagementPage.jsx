import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';
import { apiHelper } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';

import CommandsManager from '@/components/management/CommandsManager';
import UsersManager from '@/components/management/UsersManager';
import GroupsManager from '@/components/management/GroupsManager';
import PermissionsManager from '@/components/management/PermissionsManager';
import { CreateCommandDialog } from '@/components/management/CreateCommandDialog';

export default function ManagementPage() {
    const { botId } = useParams();
    const { bots } = useAppStore();
    const bot = useMemo(() => bots.find(b => b.id === parseInt(botId)), [bots, botId]);
    const navigate = useNavigate();

    const [managementData, setManagementData] = useState({ users: { items: [], total: 0 }, groups: [], permissions: [], commands: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [userPage, setUserPage] = useState(1);
    const [userPageSize, setUserPageSize] = useState(20); 
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('commands');

  const handleCreateCommand = async (commandData) => {
    try {
      const newCommand = await apiHelper(`/api/bots/${bot.id}/commands`, {
        method: 'POST',
        body: JSON.stringify({ ...commandData, isVisual: true }),
      });
      toast({ title: 'Успех', description: `Команда \"${newCommand.name}\" успешно создана.` });
      fetchData();
      setIsCreateDialogOpen(false);
      navigate(`/bots/${bot.id}/commands/visual/${newCommand.id}`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка', description: `Не удалось создать команду: ${error.message}` });
    }
  };

    const fetchData = useCallback(async (page = 1, pageSize = userPageSize, search = searchQuery) => {
        if (!bot) return;
        setIsLoading(true);
        try {
            const data = await apiHelper(`/api/bots/${bot.id}/management-data?page=${page}&pageSize=${pageSize}&search=${search}`);
            setManagementData(prevData => ({ ...prevData, ...data }));
            setUserPage(data.users.page);
            setUserPageSize(data.users.pageSize);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить данные управления.' });
        }
        setIsLoading(false);
    }, [bot, toast, userPageSize]);

    useEffect(() => {
        if (bot) {
            fetchData(1, userPageSize, debouncedSearchQuery);
        }
    }, [bot, fetchData, debouncedSearchQuery]);
    
    const motionVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    };
    
    const tabContent = {
        users: (
                    <UsersManager 
                        users={managementData.users.items} 
                        pagination={{ 
                            page: managementData.users.page, 
                            pageSize: managementData.users.pageSize,
                            total: managementData.users.total,
                            totalPages: managementData.users.totalPages,
                        }}
                onPageChange={(newPage) => fetchData(newPage, userPageSize, debouncedSearchQuery)}
                        groups={managementData.groups}
                        botId={bot?.id}
                        isLoading={isLoading}
                onDataChange={() => fetchData(userPage, userPageSize, debouncedSearchQuery)}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                    />
        ),
        groups: (
                    <GroupsManager 
                        groups={managementData.groups} 
                        allPermissions={managementData.permissions}
                        botId={bot?.id}
                        isLoading={isLoading}
                        onDataChange={fetchData} 
                    />
        ),
        permissions: (
                    <PermissionsManager 
                        permissions={managementData.permissions} 
                        botId={bot?.id}
                        isLoading={isLoading}
                        onDataChange={fetchData}
                    />
        ),
        commands: (
                    <CommandsManager
                        commands={managementData.commands}
                        allPermissions={managementData.permissions}
                        botId={bot?.id}
                        isLoading={isLoading}
                        onDataChange={fetchData}
                    />
        )
    };

    return (
        <div className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Управление ботом</CardTitle>
                <CardDescription>
                    Настройте пользователей, группы, права и команды для бота {bot?.username}.
                </CardDescription>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mt-2">
                        <TabsTrigger value="users">Пользователи</TabsTrigger>
                        <TabsTrigger value="groups">Группы</TabsTrigger>
                        <TabsTrigger value="permissions">Права</TabsTrigger>
                        <TabsTrigger value="commands">Команды</TabsTrigger>
                    </TabsList>
            </Tabs>
            </CardHeader>
            
            <main className="flex-grow min-h-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        variants={motionVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {tabContent[activeTab]}
                    </motion.div>
                </AnimatePresence>
            </main>

            <CreateCommandDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onCreate={handleCreateCommand} />
        </div>
    );
}