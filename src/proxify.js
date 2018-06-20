import isPlainObject from 'is-plain-object';

const IS_PROXY = Symbol('IS_PROXY');

function concat(path, prop) {
	return path === undefined ? prop : path + '.' + prop;
}

const arrayMutations = new Set([ 'push', 'shift', 'pop', 'unshift', 'splice', 'reverse', 'sort' ]);

function createArrayProxy(tree, value, path) {
	return new Proxy(value, {
		get(target, prop) {
			if (prop === IS_PROXY) return true;

			if (prop === 'length' || (typeof target[prop] === 'function' && !arrayMutations.has(prop))) {
				return target[prop];
			}

			const nestedPath = concat(path, prop);

			if (tree.isTrackingPaths) {
				tree.paths.add(nestedPath);
			}

			if (arrayMutations.has(prop)) {
				if (!tree.isTrackingMutations) {
					throw new Error(
						`proxy-state-tree - You are mutating the path "${nestedPath}", but it is not allowed`
					);
				}
				return (...args) => {
					tree.mutations.push({
						method: prop,
						path: path,
						args: args
					});

					return target[prop](...args);
				};
			}

			return (target[prop] = proxify(tree, target[prop], nestedPath));
		}
	});
}

function createObjectProxy(tree, value, path) {
	return new Proxy(value, {
		get(target, prop) {
			if (prop === IS_PROXY) return true;

			const value = target[prop];
			const nestedPath = concat(path, prop);

			if (tree.isTrackingPaths) {
				tree.paths.add(nestedPath);
			}

			if (typeof value === 'function') {
				return value(tree, nestedPath);
			}

			return (target[prop] = proxify(tree, value, nestedPath));
		},
		set(target, prop, value) {
			const nestedPath = concat(path, prop);

			if (!tree.isTrackingMutations) {
				throw new Error(`proxy-state-tree - You are mutating the path "${nestedPath}", but it is not allowed`);
			}
			tree.mutations.push({
				method: 'set',
				path: nestedPath,
				args: [ value ]
			});

			return (target[prop] = value);
		},
		deleteProperty(target, prop) {
			const nestedPath = concat(path, prop);

			tree.mutations.push({
				method: 'unset',
				path: nestedPath,
				args: []
			});

			delete target[prop];

			return true;
		}
	});
}

function proxify(tree, value, path) {
	if (value) {
		if (value[IS_PROXY]) {
			return value;
		} else if (Array.isArray(value)) {
			return createArrayProxy(tree, value, path);
		} else if (isPlainObject(value)) {
			return createObjectProxy(tree, value, path);
		}
	}
	return value;
}

export { IS_PROXY };
export default proxify;
