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
    onFolderDeleted,
    onFilePreview,
    onFilePreviewApplied,
    onPlanCreated,
    onStepStarted,
    onStepCompleted,
    onStepFailed
}) {
    const processStream = useCallback(async (response, assistantMessage, abortSignal) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                if (abortSignal?.aborted) {
                    await reader.cancel();
                    break;
                }

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

                                case SSE_EVENT_TYPES.FILE_PREVIEW:
                                    onFilePreview?.(data);
                                    break;

                                case SSE_EVENT_TYPES.FILE_PREVIEW_APPLIED:
                                    onFilePreviewApplied?.(data);
                                    break;

                                case SSE_EVENT_TYPES.PLAN_CREATED:
                                    onPlanCreated?.(data);
                                    break;

                                case SSE_EVENT_TYPES.STEP_STARTED:
                                    onStepStarted?.(data.stepNumber, data.description);
                                    break;

                                case SSE_EVENT_TYPES.STEP_COMPLETED:
                                    onStepCompleted?.(data.stepNumber, data.result);
                                    break;

                                case SSE_EVENT_TYPES.STEP_FAILED:
                                    onStepFailed?.(data.stepNumber, data.error);
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
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Stream processing error:', error);
                throw error;
            }
        } finally {
            try {
                reader.releaseLock();
            } catch (e) {
            }
        }

        return assistantMessage;
    }, [onChunk, onDone, onError, onToolCall, onToolResult, onFileUpdated, onFileDeleted, onFolderDeleted, onFilePreview, onFilePreviewApplied, onPlanCreated, onStepStarted, onStepCompleted, onStepFailed]);

    return { processStream };
}
