import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('management');
    const { botId } = useParams();
    const { bots } = useAppStore();
    const bot = useMemo(() => bots.find(b => b.id === parseInt(botId)), [bots, botId]);
    const navigate = useNavigate();

    const [managementData, setManagementData] = useState({ users: { items: [], total: 0 }, groups: [], permissions: [], commands: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [userPage, setUserPage] = useState(1);
    const [userPageSize, setUserPageSize] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'username', direction: 'ascending' });
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
      toast({ title: t('messages.success'), description: t('messages.commandCreated', { name: newCommand.name }) });
      fetchData();
      setIsCreateDialogOpen(false);
      navigate(`/bots/${bot.id}/commands/visual/${newCommand.id}`);
    } catch (error) {
      toast({ variant: 'destructive', title: t('messages.error'), description: `${t('messages.commandCreateError')}: ${error.message}` });
    }
  };

    const fetchData = useCallback(async (page = 1, pageSize = userPageSize, search = searchQuery, sort = sortConfig) => {
        if (!bot) return;
        setIsLoading(true);
        try {
            const sortDir = sort.direction === 'ascending' ? 'asc' : 'desc';
            const data = await apiHelper(`/api/bots/${bot.id}/management-data?page=${page}&pageSize=${pageSize}&search=${search}&sortBy=${sort.key}&sortDir=${sortDir}`);
            setManagementData(prevData => ({ ...prevData, ...data }));
            setUserPage(data.users.page);
            setUserPageSize(data.users.pageSize);
        } catch (error) {
            toast({ variant: 'destructive', title: t('messages.error'), description: t('messages.loadError') });
        }
        setIsLoading(false);
    }, [bot, toast, userPageSize, sortConfig]);

    useEffect(() => {
        if (bot) {
            fetchData(1, userPageSize, debouncedSearchQuery, sortConfig);
        }
    }, [bot, debouncedSearchQuery, sortConfig]);

    const handleSortChange = (newSortConfig) => {
        setSortConfig(newSortConfig);
    };
    
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
                onPageChange={(newPage) => fetchData(newPage, userPageSize, debouncedSearchQuery, sortConfig)}
                        groups={managementData.groups}
                        botId={bot?.id}
                        isLoading={isLoading}
                onDataChange={() => fetchData(userPage, userPageSize, debouncedSearchQuery, sortConfig)}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                sortConfig={sortConfig}
                onSortChange={handleSortChange}
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
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>
                    {t('description', { username: bot?.username })}
                </CardDescription>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mt-2">
                        <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
                        <TabsTrigger value="groups">{t('tabs.groups')}</TabsTrigger>
                        <TabsTrigger value="permissions">{t('tabs.permissions')}</TabsTrigger>
                        <TabsTrigger value="commands">{t('tabs.commands')}</TabsTrigger>
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