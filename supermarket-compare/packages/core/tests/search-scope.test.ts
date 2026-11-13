import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restoreSelection,scopeStores} from '../../../apps/web/app/search-scope';
test('scope defaults to all including first pharmacy and isolates grocery and pharmacy sources',()=>{
 const state=restoreSelection(new URLSearchParams(),null,null);assert.equal(state.scope,'all');assert.ok(state.ids.includes('nahdi'));
 assert.deepEqual(scopeStores('pharmacy').map(s=>s.id),['nahdi','aldawaa','united','whites','innova','lemon']);assert.ok(scopeStores('grocery').every(s=>s.category!=='pharmacy'));
});
test('scope restores preferences, preserves custom choices and migrates old all-store selections',()=>{
 assert.equal(restoreSelection(new URLSearchParams(),'all','pharmacy').scope,'pharmacy');
 assert.deepEqual(restoreSelection(new URLSearchParams(),['noon','danube'],null).ids,['danube','noon']);
 const legacy=scopeStores('grocery').map(s=>s.id);assert.ok(restoreSelection(new URLSearchParams(),legacy,null).ids.includes('nahdi'));
});
test('shared search scope and sources override local preferences, with old links inferred safely',()=>{
 const shared=restoreSelection(new URLSearchParams('scope=all&store=noon&store=nahdi'),['danube'],'grocery');assert.equal(shared.scope,'all');assert.deepEqual(shared.ids,['noon','nahdi']);
 assert.equal(restoreSelection(new URLSearchParams('store=nahdi'),null,'grocery').scope,'pharmacy');
 assert.equal(restoreSelection(new URLSearchParams('scope=garbage&store=noon'),null,'pharmacy').scope,'grocery');
});
