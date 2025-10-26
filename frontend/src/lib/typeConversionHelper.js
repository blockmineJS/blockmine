/**
 * Хелпер для автоматической конвертации типов при подключении нод
 */

/**
 * Определяет цепочку конвертации между двумя типами
 * @param {string} sourceType - Исходный тип (User, Array, Object и т.д.)
 * @param {string} targetType - Целевой тип (String, Boolean, Number и т.д.)
 * @param {object} sourceNode - Исходная нода
 * @returns {object|null} - Объект с информацией о ноде-конвертере или null
 */
export function getConversionChain(sourceType, targetType, sourceNode) {
  // User -> String (username)
  if (sourceType === 'User' && targetType === 'String') {
    return {
      nodeType: 'data:get_user_field',
      inputPin: 'user',
      outputPin: 'username'
    };
  }

  // User -> Boolean (isBlacklisted) - для условий
  if (sourceType === 'User' && targetType === 'Boolean') {
    return {
      nodeType: 'data:get_user_field',
      inputPin: 'user',
      outputPin: 'isBlacklisted'
    };
  }

  // User -> Array (groups или permissions)
  if (sourceType === 'User' && targetType === 'Array') {
    return {
      nodeType: 'data:get_user_field',
      inputPin: 'user',
      outputPin: 'groups'
    };
  }

  // Array -> Number (length)
  if (sourceType === 'Array' && targetType === 'Number') {
    return {
      nodeType: 'data:length',
      inputPin: 'value',
      outputPin: 'length'
    };
  }

  // Number -> String (cast)
  if (sourceType === 'Number' && targetType === 'String') {
    return {
      nodeType: 'data:cast',
      inputPin: 'value',
      outputPin: 'value',
      targetType: 'String'
    };
  }

  // Boolean -> String (cast)
  if (sourceType === 'Boolean' && targetType === 'String') {
    return {
      nodeType: 'data:cast',
      inputPin: 'value',
      outputPin: 'value',
      targetType: 'String'
    };
  }

  // String -> Number (cast)
  if (sourceType === 'String' && targetType === 'Number') {
    return {
      nodeType: 'data:cast',
      inputPin: 'value',
      outputPin: 'value',
      targetType: 'Number'
    };
  }

  // String -> Boolean (cast)
  if (sourceType === 'String' && targetType === 'Boolean') {
    return {
      nodeType: 'data:cast',
      inputPin: 'value',
      outputPin: 'value',
      targetType: 'Boolean'
    };
  }

  // Object (Entity) -> String (username или type)
  if (sourceType === 'Object' && targetType === 'String') {
    return {
      nodeType: 'data:get_entity_field',
      inputPin: 'entity',
      outputPin: 'username' // можно также 'type'
    };
  }

  // Array -> String (cast - будет преобразовано в строку)
  if (sourceType === 'Array' && targetType === 'String') {
    return {
      nodeType: 'data:cast',
      inputPin: 'value',
      outputPin: 'value',
      targetType: 'String'
    };
  }

  // Number -> Boolean (> 0)
  if (sourceType === 'Number' && targetType === 'Boolean') {
    return {
      nodeType: 'logic:compare',
      inputPin: 'a',
      outputPin: 'result',
      secondInputPin: 'b',
      defaultValue: 0,
      operation: '>'
    };
  }

  // Array -> Boolean (есть элементы)
  if (sourceType === 'Array' && targetType === 'Boolean') {
    return {
      nodeType: 'data:length',
      inputPin: 'value',
      outputPin: 'length',
      // Дополнительно потребуется logic:compare > 0
      needsSecondStage: true,
      secondStage: {
        nodeType: 'logic:compare',
        inputPin1: 'a', // length
        inputPin2: 'b', // 0
        outputPin: 'result',
        defaultValue: 0,
        operation: '>'
      }
    };
  }


  return null;
}

/**
 * Ищет существующую ноду конвертации, подключенную к данному source
 * @param {string} sourceNodeId - ID исходной ноды
 * @param {string} sourceHandle - ID пина исходной ноды
 * @param {string} converterType - Тип ноды-конвертера
 * @param {string} converterInputPin - Входной пин конвертера
 * @param {array} nodes - Массив всех нод в графе
 * @param {array} edges - Массив всех connections в графе
 * @returns {object|null} - Найденная нода или null
 */
