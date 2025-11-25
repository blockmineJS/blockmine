import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * ValueEditor - Редактор значений для Live Debug режима
 *
 * Позволяет редактировать:
 * - Простые значения (строки, числа, булевы)
 * - JSON объекты и массивы
 */
const ValueEditor = ({
  isOpen,
  onClose,
  value,
  onSave,
  title = 'Редактировать значение',
  pinName = ''
}) => {
  const [editedValue, setEditedValue] = useState(() => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value ?? '');
  });

  const [error, setError] = useState(null);

  const isObject = typeof value === 'object' && value !== null;

  const handleSave = () => {
    setError(null);

    if (isObject) {
      // Пытаемся распарсить JSON
      try {
        const parsed = JSON.parse(editedValue);
        onSave(parsed);
        onClose();
      } catch (e) {
        setError('Некорректный JSON: ' + e.message);
      }
    } else {
      // Простое значение
      let finalValue = editedValue;

      // Пытаемся определить тип
      if (editedValue === 'true') finalValue = true;
      else if (editedValue === 'false') finalValue = false;
      else if (editedValue === 'null') finalValue = null;
      else if (!isNaN(editedValue) && editedValue.trim() !== '') {
        finalValue = Number(editedValue);
      }

      onSave(finalValue);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            {title}
            {pinName && <span className="text-slate-400 font-mono ml-2">({pinName})</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isObject ? (
            <div>
              <Label className="text-xs text-slate-400 mb-2 block">
                JSON объект/массив
              </Label>
              <Textarea
                value={editedValue}
                onChange={(e) => setEditedValue(e.target.value)}
                className="font-mono text-sm bg-slate-800 border-slate-600 text-white min-h-[300px]"
                placeholder='{"key": "value"}'
              />
              <p className="text-xs text-slate-500 mt-2">
                💡 Используйте корректный JSON формат
              </p>
            </div>
          ) : (
            <div>
              <Label className="text-xs text-slate-400 mb-2 block">
                Значение
              </Label>
              <Input
                value={editedValue}
                onChange={(e) => setEditedValue(e.target.value)}
                className="font-mono text-sm bg-slate-800 border-slate-600 text-white"
                placeholder="Введите значение"
              />
              <p className="text-xs text-slate-500 mt-2">
                💡 Поддерживаются: строки, числа, true/false, null
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-slate-800 p-3 rounded border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Текущее значение:</div>
            <code className="text-xs text-slate-300">
              {typeof value === 'object' && value !== null
                ? JSON.stringify(value, null, 2)
                : String(value ?? '(пусто)')}
            </code>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-600 text-slate-300"
          >
            Отмена
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ValueEditor;
