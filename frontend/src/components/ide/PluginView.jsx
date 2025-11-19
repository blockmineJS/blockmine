import React, { useState, useEffect } from 'react';
import { Package, GitBranch, Loader2, AlertCircle, CheckCircle, ExternalLink, Key, Github, Upload, Tag, AlertTriangle, List, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { apiHelper } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import CreateReleaseDialog from './CreateReleaseDialog';
import SubmitToOfficialListDialog from './SubmitToOfficialListDialog';

const GITHUB_TOKEN_KEY = 'blockmine_github_token';

// Helper function to compare semver versions
const compareVersions = (v1, v2) => {
    if (!v1 || !v2) return 0;
    const cleanV1 = v1.replace(/^v/, '');
    const cleanV2 = v2.replace(/^v/, '');
    const parts1 = cleanV1.split('.').map(Number);
    const parts2 = cleanV2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
};

export default function PluginView({ botId, pluginName, onRefresh }) {
    const [pluginInfo, setPluginInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // GitHub token management
    const [githubToken, setGithubToken] = useState('');
    const [tokenSaved, setTokenSaved] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [githubUsername, setGithubUsername] = useState('');

    // Repository management
    const [repositories, setRepositories] = useState([]);
    const [isLoadingRepos, setIsLoadingRepos] = useState(false);
    const [uploadMode, setUploadMode] = useState('new'); // 'new' or 'existing'
    const [newRepoName, setNewRepoName] = useState('');
    const [selectedRepo, setSelectedRepo] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Tags and releases
    const [tags, setTags] = useState([]);
    const [latestTag, setLatestTag] = useState(null);
    const [isLoadingTags, setIsLoadingTags] = useState(false);
    const [showReleaseDialog, setShowReleaseDialog] = useState(false);
    const [isCreatingRelease, setIsCreatingRelease] = useState(false);
    const [hasRepoAccess, setHasRepoAccess] = useState(null); // null = не проверено, true/false
    const [isCreatingPR, setIsCreatingPR] = useState(false);

    // Official list submission
    const [showOfficialListDialog, setShowOfficialListDialog] = useState(false);
    const [isInOfficialList, setIsInOfficialList] = useState(false);
    const [officialListVersion, setOfficialListVersion] = useState(null);
    const [isCheckingOfficialList, setIsCheckingOfficialList] = useState(false);


    useEffect(() => {
        fetchPluginInfo();
        checkSavedToken();
    }, [botId, pluginName]);

    const checkSavedToken = () => {
        const saved = localStorage.getItem(GITHUB_TOKEN_KEY);
        if (saved) {
            setGithubToken(saved);
            setTokenSaved(true);
            fetchGithubUser(saved);
        }
    };

    const fetchPluginInfo = async () => {
        setIsLoading(true);
        try {
            const data = await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/info`);
            // Парсим manifest если он строка
            if (data && typeof data.manifest === 'string') {
                try {
                    data.manifest = JSON.parse(data.manifest);
                } catch (e) {
                    console.warn('Failed to parse manifest:', e);
                }
            }
            setPluginInfo(data);
            if (data.name && !newRepoName) {
                setNewRepoName(data.name);
            }
        } catch (error) {
            console.error('Failed to fetch plugin info:', error);
            setPluginInfo(null);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchGithubUser = async (token) => {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const user = await response.json();
                setGithubUsername(user.login);
            } else {
                throw new Error('Invalid token');
            }
        } catch (error) {
            console.error('Failed to fetch GitHub user:', error);
            toast({
                variant: 'destructive',
                title: 'Ошибка токена',
                description: 'Не удалось проверить GitHub токен. Проверьте правильность.'
            });
            handleRemoveToken();
        }
    };

    const handleSaveToken = () => {
        if (!githubToken.trim()) {
            toast({
                variant: 'destructive',
                title: 'Ошибка',
                description: 'Введите GitHub токен'
            });
            return;
        }

        localStorage.setItem(GITHUB_TOKEN_KEY, githubToken);
        setTokenSaved(true);
        fetchGithubUser(githubToken);
        toast({
            title: 'Успех',
            description: 'GitHub токен сохранен локально в браузере'
        });
    };

    const handleRemoveToken = () => {
        localStorage.removeItem(GITHUB_TOKEN_KEY);
        setGithubToken('');
        setTokenSaved(false);
        setGithubUsername('');
        setRepositories([]);
    };

    const fetchRepositories = async () => {
        setIsLoadingRepos(true);
        try {
            const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const repos = await response.json();
                setRepositories(repos);
            }
        } catch (error) {
            console.error('Failed to fetch repositories:', error);
            toast({
                variant: 'destructive',
                title: 'Ошибка',
                description: 'Не удалось загрузить список репозиториев'
            });
        } finally {
            setIsLoadingRepos(false);
        }
    };

    useEffect(() => {
        if (tokenSaved && uploadMode === 'existing' && repositories.length === 0) {
            fetchRepositories();
        }
    }, [tokenSaved, uploadMode]);

    useEffect(() => {
        if (pluginInfo?.hasRepository && tokenSaved && githubToken) {
            fetchTags();
            checkIfInOfficialList();
        }
    }, [pluginInfo?.hasRepository, tokenSaved, githubToken]);

    const checkIfInOfficialList = async () => {
        if (!pluginInfo?.repository?.url) return;

        setIsCheckingOfficialList(true);
        try {
            // Загружаем официальный список с GitHub
            const response = await fetch('https://raw.githubusercontent.com/blockmineJS/official-plugins-list/main/index.json');
            if (response.ok) {
                const officialList = await response.json();

                // Проверяем по repoUrl
                const repoUrl = pluginInfo.repository.url.replace('.git', '');
                const pluginInList = officialList.find(plugin =>
                    plugin.repoUrl === repoUrl ||
                    plugin.repoUrl === repoUrl + '.git'
                );

                if (pluginInList) {
                    setIsInOfficialList(true);
                    setOfficialListVersion(pluginInList.latestTag);
                } else {
                    setIsInOfficialList(false);
                    setOfficialListVersion(null);
                }
            }
        } catch (error) {
            console.error('Failed to check official list:', error);
        } finally {
            setIsCheckingOfficialList(false);
        }
    };

    const fetchTags = async () => {
        setIsLoadingTags(true);
        try {
            const data = await apiHelper(
                `/api/bots/${botId}/plugins/ide/${pluginName}/github/tags?token=${encodeURIComponent(githubToken)}`
            );
            setTags(data.tags || []);
            setLatestTag(data.latestTag);

            // Проверяем права на репозиторий
            if (pluginInfo?.repository?.url) {
                const repoUrl = pluginInfo.repository.url;
                const match = repoUrl.match(/github\.com[\/:](.+?)\/(.+?)(\.git)?$/);
                if (match) {
                    const [, owner, repo] = match;
                    try {
                        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                            headers: {
                                'Authorization': `token ${githubToken}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        if (response.ok) {
                            const repoData = await response.json();
                            setHasRepoAccess(repoData.permissions?.push || false);
                        } else {
                            setHasRepoAccess(false);
                        }
                    } catch {
                        setHasRepoAccess(false);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        } finally {
            setIsLoadingTags(false);
        }
    };

    const handleUploadToGithub = async () => {
        if (uploadMode === 'new' && !newRepoName.trim()) {
            toast({
                variant: 'destructive',
                title: 'Ошибка',
                description: 'Введите имя репозитория'
            });
            return;
        }

        if (uploadMode === 'existing' && !selectedRepo) {
            toast({
                variant: 'destructive',
                title: 'Ошибка',
                description: 'Выберите репозиторий'
            });
            return;
        }

        setIsUploading(true);
        try {
            const endpoint = uploadMode === 'new'
                ? `/api/bots/${botId}/plugins/ide/${pluginName}/github/create`
                : `/api/bots/${botId}/plugins/ide/${pluginName}/github/upload`;

            const body = uploadMode === 'new'
                ? { token: githubToken, repoName: newRepoName, isPrivate }
                : { token: githubToken, repoFullName: selectedRepo };

            await apiHelper(endpoint, {
                method: 'POST',
                body: JSON.stringify(body)
            });

            toast({
                title: 'Успех',
                description: `Плагин успешно загружен в ${uploadMode === 'new' ? 'новый' : 'существующий'} репозиторий`
            });

            await fetchPluginInfo();
            onRefresh?.();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Ошибка загрузки',
                description: error.message || 'Не удалось загрузить плагин в GitHub'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreateRelease = async (description) => {
        const version = pluginInfo?.version || '1.0.0';
        const tagName = version.startsWith('v') ? version : `v${version}`;

        setIsCreatingRelease(true);
        try {
            await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/github/release`, {
                method: 'POST',
                body: JSON.stringify({
                    token: githubToken,
                    tagName,
                    description,
                    uploadFiles: true
                })
            });

            toast({
                title: 'Успех',
                description: `Релиз ${tagName} успешно создан на GitHub`
            });

            setShowReleaseDialog(false);
            await fetchTags();
            await fetchPluginInfo();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Ошибка создания релиза',
                description: error.message || 'Не удалось создать релиз'
            });
        } finally {
            setIsCreatingRelease(false);
        }
    };

    const handleCreatePR = async () => {
        const version = pluginInfo?.version || '1.0.0';
        const versionClean = version.replace(/^v/, '');

        setIsCreatingPR(true);
        try {
            const result = await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/create-pr`, {
                method: 'POST',
                body: JSON.stringify({
                    token: githubToken,
                    branch: `update-v${versionClean}`,
                    commitMessage: `Update to v${versionClean}`,
                    prTitle: `Update to v${versionClean}`,
                    prBody: `This PR updates the plugin to version ${versionClean}.\n\nChanges made using BlockMine IDE.`
                })
            });

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

            // Открываем PR в новой вкладке
            window.open(result.prUrl, '_blank');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Ошибка создания PR',
                description: error.message || 'Не удалось создать Pull Request'
            });
        } finally {
            setIsCreatingPR(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    // Plugin with repository - show info
    if (pluginInfo && pluginInfo.hasRepository) {
        return (
            <div className="h-full flex flex-col p-6 overflow-y-auto">
                <div className="flex items-center gap-3 mb-6">
                    <Package className="h-8 w-8 text-primary" />
                    <div>
                        <h2 className="text-xl font-semibold">{pluginInfo.name || pluginName}</h2>
                        <p className="text-sm text-muted-foreground">v{pluginInfo.version || '1.0.0'}</p>
                    </div>
                </div>

                {pluginInfo.description && (
                    <p className="text-sm text-muted-foreground mb-6">
                        {pluginInfo.description}
                    </p>
                )}

                <div className="space-y-4">
                    {/* Repository Info */}
                    <div className="bg-muted/30 border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <GitBranch className="h-4 w-4 text-primary" />
                            <span className="font-medium">Git Repository</span>
                        </div>
                        <div className="space-y-2">
                            {pluginInfo.repository?.url && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">URL:</span>
                                    <a
                                        href={pluginInfo.repository.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline flex items-center gap-1 font-mono"
                                    >
                                        {pluginInfo.repository.url}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Package Info */}
                    <div className="bg-muted/30 border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Package Details</span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Version:</span>
                                <span className="font-mono">{pluginInfo.version || 'N/A'}</span>
                            </div>
                            {pluginInfo.author && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Author:</span>
                                    <span>{pluginInfo.author}</span>
                                </div>
                            )}
                            {pluginInfo.license && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">License:</span>
                                    <span>{pluginInfo.license}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Version Management */}
                    {tokenSaved && (
                        <div className="bg-muted/30 border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag className="h-4 w-4 text-primary" />
                                <span className="font-medium">Управление версиями</span>
                            </div>

                            {isLoadingTags ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(() => {
                                        const localVersion = pluginInfo?.version || '1.0.0';
                                        const localVersionClean = localVersion.replace(/^v/, '');
                                        const latestTagClean = latestTag?.replace(/^v/, '');
                                        const comparison = compareVersions(localVersionClean, latestTagClean);

                                        if (!latestTag) {
                                            // No tags yet
                                            return (
                                                <>
                                                    <p className="text-sm text-muted-foreground">
                                                        📦 Тегов пока нет
                                                    </p>
                                                    {hasRepoAccess ? (
                                                        <Button onClick={() => setShowReleaseDialog(true)} className="w-full">
                                                            <Tag className="h-4 w-4 mr-2" />
                                                            Создать первый тег v{localVersionClean}
                                                        </Button>
                                                    ) : (
                                                        <Button onClick={handleCreatePR} className="w-full" disabled={isCreatingPR}>
                                                            {isCreatingPR ? (
                                                                <>
                                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                    Создание PR...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <GitBranch className="h-4 w-4 mr-2" />
                                                                    Создать Pull Request
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                </>
                                            );
                                        } else if (comparison === 0) {
                                            // Versions match
                                            return (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span>v{localVersionClean} (синхронизировано)</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Локальная версия совпадает с последним тегом в Git
                                                    </p>
                                                </div>
                                            );
                                        } else if (comparison > 0) {
                                            // Local version is newer
                                            return (
                                                <>
                                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 space-y-1">
                                                        <div className="flex items-center gap-2 text-sm font-medium">
                                                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                                            <span>У вас есть изменения!</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            Локальная версия: v{localVersionClean}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Версия в Git: v{latestTagClean}
                                                        </p>
                                                    </div>
                                                    {hasRepoAccess ? (
                                                        <Button onClick={() => setShowReleaseDialog(true)} className="w-full">
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            Загрузить и создать тег v{localVersionClean}
                                                        </Button>
                                                    ) : (
                                                        <Button onClick={handleCreatePR} className="w-full" disabled={isCreatingPR}>
                                                            {isCreatingPR ? (
                                                                <>
                                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                    Создание PR...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <GitBranch className="h-4 w-4 mr-2" />
                                                                    Создать Pull Request
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                </>
                                            );
                                        } else {
                                            // Local version is older
                                            return (
                                                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 space-y-1">
                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                        <AlertCircle className="h-4 w-4 text-blue-600" />
                                                        <span>Локальная версия устарела</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Локальная версия: v{localVersionClean}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Версия в Git: v{latestTagClean}
                                                    </p>
                                                    <Button variant="outline" className="w-full mt-2" disabled>
                                                        <GitBranch className="h-4 w-4 mr-2" />
                                                        Скачать обновления
                                                        <span className="ml-auto text-xs text-muted-foreground">Скоро</span>
                                                    </Button>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Official List Submission */}
                    {tokenSaved && latestTag && (() => {
                        const needsUpdate = isInOfficialList && officialListVersion && compareVersions(latestTag, officialListVersion) > 0;
                        const isUpToDate = isInOfficialList && officialListVersion && compareVersions(latestTag, officialListVersion) === 0;

                        return (
                            <div className="bg-muted/30 border rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <List className="h-4 w-4 text-primary" />
                                    <span className="font-medium">Официальный список плагинов</span>
                                </div>
                                {isCheckingOfficialList ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : isUpToDate ? (
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-sm">Плагин в официальном списке ({officialListVersion})</span>
                                    </div>
                                ) : needsUpdate ? (
                                    <>
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                                            <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                                <span>Доступно обновление версии</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Версия в списке: {officialListVersion}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Ваша версия: {latestTag}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setShowOfficialListDialog(true)}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            <ArrowUpCircle className="h-4 w-4 mr-2" />
                                            Обновить версию в списке
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Добавьте ваш плагин в официальный список BlockMine что бы он появился в магазине плагинов
                                        </p>
                                        <Button
                                            onClick={() => setShowOfficialListDialog(true)}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            <List className="h-4 w-4 mr-2" />
                                            Подать в официальный список
                                        </Button>
                                    </>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Release Dialog */}
                <CreateReleaseDialog
                    isOpen={showReleaseDialog}
                    onClose={() => setShowReleaseDialog(false)}
                    version={`v${(pluginInfo?.version || '1.0.0').replace(/^v/, '')}`}
                    onConfirm={handleCreateRelease}
                    isLoading={isCreatingRelease}
                />

                {/* Official List Dialog */}
                <SubmitToOfficialListDialog
                    isOpen={showOfficialListDialog}
                    onClose={() => setShowOfficialListDialog(false)}
                    pluginInfo={pluginInfo}
                    repoUrl={pluginInfo?.repository?.url}
                    latestTag={latestTag}
                    botId={botId}
                    pluginName={pluginName}
                    githubToken={githubToken}
                    isUpdate={isInOfficialList && officialListVersion && compareVersions(latestTag, officialListVersion) > 0}
                    currentVersion={officialListVersion}
                    onSuccess={() => {
                        setIsInOfficialList(true);
                        setOfficialListVersion(latestTag);
                    }}
                />
            </div>
        );
    }


    // No repository - show setup
    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
                <Package className="h-8 w-8 text-primary" />
                <div>
                    <h2 className="text-xl font-semibold">Плагин: {pluginName}</h2>
                    <p className="text-sm text-muted-foreground">Git репозиторий не настроен</p>
                </div>
            </div>

            <div className="bg-muted/30 border rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                        <h3 className="font-medium mb-1">Плагин не связан с Git</h3>
                        <p className="text-sm text-muted-foreground">
                            Загрузите плагин в GitHub для управления версиями и совместной разработки
                        </p>
                    </div>
                </div>
            </div>

            {/* GitHub Token Setup */}
            {!tokenSaved ? (
                <div className="space-y-4 mb-6">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Key className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div className="flex-grow">
                                <h3 className="font-medium mb-2 text-sm">Настройте GitHub интеграцию</h3>

                                <Label htmlFor="github-token" className="text-sm mb-2 block">
                                    Personal Access Token
                                </Label>
                                <div className="flex gap-2 mb-2">
                                    <Input
                                        id="github-token"
                                        type={showToken ? "text" : "password"}
                                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                        value={githubToken}
                                        onChange={(e) => setGithubToken(e.target.value)}
                                        className="font-mono text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setShowToken(!showToken)}
                                    >
                                        {showToken ? '🙈' : '👁️'}
                                    </Button>
                                </div>

                                <p className="text-xs text-muted-foreground mb-3">
                                    🔒 Токен сохранится локально в вашем браузере
                                </p>

                                <div className="bg-muted/50 rounded p-3 text-xs space-y-1 mb-3">
                                    <p className="font-medium">Как создать токен:</p>
                                    <p>1. Откройте <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/settings/tokens/new</a></p>
                                    <p>2. Выберите scope: <code className="bg-muted px-1 rounded">repo</code></p>
                                    <p>3. Скопируйте токен и вставьте выше</p>
                                </div>

                                <Button onClick={handleSaveToken} className="w-full">
                                    <Github className="h-4 w-4 mr-2" />
                                    Сохранить токен
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Token saved indicator */}
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">GitHub настроен (@{githubUsername})</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleRemoveToken}>
                            Изменить
                        </Button>
                    </div>

                    {/* Upload or Clone options */}
                    <div className="bg-muted/30 border rounded-lg p-4">
                        <h3 className="font-medium mb-4">Загрузить плагин в GitHub</h3>

                        <RadioGroup value={uploadMode} onValueChange={setUploadMode} className="space-y-3 mb-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="new" id="new" />
                                <Label htmlFor="new" className="cursor-pointer">Создать новый репозиторий</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="existing" id="existing" />
                                <Label htmlFor="existing" className="cursor-pointer">В существующий репозиторий</Label>
                            </div>
                        </RadioGroup>

                        {uploadMode === 'new' ? (
                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="repo-name">Имя репозитория</Label>
                                    <Input
                                        id="repo-name"
                                        value={newRepoName}
                                        onChange={(e) => setNewRepoName(e.target.value)}
                                        placeholder="my-awesome-plugin"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="private"
                                        checked={isPrivate}
                                        onCheckedChange={setIsPrivate}
                                    />
                                    <Label htmlFor="private" className="cursor-pointer text-sm">
                                        Private repository
                                    </Label>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <Label htmlFor="existing-repo">Выберите репозиторий</Label>
                                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingRepos ? "Загрузка..." : "Выберите репозиторий"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {repositories.map(repo => (
                                            <SelectItem key={repo.id} value={repo.full_name}>
                                                {repo.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <Button
                            onClick={handleUploadToGithub}
                            disabled={isUploading}
                            className="w-full mt-4"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Загрузка...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Загрузить плагин в GitHub
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
