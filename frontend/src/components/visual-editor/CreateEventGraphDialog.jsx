import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiHelper } from '@/lib/api';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function CreateEventGraphDialog({ botId, open, onOpenChange, onCreated }) {
  const [graphName, setGraphName] = useState('');
  const [selectedPluginId, setSelectedPluginId] = useState('none');
  const [availablePlugins, setAvailablePlugins] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setGraphName('');
      setSelectedPluginId('none');
      const loadPlugins = async () => {
        try {
          const plugins = await apiHelper(`/api/plugins/bot/${botId}`);
          setAvailablePlugins(plugins.filter(plugin => 
            plugin.sourceType?.toLowerCase() === 'local' || 
            plugin.sourceType?.toLowerCase() === 'local_ide'
          ));
        } catch (error) {
          console.warn('Не удалось загрузить плагины:', error);
          setAvailablePlugins([]);
        }
      };
      loadPlugins();
    }
  }, [open, botId]);

  const handleCreate = async () => {
    if (!graphName) return;
    setIsCreating(true);
    try {
      const payload = { name: graphName };
      if (selectedPluginId !== 'none') {
        payload.pluginOwnerId = parseInt(selectedPluginId);
      }
      
      await apiHelper(`/api/bots/${botId}/event-graphs`, {
        method: 'POST',
        body: JSON.stringify(payload),
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
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="graphName">Название графа</Label>
            <Input 
              id="graphName"
              placeholder="Название графа"
              value={graphName}
              onChange={(e) => setGraphName(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="pluginOwner">Плагин-владелец</Label>
            <Select value={selectedPluginId} onValueChange={setSelectedPluginId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите плагин" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Нет (системный)</SelectItem>
                {availablePlugins.map(plugin => (
                  <SelectItem key={plugin.id} value={plugin.id.toString()}>
                    {plugin.name} ({plugin.sourceType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Привязка к локальному плагину позволит автоматически удалить граф при удалении плагина
            </p>
          </div>
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

