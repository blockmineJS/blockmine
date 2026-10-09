const COMMIT_TYPES = [
  { type: 'add', section: 'Добавлено' },
  { type: 'feat', section: 'Добавлено' },
  { type: 'feature', section: 'Добавлено' },
  { type: 'fix', section: 'Исправлено' },
  { type: 'tweak', section: 'Подкручено' },
  { type: 'refactor', section: 'Отрефакторено' },
  { type: 'perf', section: 'Подкручено' },
  { type: 'remove', section: 'Убрано' },
  { type: 'docs', section: 'Документация' },
  { type: 'revert', section: 'Откат' },
  { type: 'chore', hidden: true },
  { type: 'style', hidden: true },
  { type: 'test', hidden: true },
  { type: 'build', hidden: true },
  { type: 'ci', hidden: true },
];

const COMMITLINT_TYPES = [
  'add',
  'fix',
  'tweak',
  'remove',
  'docs',
  'chore',
  'feat',
  'refactor',
  'perf',
  'build',
  'ci',
  'style',
  'test',
  'revert',
];

module.exports = { COMMIT_TYPES, COMMITLINT_TYPES };
