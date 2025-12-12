import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * TraceViewer - Overlay панель управления воспроизведением трассировки
 * Отображается поверх графа, управляет подсветкой нод
 */
const TraceViewer = () => {
  const { t } = useTranslation('visual-editor');
  const {
    trace,
    isTraceViewerOpen,
    playbackState,
    closeTraceViewer,
    playTrace,
    pauseTrace,
    setTraceStep,
  } = useVisualEditorStore();

  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const intervalRef = useRef(null);

  // Фильтруем только шаги выполнения нод (без traversals)
  const executionSteps = trace ? trace.steps.filter(step => step.type !== 'traversal') : [];

  // DEBUG: Логируем для отладки
  useEffect(() => {
    if (trace) {
      console.log('[TraceViewer] Trace loaded:', {
        traceId: trace.id,
        totalSteps: trace.steps.length,
        executionSteps: executionSteps.length,
        traversalCount: trace.steps.filter(s => s.type === 'traversal').length,
        allSteps: trace.steps.map((s, idx) => ({
          idx,
          nodeId: s.nodeId,
          type: s.type || 'execution',
          nodeType: s.nodeType
        }))
      });
    }
  }, [trace, executionSteps.length]);

  // Автоматическое воспроизведение
  useEffect(() => {
    if (!trace || !playbackState.isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const delay = 1000 / playbackState.speed; // Задержка между шагами
    intervalRef.current = setInterval(() => {
      const nextIndex = playbackState.currentStepIndex + 1;
      if (nextIndex >= executionSteps.length) {
        pauseTrace();
        return;
      }
      setTraceStep(nextIndex);
    }, delay);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [trace, playbackState.isPlaying, playbackState.currentStepIndex, playbackState.speed, pauseTrace, setTraceStep, executionSteps.length]);

  if (!trace) return null;

  const handleStepBackward = () => {
    const prevIndex = Math.max(-1, playbackState.currentStepIndex - 1);
    setTraceStep(prevIndex);
  };

  const handleStepForward = () => {
    const nextIndex = Math.min(executionSteps.length - 1, playbackState.currentStepIndex + 1);
    setTraceStep(nextIndex);
  };

  const handlePlayPause = () => {
    if (playbackState.isPlaying) {
      pauseTrace();
    } else {
      // Если достигли конца, начинаем с начала
      if (playbackState.currentStepIndex >= executionSteps.length - 1) {
        setTraceStep(-1);
      }
      playTrace();
    }
  };

  const duration = trace.endTime ? new Date(trace.endTime) - new Date(trace.startTime) : null;
  const currentStep = executionSteps[playbackState.currentStepIndex];

  if (!isTraceViewerOpen) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <Card className="w-[600px] bg-slate-900/95 backdrop-blur border-slate-700 shadow-2xl pointer-events-auto">
        <CardContent className="p-4">
          {/* Заголовок */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  trace.status === 'completed'
                    ? 'default'
                    : trace.status === 'error'
                    ? 'destructive'
                    : 'secondary'
                }
                className="gap-1"
              >
                {trace.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                {trace.status === 'error' && <XCircle className="w-3 h-3" />}
                {trace.status === 'running' && <Clock className="w-3 h-3 animate-spin" />}
                {trace.status === 'completed' ? t('traceViewer.completed') : trace.status === 'error' ? t('traceViewer.error') : t('traceViewer.running')}
              </Badge>
              <span className="text-sm text-slate-400">{trace.eventType}</span>
              {duration && (
                <span className="text-xs text-slate-500">{duration}ms</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeTraceViewer}
              className="h-6 w-6"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Управление воспроизведением */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {/* Назад */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleStepBackward}
                disabled={playbackState.currentStepIndex <= -1}
                className="h-8 w-8"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              {/* Плей/Пауза */}
              <Button
                variant="default"
                size="icon"
                onClick={handlePlayPause}
                className="h-8 w-8"
              >
                {playbackState.isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              {/* Вперёд */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleStepForward}
                disabled={playbackState.currentStepIndex >= executionSteps.length - 1}
                className="h-8 w-8"
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              {/* Счётчик шагов */}
              <div className="flex-1 text-center">
                <span className="text-sm text-slate-300">
                  {t('traceViewer.step', { current: playbackState.currentStepIndex + 1, total: executionSteps.length })}
                </span>
              </div>

              {/* Кнопка развернуть детали */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className="h-8 w-8"
              >
                {isDetailsExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Timeline slider */}
            <input
              type="range"
              min="-1"
              max={executionSteps.length - 1}
              value={playbackState.currentStepIndex}
              onChange={(e) => setTraceStep(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />

            {/* Детали текущего шага */}
            {isDetailsExpanded && currentStep && (
              <div className="mt-3 p-3 bg-slate-800 rounded-lg space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{t('traceViewer.node')}</span>
                  <span className="text-xs font-mono text-slate-200">{currentStep.nodeType}</span>
                </div>

                {currentStep.duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{t('traceViewer.time')}</span>
                    <span className="text-xs font-mono text-slate-200">{currentStep.duration}ms</span>
                  </div>
                )}

                {currentStep.inputs && Object.keys(currentStep.inputs).length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-slate-400 mb-1">{t('traceViewer.inputs')}</div>
                    <div className="p-2 bg-slate-900 rounded text-xs font-mono max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words text-slate-300">
                        {JSON.stringify(currentStep.inputs, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {currentStep.outputs && Object.keys(currentStep.outputs).length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-slate-400 mb-1">{t('traceViewer.outputs')}</div>
                    <div className="p-2 bg-slate-900 rounded text-xs font-mono max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words text-slate-300">
                        {JSON.stringify(currentStep.outputs, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {currentStep.error && (
                  <div className="mt-2 p-2 bg-red-900/20 border border-red-500 rounded text-xs text-red-400">
                    {currentStep.error}
                  </div>
                )}
              </div>
            )}

            {trace.error && (
              <div className="mt-2 p-2 bg-red-900/20 border border-red-500 rounded text-sm text-red-400">
                {trace.error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TraceViewer;
