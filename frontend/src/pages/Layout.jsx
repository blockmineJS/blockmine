import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation, useOutlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    Key,
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
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ChangelogDialog from '@/components/ChangelogDialog';
import PresenceButton from '@/components/PresenceButton';
import { apiHelper } from '@/lib/api';
import FadeTransition from '@/components/FadeTransition';
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

const SIDEBAR_TRANSITION = 'duration-300 ease-out';

const sidebarLabelClasses = (isCollapsed, className = '') =>
    cn(
        "overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform,margin] " + SIDEBAR_TRANSITION,
        isCollapsed ? "ml-0 max-w-0 opacity-0 -translate-x-2" : "ml-0 max-w-[180px] opacity-100 translate-x-0",
        className
    );

const sidebarTextStackClasses = (isCollapsed, className = '') =>
    cn(
        "flex min-w-0 flex-col overflow-hidden transition-[max-width,opacity,transform] " + SIDEBAR_TRANSITION,
        isCollapsed ? "max-w-0 opacity-0 -translate-x-2" : "max-w-[200px] opacity-100 translate-x-0",
        className
    );

const sidebarAvatarBadgeClasses = (isCollapsed) =>
    cn(
        "overflow-hidden transition-[width,opacity,transform] " + SIDEBAR_TRANSITION,
        isCollapsed ? "w-5 opacity-100 scale-100" : "w-0 opacity-0 scale-90"
    );

const sidebarBrandLogoClasses = (isHidden) =>
    cn(
        "h-8 shrink-0 overflow-hidden rounded transition-[width,opacity,transform] " + SIDEBAR_TRANSITION,
        isHidden ? "w-0 opacity-0 scale-90" : "w-8 opacity-100 scale-100"
    );

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
                    "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-[background-color,color,gap,padding] " + SIDEBAR_TRANSITION,
                    isActive
                        ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-primary before:rounded-r"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    isCollapsed && "mx-auto h-9 w-9 justify-center gap-0 px-0 py-0"
                )}
            >
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-200",
                        botStatuses[bot.id] === 'running'
                            ? 'bg-green-500 animate-pulse'
                            : 'bg-gray-500'
                    )} />
                    <div className={sidebarAvatarBadgeClasses(isCollapsed)}>
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-primary">
                            <span className="text-xs font-bold text-primary-foreground">
                                {bot.username.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
                <div className={sidebarTextStackClasses(isCollapsed)}>
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
                "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-[background-color,color,gap,padding] " + SIDEBAR_TRANSITION,
                isActive
                    ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-primary before:rounded-r"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                isCollapsed && "mx-auto h-9 w-9 justify-center gap-0 px-0 py-0"
            )}
        >
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-200",
                    botStatuses[bot.id] === 'running'
                        ? 'bg-green-500 animate-pulse'
                        : 'bg-gray-500'
                )} />
                <div className={sidebarAvatarBadgeClasses(isCollapsed)}>
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-primary">
                        <span className="text-xs font-bold text-primary-foreground">
                            {bot.username.charAt(0).toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
            <div className={sidebarTextStackClasses(isCollapsed)}>
                <span className="font-medium truncate text-xs">{bot.username}</span>
                <span className="text-xs text-muted-foreground truncate leading-tight">{bot.note || `${bot.server.host}:${bot.server.port}`}</span>
            </div>
        </NavLink>
    );
};

const getLayoutTransitionKey = (pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'dashboard';
    if (segments[0] === 'bots') return `bots/${segments[1] || 'unknown'}`;
    return segments[0];
};

const OutletViewport = React.memo(function OutletViewport({ transitionKey, children }) {
    return (
        <main className="min-w-0 overflow-y-auto" style={{ contain: 'layout paint' }}>
            <FadeTransition transitionKey={transitionKey}>
                {children}
            </FadeTransition>
        </main>
    );
});

