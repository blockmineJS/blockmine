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
import ManifestEditor from '@/components/ide/ManifestEditor';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import path from 'path-browserify';

export default function PluginIdePage() {
    const { botId, pluginName } = useParams();
    const [structure, setStructure] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [nodeToDelete, setNodeToDelete] = useState(null);
    const [inlineAction, setInlineAction] = useState(null); // { mode, node }

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
        if (isDirty) {
            if (!window.confirm('У вас есть несохраненные изменения. Вы уверены, что хотите продолжить?')) {
                return;
            }
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
            setSelectedFile(file);
            setFileContent(content);
            setIsDirty(false);
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

    const handleDeleteNode = async () => {
        if (!nodeToDelete) return;
        await handleFileOperation('delete', nodeToDelete.path);
        
        if (selectedFile && selectedFile.path.startsWith(nodeToDelete.path)) {
            setSelectedFile(null);
            setFileContent('');
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
            if (success && selectedFile && selectedFile.path.startsWith(node.path)) {
                const newSelectedFilePath = selectedFile.path.replace(node.path, newPath);
                setSelectedFile(prev => ({...prev, path: newSelectedFilePath, name: path.basename(newSelectedFilePath)}));
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
        if (!selectedFile || !isDirty) return;
        try {
            await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/file`, {
                method: 'POST',
                body: JSON.stringify({ path: selectedFile.path, content: fileContent }),
            });
            setIsDirty(false);
            toast({ title: 'Успех', description: `Файл ${selectedFile.name} сохранен.` });
        } catch(e) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить файл.' });
        }
    };

    const getLanguage = (filename) => {
        const extension = filename.split('.').pop();
        switch (extension) {
            case 'js': return 'javascript';
            case 'json': return 'json';
            case 'md': return 'markdown';
            default: return 'plaintext';
        }
    };
    
    return (
        <div className="h-full w-full flex flex-col p-4 gap-4">
             <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Редактор плагина: {pluginName}</h1>
                    <p className="text-muted-foreground">Редактирование для бота #{botId}</p>
                </div>
                <Button onClick={handleSave} disabled={!isDirty || !selectedFile}>
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                </Button>
            </header>
            <ResizablePanelGroup direction="horizontal" className="flex-grow rounded-lg border">
                <ResizablePanel defaultSize={20} minSize={15}>
                    <Card className="h-full m-1 rounded-lg flex flex-col">
                        <CardHeader className="p-2 border-b">
                            <CardTitle className="text-base p-2">Файлы</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-grow">
                            {isLoading ? <p className="p-4 text-sm text-muted-foreground">Загрузка...</p> : 
                                <FileTree 
                                    structure={structure} 
                                    onSelectFile={handleSelectFile} 
                                    selectedFile={selectedFile}
                                    onDelete={setNodeToDelete}
                                    onRename={(node) => handleStartInlineAction('rename', node)}
                                    onCreateFile={(node) => handleStartInlineAction('createFile', node)}
                                    onCreateFolder={(node) => handleStartInlineAction('createFolder', node)}
                                    inlineAction={inlineAction}
                                    onCommit={handleCommitInline}
                                    onCancel={handleCancelInline}
                                />}
                        </CardContent>
                    </Card>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={55} minSize={30}>
                    <Editor
                        height="calc(100vh - 120px)"
                        language={selectedFile ? getLanguage(selectedFile.name) : 'plaintext'}
                        value={fileContent || ''}
                        onChange={(value) => {
                            setFileContent(value);
                            setIsDirty(true);
                        }}
                        theme="vs-dark"
                        options={{ minimap: { enabled: false } }}
                    />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={20}>
                    <Card className="h-full m-1 rounded-lg">
                       <CardHeader className="p-2 border-b">
                           <CardTitle className="text-base p-2">package.json</CardTitle>
                       </CardHeader>
                       <CardContent className="overflow-y-auto">
                           <ManifestEditor botId={botId} pluginName={pluginName} />
                       </CardContent>
                    </Card>
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
        </div>
    );
} 