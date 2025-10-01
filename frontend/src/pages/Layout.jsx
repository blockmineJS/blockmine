import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
    Store,
    Lightbulb,
    MessageSquarePlus,
    Globe
} from 'lucide-react';
import ImportBotDialog from '@/components/ImportBotDialog';
import { cn } from "@/lib/utils";
import BotForm from "@/components/BotForm";
import GlobalSearch from '@/components/GlobalSearch';
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from '@/stores/appStore';
import ThemeToggle from '@/components/ThemeToggle';
import ChangelogDialog from '@/components/ChangelogDialog';
import PresenceButton from '@/components/PresenceButton';
import { apiHelper } from '@/lib/api';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ContributeDialog from '@/components/ContributeDialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const SortableBotItem = ({ bot, isCollapsed, botStatuses, onLinkClick, isDragging: globalIsDragging }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: bot.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleClick = (e) => {
        if (isDragging || globalIsDragging) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        onLinkClick(e);
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} 
            {...listeners}
            onMouseDown={(e) => {
                if (isDragging || globalIsDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }}
        >
            <NavLink 
                to={`/bots/${bot.id}`} 
                onClick={handleClick} 
                data-bot-id={bot.id} 
                className={({ isActive }) => cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all duration-200 ease-in-out cursor-move",
                    isActive 
                        ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 text-green-600 shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:shadow-sm",
                    isCollapsed && "justify-center"
                )}
            >
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
        </div>
    );
};

const BotItem = ({ bot, isCollapsed, botStatuses, onLinkClick }) => {
    return (
        <NavLink 
            to={`/bots/${bot.id}`} 
            onClick={onLinkClick} 
            data-bot-id={bot.id} 
            className={({ isActive }) => cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all duration-200 ease-in-out cursor-pointer",
                isActive 
                    ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 text-green-600 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:shadow-sm",
                isCollapsed && "justify-center"
            )}
        >
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
    );
};

