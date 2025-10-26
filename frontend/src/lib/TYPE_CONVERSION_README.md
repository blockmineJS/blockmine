# Автоматическая конвертация типов при подключении нод

## Описание

Система автоматически создает промежуточные ноды-конвертеры при подключении несовместимых типов данных в визуальном редакторе.

## Поддерживаемые конвертации

### 1. User → String
Автоматически создается `data:get_user_field` с выходом `username`.

**Пример:**
```
event:command[user] → data:get_user_field[user→username] → action:send_message[message]
```

### 2. User → Boolean
Создается `data:get_user_field` с выходом `isBlacklisted` (для условий).

**Пример:**
```
event:command[user] → data:get_user_field[user→isBlacklisted] → flow:branch[condition]
```

### 3. User → Array
Создается `data:get_user_field` с выходом `groups`.

**Пример:**
```
event:command[user] → data:get_user_field[user→groups] → array:contains[array]
```

### 4. Number → String
Создается `data:cast` с `targetType: 'String'`.

**Пример:**
```
math:random_number[result] → data:cast[value→value] → action:send_message[message]
```

### 5. Boolean → String
Создается `data:cast` с `targetType: 'String'`.

**Пример:**
```
logic:compare[result] → data:cast[value→value] → action:send_message[message]
```

### 6. String → Number
Создается `data:cast` с `targetType: 'Number'` (парсинг).

**Пример:**
```
event:command[command_name] → data:cast[value→value] → math:operation[a]
```

### 7. String → Boolean
Создается `data:cast` с `targetType: 'Boolean'`.

**Пример:**
```
data:string_literal[value] → data:cast[value→value] → flow:branch[condition]
```

### 8. Object (Entity) → String
Создается `data:get_entity_field` с выходом `username`.

**Пример:**
```
event:entitySpawn[entity] → data:get_entity_field[entity→username] → action:send_message[message]
```

### 9. Array → String
Создается `data:cast` с `targetType: 'String'` (преобразует массив в строку).

**Пример:**
```
data:get_user_field[groups] → data:cast[value→value] → action:send_message[message]
```

### 10. Array → Number
Создается `data:length` для получения количества элементов.

**Пример:**
```
data:get_server_players[players] → data:length[value→length] → logic:compare[a]
```

### 11. Number → Boolean
Создается `logic:compare` с операцией `> 0`.

**Пример:**
```
math:operation[result] → logic:compare[a→result] → flow:branch[condition]
```

### 12. Array → Boolean (двухстадийная)
Создается цепочка:
1. `data:length` - получает длину массива
2. `logic:compare` - сравнивает с 0 (operation: '>')

**Пример:**
```
data:get_user_field[groups] → data:length[value→length] → logic:compare[a→result] → flow:branch[condition]
```

## Переиспользование существующих нод

Если для данного source-пина уже существует нода конвертации нужного типа, система переиспользует её вместо создания новой.

**Пример:**
```
event:command[user] ──┬→ data:get_user_field[user→username] ──┬→ action:send_message[message]
                      │                                         │
                      └─────────────────────────────────────────┴→ action:send_message[addressee]
```

В этом примере одна нода `data:get_user_field` используется для двух подключений.

## Архитектура

### Файлы

- **`typeConversionHelper.js`** - хелпер с логикой конвертации
  - `getConversionChain(sourceType, targetType, sourceNode)` - определяет цепочку конвертации
  - `findExistingConverterNode(...)` - ищет существующий конвертер
  - `createConverterNode(...)` - создает конвертер и подключения

- **`visualEditorStore.js`** - интеграция в store
  - `onConnect()` - модифицирован для использования автоконвертации

### Алгоритм работы

1. При создании подключения `onConnect()` проверяет совместимость типов source и target пинов
2. Если типы совместимы (или один из них Wildcard) - создается обычное подключение
3. Если типы несовместимы:
   - Вызывается `getConversionChain()` для определения цепочки конвертации
   - Если цепочка найдена:
     - `findExistingConverterNode()` ищет существующий конвертер
     - Если найден - переиспользуется, иначе создается новый
     - `createConverterNode()` создает все необходимые ноды и подключения
   - Если цепочка не найдена - создается прямое подключение (может не работать)

## Расширение системы

Для добавления новой конвертации, добавьте условие в `getConversionChain()`:

```javascript
// Object → String (example)
if (sourceType === 'Object' && targetType === 'String') {
  return {
    nodeType: 'data:stringify',  // тип ноды-конвертера
    inputPin: 'object',          // входной пин конвертера
    outputPin: 'json'            // выходной пин конвертера
  };
}
```

Для многостадийной конвертации:

```javascript
if (sourceType === 'SomeType' && targetType === 'AnotherType') {
  return {
    nodeType: 'first:converter',
    inputPin: 'input',
    outputPin: 'output',
    needsSecondStage: true,
    secondStage: {
      nodeType: 'second:converter',
      inputPin1: 'input1',
      inputPin2: 'input2',
      outputPin: 'result',
      defaultValue: 42,           // значение по умолчанию для input2
      operation: '>'              // дополнительные данные для ноды
    }
  };
}
```

## Сводная таблица конвертаций

| Исходный тип | Целевой тип | Нода-конвертер | Особенности |
|--------------|-------------|----------------|-------------|
| User | String | data:get_user_field | Вывод: username |
| User | Boolean | data:get_user_field | Вывод: isBlacklisted |
| User | Array | data:get_user_field | Вывод: groups |
| Number | String | data:cast | targetType: 'String' |
| Boolean | String | data:cast | targetType: 'String' |
| String | Number | data:cast | targetType: 'Number' |
| String | Boolean | data:cast | targetType: 'Boolean' |
| Object | String | data:get_entity_field | Вывод: username |
| Array | String | data:cast | targetType: 'String' |
| Array | Number | data:length | Возвращает длину |
| Array | Boolean | data:length + logic:compare | Двухстадийная: length > 0 |
| Number | Boolean | logic:compare | operation: '>', сравнение с 0 |

## Тестирование

Протестируйте следующие сценарии:

1. **User → String**: Перетащите пин `user` из `event:command` в `message` ноды `action:send_message`
2. **User → Boolean**: Перетащите `user` в `condition` ноды `flow:branch`
3. **Number → String**: Подключите `math:random_number[result]` к String-пину
4. **String → Number**: Подключите String к Number-пину (например, в `math:operation`)
5. **Array → Boolean**: Подключите Array к условию - должны создаться 2 ноды (length + compare)
6. **Number → Boolean**: Подключите Number к условию - должна создаться нода compare
7. **Переиспользование**: Повторно перетащите тот же пин в другое место - должна использоваться существующая нода

## Примечания

- Wildcard тип совместим со всеми типами и не требует конвертации
- Exec пины не конвертируются
- При ошибке конвертации создается прямое подключение (для отладки)
- Позиция конвертера рассчитывается как середина между source и target нодами
