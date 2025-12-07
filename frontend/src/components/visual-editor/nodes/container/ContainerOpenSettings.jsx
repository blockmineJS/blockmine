import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import CoordinatePickerDialog from '@/components/minecraft/CoordinatePickerDialog';

/**
 * Компонент настроек для container:open ноды
 * Включает кнопку для выбора координат сундука в 3D Viewer
 */
const ContainerOpenSettings = ({ nodeId, data, updateNodeData }) => {
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
        className="w-full bg-slate-800 hover:bg-slate-700 border-amber-600 text-amber-400"
        onClick={() => setPickerOpen(true)}
      >
        <MapPin className="w-4 h-4 mr-2" />
        Выбрать сундук в 3D viewer
      </Button>

      {hasCoords && (
        <div className="mt-2 text-xs text-slate-400 text-center font-mono">
          {data.x}, {data.y}, {data.z}
        </div>
      )}

      <CoordinatePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleCoordinateSelect}
        currentCoords={hasCoords ? { x: data.x, y: data.y, z: data.z } : null}
        targetBlock={true}
      />
    </div>
  );
};

export default ContainerOpenSettings;
