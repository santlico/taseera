import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWeight, matchesWeight } from '../../connectors/src/shared/search-query';
test('Arabic shopping weight is removed for upstream search and kept as a weight filter',()=>{
  assert.deepEqual(parseWeight('صدور دجاج ساديا 1 كيلو'),{grams:1000,term:'صدور دجاج ساديا'});
  assert.equal(matchesWeight('ساديا صدور دجاج مجمدة ١كغم',1000),true);
  assert.equal(matchesWeight('ساديا صدور دجاج 1000 غرام',1000),true);
  assert.equal(matchesWeight('ساديا صدور دجاج ٢ كجم',1000),false);
  assert.equal(matchesWeight('ساديا صدور دجاج طرية ٣*١ كغم',1000),false);
  assert.equal(matchesWeight('ساديا صدور دجاج ٤٥٠غرام',1000),false);
  assert.equal(parseWeight('صدور دجاج ساديا'),null);
});

