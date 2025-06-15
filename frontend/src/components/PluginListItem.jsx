import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, Loader2, GitMerge, Server, Globe, Github, Puzzle, ArrowDownToLine } from 'lucide-react';
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
    const prevDownloads = useRef(plugin.downloads);

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
            <div className="flex items-start gap-4 p-4 border-b transition-colors hover:bg-muted/50">
                <IconComponent name={plugin.icon} className="h-10 w-10 text-primary shrink-0 mt-1" />
                
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <div>
                            <Link to={`/bots/${botId}/plugins/view/${plugin.name}`} className="group">
                                <h3 className="font-semibold text-lg group-hover:underline">{plugin.name}</h3>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                                от <span className="font-medium text-primary/90">{plugin.author}</span>
                            </p>
                        </div>
                        <a href={plugin.repoUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <Github className="h-5 w-5" />
                        </a>
                    </div>

                    <p className="text-sm text-muted-foreground mt-2">{plugin.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        {plugin.categories && plugin.categories.map(category => (
                             <Badge key={category} variant="secondary">{category}</Badge>
                        ))}
                        
                        <div className={cn(isAnimating && 'animate-pop-in')}>
                            <Badge variant="outline" className="flex items-center gap-1.5 px-2.5 py-1 text-sm">
                                <ArrowDownToLine className="h-4 w-4" />
                                <span className="font-semibold">{plugin.downloads || 0}</span>
                            </Badge>
                        </div>
                        
                        {hasDependencies && (
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="destructive" className="cursor-help">
                                        <GitMerge className="h-3 w-3 mr-1" />
                                        {plugin.dependencies.length} {plugin.dependencies.length > 1 ? 'зависимости' : 'зависимость'}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Требуются плагины:</p>
                                    <ul className="list-disc list-inside">
                                        {plugin.dependencies.map(dep => <li key={dep}>{dep}</li>)}
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        
                        {!hasSupportedHosts ? (
                            <Badge variant="outline" className="flex items-center">
                                <Globe className="h-3 w-3 mr-1" />
                                Любой сервер
                            </Badge>
                        ) : plugin.supportedHosts.length <= 5 ? (
                            plugin.supportedHosts.map(host => (
                                <Badge key={host} variant="outline" className="font-mono text-xs">
                                    {host}
                                </Badge>
                            ))
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <Badge variant="outline" className="cursor-help flex items-center">
                                        <Server className="h-3 w-3 mr-1" />
                                        {plugin.supportedHosts.length} серверов
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                     <p>Протестировано на:</p>
                                     <ul className="list-disc list-inside">
                                        {plugin.supportedHosts.map(host => <li key={host}>{host}</li>)}
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0 ml-4 w-[120px]">
                    <Button 
                        size="sm"
                        className="w-full" 
                        disabled={isInstalled || isInstalling}
                        onClick={() => onInstall(plugin)}
                    >
                        {isInstalling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                      : isInstalled ? <CheckCircle className="mr-2 h-4 w-4" /> 
                                                    : <Download className="mr-2 h-4 w-4" />}
                        {isInstalling ? 'Установка' : isInstalled ? 'Установлен' : 'Установить'}
                    </Button>
                    <span className="text-xs text-muted-foreground">v{plugin.latestTag.replace('v','')}</span>
                </div>
            </div>
        </TooltipProvider>
    );
}