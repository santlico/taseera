import type {StoreConnector} from '@market/core';
import {searchHungerstation} from './client';
export const hungerstation: StoreConnector = {id:'hungerstation',name:'هنقرستيشن',enabled:true,search:searchHungerstation};
