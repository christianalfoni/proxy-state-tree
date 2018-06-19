import isPlainObject from 'is-plain-object';

const IS_PROXY = Symbol('IS_PROXY');
const PROXY_STATE = Symbol('PROXY_STATE');

function createProxyState(tree, value, path) {
	value[PROXY_STATE] = {
		tree,
		path
	};
	return value;
}

function createProxy(tree, value, path, handler) {
	return value[PROXY_STATE]
		? value
		: new Proxy(createProxyState(tree, value, path), handler);
}

const arrayMutations = ['push', 'shift', 'pop', 'unshift', 'splice'];
const objectHandler = {
	get(target, prop) {
		if (prop === IS_PROXY) return true;
		if (prop === PROXY_STATE) return target[PROXY_STATE];

		const { tree, path } = target[PROXY_STATE];

		const value = target[prop];
		const nestedPath = path.concat(prop);

		if (tree.isTrackingPaths) {
			tree.paths.push(nestedPath);
		}

		if (typeof value === 'function') {
			return value(tree, nestedPath);
		}

		return (target[prop] = proxify(tree, value, nestedPath));
	},
	set(target, prop, value) {
		const { tree, path } = target[PROXY_STATE];

		if (!tree.isTrackingMutations) {
			throw new Error(
				`proxy-state-tree - You are mutating the path "${path
					.concat(prop)
					.join('.')}", but it is not allowed`
			);
		}
		tree.mutations.push({
			method: 'set',
			path: path.concat(prop),
			args: [value]
		});

		return Reflect.set(target, prop, value);
	},
	deleteProperty(target, prop) {
		const { tree, path } = target[PROXY_STATE];

		tree.mutations.push({
			method: 'unset',
			path: path.concat(prop),
			args: []
		});

		delete target[prop];

		return true;
	}
};

const arrayHandler = {
	get(target, prop) {
		if (prop === IS_PROXY) return true;
		if (prop === PROXY_STATE) return target[PROXY_STATE];

		const { tree, path } = target[PROXY_STATE];

		const nestedPath = path.concat(prop);

		if (tree.isTrackingPaths) {
			tree.paths.push(nestedPath);
		}

		if (arrayMutations.indexOf(prop) >= 0) {
			if (!tree.isTrackingMutations) {
				throw new Error(
					`proxy-state-tree - You are mutating the path "${path
						.concat(prop)
						.join('.')}", but it is not allowed`
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
};

function proxify(tree, value, path) {
	if (Array.isArray(value)) {
		return createProxy(tree, value, path, arrayHandler);
	} else if (isPlainObject(value)) {
		return createProxy(tree, value, path, objectHandler);
	}
	return value;
}

export { IS_PROXY };
export default proxify;
