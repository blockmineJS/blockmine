import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Server, LayoutDashboard, Upload, Github, Clock, LogOut, ShieldCheck, Menu } from 'lucide-react';
import ImportBotDialog from '@/components/ImportBotDialog';
import { cn } from "@/lib/utils";
import BotForm from "@/components/BotForm";
import GlobalSearch from '@/components/GlobalSearch';
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from '@/stores/appStore';

const SidebarNav = ({ onLinkClick }) => {
    const bots = useAppStore(state => state.bots);
    const botStatuses = useAppStore(state => state.botStatuses);
    const hasPermission = useAppStore(state => state.hasPermission);

    return (
        <nav className="flex-grow flex flex-col gap-1 overflow-y-auto pr-2">
            <NavLink to="/" end onClick={onLinkClick} className={({ isActive }) => cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent", isActive ? "bg-accent" : "transparent")}>
                <LayoutDashboard className="h-4 w-4" /> Дашборд
            </NavLink>
            
            {hasPermission('task:list') && (
                <NavLink to="/tasks" onClick={onLinkClick} className={({ isActive }) => cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent", isActive ? "bg-accent" : "transparent")}>
                    <Clock className="h-4 w-4" /> Планировщик
                </NavLink>
            )}
            
            <Separator className="my-2" />
            
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground">БОТЫ</p>
            {bots.map((bot) => (
                <NavLink key={bot.id} to={`/bots/${bot.id}`} onClick={onLinkClick} className={({ isActive }) => cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent", isActive ? "bg-accent" : "transparent")}>
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", botStatuses[bot.id] === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-600')} />
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-medium truncate">{bot.username}</span>
                        <span className="text-xs text-muted-foreground truncate">{bot.note || `${bot.server.host}:${bot.server.port}`}</span>
                    </div>
                </NavLink>
            ))}
        </nav>
    );
};

export default function Layout() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const user = useAppStore(state => state.user);
    const appVersion = useAppStore(state => state.appVersion);
    const servers = useAppStore(state => state.servers);
    const logout = useAppStore(state => state.logout);
    const createBot = useAppStore(state => state.createBot);
    const fetchInitialData = useAppStore(state => state.fetchInitialData);
    const hasPermission = useAppStore(state => state.hasPermission);
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const handleCreateBot = async (botData) => {
        setIsSaving(true);
        try {
            const newBot = await createBot(botData);
            if (newBot) {
                setIsCreateModalOpen(false);
                setIsSheetOpen(false);
                navigate(`/bots/${newBot.id}`);
            }
        } catch (error) {
            console.error("Не удалось создать бота:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImportSuccess = (newBot) => {
        setIsImportModalOpen(false);
        setIsSheetOpen(false);
        fetchInitialData();
        toast({ title: "Успех!", description: `Бот "${newBot.username}" успешно импортирован.` });
        navigate(`/bots/${newBot.id}`);
    };

    const handleLogout = () => {
        setIsSheetOpen(false);
        logout();
    };

    const sidebarContent = (
        <div className="flex flex-col h-full p-2">
            <div className="p-2 mb-2">
                <h2 className="text-lg font-semibold tracking-tight">BlockMine</h2>
                <p className="text-sm text-muted-foreground">Пользователь: {user?.username}</p>
            </div>

            <SidebarNav onLinkClick={() => setIsSheetOpen(false)} />
            
            <div className="mt-auto pt-2 border-t">
                {hasPermission('panel:user:list') && (
                    <NavLink to="/admin" onClick={() => setIsSheetOpen(false)} className={({ isActive }) => cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent", isActive ? "bg-accent" : "transparent")}>
                        <ShieldCheck className="h-4 w-4" /> Администрирование
                    </NavLink>
                )}
                {hasPermission('server:list') && (
                    <NavLink to="/servers" onClick={() => setIsSheetOpen(false)} className={({ isActive }) => cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent", isActive ? "bg-accent" : "transparent")}>
                        <Server className="h-4 w-4" /> Серверы
                    </NavLink>
                )}
                
                <div className="flex flex-col gap-2 mt-2">
                    {hasPermission('bot:create') && (
                        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Создать бота
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="h-[90vh] flex flex-col">
                                <BotForm servers={servers} onFormSubmit={handleCreateBot} isSaving={isSaving} isCreation={true} />
                            </DialogContent>
                        </Dialog>
                    )}
                    {hasPermission('bot:import') && (
                        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <Upload className="mr-2 h-4 w-4" /> Импорт бота
                                </Button>
                            </DialogTrigger>
                            <ImportBotDialog onImportSuccess={handleImportSuccess} onCancel={() => setIsImportModalOpen(false)} />
                        </Dialog>
                    )}
                </div>
                
                <Separator className="my-2"/>
                
                <Button variant="ghost" className="w-full justify-start px-3" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4"/> Выйти
                </Button>
                
                <div className="mt-2 pt-2 border-t text-center text-xs text-muted-foreground">
                    <a href="https://github.com/blockmineJS/blockmine" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                        <Github className="h-4 w-4" />
                        <span>BlockMine v{appVersion}</span>
                    </a>
                </div>
            </div>
        </div>
    );


    return (
        <div className="grid md:grid-cols-[280px_1fr] h-screen">
            <GlobalSearch />
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-2 border-b">
                <h2 className="text-lg font-semibold tracking-tight ml-2">BlockMine</h2>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-full max-w-xs flex">
                        {sidebarContent}
                    </SheetContent>
                </Sheet>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block border-r">
                {sidebarContent}
            </aside>

            {/* Main Content */}
            <main className="overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}