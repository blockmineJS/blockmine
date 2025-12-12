import React, { useState, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useVisualEditorStore } from '@/stores/visualEditorStore';

const BreakpointDialog = ({ isOpen, onClose, nodeId }) => {
  const { t } = useTranslation('visual-editor');
  const [condition, setCondition] = useState('');
  const addBreakpoint = useVisualEditorStore(state => state.addBreakpoint);
  const breakpoints = useVisualEditorStore(state => state.breakpoints);
  const nodes = useVisualEditorStore(state => state.nodes);
  const edges = useVisualEditorStore(state => state.edges);

  const existingBreakpoint = breakpoints.get(nodeId);

  // Получаем информацию о ноде и её входах
  const nodeInfo = useMemo(() => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    // Находим входящие connections
    const incomingEdges = edges.filter(e => e.target === nodeId);
    const inputTypes = new Set();

    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode?.type === 'event:command') {
        inputTypes.add('user');
        inputTypes.add('args');
      }
    });

    return {
      type: node.type,
      hasUserInput: inputTypes.has('user'),
      hasArgsInput: inputTypes.has('args')
    };
  }, [nodeId, nodes, edges]);

  const handleSave = () => {
    addBreakpoint(nodeId, condition.trim() || null);
    onClose();
    setCondition('');
  };

  const handleCancel = () => {
    onClose();
    setCondition('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {existingBreakpoint ? t('breakpointDialog.editTitle') : t('breakpointDialog.addTitle')}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {t('breakpointDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="condition" className="text-sm font-medium">
              {t('breakpointDialog.conditionLabel')}
            </Label>
            <Textarea
              id="condition"
              placeholder={t('breakpointDialog.conditionPlaceholder')}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white font-mono text-sm min-h-[100px]"
            />
            <p className="text-xs text-slate-400">
              {t('breakpointDialog.conditionHelp')}
              <br />
              {t('breakpointDialog.availableVars')} <code className="text-blue-400">user</code>,{' '}
              <code className="text-blue-400">args</code>,{' '}
              <code className="text-blue-400">variables</code>
            </p>
          </div>

          <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
            <p className="text-xs font-semibold text-slate-300 mb-2">
              {t('breakpointDialog.howItWorksTitle')}
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 ml-4 list-disc">
              <li><Trans i18nKey="breakpointDialog.howItWorks1" ns="visual-editor" components={{ code: <code className="text-green-400" /> }} /></li>
              <li><Trans i18nKey="breakpointDialog.howItWorks2" ns="visual-editor" components={{ code: <code className="text-blue-400" /> }} /></li>
              <li><Trans i18nKey="breakpointDialog.howItWorks3" ns="visual-editor" components={{ code: <code className="text-blue-400" /> }} /></li>
              <li><Trans i18nKey="breakpointDialog.howItWorks4" ns="visual-editor" components={{ code: <code className="text-blue-400" /> }} /></li>
            </ul>
          </div>

          <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <p className="text-xs font-semibold text-slate-300 mb-2">
              {t('breakpointDialog.examplesTitle')}
            </p>
            <div className="space-y-2">
              {nodeInfo?.hasUserInput && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">{t('breakpointDialog.exampleAdmin')}</p>
                  <code className="text-xs text-blue-400 bg-slate-900/50 px-2 py-1 rounded block">
                    user.username === &apos;admin&apos;
                  </code>
                </div>
              )}
              {nodeInfo?.hasArgsInput && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">{t('breakpointDialog.exampleCount')}</p>
                  <code className="text-xs text-blue-400 bg-slate-900/50 px-2 py-1 rounded block">
                    args.count &gt; 10
                  </code>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 mb-1">{t('breakpointDialog.exampleDebug')}</p>
                <code className="text-xs text-blue-400 bg-slate-900/50 px-2 py-1 rounded block">
                  variables.debug_mode === true
                </code>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">{t('breakpointDialog.exampleCombined')}</p>
                <code className="text-xs text-blue-400 bg-slate-900/50 px-2 py-1 rounded block">
                  user.username === &apos;admin&apos; && variables.test_mode
                </code>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('breakpointDialog.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {existingBreakpoint ? t('breakpointDialog.update') : t('breakpointDialog.add')} {t('breakpointDialog.breakpoint')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BreakpointDialog;