const SidebarNav = ({ onLinkClick, isCollapsed, isSheetOpen }) => {
    const { t } = useTranslation(['sidebar', 'common']);
    const bots = useAppStore(state => state.bots);
    const botStatuses = useAppStore(state => state.botStatuses);
    const hasPermission = useAppStore(state => state.hasPermission);
    const updateBotOrder = useAppStore(state => state.updateBotOrder);
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [randomFeature, setRandomFeature] = useState({ text: t('contribute.improve'), icon: <Lightbulb className="h-4 w-4 flex-shrink-0" /> });
    const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);

    useEffect(() => {
        const texts = [
            t('contribute.suggest'),
            t('contribute.change'),
            t('contribute.question'),
            t('contribute.improve')
        ];
        const icons = [
            <Lightbulb key="lightbulb" className="h-4 w-4 flex-shrink-0" />,
            <MessageSquarePlus key="msg" className="h-4 w-4 flex-shrink-0" />
        ];
        const randomText = texts[Math.floor(Math.random() * texts.length)];
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];
        setRandomFeature({ text: randomText, icon: randomIcon });
    }, [t]);

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
                console.error('[Drag] Error:', error);
                updateBotOrder(oldBots);
                toast({
                    title: t('messages.error', { ns: 'common' }),
                    description: t('botOrderError'),
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
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-[background-color,color,gap,padding] " + SIDEBAR_TRANSITION,
        isActive ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-primary before:rounded-r" : "text-muted-foreground hover:text-foreground hover:bg-accent",
        isCollapsed && "mx-auto h-9 w-9 justify-center gap-0 px-0"
    );

    const iconAndText = (icon, text) => (
        <>
            {icon}
            <span className={sidebarLabelClasses(isCollapsed, "truncate")}>{text}</span>
        </>
    );

    return (
        <nav className="flex-1 flex flex-col gap-1 p-4 min-h-0 overflow-y-auto md:overflow-visible pb-20 md:pb-0 overscroll-contain">
            <NavLink to="/" end onClick={onLinkClick} className={navLinkClasses}>
                {iconAndText(<LayoutDashboard className="h-4 w-4 flex-shrink-0" />, t('dashboard'))}
            </NavLink>

            {hasPermission('task:list') && (
                <NavLink to="/tasks" onClick={onLinkClick} className={navLinkClasses}>
                    {iconAndText(<Clock className="h-4 w-4 flex-shrink-0" />, t('scheduler'))}
                </NavLink>
            )}

            <NavLink to="/graph-store" onClick={onLinkClick} className={navLinkClasses}>
                {iconAndText(<Store className="h-4 w-4 flex-shrink-0" />, t('graphStore'))}
            </NavLink>

            <NavLink to="/api-keys" onClick={onLinkClick} className={navLinkClasses}>
                {iconAndText(<Key className="h-4 w-4 flex-shrink-0" />, t('apiKeys'))}
            </NavLink>

            {hasPermission('bot:update') && (
                <NavLink to="/proxy-config" onClick={onLinkClick} className={navLinkClasses}>
                    {iconAndText(<Globe className="h-4 w-4 flex-shrink-0" />, t('proxy'))}
                </NavLink>
            )}

            <Dialog open={isContributeModalOpen} onOpenChange={setIsContributeModalOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50",
                            isCollapsed && "mx-auto h-9 w-9 justify-center gap-0 px-0"
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
                    "w-full justify-start flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 text-muted-foreground hover:text-foreground hover:bg-accent",
                    isCollapsed && "mx-auto h-9 w-9 justify-center gap-0 px-0"
                )}
                onClick={async () => {
                    onLinkClick();
                    await useAppStore.getState().openChangelogDialog();
                }}
            >
                {iconAndText(<Github className="h-4 w-4 flex-shrink-0" />, t('changelog'))}
            </Button>

            <Separator className="my-2" />

            <div className={cn(
                "overflow-hidden px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-[max-height,opacity,transform,padding] " + SIDEBAR_TRANSITION,
                isCollapsed ? "max-h-0 opacity-0 -translate-y-1 py-0" : "max-h-9 opacity-100 translate-y-0 py-1.5"
            )}>
                <div className="flex min-h-[15px] items-start">
                    <p className="block -translate-y-[8px] text-xs font-semibold leading-none text-muted-foreground uppercase tracking-wider">{t('bots')}</p>
                </div>
            </div>

            <div
                className={cn(
                    "flex-1 min-h-0 custom-scrollbar transition-[max-height,padding] " + SIDEBAR_TRANSITION + " md:overflow-y-auto",
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
    const { t } = useTranslation(['sidebar', 'common']);
    const navigate = useNavigate();
    const location = useLocation();
    const outlet = useOutlet();
    const { toast } = useToast();

    const user = useAppStore(state => state.user);
    const appVersion = useAppStore(state => state.appVersion);
    const servers = useAppStore(state => state.servers);
    const proxies = useAppStore(state => state.proxies);
    const logout = useAppStore(state => state.logout);
    const createBot = useAppStore(state => state.createBot);
    const fetchInitialData = useAppStore(state => state.fetchInitialData);
    const hasPermission = useAppStore(state => state.hasPermission);
    const theme = useAppStore(state => state.theme);
    const setTheme = useAppStore(state => state.setTheme);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        return JSON.parse(localStorage.getItem('sidebar-collapsed')) || false;
    });
    const [isSidebarBrandHidden, setIsSidebarBrandHidden] = useState(() => {
        return JSON.parse(localStorage.getItem('sidebar-brand-hidden')) || false;
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

    useEffect(() => {
        localStorage.setItem('sidebar-brand-hidden', JSON.stringify(isSidebarBrandHidden));
    }, [isSidebarBrandHidden]);

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
            toast({ title: t('messages.success', { ns: 'common' }), description: t('botImported', { name: newBot.username }) });
            navigate(`/bots/${newBot.id}`);
        });
    };

    const handleLogout = () => {
        setIsLogoutDialogOpen(false);
        setIsSheetOpen(false);
        logout();
    };

    const layoutTransitionKey = getLayoutTransitionKey(location.pathname);

    const sidebarContent = (isCollapsed) => (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <div className="border-b p-4">
                <div className={cn(
                    "relative overflow-hidden transition-[height] " + SIDEBAR_TRANSITION,
                    isCollapsed ? "h-[76px]" : "h-[52px]"
                )}>
                    <div className={cn(
                        "absolute inset-0 flex items-center justify-between transition-all " + SIDEBAR_TRANSITION,
                        isCollapsed ? "pointer-events-none opacity-0 -translate-y-2 scale-95" : "opacity-100 translate-y-0 scale-100"
                    )}>
                        <button
                            type="button"
                            onClick={() => setIsSidebarBrandHidden((previous) => !previous)}
                            aria-label={t(isSidebarBrandHidden ? 'brandToggle.show' : 'brandToggle.hide')}
                            title={t(isSidebarBrandHidden ? 'brandToggle.show' : 'brandToggle.hide')}
                            className={cn(
                                "flex min-w-0 flex-1 items-center rounded-md px-1 py-1 text-left transition-[gap,background-color] " + SIDEBAR_TRANSITION,
                                isSidebarBrandHidden ? "gap-0" : "gap-3",
                                "hover:bg-muted/50"
                            )}
                        >
                            <div className={sidebarBrandLogoClasses(isSidebarBrandHidden)}>
                                <img src="/logo.png" alt="BlockMineJS Logo" className="h-8 w-8 rounded" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base font-bold leading-tight">
                                    BlockMine
                                </h2>
                                <p className="truncate text-xs leading-tight text-muted-foreground">
                                    {user?.username}
                                </p>
                            </div>
                        </button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="hidden md:flex hover:bg-muted/50"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className={cn(
                        "absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all " + SIDEBAR_TRANSITION,
                        isCollapsed ? "opacity-100 translate-y-0 scale-100" : "pointer-events-none opacity-0 translate-y-2 scale-95"
                    )}>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="hover:bg-accent"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                        <button
                            type="button"
                            onClick={() => setIsSidebarBrandHidden((previous) => !previous)}
                            aria-label={t(isSidebarBrandHidden ? 'brandToggle.show' : 'brandToggle.hide')}
                            title={t(isSidebarBrandHidden ? 'brandToggle.show' : 'brandToggle.hide')}
                            className="relative mx-auto flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-200 hover:bg-accent"
                        >
                            <div className={cn(
                                "absolute inset-0 flex items-center justify-center overflow-hidden rounded transition-[opacity,transform] " + SIDEBAR_TRANSITION,
                                isSidebarBrandHidden ? "opacity-0 scale-90" : "opacity-100 scale-100"
                            )}>
                                <img src="/logo.png" alt="BlockMineJS Logo" className="h-8 w-8 rounded" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <SidebarNav onLinkClick={() => setIsSheetOpen(false)} isCollapsed={isCollapsed} isSheetOpen={isSheetOpen} />

            <div className="mt-auto p-3 sm:p-4 border-t space-y-2">
                {hasPermission('panel:user:list') && (
                    <NavLink
                        to="/admin"
                        onClick={() => setIsSheetOpen(false)}
                        className={({ isActive }) => cn(
                            "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-[background-color,color,gap,padding] " + SIDEBAR_TRANSITION,
                            isActive
                                ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-primary before:rounded-r"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent",
                            isCollapsed && "mx-auto h-9 w-9 justify-center gap-0 px-0"
                        )}
                    >
                        <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                        <span className={sidebarLabelClasses(isCollapsed)}>{t('admin')}</span>
                    </NavLink>
                )}
                {hasPermission('server:list') && (
                    <NavLink
                        to="/servers"
                        onClick={() => setIsSheetOpen(false)}
                        className={({ isActive }) => cn(
                            "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-[background-color,color,gap,padding] " + SIDEBAR_TRANSITION,
                            isActive
                                ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-primary before:rounded-r"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent",
                            isCollapsed && "mx-auto h-9 w-9 justify-center gap-0 px-0"
                        )}
                    >
                        <Server className="h-4 w-4 flex-shrink-0" />
                        <span className={sidebarLabelClasses(isCollapsed)}>{t('servers')}</span>
                    </NavLink>
                )}

                {hasPermission('proxy:list') && (
                    <NavLink
                        to="/proxies"
                        onClick={() => setIsSheetOpen(false)}
                        className={({ isActive }) => cn(
                            "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-[background-color,color,gap,padding] " + SIDEBAR_TRANSITION,
                            isActive
                                ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-primary before:rounded-r"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent",
                            isCollapsed && "mx-auto h-9 w-9 justify-center gap-0 px-0"
                        )}
                    >
                        <Globe className="h-4 w-4 flex-shrink-0" />
                        <span className={sidebarLabelClasses(isCollapsed)}>{t('proxies')}</span>
                    </NavLink>
                )}

                <div className={cn("flex flex-col gap-2", isCollapsed ? "px-1" : "px-2")}>
                    {hasPermission('bot:create') && (
                        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    className={cn(
                                        "w-full transition-[padding,gap] " + SIDEBAR_TRANSITION,
                                        isCollapsed ? "mx-auto h-9 w-9 justify-center px-0 gap-0 self-center" : "justify-center"
                                    )}
                                    size="sm"
                                >
                                    <PlusCircle className="h-4 w-4 shrink-0" />
                                    <span className={sidebarLabelClasses(isCollapsed, "text-center")}>{t('createBot')}</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="h-[90vh] flex flex-col">
                                <VisuallyHidden>
                                    <DialogTitle>{t('createBotTitle')}</DialogTitle>
                                    <DialogDescription>
                                        {t('createBotDescription')}
                                    </DialogDescription>
                                </VisuallyHidden>
                                <BotForm servers={servers} proxies={proxies} onFormSubmit={handleCreateBot} isSaving={isSaving} isCreation={true} />
                            </DialogContent>
                        </Dialog>
                    )}
                    {hasPermission('bot:import') && (
                        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full transition-[padding,gap] " + SIDEBAR_TRANSITION,
                                        isCollapsed ? "mx-auto h-9 w-9 justify-center px-0 gap-0 self-center" : "justify-center"
                                    )}
                                    size="sm"
                                >
                                    <Upload className="h-4 w-4 shrink-0" />
                                    <span className={sidebarLabelClasses(isCollapsed, "text-center")}>{t('importBot')}</span>
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

                <Separator className="my-2" />

                <ThemeToggle isCollapsed={isCollapsed} />
                <LanguageSwitcher isCollapsed={isCollapsed} />

                <Button
                    variant="ghost"
                    size={isCollapsed ? "icon" : "default"}
                    className={cn(
                        "rounded-md text-sm font-medium transition-[background-color,color,gap,padding] " + SIDEBAR_TRANSITION,
                        isCollapsed ? "mx-auto flex gap-0 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50" : "w-full h-9 justify-start px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={() => {
                        setIsSheetOpen(false);
                        setIsLogoutDialogOpen(true);
                    }}
                    title={isCollapsed ? t('logout') : undefined}
                    aria-label={t('logout')}
                >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        <LogOut className="h-4 w-4 shrink-0" />
                    </span>
                    <span
                        className={cn(
                            "overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform,margin] " + SIDEBAR_TRANSITION,
                            isCollapsed ? "ml-0 max-w-0 opacity-0 -translate-x-2" : "ml-2 max-w-[120px] opacity-100 translate-x-0"
                        )}
                    >
                        {t('logout')}
                    </span>
                </Button>

                <div className={cn(
                    "flex flex-col items-start overflow-hidden border-t text-xs text-muted-foreground transition-[max-height,opacity,transform,padding] " + SIDEBAR_TRANSITION,
                    isCollapsed ? "max-h-0 opacity-0 -translate-y-2 pt-0" : "max-h-20 opacity-100 translate-y-0 pt-2"
                )}>
                    <a
                        href="https://github.com/blockmineJS/blockmine"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                    >
                        <Github className="h-4 w-4" />
                        <span>BlockMine v{appVersion}</span>
                    </a>
                    <div className="mt-1">
                        <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                            onClick={async () => {
                                setIsSheetOpen(false);
                                await useAppStore.getState().openChangelogDialog();
                            }}
                        >
                            {t('whatsNew')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div
            className={cn(
                "grid h-[100dvh] md:h-screen transition-[grid-template-columns] duration-300 ease-out",
                isSidebarCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[280px_1fr]"
            )}
            style={{ willChange: 'grid-template-columns' }}
        >
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
                            aria-label={t('openMenu')}
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-full max-w-[85vw] sm:max-w-xs h-[100dvh] flex">
                        {sidebarContent(false)}
                    </SheetContent>
                </Sheet>
            </div>

            <aside className="hidden overflow-hidden border-r md:block">
                {sidebarContent(isSidebarCollapsed)}
            </aside>

            <OutletViewport transitionKey={layoutTransitionKey}>
                {outlet}
            </OutletViewport>

            <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('logoutDialog.title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('logoutDialog.description')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('logoutDialog.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout}>{t('logoutDialog.confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ChangelogDialog />
        </div>
    );
}
