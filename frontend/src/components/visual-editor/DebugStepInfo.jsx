import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity, Info, Database, TrendingUp, CheckCircle2, XCircle,
  Clock, FlaskConical, Play, Square, ArrowLeft, ArrowRight, History
} from 'lucide-react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import NodeRegistry from './nodes';
import { cn } from '@/lib/utils';
import { useNodeTranslation } from './hooks/useNodeTranslation';

const DebugStepInfo = () => {
  const { t } = useTranslation('visual-editor');
  const { getNodeTranslation } = useNodeTranslation();
  const debugSession = useVisualEditorStore(state => state.debugSession);
  const nodes = useVisualEditorStore(state => state.nodes);
  const testMode = useVisualEditorStore(state => state.testMode);
  const testModeHistoryLength = useVisualEditorStore(state => state.testModeHistoryLength);
  const testModeCanStepBack = useVisualEditorStore(state => state.testModeCanStepBack);
  const continueExecution = useVisualEditorStore(state => state.continueExecution);
  const stepExecution = useVisualEditorStore(state => state.stepExecution);
  const stepBack = useVisualEditorStore(state => state.stepBack);
  const stopExecution = useVisualEditorStore(state => state.stopExecution);

  const currentStepData = useMemo(() => {
    if (!debugSession || debugSession.status !== 'paused') return null;

    const node = nodes.find(n => n.id === debugSession.nodeId);
    const nodeDefinition = node ? NodeRegistry.get(node.type) : null;

    const executionSteps = (debugSession.executedSteps?.steps || [])
      .filter(s => s.type !== 'traversal');
    const stepNumber = executionSteps.length + 1;

    return {
      node,
      nodeDefinition,
      nodeId: debugSession.nodeId,
      nodeType: debugSession.nodeType,
      inputs: debugSession.inputs || {},
      executionSteps,
      stepNumber
    };
  }, [debugSession, nodes]);

  const executionPath = useMemo(() => {
    if (!currentStepData) return [];
    const recent = currentStepData.executionSteps.slice(-4);
    return recent.map((step) => {
      const node = nodes.find(n => n.id === step.nodeId);
      const nodeDefinition = node ? NodeRegistry.get(node.type) : null;
      return { step, node, nodeDefinition, isCurrent: false };
    }).concat([{
      step: { nodeId: currentStepData.nodeId, status: 'paused' },
      node: currentStepData.node,
      nodeDefinition: currentStepData.nodeDefinition,
      isCurrent: true
    }]);
  }, [currentStepData, nodes]);

  if (!currentStepData) {
    return (
      <Card className="bg-slate-800 border-slate-600 text-white h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            {t('debugStepInfo.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">{t('debugStepInfo.empty')}</p>
        </CardContent>
      </Card>
    );
  }

  const { node, nodeDefinition, nodeId, nodeType, inputs, stepNumber } = currentStepData;
  const nodeLabel = node
    ? getNodeTranslation(node.type).label || nodeDefinition?.label || node.type
    : t('debugStepInfo.unknown');

  return (
    <Card className="bg-slate-800 border-slate-600 text-white h-full overflow-auto">
      <CardHeader className="pb-3 border-b border-slate-700">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400 animate-pulse" />
          {testMode
            ? t('debugStepInfo.testStepNumber', { n: stepNumber })
            : t('debugStepInfo.stepNumber', { n: stepNumber })}
          {testMode && (
            <Badge variant="outline" className="ml-2 text-yellow-400 border-yellow-500 text-xs">
              <FlaskConical className="w-3 h-3 mr-1" />
              {t('testMode.title')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Контролы пошагового выполнения */}
        <div className="bg-slate-900 rounded-lg p-3 space-y-2">
          <div className="text-xs text-slate-400 mb-1">{t('debugStepInfo.controls')}</div>
          <div className="flex items-center gap-2 flex-wrap">
            {testMode && (
              <Button
                size="sm"
                variant="default"
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 flex-1"
                onClick={() => stepBack()}
                disabled={!testModeCanStepBack}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t('testMode.stepBack')}
              </Button>
            )}
            <Button
              size="sm"
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 flex-1"
              onClick={() => stepExecution()}
            >
              <ArrowRight className="w-4 h-4 mr-1" />
              {t('debugControls.stepForward')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {!testMode && (
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700 flex-1"
                onClick={() => continueExecution()}
              >
                <Play className="w-4 h-4 mr-1" />
                {t('debugControls.continue')}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => stopExecution()}
            >
              <Square className="w-4 h-4 mr-1" />
              {t('debugControls.stop')}
            </Button>
          </div>
        </div>

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
              <span className="text-xs text-slate-300 font-mono">{nodeType || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('traceStepInfo.id')}</span>
              <span className="text-xs text-slate-300 font-mono break-all text-right">{nodeId}</span>
            </div>
          </div>
        </div>

        {/* Статус (на паузе) */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            {t('traceStepInfo.status')}
          </h3>
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('traceStepInfo.result')}</span>
              <span className="text-sm font-medium px-2 py-0.5 rounded bg-amber-900/50 text-amber-300">
                {t('debugStepInfo.paused')}
              </span>
            </div>
            {testMode && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <History className="w-3 h-3" />
                  {t('debugStepInfo.historyDepth')}
                </span>
                <span className="text-sm font-medium">{testModeHistoryLength}</span>
              </div>
            )}
          </div>
        </div>

        {/* Входные значения */}
        {inputs && Object.keys(inputs).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 rotate-180" />
              {t('traceStepInfo.inputs')}
            </h3>
            <div className="bg-slate-900 rounded-lg p-3 space-y-2">
              {Object.entries(inputs).map(([key, value]) => (
                <div key={key} className="border-b border-slate-800 last:border-b-0 pb-2 last:pb-0">
                  <div className="text-xs text-slate-400 mb-1">{key}:</div>
                  <div className="text-sm font-mono text-green-300 bg-slate-950 rounded px-2 py-1 break-all">
                    {value === undefined ? '—' : (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Путь выполнения */}
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
                      pathItem.isCurrent ? "bg-amber-900/30 text-amber-300" : "text-slate-400"
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
                      <Activity className="w-3 h-3 text-amber-400 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DebugStepInfo;
