const isPlainObject = require("is-plain-object");

const IS_PROXY = "__is_proxy";

function proxifyObject(proxyStateTree, obj, path, paths, mutations) {
  return new Proxy(obj, {
    get(target, prop) {
      if (prop === IS_PROXY) {
        return true;
      }

      const value = target[prop];
      const nestedPath = path.concat(prop);

      if (proxyStateTree.isTrackingPaths) {
        proxyStateTree.paths.push(nestedPath);
      }

      if (typeof value === "function") {
        return value(proxyStateTree, nestedPath);
      }

      target[prop] = proxify(proxyStateTree, value, nestedPath);

      return target[prop];
    },
    set(target, prop, value) {
      if (!proxyStateTree.isTrackingMutations) {
        throw new Error(
          `proxy-state-tree - You are mutating the path "${path
            .concat(prop)
            .join(".")}", but it is not allowed`
        );
      }
      proxyStateTree.mutations.push({
        method: "set",
        path: path.concat(prop),
        args: [value]
      });

      return Reflect.set(target, prop, value);
    },
    deleteProperty(target, prop) {
      proxyStateTree.mutations.push({
        method: "unset",
        path: path.concat(prop),
        args: []
      });

      delete target[prop];

      return true;
    }
  });
}

const arrayMutations = ["push", "shift", "pop", "unshift", "splice"];

function proxifyArray(proxyStateTree, array, path) {
  return new Proxy(array, {
    get(target, prop) {
      if (prop === IS_PROXY) {
        return true;
      }

      const value = target[prop];
      const nestedPath = path.concat(prop);

      if (proxyStateTree.isTrackingPaths) {
        proxyStateTree.paths.push(nestedPath);
      }

      if (arrayMutations.indexOf(prop) >= 0) {
        if (!proxyStateTree.isTrackingMutations) {
          throw new Error(
            `proxy-state-tree - You are mutating the path "${path
              .concat(prop)
              .join(".")}", but it is not allowed`
          );
        }
        return (...args) => {
          proxyStateTree.mutations.push({
            method: prop,
            path: path,
            args: args
          });

          return target[prop](...args);
        };
      }

      target[prop] = proxify(proxyStateTree, value, nestedPath);

      return target[prop];
    }
  });
}

function proxify(proxyStateTree, value, path) {
  if (Array.isArray(value)) {
    return proxifyArray(proxyStateTree, value, path);
  } else if (isPlainObject(value)) {
    return proxifyObject(proxyStateTree, value, path);
  }

  return value;
}

export default proxify;
