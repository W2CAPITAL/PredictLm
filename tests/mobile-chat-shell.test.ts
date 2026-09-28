import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const chat=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/app/globals.css',import.meta.url),'utf8');

test('mobile chat has a persistent navigation bar and fixed return to Chat',()=>{
  assert.match(chat,/grok-mobile-topbar/);
  assert.match(chat,/grok-mobile-menu/);
  assert.match(chat,/grok-mobile-back-chat/);
  assert.match(chat,/Voltar ao Chat/);
  assert.match(chat,/screen!=='chat'/);
  assert.match(css,/\.grok-mobile-topbar\{/);
  assert.match(css,/position:fixed/);
});

test('mobile shell follows visualViewport so browser chrome and keyboard do not hide UI',()=>{
  assert.match(chat,/window\.visualViewport/);
  assert.match(chat,/--predictlm-viewport-height/);
  assert.match(chat,/--predictlm-viewport-top/);
  assert.match(chat,/predictlmKeyboard/);
  assert.match(css,/var\(--predictlm-viewport-height,100dvh\)/);
  assert.match(css,/data-predictlm-keyboard="open"/);
});

test('busy chat state is always visible on mobile with animation',()=>{
  assert.match(chat,/grok-mobile-busy/);
  assert.match(chat,/role="status"/);
  assert.match(chat,/aria-live="polite"/);
  assert.match(css,/@keyframes predictlmMobileSpin/);
  assert.match(css,/\.grok-mobile-busy-spinner/);
  assert.match(css,/animation:predictlmMobileSpin/);
});

test('streaming no longer starts a smooth-scroll animation for every response chunk',()=>{
  assert.doesNotMatch(chat,/scrollIntoView\(\{behavior:'smooth'/);
  assert.match(chat,/scrollConversationToBottom\('auto'\)/);
  assert.match(chat,/requestAnimationFrame/);
});

test('mobile performance disables expensive full-screen paint layers',()=>{
  assert.match(css,/\.grok-main:before,\s*\n\s*\.grok-home-core:before\{display:none!important\}/);
  assert.match(css,/-webkit-backdrop-filter:none!important/);
  assert.match(css,/content-visibility:auto/);
});
