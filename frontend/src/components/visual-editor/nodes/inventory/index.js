// Inventory nodes - работа с инвентарём бота

// Data nodes (получение информации)
export { inventoryGetAllDefinition } from './inventoryGetAll';
export { inventoryFindItemDefinition } from './inventoryFindItem';
export { inventoryCountItemDefinition } from './inventoryCountItem';
export { inventoryHasItemDefinition } from './inventoryHasItem';
export { inventoryGetSlotDefinition } from './inventoryGetSlot';
export { inventoryGetHeldItemDefinition } from './inventoryGetHeldItem';

// Action nodes (действия с инвентарём)
export { inventoryEquipDefinition } from './inventoryEquip';
export { inventoryDropDefinition } from './inventoryDrop';
export { inventorySelectSlotDefinition } from './inventorySelectSlot';
