import { useState, useCallback, useRef } from 'react';

export function useToolCalls() {
    const [toolCalls, setToolCalls] = useState([]);
    const toolCallIdCounter = useRef(0);

    const addToolCall = useCallback((toolName, args) => {
        // Генерируем уникальный ID
        const id = `${toolName}_${++toolCallIdCounter.current}`;

        setToolCalls(prev => {
            if (toolName === 'updateFile' && args.filePath) {
                const existing = prev.find(tc =>
                    tc.toolName === 'updateFile' &&
                    tc.args.filePath === args.filePath &&
                    (tc.status === 'executing' || tc.diffData?.isPending)
                );
                if (existing) {
                    return prev;
                }
            }

            return [...prev, {
                id,
                toolName,
                args,
                status: 'executing'
            }];
        });
    }, []);

    const updateToolCall = useCallback((toolName, updates) => {
        setToolCalls(prev => prev.map(tc =>
            tc.toolName === toolName && tc.status === 'executing'
                ? { ...tc, ...updates }
                : tc
        ));
    }, []);

    const updateToolCallWithDiff = useCallback((filePath, diffData) => {
        setToolCalls(prev => {
            const lastIndex = prev.findLastIndex(tc =>
                tc.toolName === 'updateFile' && tc.args.filePath === filePath
            );

            if (lastIndex === -1) return prev;

            return prev.map((tc, index) =>
                index === lastIndex ? { ...tc, diffData } : tc
            );
        });
    }, []);

    const clearToolCalls = useCallback(() => {
        setToolCalls([]);
    }, []);

    return {
        toolCalls,
        addToolCall,
        updateToolCall,
        updateToolCallWithDiff,
        clearToolCalls
    };
}
