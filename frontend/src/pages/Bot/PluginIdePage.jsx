import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiHelper } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/hooks/use-toast';
import path from 'path-browserify';
import Workbench from '@/components/ide/Workbench';

export default function PluginIdePage() {
    const { botId, pluginName } = useParams();
    const navigate = useNavigate();
    const [structure, setStructure] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openTabs, setOpenTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);

    // File Operations State
    const [nodeToDelete, setNodeToDelete] = useState(null);
    const [inlineAction, setInlineAction] = useState(null);

    const fetchStructure = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/structure`);
            setStructure(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить структуру плагина.' });
        } finally {
            setIsLoading(false);
        }
    }, [botId, pluginName]);

    useEffect(() => {
        fetchStructure();
    }, [fetchStructure]);

    const handleSelectFile = async (file) => {
        const existingTab = openTabs.find(tab => tab.path === file.path);
        if (existingTab) {
            setActiveTab(file.path);
            return;
        }

        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/file?path=${encodeURIComponent(file.path)}`, {
                headers: {
                    'Authorization': `Bearer ${useAppStore.getState().token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const content = await response.text();
            const newTab = { ...file, content, isDirty: false, originalContent: content };
            setOpenTabs(prev => [...prev, newTab]);
            setActiveTab(file.path);
        } catch (error) {
            console.error('Failed to load file content:', error);
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить файл.' });
        }
    };

    const handleOpenFileAtLine = async (filePath, lineNumber) => {
        const existingTab = openTabs.find(tab => tab.path === filePath);

        if (existingTab) {
            setActiveTab(filePath);
            setTimeout(() => {
                const event = new CustomEvent('revealLine', { detail: { line: lineNumber } });
                window.dispatchEvent(event);
            }, 100);
            return;
        }

        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/file?path=${encodeURIComponent(filePath)}`, {
                headers: {
                    'Authorization': `Bearer ${useAppStore.getState().token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const content = await response.text();
            const fileName = path.basename(filePath);
            const newTab = {
                path: filePath,
                name: fileName,
                type: 'file',
                content,
                isDirty: false,
                originalContent: content
            };
            setOpenTabs(prev => [...prev, newTab]);
            setActiveTab(filePath);

            setTimeout(() => {
                const event = new CustomEvent('revealLine', { detail: { line: lineNumber } });
                window.dispatchEvent(event);
            }, 200);
        } catch (error) {
            console.error('Failed to load file:', error);
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось открыть файл.' });
        }
    };

    const handleCloseTab = (file) => {
        const tabPath = file.path;
        const tab = openTabs.find(t => t.path === tabPath);
        if (tab.isDirty) {
            if (!window.confirm('У вас есть несохраненные изменения. Вы уверены, что хотите закрыть вкладку?')) {
                return;
            }
        }
        const newTabs = openTabs.filter(t => t.path !== tabPath);
        setOpenTabs(newTabs);
        if (activeTab === tabPath) {
            setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null);
        }
    };

    const handleContentChange = (path, value) => {
        setOpenTabs(prev => prev.map(tab =>
            tab.path === path ? { ...tab, content: value, isDirty: true } : tab
        ));
    };

    const handleSave = async (fileToSave) => {
        const targetPath = fileToSave?.path || activeTab;
        if (!targetPath) return;

        const currentTab = openTabs.find(tab => tab.path === targetPath);
        if (!currentTab || !currentTab.isDirty) return;

        try {
            const result = await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/file`, {
                method: 'POST',
                body: JSON.stringify({ path: currentTab.path, content: currentTab.content }),
            });

            setOpenTabs(prev => prev.map(tab =>
                tab.path === targetPath ? { ...tab, isDirty: false, originalContent: tab.content } : tab
            ));

            // Проверка на переименование плагина
            if (result?.renamed && result?.newName) {
                toast({
                    title: 'Плагин переименован',
                    description: `${result.oldName} → ${result.newName}. Перенаправление...`
                });

                // Перенаправить на новый URL через 1 секунду
                setTimeout(() => {
                    navigate(`/bots/${botId}/plugins/ide/${result.newName}`);
                }, 1000);
            } else {
                toast({ title: 'Успех', description: `Файл ${currentTab.name} сохранен.` });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить файл.' });
        }
    };

    // File System Operations
    const handleFileOperation = async (operation, path, newPath = '') => {
        try {
            await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/fs`, {
                method: 'POST',
                body: JSON.stringify({ operation, path, newPath }),
            });
            await fetchStructure();
            toast({ title: 'Успех!', description: `Операция "${operation}" выполнена.` });
            return true;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: `Не удалось выполнить операцию: ${error.message}` });
            return false;
        }
    };

    // Handle delete confirmation
    useEffect(() => {
        if (!nodeToDelete) return;

        const message = nodeToDelete.type === 'folder'
            ? `Вы уверены, что хотите удалить папку "${nodeToDelete.name}" и всё её содержимое?`
            : `Вы уверены, что хотите удалить файл "${nodeToDelete.name}"?`;

        if (window.confirm(message)) {
            (async () => {
                const success = await handleFileOperation('delete', nodeToDelete.path);
                if (success) {
                    setOpenTabs(prev => prev.filter(tab => {
                        if (nodeToDelete.type === 'folder') {
                            return !tab.path.startsWith(nodeToDelete.path + '/') && tab.path !== nodeToDelete.path;
                        }
                        return tab.path !== nodeToDelete.path;
                    }));

                    setActiveTab(prev => {
                        if (!prev) return null;
                        if (nodeToDelete.type === 'folder' && (prev.startsWith(nodeToDelete.path + '/') || prev === nodeToDelete.path)) {
                            return null;
                        }
                        if (prev === nodeToDelete.path) {
                            return null;
                        }
                        return prev;
                    });
                }
            })();
        }
        setNodeToDelete(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeToDelete]);

    const handleMoveFile = async (sourcePath, targetPath) => {
        try {
            const response = await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/fs`, {
                method: 'POST',
                body: JSON.stringify({ operation: 'move', path: sourcePath, newPath: targetPath }),
            });
            await fetchStructure();

            const actualNewPath = response?.newPath || targetPath;

            setOpenTabs(prev => prev.map(tab => {
                if (tab.path === sourcePath) {
                    return { ...tab, path: actualNewPath, name: path.basename(actualNewPath) };
                }
                if (tab.path.startsWith(sourcePath + '/')) {
                    const relativePath = tab.path.substring(sourcePath.length + 1);
                    const newTabPath = path.join(actualNewPath, relativePath);
                    return { ...tab, path: newTabPath, name: path.basename(newTabPath) };
                }
                return tab;
            }));

            if (activeTab) {
                if (activeTab === sourcePath) {
                    setActiveTab(actualNewPath);
                } else if (activeTab.startsWith(sourcePath + '/')) {
                    const relativePath = activeTab.substring(sourcePath.length + 1);
                    const newActivePath = path.join(actualNewPath, relativePath);
                    setActiveTab(newActivePath);
                }
            }

            toast({ title: 'Успех!', description: `Файл перемещен.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: `Не удалось переместить файл: ${error.message}` });
        }
    };

    const handleCommitInline = async (newName) => {
        if (!inlineAction || !newName) {
            setInlineAction(null);
            return;
        }

        const { mode, node } = inlineAction;
        let success = false;

        if (mode === 'rename') {
            if (newName === node.name) {
                setInlineAction(null);
                return;
            }
            const newPath = path.join(path.dirname(node.path), newName);
            success = await handleFileOperation('rename', node.path, newPath);
            if (success) {
                setOpenTabs(prev => prev.map(tab => {
                    if (tab.path.startsWith(node.path)) {
                        const newTabPath = tab.path.replace(node.path, newPath);
                        return { ...tab, path: newTabPath, name: path.basename(newTabPath) };
                    }
                    return tab;
                }));
                if (activeTab && activeTab.startsWith(node.path)) {
                    const newActiveTab = activeTab.replace(node.path, newPath);
                    setActiveTab(newActiveTab);
                }
            }
        } else if (mode === 'createFile' || mode === 'createFolder') {
            const parentPath = node.type === 'folder' ? node.path : path.dirname(node.path);
            const newPath = path.join(parentPath, newName);
            const operation = mode === 'createFile' ? 'createFile' : 'createFolder';
            success = await handleFileOperation(operation, newPath);
        }

        setInlineAction(null);
        if (success) {
            await fetchStructure();
        }
    };

    return (
        <div className="h-full w-full overflow-hidden">
            <Workbench
                botId={botId}
                pluginName={pluginName}
                files={openTabs}
                activeFile={openTabs.find(t => t.path === activeTab)}
                onSelectFile={handleSelectFile}
                onCloseFile={handleCloseTab}
                onSaveFile={handleSave}
                fileStructure={structure}
                unsavedFiles={new Set(openTabs.filter(t => t.isDirty).map(t => t.path))}
                onContentChange={handleContentChange}
                onOpenFileAtLine={handleOpenFileAtLine}
                onFileOperation={{
                    onDelete: setNodeToDelete,
                    onRename: (node) => setInlineAction({ mode: 'rename', node }),
                    onCreateFile: (node) => setInlineAction({ mode: 'createFile', node }),
                    onCreateFolder: (node) => setInlineAction({ mode: 'createFolder', node }),
                    inlineAction: inlineAction,
                    onCommit: handleCommitInline,
                    onCancel: () => setInlineAction(null),
                    onMoveFile: handleMoveFile
                }}
            />
        </div>
    );
}