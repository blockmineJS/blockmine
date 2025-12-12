import React from 'react';
import { useTranslation } from 'react-i18next';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNodeTranslation } from './hooks/useNodeTranslation';

const NodePanel = () => {
  const { t } = useTranslation('visual-editor');
  const { availableNodes } = useVisualEditorStore();
  const { getNodeTranslation } = useNodeTranslation();

  const getCategoryLabel = (category) => t(`nodePanel.categories.${category}`, category);

  const getNodeLabel = (node) => {
    const translation = getNodeTranslation(node.type);
    return translation.label || node.label;
  };

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="p-2 h-full overflow-y-auto">
        <h3 className="text-lg font-bold mb-2 text-center">{t('nodePanel.title')}</h3>
        <Accordion type="multiple" className="w-full" defaultValue={Object.keys(availableNodes)}>
            {Object.entries(availableNodes).map(([category, nodes]) => (
                <AccordionItem value={category} key={category}>
                    <AccordionTrigger>{getCategoryLabel(category)}</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2">
                        {nodes.map((node) => (
                            <div
                                key={node.type}
                                onDragStart={(event) => onDragStart(event, node.type)}
                                draggable
                                className="p-2 border rounded-md cursor-grab bg-slate-700 hover:bg-slate-600 transition-colors"
                            >
                                {getNodeLabel(node)}
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
