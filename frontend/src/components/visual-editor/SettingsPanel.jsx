import React from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

const SettingsPanel = () => {
  const { command, updateCommand, addArgument, updateArgument, removeArgument, permissions, chatTypes } = useVisualEditorStore();

  if (!command) {
    return <div className="p-4">Загрузка настроек...</div>;
  }

  const args = JSON.parse(command.argumentsJson || '[]');

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-bold">Настройки команды</h3>
      
      <div>
        <Label htmlFor="command-name">Имя команды</Label>
        <Input
          id="command-name"
          value={command.name}
          onChange={(e) => updateCommand({ name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="command-description">Описание</Label>
        <Textarea
          id="command-description"
          value={command.description}
          onChange={(e) => updateCommand({ description: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="command-aliases">Алиасы (через запятую)</Label>
        <Input
          id="command-aliases"
          value={command.aliases.join(', ')}
          onChange={(e) => updateCommand({ aliases: e.target.value.split(',').map(s => s.trim()) })}
        />
      </div>

      <div>
        <Label htmlFor="command-permission">Права доступа</Label>
        <Select
          value={command.permissionId?.toString()}
          onValueChange={(value) => updateCommand({ permissionId: parseInt(value) })}
        >
          <SelectTrigger id="command-permission">
            <SelectValue placeholder="Выберите право..." />
          </SelectTrigger>
          <SelectContent>
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
          value={(command.allowedChatTypes || []).join(', ')}
          onChange={(e) => updateCommand({ allowedChatTypes: e.target.value.split(',').map(s => s.trim()) })}
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
    </div>
  );
};

export default SettingsPanel;
