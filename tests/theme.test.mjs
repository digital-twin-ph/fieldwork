import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTheme,isThemePreference,THEME_PREFERENCES,THEME_LABELS,THEME_KEY} from '../build/theme.js';

test('a preference resolves against what the device asks for', () => {
  assert.equal(resolveTheme('light',true),'light','an explicit light choice wins over a dark device');
  assert.equal(resolveTheme('light',false),'light');
  assert.equal(resolveTheme('dark',false),'dark','an explicit dark choice wins over a light device');
  assert.equal(resolveTheme('dark',true),'dark');
  assert.equal(resolveTheme('device',true),'dark');
  assert.equal(resolveTheme('device',false),'light');
});

test('only the three known preferences are accepted', () => {
  for(const value of THEME_PREFERENCES) assert.ok(isThemePreference(value),`${value} is a preference`);
  for(const value of ['Dark','auto','system','',null,undefined,0,{}]) assert.equal(isThemePreference(value),false);
});

test('every preference has a label, and the device is the first offered', () => {
  assert.equal(THEME_PREFERENCES[0],'device','a first visit follows the device');
  for(const value of THEME_PREFERENCES) assert.match(THEME_LABELS[value],/\S/);
  assert.equal(THEME_KEY,'fieldwork.theme.v1','the key is versioned, so a future format change cannot be misread');
});
