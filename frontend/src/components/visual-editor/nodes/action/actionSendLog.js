import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:send_log
 * Отправляет сообщение в консоль на странице бота
 */
export const actionSendLogDefinition = new NodeDefinition({
  type: 'action:send_log',
  category: 'action',
  label: 'Отправить лог',
  description: 'Записывает сообщение в веб-консоль',



  defaultData: {
    message: '',
  },

  theme: {
    headerColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
});

export default actionSendLogDefinition;