export function findExistingConverterNode(sourceNodeId, sourceHandle, converterType, converterInputPin, nodes, edges) {
  // Находим все edges, идущие от source node и source handle
  const outgoingEdges = edges.filter(edge =>
    edge.source === sourceNodeId && edge.sourceHandle === sourceHandle
  );

  // Проверяем каждое подключение
  for (const edge of outgoingEdges) {
    const targetNode = nodes.find(n => n.id === edge.target);

    // Проверяем, является ли target нода нужным конвертером
    if (targetNode &&
        targetNode.type === converterType &&
        edge.targetHandle === converterInputPin) {
      return targetNode;
    }
  }

  return null;
}

/**
 * Создает ноду конвертера и подключения
 * @param {object} connection - Исходное подключение {source, sourceHandle, target, targetHandle}
 * @param {object} conversionChain - Цепочка конвертации
 * @param {object} sourceNode - Исходная нода
 * @param {object} targetNode - Целевая нода
 * @param {function} addNode - Функция создания ноды
 * @param {function} addEdge - Функция создания edge
 * @param {array} nodes - Массив всех нод
 * @param {array} edges - Массив всех edges
 * @returns {object} - { converterNode, newEdges }
 */
export function createConverterNode(connection, conversionChain, sourceNode, targetNode, addNode, addEdgeFunc, nodes, edges) {
  const result = {
    converterNode: null,
    newEdges: [],
    additionalNodes: []
  };

  // Проверяем, есть ли уже конвертер
  const existingConverter = findExistingConverterNode(
    connection.source,
    connection.sourceHandle,
    conversionChain.nodeType,
    conversionChain.inputPin,
    nodes,
    edges
  );

  let converterNode;

  if (existingConverter) {
    converterNode = existingConverter;
  } else {
    // Создаем новую ноду конвертации между source и target
    const midX = (sourceNode.position.x + targetNode.position.x) / 2;
    const midY = (sourceNode.position.y + targetNode.position.y) / 2;
    converterNode = addNode(conversionChain.nodeType, { x: midX, y: midY }, false);

    // Устанавливаем данные для ноды (например targetType для data:cast)
    if (conversionChain.targetType) {
      converterNode.data = converterNode.data || {};
      converterNode.data.targetType = conversionChain.targetType;
    }
    if (conversionChain.operation) {
      converterNode.data = converterNode.data || {};
      converterNode.data.operation = conversionChain.operation;
    }
    if (conversionChain.defaultValue !== undefined && conversionChain.secondInputPin) {
      converterNode.data = converterNode.data || {};
      converterNode.data[conversionChain.secondInputPin] = conversionChain.defaultValue;
    }

    result.converterNode = converterNode;
    result.additionalNodes.push(converterNode);

    // Подключаем source к converter
    const firstConnection = {
      source: connection.source,
      sourceHandle: connection.sourceHandle,
      target: converterNode.id,
      targetHandle: conversionChain.inputPin,
    };

    result.newEdges.push(firstConnection);
  }

  // Если нужна вторая стадия конвертации (например Array -> Boolean)
  if (conversionChain.needsSecondStage && conversionChain.secondStage) {
    const secondStage = conversionChain.secondStage;

    // Создаем вторую ноду
    const midX2 = (converterNode.position?.x || sourceNode.position.x + 150) + 150;
    const midY2 = converterNode.position?.y || sourceNode.position.y;

    const secondNode = addNode(secondStage.nodeType, { x: midX2, y: midY2 }, false);

    // Устанавливаем дефолтные данные если нужно
    if (secondStage.defaultValue !== undefined) {
      secondNode.data = secondNode.data || {};
      secondNode.data[secondStage.inputPin2] = secondStage.defaultValue;
    }
    if (secondStage.operation) {
      secondNode.data = secondNode.data || {};
      secondNode.data.operation = secondStage.operation;
    }

    result.additionalNodes.push(secondNode);

    // Подключаем первый конвертер ко второму
    const secondConnection = {
      source: converterNode.id,
      sourceHandle: conversionChain.outputPin,
      target: secondNode.id,
      targetHandle: secondStage.inputPin1,
    };
    result.newEdges.push(secondConnection);

    // Подключаем второй конвертер к target
    const finalConnection = {
      source: secondNode.id,
      sourceHandle: secondStage.outputPin,
      target: connection.target,
      targetHandle: connection.targetHandle,
    };
    result.newEdges.push(finalConnection);

  } else {
    // Обычная одностадийная конвертация
    // Подключаем converter к target
    const secondConnection = {
      source: converterNode.id,
      sourceHandle: conversionChain.outputPin,
      target: connection.target,
      targetHandle: connection.targetHandle,
    };
    result.newEdges.push(secondConnection);
  }

  return result;
}
