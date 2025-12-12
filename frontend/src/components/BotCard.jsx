import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Square, RotateCw, Edit, Trash2 } from 'lucide-react';

export default function BotCard({ bot, status, logs, onStart, onStop, onRestart, onEdit, onDelete }) {
    const { t } = useTranslation('bots');
    const isRunning = status === 'running';

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{bot.username}</CardTitle>
                        <CardDescription>
                            {bot.server.name} ({bot.server.host}:{bot.server.port})
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant={isRunning ? "default" : "secondary"}>
                            {isRunning ? t('status.running') : t('status.stopped')}
                        </Badge>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => onEdit(bot)} 
                                        disabled={isRunning}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('card.edit')}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => onDelete(bot.id)} 
                                        disabled={isRunning}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('card.delete')}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="bg-black/90 dark:bg-black/50 rounded p-3 font-mono text-xs h-48 overflow-y-auto flex flex-col-reverse text-foreground">
                    {logs.map((log, index) => (
                        <p key={index} className="whitespace-pre-wrap">{log}</p>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="gap-2">
                <Button
                    onClick={() => onStart(bot.id)}
                    disabled={isRunning}
                    size="sm"
                    className="flex-1"
                >
                    <Play className="mr-2 h-4 w-4" />
                    {t('actions.start')}
                </Button>
                <Button
                    onClick={() => onStop(bot.id)}
                    disabled={!isRunning}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                >
                    <Square className="mr-2 h-4 w-4" />
                    {t('actions.stop')}
                </Button>
                <Button
                    onClick={() => onRestart(bot.id)}
                    disabled={!isRunning}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                >
                    <RotateCw className="mr-2 h-4 w-4" />
                    {t('actions.restart')}
                </Button>
            </CardFooter>
        </Card>
    );
}
