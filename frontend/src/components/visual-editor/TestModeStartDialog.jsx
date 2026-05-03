import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Play, MessageCircle, User, Heart, Skull, Package, Zap } from 'lucide-react';

const EVENT_TYPES = [
  { value: 'chat', labelKey: 'testMode.events.chat', icon: MessageCircle },
  { value: 'playerJoined', labelKey: 'testMode.events.playerJoined', icon: User },
  { value: 'playerLeft', labelKey: 'testMode.events.playerLeft', icon: User },
  { value: 'health', labelKey: 'testMode.events.health', icon: Heart },
  { value: 'botDied', labelKey: 'testMode.events.botDied', icon: Skull },
  { value: 'entitySpawn', labelKey: 'testMode.events.entitySpawn', icon: Package },
  { value: 'entityGone', labelKey: 'testMode.events.entityGone', icon: Package },
  { value: 'botStartup', labelKey: 'testMode.events.botStartup', icon: Zap },
  { value: 'command', labelKey: 'testMode.events.command', icon: Zap },
];

function buildEventArgs(eventType, data) {
  switch (eventType) {
    case 'chat':
      return {
        username: data.username || 'TestPlayer',
        message: data.message || 'hello',
        type: 'chat',
        chatType: 'chat'
      };
    case 'playerJoined':
    case 'playerLeft':
      return { user: { username: data.username || 'TestPlayer', uuid: 'test-uuid' } };
    case 'health':
      return { health: Number(data.health ?? 20), food: Number(data.food ?? 20), saturation: 5 };
    case 'botDied':
      return { user: { username: 'TestBot' } };
    case 'entitySpawn':
    case 'entityGone':
      return { entity: { id: 1, type: 'player', position: { x: 0, y: 64, z: 0 } } };
    case 'command':
      return { commandArguments: data.commandArguments ? safeParse(data.commandArguments) : {}, username: data.username || 'TestPlayer' };
    default:
      return {};
  }
}

function safeParse(json) {
  try { return JSON.parse(json); } catch { return {}; }
}

const TestModeStartDialog = ({ open, onOpenChange }) => {
  const { t } = useTranslation('visual-editor');
  const startTestRun = useVisualEditorStore(s => s.startTestRun);
  const enableTestMode = useVisualEditorStore(s => s.enableTestMode);

  const [eventType, setEventType] = useState('chat');
  const [data, setData] = useState({ username: 'TestPlayer', message: 'hello world', health: 20, food: 20, commandArguments: '{}' });
  const [busy, setBusy] = useState(false);

  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  const handleStart = async () => {
    setBusy(true);
    try {
      enableTestMode();
      const eventArgs = buildEventArgs(eventType, data);
      await startTestRun({ eventType, eventArgs });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const renderFields = () => {
    switch (eventType) {
      case 'chat':
        return (
          <>
            <div className="space-y-1">
              <Label>{t('testMode.fields.username')}</Label>
              <Input value={data.username} onChange={(e) => update('username', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('testMode.fields.message')}</Label>
              <Textarea value={data.message} onChange={(e) => update('message', e.target.value)} rows={3} />
            </div>
          </>
        );
      case 'health':
        return (
          <>
            <div className="space-y-1">
              <Label>{t('testMode.fields.health')}</Label>
              <Input type="number" min="0" max="20" value={data.health} onChange={(e) => update('health', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('testMode.fields.food')}</Label>
              <Input type="number" min="0" max="20" value={data.food} onChange={(e) => update('food', e.target.value)} />
            </div>
          </>
        );
      case 'playerJoined':
      case 'playerLeft':
        return (
          <div className="space-y-1">
            <Label>{t('testMode.fields.username')}</Label>
            <Input value={data.username} onChange={(e) => update('username', e.target.value)} />
          </div>
        );
      case 'command':
        return (
          <>
            <div className="space-y-1">
              <Label>{t('testMode.fields.username')}</Label>
              <Input value={data.username} onChange={(e) => update('username', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('testMode.fields.commandArgsJson')}</Label>
              <Textarea value={data.commandArguments} onChange={(e) => update('commandArguments', e.target.value)} rows={4} className="font-mono text-xs" />
            </div>
          </>
        );
      default:
        return <p className="text-sm text-slate-400">{t('testMode.noFields')}</p>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-yellow-400" />
            {t('testMode.startTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>{t('testMode.eventTypeLabel')}</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {EVENT_TYPES.map(ev => (
                  <SelectItem key={ev.value} value={ev.value}>{t(ev.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {renderFields()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('testMode.cancel')}
          </Button>
          <Button onClick={handleStart} disabled={busy} className="bg-yellow-600 hover:bg-yellow-700">
            <Play className="w-4 h-4 mr-2" />
            {t('testMode.startRun')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestModeStartDialog;
