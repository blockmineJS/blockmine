import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
      return { username: data.username || 'TestPlayer' };
    default:
      return {};
  }
}

function coerceArgument(arg, raw) {
  if (arg.type === 'boolean') return Boolean(raw);
  if (arg.type === 'number') {
    if (raw === '' || raw === undefined || raw === null) return undefined;
    const number = Number(raw);
    return Number.isFinite(number) ? number : undefined;
  }
  if (raw === undefined || raw === null) return undefined;
  return String(raw);
}

const TestModeStartDialog = ({ open, onOpenChange }) => {
  const { t } = useTranslation('visual-editor');
  const startTestRun = useVisualEditorStore(s => s.startTestRun);
  const editorType = useVisualEditorStore(s => s.editorType);
  const commandArguments = useVisualEditorStore(s => s.commandArguments);
  const isCommand = editorType === 'command';

  const [eventType, setEventType] = useState('chat');
  const [data, setData] = useState({ username: 'TestPlayer', message: 'hello world', health: 20, food: 20 });
  const [typeChat, setTypeChat] = useState('chat');
  const [argValues, setArgValues] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !isCommand) return;
    const next = {};
    for (const arg of commandArguments || []) {
      if (!arg?.name) continue;
      next[arg.name] = arg.type === 'boolean' ? false : '';
    }
    setArgValues(next);
    setTypeChat('chat');
    setData((prev) => ({ ...prev, username: prev.username || 'TestPlayer' }));
  }, [open, isCommand, commandArguments]);

  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  const handleStart = async () => {
    setBusy(true);
    try {
      const payload = isCommand
        ? {
            eventType: 'command',
            username: data.username || 'TestPlayer',
            typeChat,
            args: Object.fromEntries(
              (commandArguments || [])
                .filter((arg) => arg?.name)
                .map((arg) => [arg.name, coerceArgument(arg, argValues[arg.name])])
                .filter(([, value]) => value !== undefined)
            ),
          }
        : {
            eventType,
            eventArgs: buildEventArgs(eventType, data),
            username: data.username,
            typeChat: eventType === 'command' ? typeChat : undefined,
            args: eventType === 'command' ? {} : undefined,
          };
      const result = await startTestRun(payload);
      if (result?.success !== false) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const renderCommandFields = () => {
    const args = (commandArguments || []).filter((arg) => arg?.name);
    return (
      <>
        <p className="text-xs text-slate-400">{t('testMode.commandHint')}</p>
        <div className="space-y-1">
          <Label>{t('testMode.fields.username')}</Label>
          <Input value={data.username} onChange={(e) => update('username', e.target.value)} className="bg-slate-700 border-slate-600" />
        </div>
        <div className="space-y-1">
          <Label>{t('testMode.fields.typeChat')}</Label>
          <Select value={typeChat} onValueChange={setTypeChat}>
            <SelectTrigger className="bg-slate-700 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="chat">{t('testMode.chatTypes.chat')}</SelectItem>
              <SelectItem value="private">{t('testMode.chatTypes.private')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {args.length === 0 ? (
          <p className="text-sm text-slate-400">{t('testMode.fields.noArguments')}</p>
        ) : (
          args.map((arg) => (
            <div key={arg.id || arg.name} className="space-y-1">
              <Label>{arg.name}</Label>
              {arg.type === 'boolean' ? (
                <div className="flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2">
                  <Checkbox
                    id={`test-arg-${arg.name}`}
                    checked={Boolean(argValues[arg.name])}
                    onCheckedChange={(checked) => setArgValues((prev) => ({ ...prev, [arg.name]: Boolean(checked) }))}
                  />
                  <Label htmlFor={`test-arg-${arg.name}`} className="text-sm">{arg.name}</Label>
                </div>
              ) : (
                <Input
                  type={arg.type === 'number' ? 'number' : 'text'}
                  value={argValues[arg.name] ?? ''}
                  onChange={(e) => setArgValues((prev) => ({ ...prev, [arg.name]: e.target.value }))}
                  className="bg-slate-700 border-slate-600"
                />
              )}
            </div>
          ))
        )}
      </>
    );
  };

  const renderFields = () => {
    switch (eventType) {
      case 'chat':
        return (
          <>
            <div className="space-y-1">
              <Label>{t('testMode.fields.username')}</Label>
              <Input value={data.username} onChange={(e) => update('username', e.target.value)} className="bg-slate-700 border-slate-600" />
            </div>
            <div className="space-y-1">
              <Label>{t('testMode.fields.message')}</Label>
              <Textarea value={data.message} onChange={(e) => update('message', e.target.value)} rows={3} className="bg-slate-700 border-slate-600" />
            </div>
          </>
        );
      case 'health':
        return (
          <>
            <div className="space-y-1">
              <Label>{t('testMode.fields.health')}</Label>
              <Input type="number" min="0" max="20" value={data.health} onChange={(e) => update('health', e.target.value)} className="bg-slate-700 border-slate-600" />
            </div>
            <div className="space-y-1">
              <Label>{t('testMode.fields.food')}</Label>
              <Input type="number" min="0" max="20" value={data.food} onChange={(e) => update('food', e.target.value)} className="bg-slate-700 border-slate-600" />
            </div>
          </>
        );
      case 'playerJoined':
      case 'playerLeft':
        return (
          <div className="space-y-1">
            <Label>{t('testMode.fields.username')}</Label>
            <Input value={data.username} onChange={(e) => update('username', e.target.value)} className="bg-slate-700 border-slate-600" />
          </div>
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

        <div className="space-y-4 py-2 max-h-[60vh] overflow-auto">
          {isCommand ? renderCommandFields() : (
            <>
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
            </>
          )}
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
