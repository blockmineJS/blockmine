import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiHelper } from '@/lib/api';
import { Input } from "@/components/ui/input";

export default function CreateEventGraphDialog({ botId, open, onOpenChange, onCreated }) {
  const [graphName, setGraphName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setGraphName('');
    }
  }, [open]);

  const handleCreate = async () => {
    if (!graphName) return;
    setIsCreating(true);
    try {
      await apiHelper(`/api/bots/${botId}/event-graphs`, {
        method: 'POST',
        body: JSON.stringify({ name: graphName }),
      });
      onCreated();
      onOpenChange(false);
    } catch (error) {
      console.error("Не удалось создать граф событий:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать новый граф событий</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input 
            placeholder="Название графа"
            value={graphName}
            onChange={(e) => setGraphName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleCreate} disabled={!graphName || isCreating}>
            {isCreating ? 'Создание...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

