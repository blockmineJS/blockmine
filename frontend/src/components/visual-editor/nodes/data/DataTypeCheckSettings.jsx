import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для data:type_check ноды
 */
const DataTypeCheckSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700">
      <Label>Проверить тип:</Label>
      <Select
        value={data.checkType || 'string'}
        onValueChange={(value) => updateNodeData(nodeId, { checkType: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Выберите тип..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="string">String (Строка)</SelectItem>
          <SelectItem value="number">Number (Число)</SelectItem>
          <SelectItem value="numeric_string">Числовая строка ("100")</SelectItem>
          <SelectItem value="boolean">Boolean (Да/Нет)</SelectItem>
          <SelectItem value="array">Array (Массив)</SelectItem>
          <SelectItem value="object">Object (Объект)</SelectItem>
          <SelectItem value="null">Null/Undefined (Пусто)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default DataTypeCheckSettings;
