import { z } from 'zod';

export const appSchemes = z.enum([
  'strawnote',
  'strawnote-canary',
  'strawnote-beta',
  'strawnote-internal',
  'strawnote-dev',
]);

export type Scheme = z.infer<typeof appSchemes>;
export type Channel = 'stable' | 'canary' | 'beta' | 'internal';

export const schemeToChannel = {
  strawnote: 'stable',
  'strawnote-canary': 'canary',
  'strawnote-beta': 'beta',
  'strawnote-internal': 'internal',
  'strawnote-dev': 'canary', // dev does not have a dedicated app. use canary as the placeholder.
} as Record<Scheme, Channel>;

export const channelToScheme = {
  stable: 'strawnote',
  canary: BUILD_CONFIG.debug ? 'strawnote-dev' : 'strawnote-canary',
  beta: 'strawnote-beta',
  internal: 'strawnote-internal',
} as Record<Channel, Scheme>;

export const appIconMap = {
  stable: '/StrawNote.png',
  canary: '/StrawNote.png',
  beta: '/StrawNote.png',
  internal: '/StrawNote.png',
} satisfies Record<Channel, string>;

export const appNames = {
  stable: 'StrawNote',
  canary: 'StrawNote Canary',
  beta: 'StrawNote Beta',
  internal: 'StrawNote Internal',
} satisfies Record<Channel, string>;

export const appSchemaUrl = z.custom<string>(
  (url: string) => {
    try {
      return appSchemes.safeParse(new URL(url).protocol.replace(':', ''))
        .success;
    } catch {
      return false;
    }
  },
  { message: 'Invalid URL or protocol' }
);
