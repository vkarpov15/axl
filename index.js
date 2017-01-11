'use strict';

const { Observable } = require('rxjs/Observable');
require('rxjs/add/observable/fromPromise');
require('rxjs/add/operator/catch');
require('rxjs/add/operator/map');
require('rxjs/add/operator/share');

module.exports = function(gen) {
  if (typeof gen === 'function') {
    gen = gen();
  }
  if (typeof gen.next !== 'function') {
    throw new Error('Parameter does not look like a generator');
  }

  const observable = new Observable(observer => {
    onComplete();

    function onComplete(res) {
      let ret;
      try {
        ret = gen.next(res);
      } catch (e) {
        return observer.error(e);
      }
      next(ret);
      return null;
    }

    function onError(err) {
      let ret;
      try {
        ret = gen.throw(err);
      } catch (e) {
        return observer.error(e);
      }
      next(ret);
    }

    function next(ret) {
      if (ret.done) {
        observer.next(ret.value);
        return observer.complete();
      }
      const value = toObservable(ret.value);
      if (value) {
        observer.next(value);

        const v = [];
        value.subscribe(
          res => { v.push(res); },
          error => onError(error),
          () => {
            if (v.length === 0) {
              onComplete(void 0);
            } else if (v.length === 1) {
              onComplete(v[0]);
            } else {
              onComplete(v);
            }
          }
        );

        return;
      }
      return onError(new TypeError('You may only yield a promise '
          + 'but the following object was passed: "' + String(ret.value) + '"'));
    }
  });

  return observable.share();
}

function toObservable(obj) {
  if (obj) {
    if (typeof obj.subscribe === 'function') {
      // Observable
      return obj;
    } else if (typeof obj.then === 'function') {
      // Promise
      return Observable.fromPromise(obj);
    } else if (typeof obj === 'function') {
      // Thunk
      return thunkToObservable(obj);
    }
  }
}

function thunkToObservable(fn) {
  return new Observable(observer => {
    try {
      fn(function(error, res) {
        if (error) {
          return observer.error(error);
        }
        observer.next(res);
        observer.complete();
      });
    } catch (error) {
      observer.error(error);
    }
  });
}
