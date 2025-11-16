/**
 * Центральный файл регистрации всех типов нод
 * Импортирует и регистрирует все доступные NodeDefinition
 */

import NodeRegistry from '../core/registry/NodeRegistry';

// Data nodes
import {
  dataCastDefinition,
  dataTypeCheckDefinition,
  dataGetVariableDefinition,
  dataGetArgumentDefinition,
  dataMakeObjectDefinition,
  dataNumberLiteralDefinition,
  dataBooleanLiteralDefinition,
  dataGetEntityFieldDefinition,
  dataGetServerPlayersDefinition,
  dataGetNearbyEntitiesDefinition,
  dataGetNearbyPlayersDefinition,
  dataEntityInfoDefinition,
  dataGetUserFieldDefinition,
  dataLengthDefinition,
} from './data';

// Flow nodes
import {
  flowBranchDefinition,
  flowSequenceDefinition,
  flowSwitchDefinition,
  flowForEachDefinition,
  flowWhileDefinition,
  flowBreakDefinition,
  flowDelayDefinition,
} from './flow';

// Math nodes
import {
  mathOperationDefinition,
  mathRandomNumberDefinition,
} from './math';

// Logic nodes
import {
  logicOperationDefinition,
  logicCompareDefinition,
} from './logic';

// String nodes
import {
  stringConcatDefinition,
  stringLiteralDefinition,
  stringContainsDefinition,
  stringMatchesDefinition,
  stringStartsWithDefinition,
  stringLengthDefinition,
  stringEqualsDefinition,
  stringEndsWithDefinition,
  stringSplitDefinition,
} from './string';

// Array nodes
import {
  arrayLiteralDefinition,
  arrayGetRandomElementDefinition,
  arrayContainsDefinition,
  arrayGetByIndexDefinition,
  arrayGetNextDefinition,
  arrayAddElementDefinition,
  arrayRemoveByIndexDefinition,
  arrayFindIndexDefinition,
} from './array';

// Object nodes
import {
  objectCreateDefinition,
  objectGetDefinition,
  objectSetDefinition,
  objectDeleteDefinition,
  objectHasKeyDefinition,
} from './object';

// Action nodes
import {
  actionSendMessageDefinition,
  actionHttpRequestDefinition,
  actionSendLogDefinition,
  actionSendWebsocketResponseDefinition,
  actionBotLookAtDefinition,
  actionBotSetVariableDefinition,
} from './action';

// Time nodes
import {
  timeDateTimeLiteralDefinition,
  timeNowDefinition,
  timeFormatDefinition,
  timeAddDefinition,
  timeDiffDefinition,
  timeCompareDefinition,
} from './time';

// User nodes
import {
  userCheckBlacklistDefinition,
  userSetBlacklistDefinition,
  userGetGroupsDefinition,
  userGetPermissionsDefinition,
} from './user';

// Bot nodes
import {
  botGetPositionDefinition,
} from './bot';

// Debug nodes
import {
  debugLogDefinition,
} from './debug';

// Event nodes
import {
  eventCommandDefinition,
  eventChatDefinition,
  eventRawMessageDefinition,
  eventPlayerJoinedDefinition,
  eventPlayerLeftDefinition,
  eventEntitySpawnDefinition,
  eventEntityMovedDefinition,
  eventEntityGoneDefinition,
  eventBotDiedDefinition,
  eventBotStartupDefinition,
  eventHealthDefinition,
  eventWebsocketCallDefinition,
} from './event';

/**
 * Регистрирует все ноды в реестре
 */
