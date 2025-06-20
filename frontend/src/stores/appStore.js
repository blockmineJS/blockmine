import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createCoreSlice } from './createCoreSlice';
import { createBotActionsSlice } from './createBotActionsSlice';
import { createPluginSlice } from './createPluginSlice';
import { createTaskSlice } from './createTaskSlice';
import { createAuthSlice } from './createAuthSlice';

export const useAppStore = create(
    immer((...a) => ({
        ...createCoreSlice(...a),
        ...createBotActionsSlice(...a),
        ...createPluginSlice(...a),
        ...createTaskSlice(...a),
        ...createAuthSlice(...a),
    }))
);