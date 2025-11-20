import { useState, useCallback } from 'react';

export function useToolCalls() {
    const [toolCalls, setToolCalls] = useState([]);

    const addToolCall = useCallback((toolName, args) => {
        setToolCalls(prev => [...prev, {
            id: Date.now(),
            toolName,
            args,
            status: 'executing'
        }]);
    }, []);

    const updateToolCall = useCallback((toolName, updates) => {
        setToolCalls(prev => prev.map(tc =>
            tc.toolName === toolName && tc.status === 'executing'
                ? { ...tc, ...updates }
                : tc
        ));
    }, []);

    const updateToolCallWithDiff = useCallback((filePath, diffData) => {
        setToolCalls(prev => prev.map(tc =>
            tc.toolName === 'updateFile' && tc.args.filePath === filePath
                ? { ...tc, diffData }
                : tc
        ));
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
