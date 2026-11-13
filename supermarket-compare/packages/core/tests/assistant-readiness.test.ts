import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantReadyStores,type LiveStoreResult} from '../../../apps/web/app/search-client';
import type {Product} from '@market/core';
test('smart picks start with the first usable store while others are pending, empty or failed',()=>{
 const product={id:'1'} as Product;
 const results:LiveStoreResult[]=[{store:'danube',status:'ok',products:[product],durationMs:1},{store:'jarir',status:'pending',products:[],durationMs:0},{store:'extra',status:'timeout',products:[],durationMs:8000},{store:'noon',status:'ok',products:[],durationMs:1}];
 assert.deepEqual(assistantReadyStores(results),['danube']);
 results[1]={...results[1],status:'ok',products:[product]};assert.deepEqual(assistantReadyStores(results),['danube','jarir']);
 assert.deepEqual(assistantReadyStores(results.filter(r=>r.store!=='danube'&&r.store!=='jarir')),[]);
});
