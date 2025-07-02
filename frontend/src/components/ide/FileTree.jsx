import React, { useState, useEffect, useRef } from 'react';
import { Folder, File, FolderOpen, MoreVertical, Pencil, Trash, FilePlus, FolderPlus } from 'lucide-react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import path from 'path-browserify';

const InlineInput = ({ defaultValue = '', onCommit, onCancel, type = 'file' }) => {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onCommit(value);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
        }
    };

    const handleBlur = () => {
        onCommit(value);
    };

    return (
        <div className="flex items-center p-1 w-full">
            {type === 'folder' ? <FolderOpen className="h-4 w-4 mr-2 flex-shrink-0" /> : <File className="h-4 w-4 mr-2 ml-1 flex-shrink-0" />}
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="bg-background text-foreground border border-primary rounded p-0 px-1 w-full text-sm h-6"
            />
        </div>
    );
};

const FileTree = ({ structure, onSelectFile, selectedFile, onDelete, onRename, onCreateFile, onCreateFolder, inlineAction, onCommit, onCancel }) => {
    const [openFolders, setOpenFolders] = useState({});

    useEffect(() => {
        if (inlineAction?.mode.startsWith('create') && inlineAction.node) {
            const parentPath = inlineAction.node.type === 'folder' ? inlineAction.node.path : path.dirname(inlineAction.node.path);
            if (parentPath && !openFolders[parentPath]) {
                setOpenFolders(prev => ({ ...prev, [parentPath]: true }));
            }
        }
    }, [inlineAction]);

    const toggleFolder = (path) => {
        setOpenFolders(prev => ({ ...prev, [path]: !prev[path] }));
    };

    const renderNode = (node) => {
        const isSelected = selectedFile && selectedFile.path === node.path;
        const isOpen = openFolders[node.path];

        if (inlineAction?.mode === 'rename' && inlineAction.node.path === node.path) {
            return (
                <div key={`${node.path}-editing`} className="w-full">
                    <InlineInput
                        defaultValue={node.name}
                        onCommit={onCommit}
                        onCancel={onCancel}
                        type={node.type}
                    />
                </div>
            )
        }

        const nodeContent = (
            <div
                className={`flex items-center cursor-pointer p-1 rounded hover:bg-muted ${isSelected ? 'bg-primary/20' : ''}`}
                onClick={() => node.type === 'file' ? onSelectFile(node) : toggleFolder(node.path)}
            >
                {node.type === 'folder' 
                    ? (isOpen ? <FolderOpen className="h-4 w-4 mr-2" /> : <Folder className="h-4 w-4 mr-2" />)
                    : <File className="h-4 w-4 mr-2 ml-1" />
                }
                <span>{node.name}</span>
            </div>
        );

        if (node.type === 'folder') {
            const parentOfNewNode = inlineAction?.node ? (inlineAction.node.type === 'folder' ? inlineAction.node.path : path.dirname(inlineAction.node.path)) : null;
            const isCreatingInThisFolder = inlineAction?.mode.startsWith('create') && parentOfNewNode === node.path;

            return (
                <div key={node.path}>
                    <ContextMenu>
                        <ContextMenuTrigger>{nodeContent}</ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem onClick={() => onCreateFile(node)}>
                                <FilePlus className="h-4 w-4 mr-2" />
                                Создать файл
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => onCreateFolder(node)}>
                                <FolderPlus className="h-4 w-4 mr-2" />
                                Создать папку
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => onRename(node)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Переименовать
                            </ContextMenuItem>
                            <ContextMenuItem className="text-destructive" onClick={() => onDelete(node)}>
                                <Trash className="h-4 w-4 mr-2" />
                                Удалить
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                    {isOpen && (
                         <div className="pl-4 border-l border-muted-foreground/20 ml-2">
                            {node.children && node.children.length > 0 && node.children.map(renderNode)}
                            {isCreatingInThisFolder && (
                                <InlineInput
                                    onCommit={onCommit}
                                    onCancel={onCancel}
                                    type={inlineAction.mode === 'createFile' ? 'file' : 'folder'}
                                />
                            )}
                             {!isCreatingInThisFolder && node.children && node.children.length === 0 && (
                                 <p className="text-xs text-muted-foreground italic p-1">Папка пуста</p>
                             )}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <ContextMenu key={node.path}>
                <ContextMenuTrigger>{nodeContent}</ContextMenuTrigger>
                 <ContextMenuContent>
                    <ContextMenuItem onClick={() => onCreateFile(node)}>
                        <FilePlus className="h-4 w-4 mr-2" />
                        Создать файл
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onCreateFolder(node)}>
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Создать папку
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => onRename(node)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Переименовать
                    </ContextMenuItem>
                    <ContextMenuItem className="text-destructive" onClick={() => onDelete(node)}>
                        <Trash className="h-4 w-4 mr-2" />
                        Удалить
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    };
    
    const parentOfNewNodeInRoot = inlineAction?.node ? (inlineAction.node.type === 'folder' ? inlineAction.node.path : path.dirname(inlineAction.node.path)) : null;
    const isCreatingInRoot = inlineAction?.mode.startsWith('create') && (parentOfNewNodeInRoot === '.' || parentOfNewNodeInRoot === '');

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div className="p-2 select-none h-full">
                    {structure.map(renderNode)}
                    {isCreatingInRoot && (
                        <div className="pl-4 border-l-transparent ml-2">
                            <InlineInput
                                onCommit={onCommit}
                                onCancel={onCancel}
                                type={inlineAction.mode === 'createFile' ? 'file' : 'folder'}
                            />
                        </div>
                    )}
                    {!inlineAction && structure.length === 0 && (
                         <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
                            Правый клик, <br/> чтобы создать файл или папку.
                        </div>
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={() => onCreateFile({ path: '', type: 'folder', name: 'root' })}>
                    <FilePlus className="h-4 w-4 mr-2" />
                    Создать файл в корне
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onCreateFolder({ path: '', type: 'folder', name: 'root' })}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Создать папку в корне
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default FileTree; 