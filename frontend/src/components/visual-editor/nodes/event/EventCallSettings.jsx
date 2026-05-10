import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVisualEditorStore } from '@/stores/visualEditorStore';

const EventCallSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');
  const nodes = useVisualEditorStore(state => state.nodes);
  const customEventNodes = nodes.filter(node => node.type === 'event:custom_event');

  return (
    <div className="p-2 border-t border-slate-700 flex items-center gap-2">
      <Label>{t('eventNodes.selectEvent')}</Label>
      <Select
        value={data.selectedEventId || ''}
        onValueChange={(value) => updateNodeData(nodeId, { selectedEventId: value })}
        disabled={customEventNodes.length === 0}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={
            customEventNodes.length === 0
              ? t('eventNodes.noEvents')
              : t('eventNodes.selectEventPlaceholder')
          } />
        </SelectTrigger>
        <SelectContent>
          {customEventNodes.map(node => (
            <SelectItem key={node.id} value={node.id}>
              {node.data?.label || node.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default EventCallSettings;
