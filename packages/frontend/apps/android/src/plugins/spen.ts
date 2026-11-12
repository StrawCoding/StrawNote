import type { PluginListenerHandle } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

type SPenButtonEvent = {
  action: 'down' | 'up' | 'click';
  pressed: boolean;
  keyCode?: number;
};

type SPenPlugin = {
  ping(): Promise<{ ok: boolean }>;
  addListener(
    event: 'spenButton',
    listener: (event: SPenButtonEvent) => void
  ): Promise<PluginListenerHandle>;
};

export const SPen = registerPlugin<SPenPlugin>('SPen');
