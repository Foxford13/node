'use strict';

const common = require('../common');
if (!common.hasCrypto) {
  common.skip('missing crypto');
  return;
}

const async_wrap = process.binding('async_wrap');
const assert = require('assert');
const crypto = require('crypto');
const domain = require('domain');
const spawn = require('child_process').spawn;
const callbacks = [ 'init', 'pre', 'post', 'destroy' ];
const toCall = process.argv[2];
let msgCalled = 0;
let msgReceived = 0;

function init() {
  if (toCall === 'init')
    throw new Error('init');
}
function pre() {
  if (toCall === 'pre')
    throw new Error('pre');
}
function post() {
  if (toCall === 'post')
    throw new Error('post');
}
function destroy() {
  if (toCall === 'destroy')
    throw new Error('destroy');
}

if (typeof process.argv[2] === 'string') {
  async_wrap.setupHooks({ init, pre, post, destroy });
  async_wrap.enable();

  process.on('uncaughtException', common.mustNotCall());

  const d = domain.create();
  d.on('error', common.mustNotCall());
  d.run(() => {
    // Using randomBytes because timers are not yet supported.
    crypto.randomBytes(0, common.noop);
  });

} else {

  process.on('exit', (code) => {
    assert.strictEqual(msgCalled, callbacks.length);
    assert.strictEqual(msgCalled, msgReceived);
  });

  callbacks.forEach((item) => {
    msgCalled++;

    const child = spawn(process.execPath, [__filename, item]);
    let errstring = '';

    child.stderr.on('data', (data) => {
      errstring += data.toString();
    });

    child.on('close', (code) => {
      if (errstring.includes('Error: ' + item))
        msgReceived++;

      assert.strictEqual(code, 1, `${item} closed with code ${code}`);
    });
  });
}
