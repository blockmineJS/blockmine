import { NodeDefinition } from '../../core/registry';
import ActionHttpRequestSettings from './ActionHttpRequestSettings';

/**
 * Определение ноды action:http_request
 * HTTP запрос с различными методами
 */
export const actionHttpRequestDefinition = new NodeDefinition({
  type: 'action:http_request',
  category: 'action',
  label: 'HTTP Запрос',
  description: 'Выполняет HTTP запрос. Поддерживает переменные: {varName}',



  SettingsComponent: ActionHttpRequestSettings,

  defaultData: {
    method: 'GET',
    url: '',
    body: '',
  },

  theme: {
    headerColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
});

export default actionHttpRequestDefinition;