const SidebarNav = ({ onLinkClick, isCollapsed, isSheetOpen }) => {
    const bots = useAppStore(state => state.bots);
    const botStatuses = useAppStore(state => state.botStatuses);
    const hasPermission = useAppStore(state => state.hasPermission);
    const updateBotOrder = useAppStore(state => state.updateBotOrder);
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [randomFeature, setRandomFeature] = useState({ text: 'Улучшить BlockMine', icon: <Lightbulb className="h-4 w-4 flex-shrink-0" /> });
    const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);

    useEffect(() => {
        const texts = ["Предложить улучшение", "Предложить изменение", "Задать вопрос", "Улучшить BlockMine"];
        const icons = [
            <Lightbulb key="lightbulb" className="h-4 w-4 flex-shrink-0" />,
            <MessageSquarePlus key="msg" className="h-4 w-4 flex-shrink-0" />
        ];
        const randomText = texts[Math.floor(Math.random() * texts.length)];
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];
        setRandomFeature({ text: randomText, icon: randomIcon });
    }, []);

    const activeBotId = location.pathname.match(/\/bots\/(\d+)/)?.[1];

    const handleNavClick = (e, botId) => {
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onLinkClick(e);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 12,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = useCallback((event) => {
        if (isSheetOpen) return;
        setIsDragging(true);
    }, [
        isSheetOpen
    ]);

    const handleDragEnd = useCallback(async (event) => {
        const { active, over } = event;

        setTimeout(() => setIsDragging(false), 100);

        if (active.id !== over.id) {
            const oldIndex = bots.findIndex(bot => bot.id === active.id);
            const newIndex = bots.findIndex(bot => bot.id === over.id);
            
            
            const oldBots = [...bots];

            try {
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const newBots = arrayMove(bots, oldIndex, newIndex);
                updateBotOrder(newBots);

                const targetBot = bots[newIndex];
                const newSortOrder = targetBot.sortOrder;

                const result = await apiHelper(`/api/bots/${active.id}/sort-order`, {
                    method: 'PUT',
                    body: JSON.stringify({ 
                        newPosition: newSortOrder,
                        oldIndex: oldIndex,
                        newIndex: newIndex 
                    }),
                });

            } catch (error) {
                console.error('[Drag] Ошибка:', error);
                updateBotOrder(oldBots);
                toast({
                    title: "Ошибка",
                    description: "Не удалось обновить порядок ботов",
                    variant: "destructive",
                });
            }
        }
    }, [bots, updateBotOrder, toast]);

    useEffect(() => {
        if (isSheetOpen) {
            setIsDragging(false);
        }
    }, [isSheetOpen]);

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

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDragging && !isSheetOpen) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        const handleClick = (e) => {
            if (isDragging && !isSheetOpen) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };

        const handleMouseDown = (e) => {
            if (isDragging && !isSheetOpen) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };

        if (isDragging && !isSheetOpen) {
            window.addEventListener('beforeunload', handleBeforeUnload);
            document.addEventListener('click', handleClick, true);
            document.addEventListener('mousedown', handleMouseDown, true);
            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
                document.removeEventListener('click', handleClick, true);
                document.removeEventListener('mousedown', handleMouseDown, true);
            };
        }
    }, [isDragging, isSheetOpen]);

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
        <nav className="flex-1 flex flex-col gap-1 p-4 min-h-0 overflow-y-auto md:overflow-visible pb-20 md:pb-0 overscroll-contain">
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

            {hasPermission('bot:update') && (
                <NavLink to="/proxy-config" onClick={onLinkClick} className={navLinkClasses}>
                    {iconAndText(<Globe className="h-4 w-4 flex-shrink-0" />, "Прокси")}
                </NavLink>
            )}

            <Dialog open={isContributeModalOpen} onOpenChange={setIsContributeModalOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-muted/50",
                            isCollapsed && "justify-center"
                        )}
                        onClick={() => {
                            setIsContributeModalOpen(true);
                            if (typeof onLinkClick === 'function') onLinkClick();
                        }}
                    >
                        {iconAndText(randomFeature.icon, randomFeature.text)}
                    </Button>
                </DialogTrigger>
                <ContributeDialog onClose={() => setIsContributeModalOpen(false)} />
            </Dialog>
            
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
            
            <div
                className={cn(
                    "flex-1 min-h-0 custom-scrollbar transition-all duration-200 md:overflow-y-auto",
                    bots.length > 0 && "min-h-[96px]",
                    bots.length >= 6 && "md:max-h-[35vh]"
                )}
            >
                {isSheetOpen ? (
                    <div className="space-y-0.5">
                        {bots.map((bot) => (
                            <BotItem key={bot.id} bot={bot} isCollapsed={isCollapsed} botStatuses={botStatuses} onLinkClick={onLinkClick} />
                        ))}
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={bots.map(bot => bot.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div 
                                className="space-y-0.5"
                                onMouseDown={(e) => {
                                    if (isDragging) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }
                                }}
                                onClick={(e) => {
                                    if (isDragging) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }
                                }}
                            >
                                {bots.map((bot) => (
                                    <SortableBotItem key={bot.id} bot={bot} isCollapsed={isCollapsed} botStatuses={botStatuses} onLinkClick={onLinkClick} isDragging={isDragging} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
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
        fetchInitialData().then(() => {
            toast({ title: "Успех!", description: `Бот "${newBot.username}" успешно импортирован.` });
            navigate(`/bots/${newBot.id}`);
        });
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

            <SidebarNav onLinkClick={() => setIsSheetOpen(false)} isCollapsed={isCollapsed} isSheetOpen={isSheetOpen} />
            
            <div className="mt-auto p-3 sm:p-4 border-t border-border/50 space-y-2.5">
                {hasPermission('panel:user:list') && (
                    <NavLink 
                        to="/admin" 
                        onClick={() => setIsSheetOpen(false)} 
                        className={({ isActive }) => cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
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
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
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
                
                <div className={cn("flex flex-col gap-2", isCollapsed ? "px-1" : "px-2.5")}> 
                    {hasPermission('bot:create') && (
                        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                            <DialogTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className={cn(
                                        "w-full transition-all",
                                        isCollapsed ? "h-9 w-9 p-0" : "h-9 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20 text-green-600 hover:from-green-500/20 hover:to-emerald-500/20"
                                    )}
                                    size={isCollapsed ? "icon" : "default"}
                                >
                                    <PlusCircle className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                                    {!isCollapsed && "Создать бота"}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="h-[90vh] flex flex-col">
                                <VisuallyHidden>
                                    <DialogTitle>Создание нового бота</DialogTitle>
                                    <DialogDescription>
                                        Заполните информацию ниже, чтобы добавить нового бота в панель.
                                    </DialogDescription>
                                </VisuallyHidden>
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
                                        isCollapsed ? "h-9 w-9 p-0" : "h-9 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-600 hover:from-blue-500/20 hover:to-indigo-500/20"
                                    )}
                                    size={isCollapsed ? "icon" : "default"}
                                >
                                    <Upload className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                                    {!isCollapsed && "Импорт бота"}
                                </Button>
                            </DialogTrigger>
                            <ImportBotDialog 
                                onImportSuccess={handleImportSuccess} 
                                onCancel={() => setIsImportModalOpen(false)} 
                                servers={servers}
                            />
                        </Dialog>
                    )}
                </div>
                
                <Separator className="my-2"/>

                <ThemeToggle isCollapsed={isCollapsed} />
                
                <Button 
                    variant="ghost" 
                    className={cn(
                        "w-full transition-all",
                        isCollapsed ? "h-9 w-9 p-0 justify-center" : "h-9 justify-start px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
            "grid h-[100dvh] md:h-screen transition-[grid-template-columns] duration-300 ease-in-out",
            isSidebarCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[280px_1fr]"
        )}>
            <div className="fixed z-40 flex items-center gap-2" style={{ top: 'max(8px, env(safe-area-inset-top))', right: 'max(8px, env(safe-area-inset-right))' }}>
            <GlobalSearch />
                <PresenceButton />
            </div>
            <div className="md:hidden fixed z-50 top-[max(0.5rem,env(safe-area-inset-top))] left-[max(0.5rem,env(safe-area-inset-left))]">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-background/80 backdrop-blur border"
                            aria-label="Открыть меню"
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-full max-w-[85vw] sm:max-w-xs h-[100dvh] flex">
                        {sidebarContent(false)}
                    </SheetContent>
                </Sheet>
            </div>

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
