import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import FileIcon from './FileIcon';

const QuickOpen = ({ isOpen, onClose, fileStructure, onSelectFile }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSelectedIndex(0);
            return;
        }

        const getAllFiles = (nodes, path = '') => {
            let files = [];
            for (const node of nodes) {
                if (node.type === 'file') {
                    files.push({
                        name: node.name,
                        path: node.path,
                        fullPath: path ? `${path}/${node.name}` : node.name,
                    });
                } else if (node.type === 'folder' && node.children) {
                    const folderPath = path ? `${path}/${node.name}` : node.name;
                    files = files.concat(getAllFiles(node.children, folderPath));
                }
            }
            return files;
        };

        const allFiles = getAllFiles(fileStructure);

        if (!query) {
            setFilteredFiles(allFiles.slice(0, 50));
        } else {
            const lowerQuery = query.toLowerCase();
            const filtered = allFiles
                .filter(file =>
                    file.name.toLowerCase().includes(lowerQuery) ||
                    file.path.toLowerCase().includes(lowerQuery)
                )
                .slice(0, 50);
            setFilteredFiles(filtered);
            setSelectedIndex(0);
        }
    }, [query, fileStructure, isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredFiles[selectedIndex]) {
                handleSelect(filteredFiles[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    const handleSelect = (file) => {
        onSelectFile({
            name: file.name,
            path: file.path,
            type: 'file',
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 gap-0">
                <div className="border-b p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            placeholder="Поиск файлов..."
                            className="pl-9"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {filteredFiles.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            {query ? 'Файлы не найдены' : 'Нет доступных файлов'}
                        </div>
                    ) : (
                        filteredFiles.map((file, index) => (
                            <div
                                key={file.path}
                                className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                                    index === selectedIndex
                                        ? 'bg-primary/10 border-l-2 border-primary'
                                        : 'hover:bg-muted/50'
                                }`}
                                onClick={() => handleSelect(file)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <FileIcon name={file.name} className="h-4 w-4 flex-shrink-0" />
                                <div className="flex-grow min-w-0">
                                    <div className="text-sm font-medium truncate">{file.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {file.path}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t px-4 py-2 text-xs text-muted-foreground bg-muted/20">
                    <span className="flex items-center gap-4">
                        <span>↑↓ Навигация</span>
                        <span>Enter Выбрать</span>
                        <span>Esc Закрыть</span>
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QuickOpen;
