import React from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const NodePanel = () => {
  const { availableNodes } = useVisualEditorStore();

  const onDragStart = (event, nodeType) => {
    // Сохраняем тип ноды в событии перетаскивания
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="p-2 h-full overflow-y-auto">
        <h3 className="text-lg font-bold mb-2 text-center">Добавить ноду</h3>
        <Accordion type="multiple" className="w-full" defaultValue={Object.keys(availableNodes)}>
            {Object.entries(availableNodes).map(([category, nodes]) => (
                <AccordionItem value={category} key={category}>
                    <AccordionTrigger>{category}</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2">
                        {nodes.map((node) => (
                            <div
                                key={node.type}
                                onDragStart={(event) => onDragStart(event, node.type)}
                                draggable
                                className="p-2 border rounded-md cursor-grab bg-slate-700 hover:bg-slate-600 transition-colors"
                            >
                                {node.label}
                            </div>
                        ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    </div>
  );
};

export default NodePanel;
