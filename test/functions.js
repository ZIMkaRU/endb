'use strict';

const apiTest = (test, Endb, options = {}) => {
  describe('API Test', () => {
    beforeEach(async () => {
      jest.setTimeout(30000);
      const endb = new Endb(options);
      await endb.clear();
    });

    test('All methods return a Promise.', () => {
      const endb = new Endb(options);
      expect(endb.all()).toBeInstanceOf(Promise);
      expect(endb.clear()).toBeInstanceOf(Promise);
      expect(endb.delete('foo')).toBeInstanceOf(Promise);
      expect(endb.entries()).toBeInstanceOf(Promise);
      expect(endb.find((v) => v === 'foo')).toBeInstanceOf(Promise);
      expect(endb.get('foo')).toBeInstanceOf(Promise);
      expect(endb.has('foo')).toBeInstanceOf(Promise);
      expect(endb.keys()).toBeInstanceOf(Promise);
      expect(endb.set('foo', 'bar')).toBeInstanceOf(Promise);
      expect(endb.values() instanceof Promise);
    });

    test('.all() resolves to an array containing all the keys and values', async () => {
      const endb = new Endb(options);
      await endb.set('foo', 'bar');
      expect(await endb.all()).toContainEqual({ key: 'foo', value: 'bar' });
    });

    test('.clear() resolves to undefined', async () => {
      const endb = new Endb(options);
      expect(await endb.clear()).toBeUndefined();
      await endb.set('foo', 'bar');
      expect(await endb.clear()).toBeUndefined();
    });

    test('.delete(key) resolves to true', async () => {
      const endb = new Endb(options);
      await endb.set('foo', 'bar');
      expect(await endb.delete('foo')).toBe(true);
    });

    test('.delete(key) with non-existent key resolves to false', async () => {
      const endb = new Endb(options);
      expect(await endb.delete('foo')).toBe(false);
    });

    test('.delete(key, path) deletes the property of the value', async () => {
      const endb = new Endb(options);
      const path = 'fizz.buzz';
      await endb.set('foo', 'bar', path);
      expect(await endb.delete('foo', path)).toBe(true);
    });

    test('.find(fn) resolves to value', async () => {
      const endb = new Endb(options);
      await endb.set('foo', 'bar');
      expect(await endb.find((value) => value === 'bar')).toBe('bar');
    });

    test('.find(fn) with non-existent value resolves to undefined', async () => {
      const endb = new Endb(options);
      expect(await endb.find((value) => value === 'bar')).toBeUndefined();
    });

    test('.get(key) resolves to value', async () => {
      const endb = new Endb(options);
      await endb.set('foo', 'bar');
      expect(await endb.get('foo')).toBe('bar');
    });

    test('.get(key) with non-existent key resolves to undefined', async () => {
      const endb = new Endb(options);
      expect(await endb.get('foo')).toBeUndefined();
    });

    test('.get(key, path) gets the property of the value', async () => {
      const endb = new Endb(options);
      const path = 'fizz.buzz';
      await endb.set('foo', 'bar', path);
      expect(await endb.get('foo', path)).toBe('bar');
    });

    test('.has(key) resolves to a true', async () => {
      const endb = new Endb(options);
      await endb.set('foo', 'bar');
      expect(await endb.has('foo')).toBe(true);
    });

    test('.has(key) with non-existent key resolves to false', async () => {
      const endb = new Endb(options);
      expect(await endb.has('foo')).toBe(false);
    });

    test('.has(key, path) checks whether the property exists or not', async () => {
      const endb = new Endb(options);
      const path = 'fizz.buzz';
      await endb.set('foo', 'bar', path);
      expect(await endb.has('foo', path)).toBe(true);
    });

    test('.set(key, value) resolves to true', async () => {
      const endb = new Endb(options);
      expect(await endb.set('foo', 'bar')).toBe(true);
    });

    test('.set(key, value) sets a value', async () => {
      const endb = new Endb(options);
      await endb.set('foo', 'bar');
      expect(await endb.get('foo')).toBe('bar');
    });

    test('.set(key, value, path) sets the property to the value', async () => {
      const endb = new Endb(options);
      const path = 'fizz.buzz';
      await endb.set('foo', 'bar', path);
      expect(await endb.get('foo')).toEqual({ fizz: { buzz: 'bar' } });
    });

    afterEach(async () => {
      const endb = new Endb(options);
      await endb.clear();
    });
  });
};

const valueTest = (test, Endb, options) => {
  describe('Value Test', () => {
    beforeEach(async () => {
      const endb = new Endb(options);
      await endb.clear();
    });

    test('value can be a boolean', async () => {
      const endb = new Endb(options);
      await endb.set('foo', true);
      expect(await endb.get('foo')).toBe(true);
      await endb.set('bar', false);
      expect(await endb.get('bar')).toBe(false);
    });

    test('value can be null', async () => {
      const endb = new Endb(options);
      await endb.set('foo', null);
      expect(await endb.get('foo')).toBeNull();
    });

    test('value can be a string', async () => {
      const endb = new Endb(options);
      await endb.set('foo', 'bar');
      expect(await endb.get('foo')).toBe('bar');
    });

    test('value can be a number', async () => {
      const endb = new Endb(options);
      await endb.set('foo', 0);
      expect(await endb.get('foo')).toBe(0);
    });

    test('value can be an object', async () => {
      const endb = new Endb(options);
      await endb.set('foo', {
        bar: 'fizz',
      });
      expect(await endb.get('foo')).toEqual({ bar: 'fizz' });
    });

    test('value can be an array', async () => {
      const endb = new Endb(options);
      await endb.set('foo', ['bar']);
      expect(await endb.get('foo')).toEqual(['bar']);
    });

    test('value can be a buffer', async () => {
      const endb = new Endb(options);
      const buffer = Buffer.from('bar');
      await endb.set('foo', buffer);
      expect(buffer.equals(await endb.get('foo'))).toBe(true);
    });

    test('value can contain quotes', async () => {
      const endb = new Endb(options);
      const value = '"';
      await endb.set('foo', value);
      expect(await endb.get('foo')).toBe(value);
    });
  });
};

const adapterTest = (it, Endb, goodUri) => {
  describe('Adapter Test', () => {
    it('should infer the adapter from the URI', async () => {
      const endb = new Endb(goodUri);
      await endb.clear();
      expect(await endb.get('foo')).toBeUndefined();
      await endb.set('foo', 'bar');
      expect(await endb.get('foo')).toBe('bar');
      await endb.clear();
    });
  });
};

const endbTest = (test, Endb, options = {}) => {
  apiTest(test, Endb, options);
  valueTest(test, Endb, options);
};

module.exports = { endbTest, apiTest, adapterTest };
