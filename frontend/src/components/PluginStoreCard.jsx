import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, CheckCircle, Loader2, Github, ExternalLink, GitMerge, Check } from 'lucide-react';

export default function PluginStoreCard({ plugin, isInstalled, isInstalling, onInstall, botId }) {
    const hasDependencies = plugin.dependencies && plugin.dependencies.length > 0;

    return (
        <TooltipProvider delayDuration={100}>
            <Card className="flex flex-col hover:border-primary/50 transition-colors duration-300 relative">
                {isInstalled && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1 z-10">
                        <Check className="h-4 w-4" />
                    </div>
                )}
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="flex-grow mr-2">
                            <Link to={`/bots/${botId}/plugins/view/${plugin.name}`} className="group">
                                <CardTitle className="flex items-center gap-2 text-xl group-hover:underline transition-all">
                                    <span>{plugin.name}</span>
                                </CardTitle>
                            </Link>
                            <CardDescription>by {plugin.author}</CardDescription>
                        </div>
                        <a href={plugin.repoUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
                            <Github className="h-5 w-5" />
                        </a>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <p className="text-sm text-muted-foreground h-20 overflow-hidden">{plugin.description}</p>
                    
                    <div className="flex flex-wrap gap-1">
                        {plugin.categories?.map(tag => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-4 mt-auto pt-4 border-t">
                    {hasDependencies && (
                        <div>
                            <h4 className="text-xs font-semibold">Зависимости:</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="destructive" className="cursor-help">
                                            <GitMerge className="h-3 w-3 mr-1"/>
                                            {plugin.dependencies.length} шт.
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Требуются плагины:</p>
                                        <ul className="list-disc list-inside">
                                            {plugin.dependencies.map(dep => <li key={dep}>{dep}</li>)}
                                        </ul>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    )}
                    
                    <Button 
                        className="w-full" 
                        disabled={isInstalled || isInstalling}
                        onClick={() => onInstall(plugin)}
                    >
                        {isInstalling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                      : isInstalled ? <CheckCircle className="mr-2 h-4 w-4" /> 
                                                    : <Download className="mr-2 h-4 w-4" />}
                        {isInstalling ? 'Установка...' : isInstalled ? 'Установлен' : `Установить (v${plugin.latestTag.replace('v','')})`}
                    </Button>
                </CardFooter>
            </Card>
        </TooltipProvider>
    );
}