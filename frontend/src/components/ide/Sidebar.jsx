import React, { useState } from 'react';
import FileTree from './FileTree';
import SearchPanel from './SearchPanel';
import PluginView from './PluginView';
import GitView from './GitView';
import { Input } from '@/components/ui/input';
import { Search, FilePlus, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SidebarHeader = ({ title, children }) => (
    <div className="h-9 px-4 flex items-center justify-between bg-muted/10 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{title}</span>
        <div className="flex items-center gap-1">
            {children}
        </div>
    </div>
);

export default function Sidebar({
    activeView,
    botId,
    pluginName,
    fileStructure,
    onSelectFile,
    activeFile,
    onFileOperation,
    onOpenFileAtLine
}) {
    const [focusedNode, setFocusedNode] = useState(null);

    const handleNodeSelect = (node) => {
        setFocusedNode(node);
        if (node.type === 'file') {
            onSelectFile(node);
        }
    };

    const handleCreate = (type) => {
        // Default to root if no node focused
        let targetPath = '';

        if (focusedNode) {
            if (focusedNode.type === 'folder') {
                targetPath = focusedNode.path;
            } else {
                // If file selected, create in its parent folder
                const lastSlashIndex = focusedNode.path.lastIndexOf('/');
                if (lastSlashIndex !== -1) {
                    targetPath = focusedNode.path.substring(0, lastSlashIndex);
                } else {
                    targetPath = '';
                }
            }
        }

        const nodeToCreateIn = { path: targetPath, type: 'folder', name: 'root' }; // Mock node for the handler

        if (type === 'file') {
            onFileOperation.onCreateFile(nodeToCreateIn);
        } else {
            onFileOperation.onCreateFolder(nodeToCreateIn);
        }
    };

    if (activeView === 'explorer') {
        return (
            <div className="h-full flex flex-col">
                <SidebarHeader title="Explorer">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="New File"
                        onClick={() => handleCreate('file')}
                    >
                        <FilePlus className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="New Folder"
                        onClick={() => handleCreate('folder')}
                    >
                        <FolderPlus className="h-4 w-4" />
                    </Button>
                </SidebarHeader>
                <div className="flex-grow overflow-y-auto p-2" onClick={() => setFocusedNode(null)}>
                    <div className="font-medium text-sm mb-2 px-2 py-1 bg-muted/20 rounded flex items-center">
                        <span className="truncate">{pluginName}</span>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                        <FileTree
                            structure={fileStructure}
                            onSelectFile={handleNodeSelect}
                            selectedFile={activeFile}
                            focusedNode={focusedNode}
                            {...onFileOperation}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (activeView === 'search') {
        return (
            <div className="h-full flex flex-col">
                <SidebarHeader title="Search" />
                <SearchPanel
                    botId={botId}
                    pluginName={pluginName}
                    onOpenFile={onOpenFileAtLine}
                />
            </div>
        );
    }

    if (activeView === 'plugin') {
        return (
            <div className="h-full flex flex-col">
                <SidebarHeader title="Plugin" />
                <PluginView
                    botId={botId}
                    pluginName={pluginName}
                    onRefresh={() => {
                        // Callback to refresh file structure after cloning
                        window.location.reload();
                    }}
                />
            </div>
        );
    }

    if (activeView === 'git') {
        return (
            <div className="h-full flex flex-col">
                <GitView
                    botId={botId}
                    pluginName={pluginName}
                    onRefresh={() => window.location.reload()}
                />
            </div>
        );
    }

    if (activeView === 'settings') {
        return (
            <div className="h-full flex flex-col">
                <SidebarHeader title="Settings" />
                <div className="p-4 text-sm text-muted-foreground">
                    Settings coming soon.
                </div>
            </div>
        );
    }

    return null;
}
