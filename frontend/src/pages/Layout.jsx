import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { 
    LayoutDashboard, 
    Clock, 
    Github, 
    PlusCircle, 
    Upload, 
    LogOut, 
    Menu, 
    ChevronsLeft, 
    ChevronsRight, 
    Server, 
    ShieldCheck,
    Store
} from 'lucide-react';
import ImportBotDialog from '@/components/ImportBotDialog';
import { cn } from "@/lib/utils";
import BotForm from "@/components/BotForm";
import GlobalSearch from '@/components/GlobalSearch';
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from '@/stores/appStore';
import ThemeToggle from '@/components/ThemeToggle';
import ChangelogDialog from '@/components/ChangelogDialog';

const SidebarNav = ({ onLinkClick, isCollapsed }) => {
    const bots = useAppStore(state => state.bots);
    const botStatuses = useAppStore(state => state.botStatuses);
    const hasPermission = useAppStore(state => state.hasPermission);
    const location = useLocation();

    const activeBotId = location.pathname.match(/\/bots\/(\d+)/)?.[1];

    useEffect(() => {
        if (activeBotId) {
            const activeBotElement = document.querySelector(`[data-bot-id="${activeBotId}"]`);
            const scrollContainer = activeBotElement?.closest('.custom-scrollbar');
            
            if (activeBotElement && scrollContainer) {
                setTimeout(() => {
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const elementRect = activeBotElement.getBoundingClientRect();
                    
                    const isVisible = (
                        elementRect.top >= containerRect.top &&
                        elementRect.bottom <= containerRect.bottom
                    );
                    
                    if (!isVisible) {
                        activeBotElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });
                    }
                }, 100);
            }
        }
    }, [activeBotId, bots]);

    const navLinkClasses = ({ isActive }) => cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        isActive ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-600" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        isCollapsed && "justify-center"
    );

    const iconAndText = (icon, text) => (
        <>
            {icon}
            <span className={cn("truncate", isCollapsed && "hidden")}>{text}</span>
        </>
    );

    return (
        <nav className="flex-1 flex flex-col gap-1 p-4 min-h-0">
            <NavLink to="/" end onClick={onLinkClick} className={navLinkClasses}>
                {iconAndText(<LayoutDashboard className="h-4 w-4 flex-shrink-0" />, "Дашборд")}
            </NavLink>
            
            {hasPermission('task:list') && (
                <NavLink to="/tasks" onClick={onLinkClick} className={navLinkClasses}>
                    {iconAndText(<Clock className="h-4 w-4 flex-shrink-0" />, "Планировщик")}
                </NavLink>
            )}

            <NavLink to="/graph-store" onClick={onLinkClick} className={navLinkClasses}>
                {iconAndText(<Store className="h-4 w-4 flex-shrink-0" />, "Магазин графов")}
            </NavLink>

            <Button 
                variant="ghost"
                className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    isCollapsed && "justify-center"
                )}
                onClick={async () => {
                    await useAppStore.getState().fetchChangelog();
                    useAppStore.setState({ showChangelogDialog: true });
                    onLinkClick();
                }}
            >
                {iconAndText(<Github className="h-4 w-4 flex-shrink-0" />, "История версий")}
            </Button>
            
            <Separator className="my-2" />
            
            {!isCollapsed && (
                <div className="px-3 py-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Боты</p>
                </div>
            )}
            
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar transition-all duration-200" style={{ 
                maxHeight: bots.length >= 6 ? '35vh' : 'auto',
                minHeight: bots.length > 0 ? '120px' : 'auto'
            }}>
                <div className="space-y-0.5">
                    {bots.map((bot) => (
                        <NavLink key={bot.id} to={`/bots/${bot.id}`} onClick={onLinkClick} data-bot-id={bot.id} className={({ isActive }) => cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all duration-200 ease-in-out",
                            isActive 
                                ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 text-green-600 shadow-sm" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:shadow-sm",
                            isCollapsed && "justify-center"
                        )}>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-all duration-200",
                                    botStatuses[bot.id] === 'running' 
                                        ? 'bg-green-500 animate-pulse' 
                                        : 'bg-gray-500'
                                )} />
                                {isCollapsed && (
                                    <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-md flex items-center justify-center shadow-sm">
                                        <span className="text-xs font-bold text-white">
                                            {bot.username.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className={cn("flex flex-col overflow-hidden", isCollapsed && "hidden")}>
                                <span className="font-medium truncate text-xs">{bot.username}</span>
                                <span className="text-xs text-muted-foreground truncate leading-tight">{bot.note || `${bot.server.host}:${bot.server.port}`}</span>
                            </div>
                        </NavLink>
                    ))}
                </div>
                <div className="pb-1"></div>
            </div>
        </nav>
    );
};

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const user = useAppStore(state => state.user);
    const appVersion = useAppStore(state => state.appVersion);
    const servers = useAppStore(state => state.servers);
    const logout = useAppStore(state => state.logout);
    const createBot = useAppStore(state => state.createBot);
    const fetchInitialData = useAppStore(state => state.fetchInitialData);
    const hasPermission = useAppStore(state => state.hasPermission);
    const theme = useAppStore(state => state.theme);
    const setTheme = useAppStore(state => state.setTheme);
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        return JSON.parse(localStorage.getItem('sidebar-collapsed')) || false;
    });



    useEffect(() => {
        if (location.state?.openCreateBotModal) {
            setIsCreateModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
        if (location.state?.openImportBotModal) {
            setIsImportModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(isSidebarCollapsed));
    }, [isSidebarCollapsed]);
    
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

    const sidebarContent = (isCollapsed) => (
        <div className="flex flex-col h-full bg-gradient-to-b from-background via-muted/20 to-background overflow-hidden">
            <div className={cn("p-4 border-b border-border/50", isCollapsed ? 'text-center' : '')}>
                <div className={cn("flex items-center", isCollapsed ? 'justify-center' : 'justify-between')}>
                    <div className={cn("flex items-center gap-3", isCollapsed && "hidden")}> 
                        <div className="relative">
                            <img src="/logo.png" alt="BlockMineJS Logo" className="w-10 h-10 rounded-lg shadow-lg bg-gradient-to-r from-blue-500 to-purple-500" style={{boxShadow: '0 0 24px 0 #6f6fff55'}} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                BlockMine
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {user?.username}
                            </p>
                        </div>
                    </div>
                    {!isCollapsed && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                            className="hidden md:flex hover:bg-muted/50"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                {isCollapsed && (
                    <div className="flex flex-col items-center mt-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="mb-2 hover:bg-muted/50"
                        >
                            <ChevronsRight className="h-5 w-5" />
                        </Button>
                        <div className="relative mx-auto w-10 h-10">
                            <img src="/logo.png" alt="BlockMineJS Logo" className="w-10 h-10 rounded-lg shadow-lg bg-gradient-to-r from-blue-500 to-purple-500" style={{boxShadow: '0 0 24px 0 #6f6fff55'}} />
                        </div>
                    </div>
                )}
            </div>

            <SidebarNav onLinkClick={() => setIsSheetOpen(false)} isCollapsed={isCollapsed} />
            
            <div className="mt-auto p-4 border-t border-border/50 space-y-3">
                {hasPermission('panel:user:list') && (
                    <NavLink 
                        to="/admin" 
                        onClick={() => setIsSheetOpen(false)} 
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                            isActive 
                                ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-600" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                        <span className={cn(isCollapsed && "hidden")}>Администрирование</span>
                    </NavLink>
                )}
                {hasPermission('server:list') && (
                    <NavLink 
                        to="/servers" 
                        onClick={() => setIsSheetOpen(false)} 
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                            isActive 
                                ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-blue-600" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <Server className="h-4 w-4 flex-shrink-0" />
                        <span className={cn(isCollapsed && "hidden")}>Серверы</span>
                    </NavLink>
                )}
                
                <div className={cn("flex flex-col gap-2", isCollapsed ? "px-1" : "px-3")}>
                    {hasPermission('bot:create') && (
                        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                            <DialogTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className={cn(
                                        "w-full transition-all",
                                        isCollapsed ? "h-9 w-9 p-0" : "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20 text-green-600 hover:from-green-500/20 hover:to-emerald-500/20"
                                    )}
                                    size={isCollapsed ? "icon" : "default"}
                                >
                                    <PlusCircle className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                                    {!isCollapsed && "Создать бота"}
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
                                <Button 
                                    variant="outline" 
                                    className={cn(
                                        "w-full transition-all",
                                        isCollapsed ? "h-9 w-9 p-0" : "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-600 hover:from-blue-500/20 hover:to-indigo-500/20"
                                    )}
                                    size={isCollapsed ? "icon" : "default"}
                                >
                                    <Upload className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                                    {!isCollapsed && "Импорт бота"}
                                </Button>
                            </DialogTrigger>
                            <ImportBotDialog onImportSuccess={handleImportSuccess} onCancel={() => setIsImportModalOpen(false)} />
                        </Dialog>
                    )}
                </div>
                
                <Separator className="my-2"/>

                <ThemeToggle isCollapsed={isCollapsed} />
                
                <Button 
                    variant="ghost" 
                    className={cn(
                        "w-full transition-all",
                        isCollapsed ? "h-9 w-9 p-0 justify-center" : "justify-start px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )} 
                    onClick={handleLogout}
                >
                    <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")}/>
                    {!isCollapsed && "Выйти"}
                </Button>
                
                <div className={cn("pt-2 border-t border-border/50 text-center text-xs text-muted-foreground", isCollapsed && "hidden")}>
                    <a 
                        href="https://github.com/blockmineJS/blockmine" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                    >
                        <Github className="h-4 w-4" />
                        <span>BlockMine v{appVersion}</span>
                    </a>
                    <Button
                        variant="link"
                        size="sm"
                        className="text-xs h-auto p-0 mt-1 text-muted-foreground hover:text-primary"
                        onClick={async () => {
                            await useAppStore.getState().fetchChangelog();
                            useAppStore.setState({ showChangelogDialog: true });
                        }}
                    >
                        Что нового?
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={cn(
            "grid h-screen transition-[grid-template-columns] duration-300 ease-in-out",
            isSidebarCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[280px_1fr]"
        )}>
            <GlobalSearch />
            <header className="md:hidden flex items-center justify-between p-2 border-b">
                <h2 className="text-lg font-semibold tracking-tight ml-2">BlockMine</h2>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-full max-w-xs flex">
                        {sidebarContent(false)}
                    </SheetContent>
                </Sheet>
            </header>

            <aside className="hidden md:block border-r">
                {sidebarContent(isSidebarCollapsed)}
            </aside>

            <main className="overflow-y-auto">
                <Outlet />
            </main>
            
            <ChangelogDialog />
        </div>
    );
}
