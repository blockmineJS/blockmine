import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { randomUUID } from '@/lib/uuid';

const PIN_TYPES = [
  { value: 'String', label: 'String' },
  { value: 'Number', label: 'Number' },
  { value: 'Boolean', label: 'Boolean' },
  { value: 'Object', label: 'Object' },
  { value: 'Array', label: 'Array' },
  { value: 'Wildcard', label: 'Any' },
];

const EventCustomSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');

  const handleAddPin = () => {
    const pins = data.pins || [];
    const newPin = { id: randomUUID(), name: `param${pins.length + 1}`, type: 'String' };
    updateNodeData(nodeId, { pins: [...pins, newPin] });
  };

  const handleUpdatePin = (pinId, field, value) => {
    updateNodeData(nodeId, {
      pins: (data.pins || []).map((p) => (p.id === pinId ? { ...p, [field]: value } : p)),
    });
  };

  const handleDeletePin = (pinId) => {
    updateNodeData(nodeId, { pins: (data.pins || []).filter((p) => p.id !== pinId) });
  };

  return (
    <div className="p-2 border-t border-slate-700 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs shrink-0">{t('eventNodes.eventName')}</Label>
        <Input
          className="h-7 text-xs"
          value={data.label || ''}
          onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
          placeholder={t('eventNodes.eventNamePlaceholder')}
        />
      </div>

      {(data.pins || []).map((pin) => (
        <div key={pin.id} className="flex items-center gap-1">
          <Input
            className="h-7 text-xs flex-1 min-w-0"
            value={pin.name}
            onChange={(e) => handleUpdatePin(pin.id, 'name', e.target.value)}
            placeholder={t('eventNodes.pinNamePlaceholder')}
          />
          <Select value={pin.type} onValueChange={(val) => handleUpdatePin(pin.id, 'type', val)}>
            <SelectTrigger className="h-7 text-xs w-[90px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIN_TYPES.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 shrink-0 text-red-400 hover:text-red-300"
            onClick={() => handleDeletePin(pin.id)}
          >
            ×
          </Button>
        </div>
      ))}

      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs w-full"
        onClick={handleAddPin}
      >
        {t('eventNodes.addPin')}
      </Button>
    </div>
  );
};

export default EventCustomSettings;
