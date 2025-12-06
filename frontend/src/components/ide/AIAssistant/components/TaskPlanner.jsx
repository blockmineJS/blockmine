import React from 'react';
import {
    CheckCircle2,
    Circle,
    Loader2,
    XCircle,
    SkipForward,
    X,
    ListChecks,
    AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { STEP_STATUS, TASK_STATUS } from '../hooks/useAgentMode';
import { cn } from '@/lib/utils';

/**
 * Иконка статуса шага
 */
function StepStatusIcon({ status }) {
    switch (status) {
        case STEP_STATUS.COMPLETED:
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case STEP_STATUS.IN_PROGRESS:
            return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
        case STEP_STATUS.FAILED:
            return <XCircle className="h-4 w-4 text-red-500" />;
        case STEP_STATUS.SKIPPED:
            return <SkipForward className="h-4 w-4 text-yellow-500" />;
        default:
            return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
}

/**
 * Компонент одного шага плана
 */
function PlanStep({ step, isActive }) {
    return (
        <div
            className={cn(
                "flex items-start gap-3 py-2 px-3 rounded-md transition-colors",
                isActive && "bg-blue-500/10 border border-blue-500/30",
                step.status === STEP_STATUS.COMPLETED && "opacity-70",
                step.status === STEP_STATUS.FAILED && "bg-red-500/10 border border-red-500/30"
            )}
        >
            <div className="flex-shrink-0 mt-0.5">
                <StepStatusIcon status={step.status} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                        Шаг {step.number}
                    </span>
                    {step.status === STEP_STATUS.IN_PROGRESS && (
                        <span className="text-xs text-blue-400">
                            Выполняется...
                        </span>
                    )}
                </div>
                <p className={cn(
                    "text-sm mt-0.5",
                    step.status === STEP_STATUS.SKIPPED && "line-through text-muted-foreground"
                )}>
                    {step.description}
                </p>
                {step.message && step.status === STEP_STATUS.FAILED && (
                    <p className="text-xs text-red-400 mt-1">
                        {step.message}
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * Компонент планировщика задач
 *
 * Теперь это только отображение - AI сам контролирует выполнение через SSE события.
 * Кнопки управления (Pause/Resume/Skip/Rollback) убраны, так как они не влияют на AI.
 */
export function TaskPlanner({
    task,
    status,
    progress,
    lastError,
    onCancel,
    onClose
}) {
    if (!task) return null;

    const isRunning = status === TASK_STATUS.RUNNING;
    const isReady = status === TASK_STATUS.READY;
    const isFailed = status === TASK_STATUS.FAILED;
    const isCompleted = status === TASK_STATUS.COMPLETED;
    const isCancelled = status === TASK_STATUS.CANCELLED;

    const currentStepIndex = task.steps.findIndex(s => s.status === STEP_STATUS.IN_PROGRESS);

    return (
        <div className="bg-background border rounded-lg shadow-lg overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">{task.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        isRunning && "bg-blue-500/20 text-blue-400",
                        isReady && "bg-yellow-500/20 text-yellow-400",
                        isFailed && "bg-red-500/20 text-red-400",
                        isCompleted && "bg-green-500/20 text-green-400",
                        isCancelled && "bg-muted text-muted-foreground"
                    )}>
                        {isRunning && 'Выполняется'}
                        {isReady && 'Ожидание AI'}
                        {isFailed && 'Ошибка'}
                        {isCompleted && 'Завершено'}
                        {isCancelled && 'Отменено'}
                    </span>
                    {(isCompleted || isCancelled || isFailed) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="px-4 py-2 border-b">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Прогресс</span>
                    <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                {task.steps.map((step, index) => (
                    <PlanStep
                        key={step.id}
                        step={step}
                        isActive={index === currentStepIndex}
                    />
                ))}
            </div>

            {lastError && (
                <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{lastError}</p>
                    </div>
                </div>
            )}

            <div className="px-4 py-3 bg-muted/30 border-t flex items-center justify-end gap-2">
                {(isRunning || isReady) && (
                    <Button size="sm" variant="ghost" onClick={onCancel}>
                        Скрыть
                    </Button>
                )}

                {(isCompleted || isCancelled || isFailed) && (
                    <Button size="sm" onClick={onClose}>
                        Закрыть
                    </Button>
                )}
            </div>
        </div>
    );
}
