import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Replace, ChevronRight, ChevronDown, FileText, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/appStore';
import FileIcon from './FileIcon';

const SearchResult = ({ result, onResultClick, isExpanded, onToggle }) => {
    return (
        <div className="mb-2">
            <div
                className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer rounded group"
                onClick={onToggle}
            >
                {isExpanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
                <FileIcon name={result.file} className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate flex-grow">{result.file}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                    {result.matches.length}
                </span>
            </div>

            {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                    {result.matches.map((match, idx) => (
                        <div
                            key={idx}
                            className="p-2 hover:bg-muted/50 cursor-pointer rounded text-xs font-mono"
                            onClick={() => onResultClick(result.file, match.line)}
                        >
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <span className="text-primary font-semibold">{match.line}</span>
                                <span className="truncate">{match.preview}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function SearchPanel({ botId, pluginName, onOpenFile }) {
    const token = useAppStore(state => state.token);
    const searchInputRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showReplace, setShowReplace] = useState(false);
    const [expandedFiles, setExpandedFiles] = useState(new Set());
    const [options, setOptions] = useState({
        caseSensitive: false,
        wholeWord: false,
        useRegex: false,
    });

    const [totalMatches, setTotalMatches] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);

    // Auto-focus search input when component mounts
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setResults([]);
            setTotalFiles(0);
            setTotalMatches(0);
            return;
        }

        setIsSearching(true);
        try {
            const params = new URLSearchParams({
                query: searchQuery,
                caseSensitive: options.caseSensitive,
                wholeWord: options.wholeWord,
                useRegex: options.useRegex,
            });

            const response = await fetch(
                `/api/bots/${botId}/plugins/ide/${pluginName}/search?${params}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Search failed');

            const data = await response.json();
            setResults(data.results || []);

            // Calculate totals
            const files = data.results?.length || 0;
            const matches = data.results?.reduce((sum, r) => sum + r.matches.length, 0) || 0;
            setTotalFiles(files);
            setTotalMatches(matches);

            // Auto-expand if only one file
            if (files === 1) {
                setExpandedFiles(new Set([data.results[0].file]));
            }
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
            setTotalFiles(0);
            setTotalMatches(0);
        } finally {
            setIsSearching(false);
        }
    };

    // Auto-search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch();
            } else {
                setResults([]);
                setTotalFiles(0);
                setTotalMatches(0);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, options.caseSensitive, options.wholeWord, options.useRegex]);

    const handleReplace = async () => {
        if (!searchQuery.trim() || !replaceQuery) return;

        const confirmed = window.confirm(
            `Заменить все вхождения "${searchQuery}" на "${replaceQuery}"?`
        );

        if (!confirmed) return;

        try {
            const response = await fetch(
                `/api/bots/${botId}/plugins/ide/${pluginName}/replace`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        searchQuery,
                        replaceQuery,
                        options,
                    }),
                }
            );

            if (!response.ok) throw new Error('Replace failed');

            const data = await response.json();
            alert(`Заменено ${data.replacedCount} вхождений в ${data.filesModified} файлах`);

            // Refresh search results
            handleSearch();
        } catch (error) {
            console.error('Replace error:', error);
            alert('Ошибка при замене');
        }
    };

    const toggleFileExpansion = (fileName) => {
        setExpandedFiles((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(fileName)) {
                newSet.delete(fileName);
            } else {
                newSet.add(fileName);
            }
            return newSet;
        });
    };

    const handleResultClick = (filePath, lineNumber) => {
        if (onOpenFile) {
            onOpenFile(filePath, lineNumber);
        }
    };

    // Search on Enter key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="h-full flex flex-col p-4 space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Поиск"
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                </div>

                {/* Replace Input */}
                {showReplace && (
                    <div className="relative">
                        <Replace className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Заменить"
                            className="pl-8"
                            value={replaceQuery}
                            onChange={(e) => setReplaceQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                )}

                {/* Search Options */}
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="case-sensitive"
                            checked={options.caseSensitive}
                            onCheckedChange={(checked) =>
                                setOptions((prev) => ({ ...prev, caseSensitive: checked }))
                            }
                        />
                        <Label htmlFor="case-sensitive" className="cursor-pointer">
                            Аа
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="whole-word"
                            checked={options.wholeWord}
                            onCheckedChange={(checked) =>
                                setOptions((prev) => ({ ...prev, wholeWord: checked }))
                            }
                        />
                        <Label htmlFor="whole-word" className="cursor-pointer">
                            Слово
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="use-regex"
                            checked={options.useRegex}
                            onCheckedChange={(checked) =>
                                setOptions((prev) => ({ ...prev, useRegex: checked }))
                            }
                        />
                        <Label htmlFor="use-regex" className="cursor-pointer">
                            .*
                        </Label>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 items-center">
                    {isSearching && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Поиск...</span>
                        </div>
                    )}
                    <div className="flex-grow"></div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowReplace(!showReplace)}
                        title="Показать/скрыть замену"
                    >
                        <Replace className="h-4 w-4" />
                    </Button>
                </div>

                {showReplace && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleReplace}
                        disabled={!searchQuery.trim() || !replaceQuery}
                        className="w-full"
                    >
                        Заменить все
                    </Button>
                )}
            </div>

            {/* Results Summary */}
            {results.length > 0 && (
                <div className="text-xs text-muted-foreground">
                    {totalMatches} {totalMatches === 1 ? 'совпадение' : 'совпадений'} в {totalFiles}{' '}
                    {totalFiles === 1 ? 'файле' : 'файлах'}
                </div>
            )}

            {/* Results List */}
            <div className="flex-grow overflow-y-auto space-y-1">
                {isSearching ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : results.length === 0 && searchQuery ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        Ничего не найдено
                    </div>
                ) : (
                    results.map((result, idx) => (
                        <SearchResult
                            key={idx}
                            result={result}
                            onResultClick={handleResultClick}
                            isExpanded={expandedFiles.has(result.file)}
                            onToggle={() => toggleFileExpansion(result.file)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
