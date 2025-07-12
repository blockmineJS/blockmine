import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, Loader2, GitMerge, Server, Globe, Github, Puzzle, ArrowDownToLine, Star, Sparkles, TrendingUp } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

const IconComponent = ({ name, ...props }) => {
    if (!name) return <Puzzle {...props} />;
    if (name.startsWith('/') || name.startsWith('http')) return <img src={name} alt="plugin icon" {...props} />;
    const iconName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    const LucideIcon = Icons[iconName] || Puzzle;
    return <LucideIcon {...props} />;
};

export default function PluginListItem({ plugin, isInstalled, isInstalling, onInstall, botId }) {
    const hasDependencies = plugin.dependencies && plugin.dependencies.length > 0;
    const hasSupportedHosts = plugin.supportedHosts && plugin.supportedHosts.length > 0;

    const [isAnimating, setIsAnimating] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const prevDownloads = useRef(plugin.downloads);

    const isPopular = (plugin.downloads || 0) > 500;

    useEffect(() => {
        if (plugin.downloads > prevDownloads.current) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 400);
            
            prevDownloads.current = plugin.downloads;

            return () => clearTimeout(timer);
        } else if (plugin.downloads !== prevDownloads.current) {
            prevDownloads.current = plugin.downloads;
        }
    }, [plugin.downloads]);

    return (
        <TooltipProvider delayDuration={100}>
            <div 
                className={cn(
                    "relative flex items-start gap-4 p-4 border rounded-lg transition-all duration-300",
                    "hover:border-primary/50 hover:bg-muted/50 hover:shadow-md",
                    isInstalled && "border-green-600/30 bg-green-950/20",
                    isHovered && "transform scale-[1.01]"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {isPopular && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-red-500 rounded-l-lg" />
                )}
                
                <div className={cn(
                    "relative shrink-0 mt-1 transition-transform duration-300",
                    isHovered && "scale-110 rotate-3"
                )}>
                    <IconComponent 
                        name={plugin.icon} 
                        className={cn(
                            "h-12 w-12 text-primary",
                            isHovered && "drop-shadow-glow"
                        )} 
                    />
                    {isPopular && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                    )}
                </div>
                
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 flex-grow">
                            <Link to={`/bots/${botId}/plugins/view/${plugin.name}`} className="group">
                                <h3 className={cn(
                                    "font-semibold text-lg group-hover:text-primary transition-colors inline-flex items-center gap-2",
                                    isHovered && "gradient-text"
                                )}>
                                    {plugin.name}
                                    {plugin.verified && (
                                        <Sparkles className="h-4 w-4 text-blue-500" />
                                    )}
                                </h3>
                            </Link>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>от <span className="font-medium text-primary/90">{plugin.author}</span></span>
                            </div>
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <a 
                                    href={plugin.repoUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-muted-foreground hover:text-foreground transition-all hover:scale-110"
                                >
                                    <Github className="h-5 w-5" />
                                </a>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Открыть репозиторий</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{plugin.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        {plugin.categories && plugin.categories.slice(0, 3).map(category => (
                            <Badge 
                                key={category} 
                                variant="secondary" 
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                                {category}
                            </Badge>
                        ))}
                        {plugin.categories && plugin.categories.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                                +{plugin.categories.length - 3}
                            </Badge>
                        )}
                        
                        {isPopular && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Популярный
                            </Badge>
                        )}
                        
                        <div className={cn(
                            "transition-all duration-300",
                            isAnimating && "animate-bounce"
                        )}>
                            <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
                                <ArrowDownToLine className="h-3 w-3" />
                                <span className="font-semibold">{plugin.downloads || 0}</span>
                            </Badge>
                        </div>
                        
                        {hasDependencies && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="outline" className="cursor-help border-orange-600/50 text-orange-600 text-xs">
                                        <GitMerge className="h-3 w-3 mr-1" />
                                        {plugin.dependencies.length}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-semibold">Требуются плагины:</p>
                                    <ul className="list-disc list-inside text-sm mt-1">
                                        {plugin.dependencies.map(dep => <li key={dep}>{dep}</li>)}
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        
                        {!hasSupportedHosts ? (
                            <Badge variant="outline" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                Любой
                            </Badge>
                        ) : plugin.supportedHosts.length <= 3 ? (
                            plugin.supportedHosts.map(host => (
                                <Badge key={host} variant="outline" className="font-mono text-xs">
                                    {host}
                                </Badge>
                            ))
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="outline" className="cursor-help text-xs">
                                        <Server className="h-3 w-3 mr-1" />
                                        {plugin.supportedHosts.length}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-semibold">Протестировано на:</p>
                                    <ul className="list-disc list-inside text-sm mt-1">
                                        {plugin.supportedHosts.map(host => <li key={host}>{host}</li>)}
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                    <Button 
                        size="sm"
                        className={cn(
                            "min-w-[120px] relative overflow-hidden transition-all",
                            isInstalled && "bg-green-600 hover:bg-green-700",
                            isInstalling && "shimmer"
                        )}
                        disabled={isInstalled || isInstalling}
                        onClick={() => onInstall(plugin)}
                    >
                        {isInstalling ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Установка
                            </>
                        ) : isInstalled ? (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Установлен
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Установить
                            </>
                        )}
                        
                        {isInstalling && (
                            <div className="install-progress">
                                <div className="install-progress-bar" />
                            </div>
                        )}
                    </Button>
                    <span className="text-xs text-muted-foreground">v{plugin.latestTag.replace('v','')}</span>
                </div>
            </div>
        </TooltipProvider>
    );
}