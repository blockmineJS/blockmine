import React, { useState, useEffect, useCallback } from 'react';
import {
    GitBranch,
    RefreshCw,
    Check,
    Upload,
    Download,
    Plus,
    Minus,
    FileText,
    FilePlus,
    FileX,
    FileEdit,
    ChevronDown,
    ChevronRight,
    History,
    AlertCircle,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/stores/appStore';

// Иконка для типа изменения файла
const FileChangeIcon = ({ status }) => {
    switch (status) {
        case 'A':
        case '?':
            return <FilePlus className="w-4 h-4 text-green-500" />;
        case 'M':
            return <FileEdit className="w-4 h-4 text-yellow-500" />;
        case 'D':
            return <FileX className="w-4 h-4 text-red-500" />;
        case 'R':
            return <FileText className="w-4 h-4 text-blue-500" />;
        default:
            return <FileText className="w-4 h-4 text-gray-500" />;
    }
};

// Название статуса изменения
const getStatusLabel = (status) => {
    switch (status) {
        case 'A': return 'Added';
        case 'M': return 'Modified';
        case 'D': return 'Deleted';
        case 'R': return 'Renamed';
        case '?': return 'Untracked';
        default: return status;
    }
};

export default function GitView({ botId, pluginName, onRefresh }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [gitStatus, setGitStatus] = useState(null);
    const [commitMessage, setCommitMessage] = useState('');
    const [committing, setCommitting] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [pulling, setPulling] = useState(false);
    const [commitHistory, setCommitHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileDiff, setFileDiff] = useState('');
    const [loadingDiff, setLoadingDiff] = useState(false);

    // Секции UI
    const [stagedOpen, setStagedOpen] = useState(true);
    const [changesOpen, setChangesOpen] = useState(true);
    const [historyOpen, setHistoryOpen] = useState(false);

    // Helper для получения headers с авторизацией
    const getHeaders = (includeContentType = false) => {
        const headers = {
            'Authorization': `Bearer ${useAppStore.getState().token}`
        };
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    };

    // Загрузка статуса Git
    const fetchGitStatus = useCallback(async () => {
        if (!pluginName) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/git/status`, {
                headers: getHeaders()
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get git status');
            }

            setGitStatus(data);
        } catch (err) {
            setError(err.message);
            setGitStatus(null);
        } finally {
            setLoading(false);
        }
    }, [botId, pluginName]);

    // Загрузка истории коммитов
    const fetchCommitHistory = useCallback(async () => {
        if (!pluginName) return;

        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/git/log`, {
                headers: getHeaders()
            });
            const data = await response.json();

            if (response.ok) {
                setCommitHistory(data.commits || []);
            }
        } catch (err) {
            console.error('Failed to fetch commit history:', err);
        }
    }, [botId, pluginName]);

    useEffect(() => {
        fetchGitStatus();
        fetchCommitHistory();
    }, [fetchGitStatus, fetchCommitHistory]);

    // Stage файл
    const stageFile = async (filePath) => {
        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/git/add`, {
                method: 'POST',
                headers: getHeaders(true),
                body: JSON.stringify({ files: [filePath] })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to stage file');
            }

            await fetchGitStatus();
        } catch (err) {
            setError(err.message);
        }
    };

    // Unstage файл
    const unstageFile = async (filePath) => {
        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/git/reset`, {
                method: 'POST',
                headers: getHeaders(true),
                body: JSON.stringify({ files: [filePath] })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to unstage file');
            }

            await fetchGitStatus();
        } catch (err) {
            setError(err.message);
        }
    };

    // Stage все файлы
    const stageAll = async () => {
        if (!gitStatus?.unstaged?.length) return;

        try {
            const files = gitStatus.unstaged.map(f => f.path);
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/git/add`, {
                method: 'POST',
                headers: getHeaders(true),
                body: JSON.stringify({ files })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to stage files');
            }

            await fetchGitStatus();
        } catch (err) {
            setError(err.message);
        }
    };

    // Unstage все файлы
    const unstageAll = async () => {
        if (!gitStatus?.staged?.length) return;

        try {
            const files = gitStatus.staged.map(f => f.path);
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/git/reset`, {
                method: 'POST',
                headers: getHeaders(true),
                body: JSON.stringify({ files })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to unstage files');
            }

            await fetchGitStatus();
        } catch (err) {
            setError(err.message);
        }
    };

    // Создать коммит
    const createCommit = async () => {
        if (!commitMessage.trim() || !gitStatus?.staged?.length) return;

        setCommitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/git/commit`, {
                method: 'POST',
                headers: getHeaders(true),
                body: JSON.stringify({ message: commitMessage.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create commit');
            }

            setCommitMessage('');
            await fetchGitStatus();
            await fetchCommitHistory();
        } catch (err) {
            setError(err.message);
        } finally {
            setCommitting(false);
        }
    };

    // Push изменения
    const pushChanges = async () => {
        setPushing(true);
        setError(null);

        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/git/push`, {
                method: 'POST',
                headers: getHeaders(true)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to push changes');
            }

            await fetchGitStatus();
        } catch (err) {
            setError(err.message);
        } finally {
            setPushing(false);
        }
    };

    // Pull изменения
    const pullChanges = async () => {
        setPulling(true);
        setError(null);

        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/git/pull`, {
                method: 'POST',
                headers: getHeaders(true)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to pull changes');
            }

            await fetchGitStatus();
            await fetchCommitHistory();

            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setPulling(false);
        }
    };

    // Синхронизация с GitHub
    const syncWithGitHub = async () => {
        if (!window.confirm('⚠️ Это заменит все локальные файлы версиями с GitHub.\n\nВсе несохранённые изменения будут ПОТЕРЯНЫ!\n\nПродолжить?')) {
            return;
        }

        setSyncing(true);
        setError(null);

        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/git/sync`, {
                method: 'POST',
                headers: getHeaders(true)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to sync with GitHub');
            }

            await fetchGitStatus();
            await fetchCommitHistory();

            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSyncing(false);
        }
    };

    // Загрузка diff файла
    const fetchFileDiff = async (file, isStaged) => {
        setLoadingDiff(true);
        setSelectedFile({ ...file, isStaged });

        try {
            const response = await fetch(
                `/api/bots/${botId}/plugins/ide/${pluginName}/git/diff?path=${encodeURIComponent(file.path)}&staged=${isStaged}&status=${encodeURIComponent(file.status || '')}`,
                { headers: getHeaders() }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get file diff');
            }

            setFileDiff(data.diff || 'No changes');
        } catch (err) {
            setFileDiff(`Error: ${err.message}`);
        } finally {
            setLoadingDiff(false);
        }
    };

    // Компонент элемента файла
    const FileItem = ({ file, isStaged }) => {
        const isSelected = selectedFile?.path === file.path && selectedFile?.isStaged === isStaged;

        return (
            <div className={`flex items-center justify-between py-1 px-2 hover:bg-slate-700/50 rounded group cursor-pointer ${isSelected ? 'bg-slate-700/70' : ''}`}>
                <div
                    className="flex items-center gap-2 flex-1 min-w-0"
                    onClick={() => fetchFileDiff(file, isStaged)}
                >
                    <FileChangeIcon status={file.status} />
                    <span className="text-sm truncate" title={file.path}>
                        {file.path}
                    </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isStaged ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                unstageFile(file.path);
                            }}
                            className="p-1 hover:bg-slate-600 rounded"
                            title="Unstage"
                        >
                            <Minus className="w-3 h-3" />
                        </button>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                stageFile(file.path);
                            }}
                            className="p-1 hover:bg-slate-600 rounded"
                            title="Stage"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (!pluginName) {
        return (
            <div className="p-4 text-center text-slate-400">
                Плагин не выбран
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    <span className="text-sm font-medium">
                        {gitStatus?.branch || 'main'}
                    </span>
                </div>
                <button
                    onClick={fetchGitStatus}
                    className="p-1 hover:bg-slate-700 rounded"
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-3">
                    {/* Ошибка */}
                    {error && (
                        <div className="flex items-start gap-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-sm">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span className="text-red-200">{error}</span>
                        </div>
                    )}

                    {/* Не Git репозиторий */}
                    {gitStatus && !gitStatus.isGitRepo && (
                        <div className="p-4 text-center text-slate-400">
                            <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Это не Git репозиторий</p>
                            <p className="text-xs mt-1">Инициализируйте репозиторий через вкладку Plugin</p>
                        </div>
                    )}

                    {/* Git контент */}
                    {gitStatus?.isGitRepo && (
                        <>
                            {/* Поле для сообщения коммита */}
                            <div className="space-y-2">
                                <Textarea
                                    placeholder="Сообщение коммита"
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    className="min-h-[60px] text-sm bg-slate-800 border-slate-600"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) {
                                            createCommit();
                                        }
                                    }}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={createCommit}
                                        disabled={!commitMessage.trim() || !gitStatus?.staged?.length || committing}
                                        className="flex-1"
                                        size="sm"
                                    >
                                        <Check className="w-4 h-4 mr-1" />
                                        {committing ? 'Committing...' : 'Commit'}
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={pullChanges}
                                        disabled={pulling}
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                    >
                                        <Download className="w-4 h-4 mr-1" />
                                        {pulling ? 'Pulling...' : 'Pull'}
                                    </Button>
                                    <Button
                                        onClick={pushChanges}
                                        disabled={pushing}
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                    >
                                        <Upload className="w-4 h-4 mr-1" />
                                        {pushing ? 'Pushing...' : 'Push'}
                                    </Button>
                                </div>
                                <Button
                                    onClick={syncWithGitHub}
                                    disabled={syncing}
                                    variant="secondary"
                                    size="sm"
                                    className="w-full"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                                    {syncing ? 'Синхронизация...' : 'Синхронизировать с GitHub'}
                                </Button>
                            </div>

                            {/* Staged Changes */}
                            <div>
                                <div
                                    className="flex items-center justify-between w-full py-1 hover:bg-slate-700/50 rounded px-1 cursor-pointer"
                                    onClick={() => setStagedOpen(!stagedOpen)}
                                >
                                    <div className="flex items-center gap-1">
                                        {stagedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        <span className="text-xs font-medium uppercase">
                                            Staged Changes
                                        </span>
                                        {gitStatus?.staged?.length > 0 && (
                                            <span className="text-xs bg-green-500/30 px-1.5 rounded">
                                                {gitStatus.staged.length}
                                            </span>
                                        )}
                                    </div>
                                    {gitStatus?.staged?.length > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                unstageAll();
                                            }}
                                            className="p-1 hover:bg-slate-600 rounded"
                                            title="Unstage All"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                {stagedOpen && (
                                    <div className="ml-2">
                                        {gitStatus?.staged?.length > 0 ? (
                                            gitStatus.staged.map((file, i) => (
                                                <FileItem key={i} file={file} isStaged={true} />
                                            ))
                                        ) : (
                                            <div className="text-xs text-slate-500 py-2 px-2">
                                                Нет staged изменений
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Changes */}
                            <div>
                                <div
                                    className="flex items-center justify-between w-full py-1 hover:bg-slate-700/50 rounded px-1 cursor-pointer"
                                    onClick={() => setChangesOpen(!changesOpen)}
                                >
                                    <div className="flex items-center gap-1">
                                        {changesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        <span className="text-xs font-medium uppercase">
                                            Changes
                                        </span>
                                        {gitStatus?.unstaged?.length > 0 && (
                                            <span className="text-xs bg-yellow-500/30 px-1.5 rounded">
                                                {gitStatus.unstaged.length}
                                            </span>
                                        )}
                                    </div>
                                    {gitStatus?.unstaged?.length > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                stageAll();
                                            }}
                                            className="p-1 hover:bg-slate-600 rounded"
                                            title="Stage All"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                {changesOpen && (
                                    <div className="ml-2">
                                        {gitStatus?.unstaged?.length > 0 ? (
                                            gitStatus.unstaged.map((file, i) => (
                                                <FileItem key={i} file={file} isStaged={false} />
                                            ))
                                        ) : (
                                            <div className="text-xs text-slate-500 py-2 px-2">
                                                Нет изменений
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Commit History */}
                            <div>
                                <div
                                    className="flex items-center gap-1 w-full py-1 hover:bg-slate-700/50 rounded px-1 cursor-pointer"
                                    onClick={() => setHistoryOpen(!historyOpen)}
                                >
                                    {historyOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    <History className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase">
                                        Commit History
                                    </span>
                                </div>
                                {historyOpen && (
                                    <div className="ml-2 space-y-1">
                                        {commitHistory.length > 0 ? (
                                            commitHistory.slice(0, 10).map((commit, i) => (
                                                <div key={i} className="py-1.5 px-2 hover:bg-slate-700/50 rounded">
                                                    <div className="text-sm truncate" title={commit.message}>
                                                        {commit.message}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                        <span>{commit.author}</span>
                                                        <span>•</span>
                                                        <span>{new Date(commit.date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-slate-500 py-2 px-2">
                                                Нет коммитов
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>

            {/* Diff Viewer */}
            {selectedFile && (
                <div className="border-t border-slate-700 bg-slate-900">
                    {/* Diff Header */}
                    <div className="flex items-center justify-between p-2 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                            <FileChangeIcon status={selectedFile.status} />
                            <span className="text-sm font-medium">{selectedFile.path}</span>
                            <span className="text-xs text-slate-500">
                                {selectedFile.isStaged ? '(Staged)' : '(Unstaged)'}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedFile(null);
                                setFileDiff('');
                            }}
                            className="p-1 hover:bg-slate-700 rounded"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Diff Content */}
                    <ScrollArea className="h-[300px]">
                        {loadingDiff ? (
                            <div className="flex items-center justify-center h-full">
                                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                            </div>
                        ) : (
                            <pre className="p-3 text-xs font-mono overflow-x-auto">
                                {fileDiff.split('\n').map((line, i) => {
                                    let lineClass = 'text-slate-300';
                                    if (line.startsWith('+') && !line.startsWith('+++')) {
                                        lineClass = 'text-green-400 bg-green-500/10';
                                    } else if (line.startsWith('-') && !line.startsWith('---')) {
                                        lineClass = 'text-red-400 bg-red-500/10';
                                    } else if (line.startsWith('@@')) {
                                        lineClass = 'text-blue-400 font-semibold';
                                    } else if (line.startsWith('+++') || line.startsWith('---')) {
                                        lineClass = 'text-slate-500 font-semibold';
                                    }

                                    return (
                                        <div key={i} className={lineClass}>
                                            {line || '\u00A0'}
                                        </div>
                                    );
                                })}
                            </pre>
                        )}
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
