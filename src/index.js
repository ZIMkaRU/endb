'use strict';

const EventEmitter = require('events');
const util = require('./util');
const load = options => {
	const adapters = {
		level: './adapters/leveldb',
		leveldb: './adapters/leveldb',
		mongo: './adapters/mongodb',
		mongodb: './adapters/mongodb',
		mysql: './adapters/mysql',
		mysql2: './adapters/mysql',
		postgres: './adapters/postgres',
		postgresql: './adapters/postgres',
		redis: './adapters/redis',
		sqlite: './adapters/sqlite',
		sqlite3: './adapters/sqlite'
	};
	if (options.adapter || options.uri) {
		const adapter = options.adapter || /^[^:]*/.exec(options.uri)[0];
		if (adapters[adapter] !== undefined) {
			return new (require(adapters[adapter]))(options);
		}
	}

	return new Map();
};

/**
 * @class Endb
 * @classdesc Simple key-value database with cache and multi adapter support.
 * @extends EventEmitter
 */
class Endb extends EventEmitter {
	/**
	 * @constructor
	 * @param {string} [uri=undefined] The connection string URI.
	 * @param {Object} [options={}] The options for the database.
	 * @param {string} [options.namespace='endb'] The name of the database.
	 * @param {Function} [options.serialize] A custom serialization function.
	 * @param {Function} [options.deserialize] A custom deserialization function.
	 * @param {string} [options.adapter] The adapter to be used.
	 * @param {string} [options.collection='endb'] The name of the collection. (only for MongoDB)
	 * @param {string} [options.table='endb'] The name of the table. (only for SQL adapters)
	 * @param {number} [options.keySize=255] The size of the key. (only for SQL adapters)
	 * @example
	 * const endb = new Endb();
	 * const endb = new Endb({
	 *     namespace: 'endb',
	 *     serialize: JSON.stringify,
	 *     deserialize: JSON.parse
	 * });
	 * const endb = new Endb('leveldb://path/to/database');
	 * const endb = new Endb('mongodb://user:pass@localhost:27017/dbname');
	 * const endb = new Endb('mysql://user:pass@localhost:3306/dbname');
	 * const endb = new Endb('postgresql://user:pass@localhost:5432/dbname');
	 * const endb = new Endb('redis://user:pass@localhost:6379');
	 * const endb = new Endb('sqlite://path/to/database.sqlite');
	 *
	 * // Handles database connection error
	 * endb.on('error', err => console.log('Connection Error: ', err));
	 *
	 * await endb.set('foo', 'bar'); // true
	 * await endb.set('exists', true); // true
	 * await endb.set('num', 10); // true
	 * await endb.math('num', 'add', 40); // true
	 * await endb.get('foo'); // 'bar'
	 * await endb.get('exists'); // true
	 * await endb.all(); // { ... }
	 * await endb.has('foo'); // true
	 * await endb.has('bar'); // false
	 * await endb.find(v => v === 'bar'); // { key: 'foo', value: 'bar' }
	 * await endb.delete('foo'); // true
	 * await endb.clear(); // undefined
	 */
	constructor(uri, options = {}) {
		super();
		this.options = Object.assign(
			{
				namespace: 'endb',
				serialize: JSON.stringify,
				deserialize: JSON.parse
			},
			typeof uri === 'string' ? {uri} : uri,
			options
		);

		if (!this.options.store) {
			this.options.store = load(Object.assign({}, this.options));
		}

		if (typeof this.options.store.on === 'function') {
			this.options.store.on('error', err => this.emit('error', err));
		}

		this.options.store.namespace = this.options.namespace;
	}

	_addKeyPrefix(key) {
		return `${this.options.namespace}:${key}`;
	}

	_removeKeyPrefix(key) {
		return key.replace(`${this.options.namespace}:`, '');
	}

	/**
	 * Gets all the elements (keys and values) from the database.
	 * @returns {Promise<Array<any>>} All the elements (keys and values).
	 * @example
	 * Endb.all().then(console.log).catch(console.error);
	 *
	 * const elements = await Endb.all();
	 * console.log(elements);
	 */
	all() {
		return Promise.resolve()
			.then(() => {
				if (this.options.store instanceof Map) {
					const arr = [];
					for (const [key, value] of this.options.store) {
						arr.push({
							key: this._removeKeyPrefix(key, this.options.namespace),
							value: this.options.deserialize(value).value
						});
					}

					return arr;
				}

				return this.options.store.all();
			})
			.then(data => (data === undefined ? undefined : data));
	}

	/**
	 * Deletes all the elements (keys and values) from the database.
	 * @returns {Promise<void>} Returns undefined
	 * @example
	 * Endb.clear().then(console.log).catch(console.error);
	 */
	clear() {
		return Promise.resolve().then(() => this.options.store.clear());
	}

	/**
	 * Deletes an element (key and value) from the database.
	 * @param {string} key The key of an element.
	 * @returns {Promise<true>} Whether or not, the key has been deleted.
	 * @example
	 * Endb.delete('key').then(console.log).catch(console.error);
	 */
	delete(key) {
		key = this._addKeyPrefix(key, this.options.namespace);
		return Promise.resolve().then(() => this.options.store.delete(key));
	}

