import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Play, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const RunNodeDialog = () => {
  const { t } = useTranslation('visual-editor');
  const dialog = useVisualEditorStore(s => s.runNodeDialog);
  const result = useVisualEditorStore(s => s.runNodeResult);
  const close = useVisualEditorStore(s => s.closeRunNodeDialog);
  const runNode = useVisualEditorStore(s => s.runSingleNode);
  const nodes = useVisualEditorStore(s => s.nodes);

  const node = useMemo(() => {
    if (!dialog?.nodeId) return null;
    return nodes.find(n => n.id === dialog.nodeId);
  }, [dialog?.nodeId, nodes]);

  const inputDefs = useMemo(() => {
    if (!node) return [];
    const data = node.data || {};
    const pins = data.pins?.inputs || data.inputs || [];
    return pins.filter(p => p && p.type !== 'exec' && p.name);
  }, [node]);

  const [inputs, setInputs] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (node) {
      const initial = {};
      inputDefs.forEach(p => { initial[p.name] = ''; });
      setInputs(initial);
    }
  }, [node, inputDefs]);

  if (!dialog || !node) return null;

  const update = (key, value) => setInputs(prev => ({ ...prev, [key]: value }));

  const handleRun = async () => {
    setBusy(true);
    try {
      const parsed = {};
      for (const [k, v] of Object.entries(inputs)) {
        if (v === '') continue;
        try { parsed[k] = JSON.parse(v); } catch { parsed[k] = v; }
      }
      await runNode({ nodeId: node.id, inputs: parsed, variables: {} });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!dialog} onOpenChange={(o) => !o && close()}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-yellow-400" />
            {t('testMode.runNodeTitle')}
            <Badge variant="outline" className="text-xs ml-2">{node.type}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-auto">
          {inputDefs.length === 0 ? (
            <p className="text-sm text-slate-400">{t('testMode.noInputPins')}</p>
          ) : (
            inputDefs.map(pin => (
              <div key={pin.name} className="space-y-1">
                <Label className="flex items-center gap-2">
                  <span>{pin.label || pin.name}</span>
                  {pin.type && <Badge variant="outline" className="text-xs">{pin.type}</Badge>}
                </Label>
                <Input
                  value={inputs[pin.name] ?? ''}
                  onChange={(e) => update(pin.name, e.target.value)}
                  placeholder={t('testMode.valueOrJson')}
                  className="bg-slate-700 border-slate-600 font-mono text-xs"
                />
              </div>
            ))
          )}

          {result && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-sm font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.success ? t('testMode.executed') : t('testMode.error')}
                </span>
                {typeof result.executionTime === 'number' && (
                  <Badge variant="outline" className="text-xs">{result.executionTime}ms</Badge>
                )}
              </div>

              {result.error && (
                <pre className="p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300 whitespace-pre-wrap">
                  {result.error}
                </pre>
              )}

              {result.outputs && Object.keys(result.outputs).length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">{t('testMode.outputs')}</div>
                  <pre className="p-2 bg-slate-900 rounded text-xs font-mono text-blue-300 whitespace-pre-wrap break-all">
                    {JSON.stringify(result.outputs, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>
            {t('testMode.close')}
          </Button>
          <Button onClick={handleRun} disabled={busy} className="bg-yellow-600 hover:bg-yellow-700">
            {busy ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('testMode.running')}</>
            ) : (
              <><Play className="w-4 h-4 mr-2" />{t('testMode.runIsolated')}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RunNodeDialog;
