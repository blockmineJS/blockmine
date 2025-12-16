# Документация: Зависимости между полями настроек плагинов (dependsOn)

## Описание

Система `dependsOn` позволяет динамически показывать/скрывать поля настроек плагинов в зависимости от значений других полей.

## Базовый синтаксис

```json
{
  "useProxy": {
    "type": "boolean",
    "label": "Использовать прокси",
    "default": false
  },
  "proxyHost": {
    "type": "string",
    "label": "Хост",
    "dependsOn": {
      "field": "useProxy",
      "value": true
    }
  }
}
```

**Результат**: поле `proxyHost` показывается только когда `useProxy === true`

## Расширенные возможности

### 1. Несколько допустимых значений

```json
{
  "serverType": {
    "type": "select",
    "label": "Тип сервера",
    "options": [
      { "value": "vanilla", "label": "Vanilla" },
      { "value": "spigot", "label": "Spigot" },
      { "value": "paper", "label": "Paper" }
    ]
  },
  "pluginFolder": {
    "type": "string",
    "label": "Папка плагинов",
    "dependsOn": {
      "field": "serverType",
      "value": ["spigot", "paper"]
    }
  }
}
```

**Результат**: `pluginFolder` виден только для Spigot или Paper

### 2. Операторы сравнения

```json
{
  "messageCount": {
    "type": "number",
    "label": "Количество сообщений",
    "default": 0
  },
  "messageTemplate": {
    "type": "string",
    "label": "Шаблон сообщения",
    "dependsOn": {
      "field": "messageCount",
      "operator": "gt",
      "value": 0
    }
  }
}
```

**Доступные операторы**:

| Оператор | Значение             |
|----------|----------------------|
| `eq`     | равно (по умолчанию) |
| `ne`     | не равно             |
| `gt`     | больше               |
| `gte`    | больше или равно     |
| `lt`     | меньше               |
| `lte`    | меньше или равно     |

### 3. Множественные условия (AND)

```json
{
  "advancedProxyAuth": {
    "type": "string",
    "label": "Токен авторизации прокси",
    "dependsOn": [
      { "field": "useProxy", "value": true },
      { "field": "proxyType", "value": "socks5" }
    ]
  }
}
```

**Результат**: показывается только когда **ОБА** условия выполнены

### 4. Инвертирование (NOT)

```json
{
  "manualConfig": {
    "type": "string",
    "label": "Ручная конфигурация",
    "dependsOn": {
      "field": "useAutoConfig",
      "value": true,
      "invert": true
    }
  }
}
```

**Результат**: показывается когда `useAutoConfig !== true`

## Полный пример плагина

```json
{
  "name": "advanced-chat",
  "botpanel": {
    "settings": {
      "chatMode": {
        "type": "select",
        "label": "Режим чата",
        "options": [
          { "value": "simple", "label": "Простой" },
          { "value": "advanced", "label": "Продвинутый" },
          { "value": "custom", "label": "Кастомный" }
        ],
        "default": "simple"
      },
      "messageDelay": {
        "type": "number",
        "label": "Задержка (мс)",
        "default": 1000,
        "dependsOn": {
          "field": "chatMode",
          "value": ["advanced", "custom"]
        }
      },
      "customPattern": {
        "type": "string",
        "label": "Кастомный паттерн",
        "dependsOn": {
          "field": "chatMode",
          "value": "custom"
        }
      },
      "useProxy": {
        "type": "boolean",
        "label": "Через прокси",
        "default": false,
        "dependsOn": {
          "field": "chatMode",
          "value": "simple",
          "invert": true
        }
      },
      "proxyHost": {
        "type": "string",
        "label": "Прокси хост",
        "dependsOn": [
          { "field": "useProxy", "value": true },
          { "field": "chatMode", "operator": "ne", "value": "simple" }
        ]
      }
    }
  }
}
```

## Как это работает

UI автоматически показывает/скрывает поля при изменении значений. Реализация находится в:

- **Utils**: `frontend/src/utils/pluginSettingsUtils.js` - функция `shouldShowField()`
- **Компоненты**:
  - `frontend/src/components/PluginSettingsDialog.jsx`
  - `frontend/src/components/PluginSettingsForm.jsx`

## Обратная совместимость

Старая логика с `actionsPreset` продолжает работать:
- Если есть поле `actionsPreset`, то поля с префиксом `enable*` показываются только при значении `custom`