	/**
	 * Finds or searches for a single item where the given function returns a truthy value.
	 * Behaves like {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find Array.prototype.find}.
	 * The database elements is mapped by their `key`. If you want to find an element by key, you should use the `get` method instead.
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/get MDN} for more details.
	 * @param {Function} fn The function to execute on each element.
	 * @param {*} [thisArg] Value to use as `this` inside function.
	 * @returns {Promise<Object<*>|undefined>}
	 * @example
	 * Endb.find(v => v === 'value').then(console.log).catch(console.error);
	 *
	 * const element = await Endb.find(v => v === 'value');
	 * console.log(element);
	 */
	async find(fn, thisArg) {
		if (typeof thisArg !== undefined) {
			fn = fn.bind(thisArg);
		}

		const elements = await this.all();
		for (const element of elements) {
			if (fn(element.value)) {
				return element;
			}
		}

		return undefined;
	}

	/**
	 * Gets an element (key and value) from the database.
	 * @param {string} key The key of the element.
	 * @returns {Promise<*>} The value of the element.
	 * @example
	 * Endb.get('key').then(console.log).catch(console.error);
	 *
	 * const value = await Endb.get('key');
	 * console.log(value);
	 */
	get(key) {
		key = this._addKeyPrefix(key);
		return Promise.resolve()
			.then(() => this.options.store.get(key))
			.then(data => {
				if (data === undefined) {
					return undefined;
				}

				return data;
			});
	}

	/**
	 * Checks if the database has an element (key and value).
	 * @param {string} key The key of the element.
	 * @returns {Promise<boolean>} Whether or not, the element exists in the database.
	 * @example
	 * Endb.has('key').then(console.log).catch(console.error);
	 *
	 * const element = await Endb.has('key');
	 * if (element) {
	 *     console.log('exists');
	 * } else {
	 *     console.log('does not exist');
	 * }
	 */
	async has(key) {
		key = this._addKeyPrefix(key, this.options.namespace);
		if (this.options.store instanceof Map) {
			const data = await this.options.store.has(key);
			return data;
		}

		return typeof (await this.get(key, {raw: true})) === 'object';
	}

	/**
	 * Performs a mathematical operation on an element.
	 * @param {string} key The key of the element.
	 * @param {string} operation The mathematical operationto execute.
	 * Possible operations: addition, subtraction, multiply, division, exp, and module.
	 * @param {number} operand The operand of the operation
	 * @returns {Promise<true>}
	 * @example
	 * Endb.math('key', 'add', 100).then(console.log).catch(console.error);
	 *
	 * await Endb.math('key', 'add', 100);
	 * await Endb.math('key', 'div', 5);
	 * await Endb.math('key', 'subtract', 15);
	 * const element = await Endb.get('key');
	 * console.log(element); // 5
	 *
	 * const operations = ['add', 'sub', 'div', 'mult', 'exp', 'mod'];
	 * operations.forEach(operation => {
	 *   await Endb.math('key', operation, 100);
	 * });
	 */
	async math(key, operation, operand) {
		if (operation === 'random' || operation === 'rand') {
			const data = await this.set(key, Math.round(Math.random() * operand));
			return data;
		}

		const data = await this.set(
			key,
			util.math(await this.get(key), operation, operand)
		);
		return data;
	}

	/**
	 * Creates multiple instances of Endb.
	 * @param {string[]} names An array of strings. Each element will create new instance.
	 * @param {Object} [options] The options for the instances.
	 * @returns {Object<Endb>} An object containing created instances.
	 * @example
	 * const { users, members } = Endb.multi(['users', 'members']);
	 * // With options
	 * const { users, members } = Endb.multi(['users', 'members'], {
	 *     adapter: 'sqlite'
	 * });
	 *
	 * await users.set('foo', 'bar');
	 * await members.set('bar', 'foo');
	 */
	static multi(names, options = {}) {
		const instances = {};
		for (const name of names) {
			instances[name] = new Endb(options);
		}

		return instances;
	}

	/**
	 * Sets an element (key and a value) to the database.
	 * @param {string} key The key of the element.
	 * @param {*} value The value of the element.
	 * @returns {Promise<boolean>} Whether or not, the element has been assigned.
	 * @example
	 * Endb.set('key', 'value').then(console.log).catch(console.error);
	 * Endb.set('userExists', true).then(console.log).catch(console.error);
	 * Endb.set('profile', {
	 *   id: 1234567890,
	 *   username: 'user',
	 *   description: 'A test user',
	 *   verified: true,
	 *   nil: null,
	 *   hobbies: ['programming']
	 * }).then(console.log).catch(console.error);
	 */
	set(key, value) {
		key = this._addKeyPrefix(key);
		return Promise.resolve()
			.then(() => this.options.serialize(value))
			.then(() => this.options.store.set(key, value))
			.then(() => true);
	}
}

module.exports = Endb;
module.exports.Endb = Endb;
module.exports.util = require('./util');
module.exports.version = require('../package').version;
