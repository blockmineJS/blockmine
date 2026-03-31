import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Activity, Code, ExternalLink, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PluginDetailInfo({ plugin, botId }) {
  const { t } = useTranslation('plugins');
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
            {t('details.title', { defaultValue: 'Информация о плагине' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('details.name', { defaultValue: 'Название' })}</label>
              <p className="text-lg font-semibold">{plugin.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('details.version', { defaultValue: 'Версия' })}</label>
              <p className="text-lg">{plugin.version}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('details.source', { defaultValue: 'Источник' })}</label>
              <Badge variant={plugin.sourceType === 'LOCAL' ? 'secondary' : 'default'}>{plugin.sourceType}</Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('details.status', { defaultValue: 'Статус' })}</label>
              <Badge variant={plugin.isEnabled ? 'default' : 'secondary'}>
                {plugin.isEnabled
                  ? t('status.enabled', { defaultValue: 'Включен' })
                  : t('status.disabled', { defaultValue: 'Отключен' })}
              </Badge>
            </div>
          </div>

          {plugin.description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('details.description', { defaultValue: 'Описание' })}</label>
              <p className="text-sm">{plugin.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="w-full">
        <div className="grid w-full grid-cols-2 rounded-lg bg-muted p-1">
          <div className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium">
            <Terminal className="h-4 w-4" />
            {t('details.commands', { count: plugin.commands?.length || 0, defaultValue: 'Команды' })} ({plugin.commands?.length || 0})
          </div>
          <div className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            {t('details.events', { count: plugin.eventGraphs?.length || 0, defaultValue: 'Графы событий' })} ({plugin.eventGraphs?.length || 0})
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {plugin.commands?.length > 0 ? (
          <div className="grid gap-4">
            {plugin.commands.map((command) => (
              <Card key={command.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h4 className="font-semibold">{command.name}</h4>
                        <Badge variant={command.isEnabled ? 'default' : 'secondary'}>
                          {command.isEnabled
                            ? t('status.enabled', { defaultValue: 'Активна' })
                            : t('status.disabled', { defaultValue: 'Неактивна' })}
                        </Badge>
                        {command.isVisual && (
                          <Badge variant="outline">
                            <Code className="mr-1 h-3 w-3" />
                            {t('details.visual', { defaultValue: 'Визуальная' })}
                          </Badge>
                        )}
                      </div>

                      {command.description && <p className="mb-2 text-sm text-muted-foreground">{command.description}</p>}

                      <div className="flex flex-wrap gap-2">
                        {command.aliases?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{t('details.aliases', { defaultValue: 'Алиасы:' })}</span>
                            {command.aliases.slice(0, 3).map((alias) => (
                              <Badge key={alias} variant="outline" className="text-xs">
                                {alias}
                              </Badge>
                            ))}
                            {command.aliases.length > 3 && <Badge variant="outline" className="text-xs">+{command.aliases.length - 3}</Badge>}
                          </div>
                        )}
                      </div>
                    </div>

                    {command.isVisual && (
                      <Button variant="outline" size="sm" onClick={() => handleViewCommand(command.id, command)}>
                        <ExternalLink className="mr-1 h-4 w-4" />
                        {t('actions.open', { defaultValue: 'Открыть' })}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Terminal className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold text-muted-foreground">{t('details.noCommands', { defaultValue: 'Нет команд' })}</h3>
              <p className="text-sm text-muted-foreground">{t('details.noCommandsDescription', { defaultValue: 'Этот плагин не предоставляет команд' })}</p>
            </CardContent>
          </Card>
        )}

        {plugin.eventGraphs?.length > 0 ? (
          <div className="grid gap-4">
            {plugin.eventGraphs.map((graph) => (
              <Card key={graph.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h4 className="font-semibold">{graph.name}</h4>
                        <Badge variant={graph.isEnabled ? 'default' : 'secondary'}>
                          {graph.isEnabled
                            ? t('status.enabled', { defaultValue: 'Активен' })
                            : t('status.disabled', { defaultValue: 'Неактивен' })}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('details.created', { defaultValue: 'Создан:' })} {new Date(graph.createdAt).toLocaleDateString()}
                        {graph.updatedAt && graph.updatedAt !== graph.createdAt && (
                          <span className="ml-4">
                            {t('details.updated', { defaultValue: 'Обновлен:' })} {new Date(graph.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => handleViewGraph(graph.id)}>
                      <ExternalLink className="mr-1 h-4 w-4" />
                      {t('actions.open', { defaultValue: 'Открыть' })}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold text-muted-foreground">{t('details.noEvents', { defaultValue: 'Нет графов событий' })}</h3>
              <p className="text-sm text-muted-foreground">{t('details.noEventsDescription', { defaultValue: 'Этот плагин не предоставляет графов событий' })}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
