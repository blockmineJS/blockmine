import { useCallback } from 'react';
import { SSE_EVENT_TYPES } from '../utils/constants';

export function useSSEStream({
    onChunk,
    onDone,
    onError,
    onToolCall,
    onToolResult,
    onFileUpdated,
    onFileDeleted,
    onFolderDeleted
}) {
    const processStream = useCallback(async (response, assistantMessage) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.trim() === '') continue;

                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        switch (data.type) {
                            case SSE_EVENT_TYPES.CHUNK:
                                assistantMessage.content += data.content;
                                onChunk?.(data.content, assistantMessage);
                                break;

                            case SSE_EVENT_TYPES.DONE:
                                onDone?.(data.fullResponse);
                                break;

                            case SSE_EVENT_TYPES.ERROR:
                                console.error('AI Error:', data.error);
                                onError?.(data.error);
                                break;

                            case SSE_EVENT_TYPES.TOOL_CALL:
                                onToolCall?.(data.toolName, data.args);
                                break;

                            case SSE_EVENT_TYPES.TOOL_RESULT:
                                onToolResult?.(data.toolName, data.result);
                                break;

                            case SSE_EVENT_TYPES.FILE_UPDATED:
                                onFileUpdated?.(data);
                                break;

                            case SSE_EVENT_TYPES.FILE_DELETED:
                                onFileDeleted?.(data.filePath);
                                break;

                            case SSE_EVENT_TYPES.FOLDER_DELETED:
                                onFolderDeleted?.(data.folderPath);
                                break;

                            default:
                                console.warn('Unknown SSE event type:', data.type);
                        }
                    } catch (error) {
                        console.error('Error parsing SSE data:', error);
                    }
                }
            }
        }

        return assistantMessage;
    }, [onChunk, onDone, onError, onToolCall, onToolResult, onFileUpdated, onFileDeleted, onFolderDeleted]);

    return { processStream };
}
