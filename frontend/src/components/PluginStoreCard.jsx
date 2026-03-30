import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, CheckCircle, Loader2, Github, GitMerge, Check, Users, TrendingUp, Sparkles, Server, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const getDependencyLabel = (count) => {
    if (count % 10 === 1 && count % 100 !== 11) return 'зависимость';
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'зависимости';
    return 'зависимостей';
};

const getLatestVersion = (tag) => (tag || '0.0.0').replace(/^v/i, '');

export default function PluginStoreCard({ plugin, isInstalled, isInstalling, onInstall, botId }) {
    const hasDependencies = plugin.dependencies && plugin.dependencies.length > 0;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <TooltipProvider delayDuration={100}>
            <Card
                className={cn(
                    "group relative flex h-full flex-col overflow-hidden transition-all duration-300 plugin-card-hover",
                    "hover:border-primary/50 hover:shadow-xl",
                    isInstalled && "border-green-600/50"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div
                    className={cn(
                        "absolute inset-0 opacity-0 transition-opacity duration-300",
                        "bg-gradient-to-br from-primary/10 via-transparent to-purple-600/10",
                        isHovered && "opacity-100"
                    )}
                />

                {plugin.isTop3 && (
                    <div className="absolute left-0 top-0 z-10 flex flex-col items-start gap-1">
                        <Badge className="rounded-none rounded-br-md border-0 bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 text-[10px] text-white shadow-sm">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Популярное
                        </Badge>
                    </div>
                )}

                <CardHeader className="relative z-10 px-5 pb-2 pt-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <Link to={`/bots/${botId}/plugins/view/${plugin.name}`} className="group/title">
                                <CardTitle className="flex items-start gap-2 text-[1.15rem] leading-tight transition-colors group-hover/title:text-primary">
                                    <span
                                        className={cn(
                                            "line-clamp-2 min-w-0 break-words transition-all duration-300",
                                            isHovered && "gradient-text"
                                        )}
                                    >
                                        {plugin.displayName || plugin.name}
                                    </span>
                                    {plugin.verified && <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />}
                                </CardTitle>
                            </Link>

                            <CardDescription className="mt-1">
                                <span>by {plugin.author}</span>
                            </CardDescription>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 pt-0.5">
                            {plugin.repoUrl && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <a
                                            href={plugin.repoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-md p-1 text-muted-foreground transition-all hover:scale-110 hover:text-foreground"
                                        >
                                            <Github className="h-5 w-5" />
                                        </a>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Открыть репозиторий</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}

                            {isInstalled && (
                                <div className="rounded-full bg-green-600 p-2 text-white shadow-lg">
                                    <Check className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="relative z-10 flex flex-1 flex-col gap-3 px-5 pb-0">
                    <p className="min-h-[40px] line-clamp-2 text-sm text-muted-foreground">
                        {plugin.description}
                    </p>

                    <div className="flex min-h-[26px] flex-wrap content-start gap-1">
                        {plugin.categories?.map(tag => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="cursor-default text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>

                    <div className="flex h-4 items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{plugin.downloads || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            <span>v{getLatestVersion(plugin.latestTag)}</span>
                        </div>
                    </div>

                    <div className="flex min-h-[24px] flex-wrap content-start gap-1">
                        {!plugin.supportedHosts || plugin.supportedHosts.length === 0 ? (
                            <Badge variant="outline" className="text-xs">
                                <Globe className="mr-1 h-3 w-3" />
                                Любой сервер
                            </Badge>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="outline" className="cursor-help text-xs">
                                        <Server className="mr-1 h-3 w-3" />
                                        {plugin.supportedHosts.length <= 2
                                            ? plugin.supportedHosts.join(', ')
                                            : `${plugin.supportedHosts.length} серверов`}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="mb-1 font-semibold">Протестировано на:</p>
                                    <ul className="list-inside list-disc text-sm">
                                        {plugin.supportedHosts.map(host => <li key={host}>{host}</li>)}
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="relative z-10 mt-auto flex min-h-[84px] flex-col items-start justify-end gap-2 border-t px-5 pb-4 pt-3">
                    <div className="min-h-[22px] w-full">
                        {hasDependencies && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 text-xs">
                                        <Badge variant="outline" className="cursor-help border-orange-600/50 text-orange-600">
                                            <GitMerge className="mr-1 h-3 w-3" />
                                            Требует {plugin.dependencies.length} {getDependencyLabel(plugin.dependencies.length)}
                                        </Badge>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="mb-1 font-semibold">Требуются плагины:</p>
                                    <ul className="list-inside list-disc text-sm">
                                        {plugin.dependencies.map(dep => <li key={dep}>{dep}</li>)}
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    <Button
                        className={cn(
                            "relative h-11 w-full justify-center rounded-lg px-4 text-[15px] font-semibold leading-none transition-all",
                            isInstalled && "bg-green-600 hover:bg-green-700",
                            isInstalling && "overflow-hidden shimmer"
                        )}
                        disabled={isInstalled || isInstalling}
                        onClick={() => onInstall(plugin)}
                    >
                        {isInstalling ? (
                            <span className="flex w-full items-center justify-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Установка...
                            </span>
                        ) : isInstalled ? (
                            <span className="flex w-full items-center justify-center">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Установлен
                            </span>
                        ) : (
                            <span className="flex w-full items-center justify-center">
                                <Download className="mr-2 h-4 w-4" />
                                Установить
                            </span>
                        )}

                        {isInstalling && (
                            <div className="install-progress">
                                <div className="install-progress-bar" />
                            </div>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </TooltipProvider>
    );
}
