import isPlainObject from "is-plain-object";

export const IS_PROXY = Symbol("IS_PROXY");
export const STATUS = {
  IDLE: "IDLE",
  TRACKING_PATHS: "TRACKING_PATHS",
  TRACKING_MUTATIONS: "TRACKING_MUTATIONS"
};

function concat(path, prop) {
  return path === undefined ? prop : path + "." + prop;
}

const arrayMutations = new Set([
  "push",
  "shift",
  "pop",
  "unshift",
  "splice",
  "reverse",
  "sort",
  "copyWithin"
]);

function createArrayProxy(tree, value, path) {
  return new Proxy(value, {
    get(target, prop) {
      if (prop === IS_PROXY) return true;

      if (
        prop === "length" ||
        (typeof target[prop] === "function" && !arrayMutations.has(prop))
      ) {
        return target[prop];
      }

      const nestedPath = concat(path, prop);

      if (tree.status === STATUS.TRACKING_PATHS) {
        tree.paths[tree.paths.length - 1].add(nestedPath);
      }

      if (arrayMutations.has(prop)) {
        if (tree.status !== STATUS.TRACKING_MUTATIONS) {
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

      if (tree.status === STATUS.TRACKING_PATHS) {
        tree.paths[tree.paths.length - 1].add(nestedPath);
      }

      if (typeof value === "function") {
        return value(tree, nestedPath);
      }

      return (target[prop] = proxify(tree, value, nestedPath));
    },
    set(target, prop, value) {
      const nestedPath = concat(path, prop);

      if (tree.status !== STATUS.TRACKING_MUTATIONS) {
        throw new Error(
          `proxy-state-tree - You are mutating the path "${nestedPath}", but it is not allowed`
        );
      }

      tree.mutations.push({
        method: "set",
        path: nestedPath,
        args: [value]
      });

      return Reflect.set(target, prop, value);
    },
    deleteProperty(target, prop) {
      const nestedPath = concat(path, prop);

      if (tree.status !== STATUS.TRACKING_MUTATIONS) {
        throw new Error(
          `proxy-state-tree - You are mutating the path "${nestedPath}", but it is not allowed`
        );
      }

      tree.mutations.push({
        method: "unset",
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

export default proxify;
