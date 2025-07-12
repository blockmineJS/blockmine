import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import Editor from "@monaco-editor/react";
import { apiHelper } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import FileTree from '@/components/ide/FileTree';
import { toast } from '@/hooks/use-toast';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import path from 'path-browserify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Github } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { X } from 'lucide-react';

export default function PluginIdePage() {
    const { botId, pluginName } = useParams();
    const [structure, setStructure] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [nodeToDelete, setNodeToDelete] = useState(null);
    const [inlineAction, setInlineAction] = useState(null);
    const [isPrDialogOpen, setIsPrDialogOpen] = useState(false);
    const [prForm, setPrForm] = useState({ 
        branch: `feature/local-changes-${new Date().toISOString().slice(0, 16).replace(/[:-]/g, '-')}`, 
        commitMessage: 'Changes from local edit', 
        originalRepo: '' 
    });
    const [isPrLoading, setIsPrLoading] = useState(false);

    const [openTabs, setOpenTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);

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
            const newTab = { ...file, content, isDirty: false };
            setOpenTabs(prev => [...prev, newTab]);
            setActiveTab(file.path);
        } catch (error) {
            console.error('Failed to load file content:', error);
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить файл.' });
        }
    };
    
    const handleFileOperation = async (operation, path, newPath = '') => {
        try {
            await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/fs`, {
                method: 'POST',
                body: JSON.stringify({ operation, path, newPath }),
            });
            await fetchStructure();
            toast({ title: 'Успех!', description: `Операция "${operation}" для "${path}" выполнена.` });
            return true;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: `Не удалось выполнить операцию: ${error.message}`});
            return false;
        }
    };

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
            
            toast({ title: 'Успех!', description: `Файл перемещен в "${path.dirname(actualNewPath)}"` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: `Не удалось переместить файл: ${error.message}`});
            throw error;
        }
    };

    const handleDeleteNode = async () => {
        if (!nodeToDelete) return;
        await handleFileOperation('delete', nodeToDelete.path);
        
        const affectedTabs = openTabs.filter(tab => tab.path.startsWith(nodeToDelete.path));
        if (affectedTabs.length > 0) {
            const newTabs = openTabs.filter(tab => !tab.path.startsWith(nodeToDelete.path));
            setOpenTabs(newTabs);
            if (affectedTabs.some(tab => tab.path === activeTab)) {
                setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null);
            }
        }
        setNodeToDelete(null);
    };

    const handleStartInlineAction = (mode, node) => {
        setInlineAction({ mode, node });
    };

    const handleCancelInline = () => {
        setInlineAction(null);
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

    const handleSave = async () => {
        if (!activeTab) return;
        const currentTab = openTabs.find(tab => tab.path === activeTab);
        if (!currentTab || !currentTab.isDirty) return;
        try {
            await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/file`, {
                method: 'POST',
                body: JSON.stringify({ path: currentTab.path, content: currentTab.content }),
            });
            setOpenTabs(prev => prev.map(tab => 
                tab.path === activeTab ? { ...tab, isDirty: false } : tab
            ));
            toast({ title: 'Успех', description: `Файл ${currentTab.name} сохранен.` });
        } catch(e) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить файл.' });
        }
    };

    const handleCloseTab = (tabPath, e) => {
        e.stopPropagation();
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

    const handleEditorChange = (value) => {
        setOpenTabs(prev => prev.map(tab => 
            tab.path === activeTab ? { ...tab, content: value, isDirty: true } : tab
        ));
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && activeTab && openTabs.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
            }
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [activeTab, openTabs]);

    const getLanguage = (filename) => {
        const extension = filename.split('.').pop();
        switch (extension) {
            case 'js': return 'javascript';
            case 'json': return 'json';
            case 'md': return 'markdown';
            default: return 'plaintext';
        }
    };

    const fetchManifest = useCallback(async () => {
        try {
            const data = await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/manifest`);
            return data;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить manifest.' });
            return null;
        }
    }, [botId, pluginName]);

    const handleOpenPrDialog = async () => {
        const manifest = await fetchManifest();
        const repoUrl = manifest?.repository?.url || '';
        
        setPrForm(prev => ({ 
            ...prev, 
            originalRepo: repoUrl
        }));
        
        setIsPrDialogOpen(true);
    };

    const handlePrFormChange = (e) => {
        setPrForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCreatePr = async () => {
        setIsPrLoading(true);
        try {
            const response = await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/create-pr`, {
                method: 'POST',
                body: JSON.stringify({
                    branch: prForm.branch,
                    commitMessage: prForm.commitMessage,
                    repositoryUrl: prForm.originalRepo
                }),
            });
            
            console.log('PR Response:', response);
            
            if (response.success) {
                console.log('Opening PR URL:', response.prUrl);
                const opened = window.open(response.prUrl, '_blank');
                
                if (!opened) {
                    console.warn('Popup blocked by browser');
                    toast({ 
                        title: 'PR создан', 
                        description: `${response.message}. Откройте ссылку: ${response.prUrl}`,
                        duration: 10000 
                    });
                } else {
                    toast({ 
                        title: 'Успех', 
                        description: response.message || 'PR успешно создан и открыт.' 
                    });
                }
                setIsPrDialogOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Ошибка', description: 'Неожиданный ответ от сервера' });
            }
        } catch (error) {
            console.error('PR Error:', error);
            toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
        } finally {
            setIsPrLoading(false);
        }
    };
    
    return (
        <div className="h-full w-full flex flex-col p-4 gap-4">
             <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Редактор плагина: {pluginName}</h1>
                    <p className="text-muted-foreground">Редактирование для бота #{botId}</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleOpenPrDialog}>
                        <Github className="h-4 w-4 mr-2" />
                        Создать PR
                    </Button>
                    <Button onClick={handleSave} disabled={!activeTab || !openTabs.find(tab => tab.path === activeTab)?.isDirty}>
                        <Save className="h-4 w-4 mr-2" />
                        Сохранить
                    </Button>
                </div>
            </header>
            <ResizablePanelGroup direction="horizontal" className="flex-grow rounded-lg border">
                <ResizablePanel defaultSize={20} minSize={10}>
                    <Card className="h-full m-1 rounded-lg flex flex-col">
                        <CardHeader className="p-2 border-b">
                            <CardTitle className="text-base p-2">Файлы</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-grow">
                            {isLoading ? <p className="p-4 text-sm text-muted-foreground">Загрузка...</p> : 
                                <FileTree 
                                    structure={structure} 
                                    onSelectFile={handleSelectFile} 
                                    selectedFile={openTabs.find(tab => tab.path === activeTab)}
                                    onDelete={setNodeToDelete}
                                    onRename={(node) => handleStartInlineAction('rename', node)}
                                    onCreateFile={(node) => handleStartInlineAction('createFile', node)}
                                    onCreateFolder={(node) => handleStartInlineAction('createFolder', node)}
                                    inlineAction={inlineAction}
                                    onCommit={handleCommitInline}
                                    onCancel={handleCancelInline}
                                    onMoveFile={handleMoveFile}
                                />}
                        </CardContent>
                    </Card>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={80} minSize={50}>
                    {openTabs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            Выберите файл для редактирования
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            <TabsList className="flex-shrink-0 justify-start overflow-x-auto">
                                {openTabs.map(tab => (
                                    <TabsTrigger key={tab.path} value={tab.path} className="group relative">
                                        {tab.name}{tab.isDirty ? '*' : ''}
                                        <X 
                                            className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100" 
                                            onClick={(e) => handleCloseTab(tab.path, e)} 
                                        />
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {openTabs.map(tab => (
                                <TabsContent key={tab.path} value={tab.path} className="flex-grow mt-0">
                                    <Editor
                                        height="100%"
                                        language={getLanguage(tab.name)}
                                        value={tab.content || ''}
                                        onChange={handleEditorChange}
                                        theme="vs-dark"
                                        options={{ 
                                            minimap: { enabled: false },
                                            quickSuggestions: false,
                                            suggestOnTriggerCharacters: false
                                        }}
                                        onMount={(editor) => {
                                            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                                                handleSave();
                                            });
                                        }}
                                    />
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>

            {nodeToDelete && (
                <ConfirmationDialog
                    open={!!nodeToDelete}
                    onOpenChange={() => setNodeToDelete(null)}
                    title={`Удалить ${nodeToDelete.type === 'folder' ? 'папку' : 'файл'} "${nodeToDelete.name}"?`}
                    description="Это действие необратимо. Все содержимое будет удалено."
                    onConfirm={handleDeleteNode}
                    confirmText="Да, удалить"
                />
            )}

            <Dialog open={isPrDialogOpen} onOpenChange={setIsPrDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Создать Pull Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="originalRepo">URL репозитория</Label>
                            <Input 
                                id="originalRepo" 
                                name="originalRepo" 
                                value={prForm.originalRepo} 
                                onChange={handlePrFormChange} 
                                placeholder="https://github.com/user/repo.git"
                            />
                            {prForm.originalRepo && (
                                <div className="text-sm text-muted-foreground">
                                    Изменения будут отправлены в новую ветку этого репозитория
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="branch">Название ветки</Label>
                            <Input id="branch" name="branch" value={prForm.branch} onChange={handlePrFormChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="commitMessage">Сообщение коммита</Label>
                            <Input id="commitMessage" name="commitMessage" value={prForm.commitMessage} onChange={handlePrFormChange} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreatePr} disabled={isPrLoading || !prForm.branch || !prForm.originalRepo}>
                            {isPrLoading ? 'Создание...' : 'Создать и открыть PR'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 