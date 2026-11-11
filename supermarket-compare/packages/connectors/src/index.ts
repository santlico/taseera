import type { StoreConnector } from '@market/core';
import { othaim } from './stores/othaim/index';
import { danube } from './stores/danube/index';
import { sadhan } from './stores/sadhan/index';
import { tamimi } from './stores/tamimi/index';
import { lulu } from './stores/lulu/index';
import { carrefour } from './stores/carrefour/index';
import { ninja } from './stores/ninja/index';
import { bindawood } from './stores/bindawood/index';

// Server-only registry. Never import this package into a browser component.
export const connectors: readonly StoreConnector[] = [othaim, danube, carrefour, sadhan, tamimi, ninja, bindawood, lulu];
