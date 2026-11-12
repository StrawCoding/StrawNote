import { z } from 'zod';

export const supportedClient = z.enum([
  'web',
  'strawnote',
  'strawnote-canary',
  'strawnote-beta',
  ...(BUILD_CONFIG.debug ? ['strawnote-dev'] : []),
]);
