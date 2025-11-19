import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ExternalLink, Loader2, CheckCircle } from 'lucide-react';
import * as Icons from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiHelper } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// IconComponent для превью
const IconComponent = ({ name, ...props }) => {
    if (!name) return <Icons.Package {...props} />;
    if (name.startsWith('/') || name.startsWith('http')) {
        return <img src={name} alt="plugin icon" {...props} />;
    }
    const iconName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    const LucideIcon = Icons[iconName] || Icons.Package;
    return <LucideIcon {...props} />;
};

export default function SubmitToOfficialListDialog({ isOpen, onClose, pluginInfo, repoUrl, latestTag, botId, pluginName, githubToken, onSuccess, isUpdate = false, currentVersion = null }) {
    const [pluginDisplayName, setPluginDisplayName] = useState('');
    const [icon, setIcon] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [prUrl, setPrUrl] = useState(null);

    useEffect(() => {
        if (pluginInfo) {
            setPluginDisplayName(pluginInfo.name || '');
            // При обновлении берем иконку из package.json, при первой подаче - package по умолчанию
            const savedIcon = pluginInfo.manifest?.icon || pluginInfo.botpanel?.icon;
            setIcon(savedIcon || 'package');
        }
    }, [pluginInfo]);

    const handleSubmit = async () => {
        if (!pluginDisplayName.trim()) {
            toast({
                variant: 'destructive',
                title: 'Ошибка',
                description: 'Введите название плагина'
            });
            return;
        }

        if (!icon.trim()) {
            toast({
                variant: 'destructive',
                title: 'Ошибка',
                description: 'Введите иконку'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/submit-to-official-list`, {
                method: 'POST',
                body: JSON.stringify({
                    token: githubToken,
                    pluginDisplayName: pluginDisplayName.trim(),
                    icon: icon.trim()
                })
            });

            setPrUrl(result.prUrl);
            toast({
                title: 'Pull Request создан!',
                description: (
                    <div>
                        <a href={result.prUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Открыть PR #{result.prNumber}
                        </a>
                    </div>
                )
            });

            // Вызываем callback для обновления статуса в родительском компоненте
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Ошибка создания PR',
                description: error.message || 'Не удалось создать Pull Request'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setPluginDisplayName('');
        setIcon('package');
        setPrUrl(null);
        onClose();
    };

    // Извлекаем repo ID из URL
    const getRepoId = () => {
        if (!repoUrl) return '';
        const match = repoUrl.match(/github\.com[\/:](.+?)\/(.+?)(\.git)?$/);
        return match ? match[2].replace('.git', '') : '';
    };

    // Проверяем доступна ли иконка
    const isValidIcon = () => {
        if (!icon) return false;
        if (icon.startsWith('/') || icon.startsWith('http')) return true;
        const iconName = icon.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
        return !!Icons[iconName];
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icons.Package className="h-5 w-5" />
                        {isUpdate ? 'Обновить версию в списке' : 'Подать в официальный список'}
                    </DialogTitle>
                    <DialogDescription>
                        {prUrl ? 'Pull Request успешно создан!' : isUpdate
                            ? `Обновить версию с ${currentVersion} на ${latestTag}`
                            : 'Автоматически создаст PR в blockmineJS/official-plugins-list'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {prUrl ? (
                        // Success state
                        <div className="space-y-4">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                <div className="flex-grow">
                                    <p className="text-sm font-medium mb-1">Pull Request создан!</p>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Ваш плагин отправлен на проверку. После одобрения он появится в официальном списке.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(prUrl, '_blank')}
                                        className="w-full"
                                    >
                                        <ExternalLink className="h-3 w-3 mr-2" />
                                        Открыть Pull Request
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Form fields */}
                            <div>
                                <Label htmlFor="plugin-name" className="mb-2 block">
                                    Название плагина
                                </Label>
                                <Input
                                    id="plugin-name"
                                    placeholder="Мой плагин"
                                    value={pluginDisplayName}
                                    onChange={(e) => setPluginDisplayName(e.target.value)}
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Отображаемое имя плагина в списке
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="icon" className="mb-2 block">
                                    Иконка
                                </Label>
                                <Input
                                    id="icon"
                                    placeholder="package или https://example.com/icon.svg"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Название{' '}
                                    <a
                                        href="https://lucide.dev/icons/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        lucide-иконки
                                    </a>
                                    {' '}(например: <code className="bg-muted px-1 rounded">key-round</code>, <code className="bg-muted px-1 rounded">package</code>) или URL на SVG
                                </p>
                                {icon && !isValidIcon() && (
                                    <p className="text-xs text-orange-500 mt-1">
                                        ⚠️ Иконка "{icon}" не найдена в lucide-react
                                    </p>
                                )}
                            </div>

                            {/* Preview card */}
                            {pluginDisplayName && icon && (
                                <div>
                                    <Label className="mb-2 block">Превью</Label>
                                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 bg-muted/20 rounded-lg p-4">
                                        <div></div>
                                        <div className="w-[340px]">
                                            <Card className="relative overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-xl">
                                                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 bg-gradient-to-br from-primary/10 via-transparent to-purple-600/10"></div>

                                                <CardHeader className="relative z-10">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-grow mr-2">
                                                            <CardTitle className="flex items-center gap-2 text-xl">
                                                                <IconComponent name={icon} className="h-5 w-5" />
                                                                <span>{pluginDisplayName}</span>
                                                            </CardTitle>
                                                            <CardDescription className="mt-1">
                                                                <span>by {pluginInfo?.author || 'Unknown'}</span>
                                                            </CardDescription>
                                                        </div>
                                                        <a
                                                            href={repoUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-muted-foreground hover:text-foreground transition-all hover:scale-110"
                                                        >
                                                            <Icons.Github className="h-5 w-5" />
                                                        </a>
                                                    </div>
                                                </CardHeader>

                                                <CardContent className="relative z-10 space-y-4">
                                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                                        {pluginInfo?.description || 'Нет описания'}
                                                    </p>

                                                    {(() => {
                                                        // Пытаемся получить categories из разных источников
                                                        let cats = [];
                                                        if (pluginInfo?.manifest?.categories) {
                                                            cats = pluginInfo.manifest.categories;
                                                        } else if (pluginInfo?.botpanel?.categories) {
                                                            cats = pluginInfo.botpanel.categories;
                                                        }

                                                        return cats.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {cats.map((cat, i) => (
                                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                                        {cat}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}

                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Icons.Users className="h-3 w-3" />
                                                            <span>0</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Icons.Download className="h-3 w-3" />
                                                            <span>{latestTag}</span>
                                                        </div>
                                                    </div>

                                                    {(() => {
                                                        // Получаем supportedHosts
                                                        let hosts = [];
                                                        if (pluginInfo?.manifest?.supportedHosts) {
                                                            hosts = pluginInfo.manifest.supportedHosts;
                                                        } else if (pluginInfo?.botpanel?.supportedHosts) {
                                                            hosts = pluginInfo.botpanel.supportedHosts;
                                                        }

                                                        return (
                                                            <div className="flex flex-wrap gap-1">
                                                                {!hosts || hosts.length === 0 ? (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        <Icons.Globe className="h-3 w-3 mr-1" />
                                                                        Любой сервер
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        <Icons.Server className="h-3 w-3 mr-1" />
                                                                        {hosts.length <= 2 ? hosts.join(', ') : `${hosts.length} серверов`}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </CardContent>

                                                <div className="p-5 relative z-10 flex flex-col items-start gap-3 mt-auto pt-4 border-t">
                                                    {(() => {
                                                        // Получаем dependencies
                                                        let deps = [];
                                                        if (pluginInfo?.manifest?.dependencies) {
                                                            deps = pluginInfo.manifest.dependencies;
                                                        } else if (pluginInfo?.botpanel?.dependencies) {
                                                            deps = pluginInfo.botpanel.dependencies;
                                                        }

                                                        return deps.length > 0 && (
                                                            <div className="w-full">
                                                                <Badge variant="outline" className="cursor-help border-orange-600/50 text-orange-600 text-xs">
                                                                    <Icons.GitMerge className="h-3 w-3 mr-1" />
                                                                    Требует {deps.length} зависимост{deps.length === 1 ? 'ь' : (deps.length < 5 ? 'и' : 'ей')}
                                                                </Badge>
                                                            </div>
                                                        );
                                                    })()}

                                                    <Button className="w-full relative overflow-hidden transition-all">
                                                        <Icons.Download className="mr-2 h-4 w-4" />
                                                        Установить
                                                    </Button>
                                                </div>
                                            </Card>
                                        </div>
                                        <div></div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <p className="text-sm font-medium mb-2">ℹ️ Что произойдет:</p>
                                <ol className="text-xs space-y-1 text-muted-foreground list-decimal list-inside">
                                    <li>Автоматически создастся ветка <code className="bg-muted px-1 rounded">add-plugin-{getRepoId()}</code></li>
                                    <li>{isUpdate ? 'Версия плагина будет обновлена' : 'Ваш плагин будет добавлен'} в <code className="bg-muted px-1 rounded">index.json</code></li>
                                    <li>Создастся Pull Request в <code className="bg-muted px-1 rounded">blockmineJS/official-plugins-list</code></li>
                                    <li>После проверки и одобрения модераторами, {isUpdate ? 'новая версия появится в списке' : 'плагин появится в официальном списке'}</li>
                                </ol>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        {prUrl ? 'Закрыть' : 'Отмена'}
                    </Button>
                    {!prUrl && (
                        <Button onClick={handleSubmit} disabled={isSubmitting || !pluginDisplayName || !icon}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Создание PR...
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Создать Pull Request
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
