'use strict';

const { Observable } = require('rxjs/Observable');
const assert = require('assert');
const axl = require('../');

require('rxjs/add/observable/of');

describe('axl', function() {
  it('works', function(done) {
    let isDone = false;
    let opCount = 0;
    axl(function*() {
      const res = yield new Promise(resolve => setTimeout(() => resolve('hello'), 50))
      assert.equal(res, 'hello');
      const res2 = yield cb => setTimeout(() => cb(null, 'test'), 50);
      assert.equal(res2, 'test');
      isDone = true;
    }).subscribe(
      op$ => {
        op$.subscribe(v => ++opCount);
      },
      error => {
        done(error);
      },
      () => {
        assert.ok(done);
        assert.equal(opCount, 2);
        done();
      }
    );
  });

  it('handling errors', function(done) {
    let isDone = false;
    let opCount = 0;
    let subCount = 0;
    let subErrorCount = 0;

    axl(function*() {
      yield new Promise((_, reject) => reject(new Error('hello')));
      isDone = true;
    }).
    catch(error => {
      throw new Error('Test2');
    }).
    subscribe(
      op$ => {
        ++subCount;
        op$.subscribe(v => ++opCount, err => {
          assert.equal(err.message, 'hello');
          ++subErrorCount;
        });
      },
      error => {
        assert.equal(error.message, 'Test2');
        assert.ok(!isDone);
        assert.equal(opCount, 0);
        assert.equal(subCount, 1);
        assert.equal(subErrorCount, 1);
        done();
      },
      () => {
        done(new Error('Should not complete'));
      }
    );
  });
});
