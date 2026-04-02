import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Activity, CheckCircle2, XCircle, Info, Database, TrendingUp } from 'lucide-react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import NodeRegistry from './nodes';
import { cn } from '@/lib/utils';
import { useNodeTranslation } from './hooks/useNodeTranslation';

/**
 * TraceStepInfo - информационная панель для текущего шага трассировки
 *
 * Показывает:
 * - Информацию о текущей ноде
 * - Входные и выходные значения
 * - Статус выполнения
 * - Время выполнения
 * - Стек вызовов (путь выполнения)
 */
const TraceStepInfo = () => {
  const { t } = useTranslation('visual-editor');
  const { getNodeTranslation } = useNodeTranslation();
  const trace = useVisualEditorStore(state => state.trace);
  const currentStepIndex = useVisualEditorStore(state => state.playbackState.currentStepIndex);
  const nodes = useVisualEditorStore(state => state.nodes);

  // Получаем текущий шаг
  const currentStepData = useMemo(() => {
    if (!trace || currentStepIndex < 0) return null;

    const executionSteps = trace.steps.filter(step => step.type !== 'traversal');
    if (currentStepIndex >= executionSteps.length) return null;

    const step = executionSteps[currentStepIndex];
    const node = nodes.find(n => n.id === step.nodeId);
    const nodeDefinition = node ? NodeRegistry.get(node.type) : null;

    return {
      step,
      node,
      nodeDefinition,
      stepNumber: currentStepIndex + 1,
      totalSteps: executionSteps.length,
    };
  }, [trace, currentStepIndex, nodes]);

  // Вычисляем стек вызовов (путь выполнения до текущего шага)
  const executionPath = useMemo(() => {
    if (!trace || currentStepIndex < 0) return [];

    const executionSteps = trace.steps.filter(step => step.type !== 'traversal');
    const pathSteps = executionSteps.slice(Math.max(0, currentStepIndex - 4), currentStepIndex + 1);

    return pathSteps.map((step, index) => {
      const node = nodes.find(n => n.id === step.nodeId);
      const nodeDefinition = node ? NodeRegistry.get(node.type) : null;
      return {
        step,
        node,
        nodeDefinition,
        isCurrent: index === pathSteps.length - 1,
      };
    });
  }, [trace, currentStepIndex, nodes]);

  if (!currentStepData) {
    return (
      <Card className="bg-slate-800 border-slate-600 text-white h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5" />
            {t('traceStepInfo.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">{t('traceStepInfo.empty')}</p>
        </CardContent>
      </Card>
    );
  }

  const { step, node, nodeDefinition, stepNumber, totalSteps } = currentStepData;
  const executionTime = step.duration !== null && step.duration !== undefined ? step.duration : 0;
  const nodeLabel = node
    ? getNodeTranslation(node.type).label || nodeDefinition?.label || node.type
    : t('traceStepInfo.unknown');

  return (
    <Card className="bg-slate-800 border-slate-600 text-white h-full overflow-auto">
      <CardHeader className="pb-3 border-b border-slate-700">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          {t('traceStepInfo.stepOf', { step: stepNumber, total: totalSteps })}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Информация о ноде */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            {t('traceStepInfo.node')}
          </h3>
          <div className="bg-slate-900 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('traceStepInfo.name')}</span>
              <span className="text-sm font-medium">{nodeLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('traceStepInfo.type')}</span>
              <span className="text-xs text-slate-300 font-mono">{node?.type || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('traceStepInfo.id')}</span>
              <span className="text-xs text-slate-300 font-mono">{step.nodeId}</span>
            </div>
          </div>
        </div>

        {/* Статус выполнения */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            {step.status === 'executed' ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            {t('traceStepInfo.status')}
          </h3>
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('traceStepInfo.result')}</span>
              <span className={cn(
                "text-sm font-medium px-2 py-0.5 rounded",
                step.status === 'executed' ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"
              )}>
                {step.status === 'executed' ? t('traceStepInfo.success') : t('traceStepInfo.error')}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t('traceStepInfo.time')}
              </span>
              <span className="text-sm font-medium">{executionTime}ms</span>
            </div>
          </div>
        </div>

        {/* Входные значения */}
        {step.inputs && Object.keys(step.inputs).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 rotate-180" />
              {t('traceStepInfo.inputs')}
            </h3>
            <div className="bg-slate-900 rounded-lg p-3 space-y-2">
              {Object.entries(step.inputs).map(([key, value]) => (
                <div key={key} className="border-b border-slate-800 last:border-b-0 pb-2 last:pb-0">
                  <div className="text-xs text-slate-400 mb-1">{key}:</div>
                  <div className="text-sm font-mono text-green-300 bg-slate-950 rounded px-2 py-1 break-all">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Выходные значения */}
        {step.outputs && Object.keys(step.outputs).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('traceStepInfo.outputs')}
            </h3>
            <div className="bg-slate-900 rounded-lg p-3 space-y-2">
              {Object.entries(step.outputs).map(([key, value]) => (
                <div key={key} className="border-b border-slate-800 last:border-b-0 pb-2 last:pb-0">
                  <div className="text-xs text-slate-400 mb-1">{key}:</div>
                  <div className="text-sm font-mono text-blue-300 bg-slate-950 rounded px-2 py-1 break-all">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Стек вызовов (путь выполнения) */}
        {executionPath.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" />
              {t('traceStepInfo.path')}
            </h3>
            <div className="bg-slate-900 rounded-lg p-3">
              <div className="space-y-1">
                {executionPath.map((pathItem, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 text-xs py-1 px-2 rounded",
                      pathItem.isCurrent ? "bg-green-900/30 text-green-300" : "text-slate-400"
                    )}
                  >
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-slate-500">→</span>
                      <span className="font-medium">
                        {pathItem.node
                          ? getNodeTranslation(pathItem.node.type).label || pathItem.nodeDefinition?.label || pathItem.node.type
                          : t('traceStepInfo.unknown')}
                      </span>
                    </div>
                    {pathItem.isCurrent && (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ошибка, если есть */}
        {step.error && (
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {t('traceStepInfo.error')}
            </h3>
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono">
                {typeof step.error === 'object' ? JSON.stringify(step.error, null, 2) : String(step.error)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TraceStepInfo;
