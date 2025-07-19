import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal, Activity, ExternalLink, Code, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PluginDetailInfo({ plugin, botId }) {
    const navigate = useNavigate();

    const handleViewCommand = (commandId, command) => {
        if (command.isVisual) {
            navigate(`/bots/${botId}/commands/visual/${commandId}`);
        }
    };

    const handleViewGraph = (graphId) => {
        navigate(`/bots/${botId}/events/visual/${graphId}`);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        Информация о плагине
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Название</label>
                            <p className="text-lg font-semibold">{plugin.name}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Версия</label>
                            <p className="text-lg">{plugin.version}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Источник</label>
                            <Badge variant={plugin.sourceType === 'LOCAL' ? 'secondary' : 'default'}>
                                {plugin.sourceType}
                            </Badge>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Статус</label>
                            <Badge variant={plugin.isEnabled ? 'default' : 'secondary'}>
                                {plugin.isEnabled ? 'Активен' : 'Неактивен'}
                            </Badge>
                        </div>
                    </div>
                    
                    {plugin.description && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Описание</label>
                            <p className="text-sm">{plugin.description}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue="commands" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="commands" className="flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        Команды ({plugin.commands?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="graphs" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Графы событий ({plugin.eventGraphs?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="commands" className="space-y-4">
                    {plugin.commands?.length > 0 ? (
                        <div className="grid gap-4">
                            {plugin.commands.map(command => (
                                <Card key={command.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-semibold">{command.name}</h4>
                                                    <Badge variant={command.isEnabled ? 'default' : 'secondary'}>
                                                        {command.isEnabled ? 'Активна' : 'Неактивна'}
                                                    </Badge>
                                                    {command.isVisual && (
                                                        <Badge variant="outline">
                                                            <Code className="h-3 w-3 mr-1" />
                                                            Визуальная
                                                        </Badge>
                                                    )}
                                                </div>
                                                
                                                {command.description && (
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        {command.description}
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap gap-2">
                                                    {command.aliases?.length > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-muted-foreground">Алиасы:</span>
                                                            {command.aliases.slice(0, 3).map(alias => (
                                                                <Badge key={alias} variant="outline" className="text-xs">
                                                                    {alias}
                                                                </Badge>
                                                            ))}
                                                            {command.aliases.length > 3 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    +{command.aliases.length - 3}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                {command.isVisual && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewCommand(command.id, command)}
                                                    >
                                                        <ExternalLink className="h-4 w-4 mr-1" />
                                                        Открыть
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                    Нет команд
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Этот плагин не предоставляет команд
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="graphs" className="space-y-4">
                    {plugin.eventGraphs?.length > 0 ? (
                        <div className="grid gap-4">
                            {plugin.eventGraphs.map(graph => (
                                <Card key={graph.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-semibold">{graph.name}</h4>
                                                    <Badge variant={graph.isEnabled ? 'default' : 'secondary'}>
                                                        {graph.isEnabled ? 'Активен' : 'Неактивен'}
                                                    </Badge>
                                                </div>
                                                
                                                <div className="text-sm text-muted-foreground">
                                                    Создан: {new Date(graph.createdAt).toLocaleDateString()}
                                                    {graph.updatedAt && graph.updatedAt !== graph.createdAt && (
                                                        <span className="ml-4">
                                                            Обновлен: {new Date(graph.updatedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewGraph(graph.id)}
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-1" />
                                                    Открыть
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                    Нет графов событий
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Этот плагин не предоставляет графов событий
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
} 