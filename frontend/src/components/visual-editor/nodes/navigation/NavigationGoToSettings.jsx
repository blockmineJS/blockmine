import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import CoordinatePickerDialog from '@/components/minecraft/CoordinatePickerDialog';

/**
 * Компонент настроек для navigation:go_to ноды
 * Включает кнопку для выбора координат в 3D Viewer (модальное окно)
 */
const NavigationGoToSettings = ({ nodeId, data, updateNodeData }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleCoordinateSelect = (coords) => {
    updateNodeData(nodeId, {
      x: coords.x,
      y: coords.y,
      z: coords.z,
    });
  };

  const hasCoords = data.x !== undefined && data.y !== undefined && data.z !== undefined;

  return (
    <div className="p-2 border-t border-slate-700">
      <Button
        variant="outline"
        size="sm"
        className="w-full bg-slate-800 hover:bg-slate-700 border-cyan-600 text-cyan-400"
        onClick={() => setPickerOpen(true)}
      >
        <MapPin className="w-4 h-4 mr-2" />
        Выбрать в 3D Viewer
      </Button>

      {hasCoords && (
        <div className="mt-2 text-xs text-slate-400 text-center font-mono">
          📍 {data.x}, {data.y}, {data.z}
        </div>
      )}

      <CoordinatePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleCoordinateSelect}
        currentCoords={hasCoords ? { x: data.x, y: data.y, z: data.z } : null}
      />
    </div>
  );
};

export default NavigationGoToSettings;
