import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
const catalog = read('../lib/prompts/stylePresetPrompts.json');
const original = read('../docs/evidence/prompts-before-20261020.json');

test('all 160 registered scenarios retain category, label and order', () => {
  assert.equal(catalog.length, 160);
  assert.equal(new Set(catalog.map(row => row.style_id)).size, 16);
  assert.equal(new Set(catalog.map(row => row.style_id + ':' + row.label)).size, 160);
  for (const row of original) {
    const updated = catalog.find(item => item.style_id === row.style_id && item.label === row.label);
    assert.ok(updated, row.label);
    assert.equal(updated.display_order, row.display_order, row.label);
    assert.notEqual(updated.prompt, row.prompt, row.label);
  }
  for (const style of new Set(catalog.map(row => row.style_id))) {
    assert.deepEqual(catalog.filter(row => row.style_id === style).map(row => row.display_order).sort((a, b) => a - b), [1,2,3,4,5,6,7,8,9,10]);
  }
});

test('every template has distinct detailed English and image-text exclusions', () => {
  assert.equal(new Set(catalog.map(row => row.prompt)).size, 160);
  for (const { label, prompt } of catalog) {
    assert.doesNotMatch(prompt, /[가-힣]/, label);
    assert.ok(prompt.split(/\s+/).length >= 70, label);
    assert.match(prompt, /No text, letters, logos, or watermarks\./, label);
    assert.doesNotMatch(prompt, /Pixar|Disney|Ghibli|Miyazaki|Shinkai|Kyoto Animation|Vogue|ArchDaily|Kodak|8k|masterpiece/i, label);
  }
});

test('photographic scenarios preserve their distinctive subjects and use scene-appropriate optics', () => {
  const required = [
    ['hanok','laptop'], ['Jeju','basalt'], ['male model','wool'], ['Gangnam','umbrellas'], ['cherry','picnic'],
    ['coffee','macro'], ['sedan','panning'], ['autumn','trench'], ['wristwatch','macro'], ['surfer','wave'],
  ];
  for (const row of catalog.filter(row => row.style_id === 'photorealistic')) {
    for (const word of required[row.display_order - 1]) assert.ok(row.prompt.toLowerCase().includes(word.toLowerCase()), row.label + ': ' + word);
    assert.match(row.prompt, /lens/, row.label);
    assert.doesNotMatch(row.prompt, /masterpiece|Create a sense of adventure/i, row.label);
  }
});

test('non-photographic media keep their own rendering characteristics', () => {
  const characteristics = {
    pixar_3d: /3D/, ghibli_anime: /2D/, japanese_anime: /2D/,
    '3d_digital': /3D/, vector_illustration: /vector/, oriental_ink: /ink|hanji/,
    watercolor_pastel: /watercolor/, claymation: /clay|stop-motion/,
    webtoon_lineart: /webtoon/, minimal_flat: /flat/,
  };
  for (const row of catalog) if (characteristics[row.style_id]) {
    assert.match(row.prompt, characteristics[row.style_id], row.label);
    assert.doesNotMatch(row.prompt, /no illustration|no painting|no vector|no anime|no 3D render/i, row.label);
  }
});
