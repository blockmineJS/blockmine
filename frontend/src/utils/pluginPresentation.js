const normalizeValue = (value) => String(value || '').trim().toLowerCase();

const CATEGORY_DEFINITIONS = [
  {
    id: 'all',
    values: ['Все плагины', 'All plugins', 'All'],
    translationKey: 'categories.allPlugins',
    defaultLabel: 'Все плагины',
    iconName: 'LayoutGrid',
    color: 'from-blue-500 to-purple-500',
  },
  {
    id: 'core',
    values: ['Ядро', 'Core'],
    translationKey: 'categories.core',
    defaultLabel: 'Ядро',
    iconName: 'ShieldCheck',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'clan',
    values: ['Клан', 'Clan'],
    translationKey: 'categories.clan',
    defaultLabel: 'Клан',
    iconName: 'Users',
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'chat',
    values: ['Чат', 'Chat'],
    translationKey: 'categories.chat',
    defaultLabel: 'Чат',
    iconName: 'MessageSquare',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'automation',
    values: ['Автоматизация', 'Automation'],
    translationKey: 'categories.automation',
    defaultLabel: 'Автоматизация',
    iconName: 'Bot',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'security',
    values: ['Безопасность', 'Security'],
    translationKey: 'categories.security',
    defaultLabel: 'Безопасность',
    iconName: 'ShieldBan',
    color: 'from-red-500 to-rose-500',
  },
  {
    id: 'commands',
    values: ['Команды', 'Commands'],
    translationKey: 'categories.commands',
    defaultLabel: 'Команды',
    iconName: 'TerminalSquare',
    color: 'from-gray-500 to-gray-700',
  },
  {
    id: 'utilities',
    values: ['Утилиты', 'Utilities'],
    translationKey: 'categories.utilities',
    defaultLabel: 'Утилиты',
    iconName: 'Wrench',
    color: 'from-yellow-500 to-amber-500',
  },
  {
    id: 'permissions',
    values: ['Права', 'Permissions'],
    translationKey: 'categories.permissions',
    defaultLabel: 'Права',
    iconName: 'KeyRound',
    color: 'from-indigo-500 to-purple-500',
  },
];

const SOURCE_TYPE_DEFINITIONS = {
  GITHUB: { translationKey: 'sources.github', defaultLabel: 'GitHub' },
  LOCAL: { translationKey: 'sources.local', defaultLabel: 'Локальный' },
  LOCAL_IDE: { translationKey: 'sources.localIde', defaultLabel: 'Локальный IDE' },
};

const categoryById = new Map(CATEGORY_DEFINITIONS.map((definition) => [definition.id, definition]));
const categoryByValue = new Map(
  CATEGORY_DEFINITIONS.flatMap((definition) =>
    definition.values.map((value) => [normalizeValue(value), definition])
  )
);

export const PLUGIN_BROWSER_CATEGORIES = CATEGORY_DEFINITIONS;

export const getPluginCategoryDefinition = (categoryOrId) => {
  if (!categoryOrId) return null;
  return categoryById.get(categoryOrId) || categoryByValue.get(normalizeValue(categoryOrId)) || null;
};

export const getPluginCategoryId = (category) => getPluginCategoryDefinition(category)?.id || null;

export const translatePluginCategory = (category, t) => {
  const definition = getPluginCategoryDefinition(category);
  if (!definition) {
    return category;
  }

  return t(definition.translationKey, {
    defaultValue: definition.defaultLabel,
  });
};

export const pluginMatchesCategory = (categories = [], selectedCategoryId = 'all') => {
  if (!selectedCategoryId || selectedCategoryId === 'all') {
    return true;
  }

  return categories.some((category) => getPluginCategoryId(category) === selectedCategoryId);
};

export const translatePluginSourceType = (sourceType, t) => {
  const definition = SOURCE_TYPE_DEFINITIONS[sourceType];
  if (!definition) {
    return sourceType;
  }

  return t(definition.translationKey, {
    defaultValue: definition.defaultLabel,
  });
};
