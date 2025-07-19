import React, { useState, useEffect } from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { shallow } from 'zustand/shallow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Package } from 'lucide-react';
import VariablesPanel from './VariablesPanel';

const SettingsPanel = () => {
  const command = useVisualEditorStore(state => state.command);
  const updateCommand = useVisualEditorStore(state => state.updateCommand);
  const addArgument = useVisualEditorStore(state => state.addArgument);
  const updateArgument = useVisualEditorStore(state => state.updateArgument);
  const removeArgument = useVisualEditorStore(state => state.removeArgument);
  const permissions = useVisualEditorStore(state => state.permissions);
  const availablePlugins = useVisualEditorStore(state => state.availablePlugins);
  const updatePluginOwner = useVisualEditorStore(state => state.updatePluginOwner);
  const editorType = useVisualEditorStore(state => state.editorType);

  const isEventGraph = editorType === 'event';

  const safeJsonParse = (jsonString, defaultVal = []) => {
    try {
      if (!jsonString) return defaultVal;
      if (Array.isArray(jsonString)) return jsonString;
      return JSON.parse(jsonString);
    } catch (e) {
      console.warn("Failed to parse JSON, using default value:", jsonString);
      return defaultVal;
    }
  };
  
  const initialAliases = isEventGraph ? [] : safeJsonParse(command?.aliases);
  const initialChatTypes = isEventGraph ? [] : safeJsonParse(command?.allowedChatTypes, ["chat", "private"]);

  const [aliasesStr, setAliasesStr] = useState(initialAliases.join(', '));
  const [chatTypesStr, setChatTypesStr] = useState(initialChatTypes.join(', '));
  
  useEffect(() => {
    if (command) {
      setAliasesStr(safeJsonParse(command.aliases).join(', '));
      setChatTypesStr(safeJsonParse(command.allowedChatTypes, ["chat", "private"]).join(', '));
    }
  }, [command]);

  if (!command) {
    return <div className="p-4">Загрузка настроек...</div>;
  }

  const args = isEventGraph ? [] : safeJsonParse(command.argumentsJson);

  const handleAliasesBlur = () => {
    const newAliases = aliasesStr.split(',').map(s => s.trim()).filter(Boolean);
    updateCommand({ aliases: JSON.stringify(newAliases) });
  };

  const handleChatTypesBlur = () => {
    const newTypes = chatTypesStr.split(',').map(s => s.trim()).filter(Boolean);
    updateCommand({ allowedChatTypes: JSON.stringify(newTypes) });
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-bold">{isEventGraph ? 'Настройки графа событий' : 'Настройки команды'}</h3>
      
      <div>
        <Label htmlFor="command-name">{isEventGraph ? 'Имя графа' : 'Имя команды'}</Label>
        <Input
          id="command-name"
          value={command.name || ''}
          onChange={(e) => updateCommand({ name: e.target.value })}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
            id="is-enabled"
            checked={command.isEnabled}
            onCheckedChange={(checked) => updateCommand({ isEnabled: checked })}
        />
        <Label htmlFor="is-enabled">Включено</Label>
      </div>

      <div>
        <Label htmlFor="plugin-owner" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Плагин-владелец
        </Label>
        <Select
          value={command.pluginOwnerId ? command.pluginOwnerId.toString() : "none"}
          onValueChange={(value) => {
            const pluginId = value === 'none' ? null : parseInt(value);
            updatePluginOwner(command.botId, pluginId);
          }}
        >
          <SelectTrigger id="plugin-owner">
            <SelectValue placeholder="Выберите плагин..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Нет (системный)</SelectItem>
            {availablePlugins?.length > 0 ? (
              availablePlugins
                .filter(plugin => {
                  const sourceType = plugin.sourceType?.toLowerCase();
                  return sourceType === 'local' || sourceType === 'local_ide';
                })
                .map(plugin => (
                  <SelectItem key={plugin.id} value={plugin.id.toString()}>
                    {plugin.name} ({plugin.sourceType}) {plugin.isEnabled ? '(активен)' : '(неактивен)'}
                  </SelectItem>
                ))
            ) : (
              <SelectItem value="loading" disabled>Загрузка плагинов... ({availablePlugins?.length || 0} найдено)</SelectItem>
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {availablePlugins?.length > 0 
            ? `Привязка к локальному плагину позволит автоматически удалить ${isEventGraph ? 'граф' : 'команду'} при удалении плагина`
            : 'Для назначения плагина-владельца требуются права plugin:list'
          }
        </p>
      </div>

      {!isEventGraph && (
        <>
          <div>
            <Label htmlFor="command-description">Описание</Label>
            <Textarea
              id="command-description"
              value={command.description || ''}
              onChange={(e) => updateCommand({ description: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="command-aliases">Алиасы (через запятую)</Label>
            <Input
              id="command-aliases"
              value={aliasesStr}
              onChange={(e) => setAliasesStr(e.target.value)}
              onBlur={handleAliasesBlur}
            />
          </div>

          <div>
            <Label htmlFor="command-permission">Права доступа</Label>
            <Select
              value={command.permissionId ? command.permissionId.toString() : "none"}
              onValueChange={(value) => updateCommand({ permissionId: value === 'none' ? null : parseInt(value) })}
            >
              <SelectTrigger id="command-permission">
                <SelectValue placeholder="Выберите право..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Нет</SelectItem>
                {permissions.map(perm => (
                  <SelectItem key={perm.id} value={perm.id.toString()}>{perm.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

          <div className="space-y-2">
            <Label>Типы чатов (через запятую)</Label>
            <Input
              id="command-chat-types"
              value={chatTypesStr}
              onChange={(e) => setChatTypesStr(e.target.value)}
              onBlur={handleChatTypesBlur}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-bold">Аргументы команды</h4>
            <div className="space-y-2">
              {args.map((arg, index) => (
                <div key={arg.id || index} className="flex items-center gap-2 p-2 border rounded-md">
                  <Input
                    placeholder="Имя" 
                    value={arg.name}
                    onChange={(e) => updateArgument(arg.id, { name: e.target.value })}
                    className="flex-grow"
                  />
                  <Select value={arg.type} onValueChange={(value) => updateArgument(arg.id, { type: value }) }>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`required-${arg.id}`}
                      checked={arg.required}
                      onCheckedChange={(checked) => updateArgument(arg.id, { required: checked })}
                    />
                    <Label htmlFor={`required-${arg.id}`}>Обяз.</Label>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeArgument(arg.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addArgument}>Добавить аргумент</Button>
          </div>
        </>
      )}

      <VariablesPanel />
    </div>
  );
};

export default SettingsPanel;