export function registerAllNodes() {
  // Data category
  NodeRegistry.register(dataCastDefinition);
  NodeRegistry.register(dataTypeCheckDefinition);
  NodeRegistry.register(dataGetVariableDefinition);
  NodeRegistry.register(dataGetArgumentDefinition);
  NodeRegistry.register(dataMakeObjectDefinition);
  NodeRegistry.register(dataNumberLiteralDefinition);
  NodeRegistry.register(dataBooleanLiteralDefinition);
  NodeRegistry.register(dataGetEntityFieldDefinition);
  NodeRegistry.register(dataGetServerPlayersDefinition);
  NodeRegistry.register(dataGetNearbyEntitiesDefinition);
  NodeRegistry.register(dataGetNearbyPlayersDefinition);
  NodeRegistry.register(dataEntityInfoDefinition);
  NodeRegistry.register(dataGetUserFieldDefinition);
  NodeRegistry.register(dataLengthDefinition);

  // Flow category
  NodeRegistry.register(flowBranchDefinition);
  NodeRegistry.register(flowSequenceDefinition);
  NodeRegistry.register(flowSwitchDefinition);
  NodeRegistry.register(flowForEachDefinition);
  NodeRegistry.register(flowWhileDefinition);
  NodeRegistry.register(flowBreakDefinition);
  NodeRegistry.register(flowDelayDefinition);

  // Math category
  NodeRegistry.register(mathOperationDefinition);
  NodeRegistry.register(mathRandomNumberDefinition);

  // Logic category
  NodeRegistry.register(logicOperationDefinition);
  NodeRegistry.register(logicCompareDefinition);

  // String category
  NodeRegistry.register(stringConcatDefinition);
  NodeRegistry.register(stringLiteralDefinition);
  NodeRegistry.register(stringContainsDefinition);
  NodeRegistry.register(stringMatchesDefinition);
  NodeRegistry.register(stringStartsWithDefinition);
  NodeRegistry.register(stringLengthDefinition);
  NodeRegistry.register(stringEqualsDefinition);
  NodeRegistry.register(stringEndsWithDefinition);
  NodeRegistry.register(stringSplitDefinition);

  // Array category
  NodeRegistry.register(arrayLiteralDefinition);
  NodeRegistry.register(arrayGetRandomElementDefinition);
  NodeRegistry.register(arrayContainsDefinition);
  NodeRegistry.register(arrayGetByIndexDefinition);
  NodeRegistry.register(arrayGetNextDefinition);
  NodeRegistry.register(arrayAddElementDefinition);
  NodeRegistry.register(arrayRemoveByIndexDefinition);
  NodeRegistry.register(arrayFindIndexDefinition);

  // Object category
  NodeRegistry.register(objectCreateDefinition);
  NodeRegistry.register(objectGetDefinition);
  NodeRegistry.register(objectSetDefinition);
  NodeRegistry.register(objectDeleteDefinition);
  NodeRegistry.register(objectHasKeyDefinition);

  // Action category
  NodeRegistry.register(actionSendMessageDefinition);
  NodeRegistry.register(actionHttpRequestDefinition);
  NodeRegistry.register(actionSendLogDefinition);
  NodeRegistry.register(actionSendWebsocketResponseDefinition);
  NodeRegistry.register(actionBotLookAtDefinition);
  NodeRegistry.register(actionBotSetVariableDefinition);

  // Time category
  NodeRegistry.register(timeDateTimeLiteralDefinition);
  NodeRegistry.register(timeNowDefinition);
  NodeRegistry.register(timeFormatDefinition);
  NodeRegistry.register(timeAddDefinition);
  NodeRegistry.register(timeDiffDefinition);
  NodeRegistry.register(timeCompareDefinition);

  // User category
  NodeRegistry.register(userCheckBlacklistDefinition);
  NodeRegistry.register(userSetBlacklistDefinition);
  NodeRegistry.register(userGetGroupsDefinition);
  NodeRegistry.register(userGetPermissionsDefinition);

  // Bot category
  NodeRegistry.register(botGetPositionDefinition);

  // Debug category
  NodeRegistry.register(debugLogDefinition);

  // Event category
  NodeRegistry.register(eventCommandDefinition);
  NodeRegistry.register(eventChatDefinition);
  NodeRegistry.register(eventRawMessageDefinition);
  NodeRegistry.register(eventPlayerJoinedDefinition);
  NodeRegistry.register(eventPlayerLeftDefinition);
  NodeRegistry.register(eventEntitySpawnDefinition);
  NodeRegistry.register(eventEntityMovedDefinition);
  NodeRegistry.register(eventEntityGoneDefinition);
  NodeRegistry.register(eventBotDiedDefinition);
  NodeRegistry.register(eventBotStartupDefinition);
  NodeRegistry.register(eventHealthDefinition);
  NodeRegistry.register(eventWebsocketCallDefinition);

  console.log(`[NodeRegistry] Зарегистрировано ${NodeRegistry.size()} типов нод`);
}

export default NodeRegistry;
