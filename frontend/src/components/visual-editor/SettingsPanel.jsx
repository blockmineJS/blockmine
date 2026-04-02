import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('visual-editor');
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
    return <div className="p-4">{t('loadingSettings')}</div>;
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
    <div className="h-full overflow-y-auto bg-card/40">
      <div className="space-y-4 p-4">
        <div className="space-y-1 border-b pb-4">
          <h3 className="text-lg font-bold">{isEventGraph ? t('settings.titleEventGraph') : t('settings.titleCommand')}</h3>
        </div>

      <div className="space-y-2">
        <Label htmlFor="command-name" className="text-sm font-medium">{isEventGraph ? t('settings.graphName') : t('settings.commandName')}</Label>
        <Input
          id="command-name"
          value={command.name || ''}
          onChange={(e) => updateCommand({ name: e.target.value })}
          className="h-10"
        />
      </div>

      <div className="rounded-lg border bg-background/60 p-3">
        <div className="flex items-center gap-3">
          <Checkbox
              id="is-enabled"
              checked={command.isEnabled}
              onCheckedChange={(checked) => updateCommand({ isEnabled: checked })}
          />
          <Label htmlFor="is-enabled" className="text-sm font-medium">{t('settings.enabled')}</Label>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border bg-background/60 p-3">
        <Label htmlFor="plugin-owner" className="flex items-center gap-2 text-sm font-medium">
          <Package className="h-4 w-4" />
          {t('settings.pluginOwner')}
        </Label>
        <Select
          value={command.pluginOwnerId ? command.pluginOwnerId.toString() : "none"}
          onValueChange={(value) => {
            const pluginId = value === 'none' ? null : parseInt(value);
            updatePluginOwner(command.botId, pluginId);
          }}
        >
          <SelectTrigger id="plugin-owner" className="h-10 w-full">
            <SelectValue placeholder={t('settings.selectPlugin')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('settings.noPluginSystem')}</SelectItem>
            {availablePlugins?.length > 0 ? (
              availablePlugins
                .filter(plugin => {
                  const sourceType = plugin.sourceType?.toLowerCase();
                  return sourceType === 'local' || sourceType === 'local_ide';
                })
                .map(plugin => (
                  <SelectItem key={plugin.id} value={plugin.id.toString()}>
                    {plugin.name} ({plugin.sourceType}) {plugin.isEnabled ? t('settings.pluginActive') : t('settings.pluginInactive')}
                  </SelectItem>
                ))
            ) : (
              <SelectItem value="loading" disabled>{t('settings.loadingPlugins')} ({availablePlugins?.length || 0})</SelectItem>
            )}
          </SelectContent>
        </Select>
        <p className="break-words text-xs text-muted-foreground">
          {availablePlugins?.length > 0
            ? t('settings.pluginBindNote', { type: isEventGraph ? t('settings.pluginBindNoteGraph') : t('settings.pluginBindNoteCommand') })
            : t('settings.pluginPermissionNote')
          }
        </p>
      </div>

      {!isEventGraph && (
        <>
          <div className="space-y-2">
            <Label htmlFor="command-description" className="text-sm font-medium">{t('settings.description')}</Label>
            <Textarea
              id="command-description"
              value={command.description || ''}
              onChange={(e) => updateCommand({ description: e.target.value })}
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="command-aliases" className="text-sm font-medium">{t('settings.aliases')}</Label>
            <Input
              id="command-aliases"
              value={aliasesStr}
              onChange={(e) => setAliasesStr(e.target.value)}
              onBlur={handleAliasesBlur}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="command-permission" className="text-sm font-medium">{t('settings.permission')}</Label>
            <Select
              value={command.permissionId ? command.permissionId.toString() : "none"}
              onValueChange={(value) => updateCommand({ permissionId: value === 'none' ? null : parseInt(value) })}
            >
              <SelectTrigger id="command-permission" className="h-10">
                <SelectValue placeholder={t('settings.selectPermission')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('settings.noPermission')}</SelectItem>
                {permissions.map(perm => (
                  <SelectItem key={perm.id} value={perm.id.toString()}>{perm.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

          <div className="space-y-2">
            <Label htmlFor="command-cooldown" className="text-sm font-medium">{t('settings.cooldown')}</Label>
            <Input
              id="command-cooldown"
              type="number"
              min="0"
              value={command.cooldown || 0}
              onChange={(e) => updateCommand({ cooldown: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('settings.cooldownNote')}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('settings.chatTypes')}</Label>
            <Input
              id="command-chat-types"
              value={chatTypesStr}
              onChange={(e) => setChatTypesStr(e.target.value)}
              onBlur={handleChatTypesBlur}
              className="h-10"
            />
          </div>

          <div className="space-y-3 rounded-lg border bg-background/60 p-3">
            <h4 className="font-bold">{t('settings.arguments')}</h4>
            <div className="space-y-2">
              {args.map((arg, index) => (
                <div key={arg.id || index} className="space-y-3 rounded-md border bg-background/70 p-3">
                  <Input
                    placeholder={t('settings.argName')}
                    value={arg.name}
                    onChange={(e) => updateArgument(arg.id, { name: e.target.value })}
                    className="h-10"
                  />
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                  <Select value={arg.type} onValueChange={(value) => updateArgument(arg.id, { type: value }) }>
                    <SelectTrigger className="h-10 w-full min-w-[132px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <Checkbox
                      id={`required-${arg.id}`}
                      checked={arg.required}
                      onCheckedChange={(checked) => updateArgument(arg.id, { required: checked })}
                    />
                    <Label htmlFor={`required-${arg.id}`} className="text-sm">{t('settings.argRequired')}</Label>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeArgument(arg.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-9 w-full justify-center" onClick={addArgument}>{t('settings.addArgument')}</Button>
          </div>
        </>
      )}

      <VariablesPanel />
      </div>
    </div>
  );
};

export default SettingsPanel;
