import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, CheckCircle, Loader2, Github, ExternalLink, GitMerge, Check, Star, Users, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PluginStoreCard({ plugin, isInstalled, isInstalling, onInstall, botId }) {
    const hasDependencies = plugin.dependencies && plugin.dependencies.length > 0;
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <TooltipProvider delayDuration={100}>
            <Card 
                className={cn(
                    "relative overflow-hidden transition-all duration-300 plugin-card-hover group",
                    "hover:border-primary/50 hover:shadow-xl",
                    isInstalled && "border-green-600/50"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className={cn(
                    "absolute inset-0 opacity-0 transition-opacity duration-300",
                    "bg-gradient-to-br from-primary/10 via-transparent to-purple-600/10",
                    isHovered && "opacity-100"
                )} />
                
                {isInstalled && (
                    <div className="absolute top-0 right-0 bg-gradient-to-bl from-green-600 to-green-700 text-white p-6 rounded-bl-[40px] shadow-lg z-10">
                        <Check className="h-5 w-5 absolute top-2 right-2" />
                    </div>
                )}
                
                {plugin.isTop3 && (
                    <div className="absolute top-2 left-2 z-10">
                        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Популярное
                        </Badge>
                    </div>
                )}
                
                <CardHeader className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="flex-grow mr-2">
                            <Link to={`/bots/${botId}/plugins/view/${plugin.name}`} className="group">
                                <CardTitle className="flex items-center gap-2 text-xl group-hover:text-primary transition-colors">
                                    <span className={cn(
                                        "transition-all duration-300",
                                        isHovered && "gradient-text"
                                    )}>{plugin.displayName || plugin.name}</span>
                                    {plugin.verified && (
                                        <Sparkles className="h-4 w-4 text-blue-500" />
                                    )}
                                </CardTitle>
                            </Link>
                            <CardDescription className="mt-1">
                                <span>by {plugin.author}</span>
                            </CardDescription>
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
                </CardHeader>
                
                <CardContent className="relative z-10 space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                        {plugin.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                        {plugin.categories?.map(tag => (
                            <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors cursor-default"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{plugin.downloads || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            <span>v{plugin.latestTag.replace('v','')}</span>
                        </div>
                    </div>
                </CardContent>
                
                <CardFooter className="relative z-10 flex flex-col items-start gap-3 mt-auto pt-4 border-t">
                    {hasDependencies && (
                        <div className="w-full">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 text-xs">
                                        <Badge variant="outline" className="cursor-help border-orange-600/50 text-orange-600">
                                            <GitMerge className="h-3 w-3 mr-1"/>
                                            Требует {plugin.dependencies.length} зависимост{plugin.dependencies.length === 1 ? 'ь' : 'и'}
                                        </Badge>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-semibold mb-1">Требуются плагины:</p>
                                    <ul className="list-disc list-inside text-sm">
                                        {plugin.dependencies.map(dep => <li key={dep}>{dep}</li>)}
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                    
                    <Button 
                        className={cn(
                            "w-full relative overflow-hidden transition-all",
                            isInstalled && "bg-green-600 hover:bg-green-700",
                            isInstalling && "shimmer"
                        )}
                        disabled={isInstalled || isInstalling}
                        onClick={() => onInstall(plugin)}
                    >
                        {isInstalling ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Установка...
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
                </CardFooter>
            </Card>
        </TooltipProvider>
    );
}