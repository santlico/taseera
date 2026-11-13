import type { StoreConnector } from '@market/core';
import { othaim } from './stores/othaim/index';
import { danube } from './stores/danube/index';
import { sadhan } from './stores/sadhan/index';
import { tamimi } from './stores/tamimi/index';
import { lulu } from './stores/lulu/index';
import { carrefour } from './stores/carrefour/index';
import { ninja } from './stores/ninja/index';
import { bindawood } from './stores/bindawood/index';

import {extra} from './stores/extra/index';
import {jarir} from './stores/jarir/index';
import { amazon } from './stores/amazon/index';
import { hungerstation } from './stores/hungerstation/index';
import { noon } from './stores/noon/index';
import { beautycare } from './stores/beautycare/index';
import { goldenscent } from './stores/goldenscent/index';
import { niceone } from './stores/niceone/index';
import { outlet } from './stores/outlet/index';
import { knooz } from './stores/knooz/index';
import { daralamirat } from './stores/daralamirat/index';
import { lemon } from './stores/lemon/index';
import { innova } from './stores/innova/index';
import { whites } from './stores/whites/index';
import { united } from './stores/united/index';
import { aldawaa } from './stores/aldawaa/index';
import { nahdi } from './stores/nahdi/index';
export {fetchHungerstationImage} from './stores/hungerstation/image';

// Server-only registry. Never import this package into a browser component.
export const connectors: readonly StoreConnector[] = [othaim, danube, carrefour, sadhan, tamimi, ninja, bindawood, amazon, hungerstation, noon, nahdi, aldawaa, united, whites, innova, lemon, daralamirat, knooz, outlet, niceone, goldenscent, beautycare, jarir, extra, lulu];

export {fetchGoldenscentImage,validGoldenscentImagePath} from './stores/goldenscent/image';


