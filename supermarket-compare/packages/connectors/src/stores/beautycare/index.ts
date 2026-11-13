import type {StoreConnector} from '@market/core';
import {searchBeautycare} from './client';
export const beautycare:StoreConnector={id:'beautycare',name:'بيوتي كير',enabled:true,preserveSearchTerm:true,search:searchBeautycare};
