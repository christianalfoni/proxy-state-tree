import isPlainObject from "is-plain-object";
const IS_PROXY = Symbol("IS_PROXY");

function concat(path, prop) {
  return path === undefined ? prop : path + "." + prop;
}

function shouldTrackMutation(tracking, path) {
  const trackMutation =
    tracking.isTrackingMutations &&
    ((!tracking.mutated && tracking.paths.has(path)) || tracking.devMode);
  return trackMutation;
}

function createObjectProxy(tracking, value, currentPath) {
  return new Proxy(value, {
    get(target, prop) {
      if (prop === IS_PROXY) return true;

      const value = target[prop];
      const nestedPath = concat(currentPath, prop);

      tracking.isTrackingPaths && tracking.paths.add(nestedPath);

      if (typeof value === "function") {
        return value(tracking, nestedPath);
      }

      return proxify(tracking, value, nestedPath);
    },
    set(target, prop, value) {
      const nestedPath = concat(currentPath, prop);


      if (!tracking.isTrackingMutations) {
        throw new Error(
          `proxy-state-tree - You are mutating the path "${nestedPath}", but it is not allowed`
        );
      }
      if (shouldTrackMutation(tracking, nestedPath)) {
        tracking.mutated = true;
        tracking.mutations.push({
          method: "set",
          path: nestedPath,
          args: [value]
        });
      }
      return (target[prop] = value);
    },
    deleteProperty(target, prop) {
      const nestedPath = concat(currentPath, prop);
      if (shouldTrackMutation(tracking, nestedPath)) {
        tracking.mutated = true;
        tracking.mutations.push({
          method: "unset",
          path: nestedPath,
          args: []
        });
        return delete target[prop];
      }
    }
  });
}

const arrayMutations = new Set(["push", "shift", "pop", "unshift", "splice"]);

function createArrayProxy(tracking, value, currentPath) {
  return new Proxy(value, {
    get(target, prop) {
      if (prop === IS_PROXY) return true;
      if (
        prop === "length" ||
        (typeof target[prop] === "function" && !arrayMutations.has(prop))
      ) {
        return target[prop];
      }

      const nestedPath = concat(currentPath, prop);

      tracking.isTrackingPaths && tracking.paths.add(nestedPath);

      if (
        shouldTrackMutation(tracking, currentPath) &&
        arrayMutations.has(prop)
      ) {
        return (...args) => {
          tracking.mutated = true;
          tracking.mutations.push({
            method: prop,
            path: currentPath,
            args: args
          });
          return target[prop](...args);
        };
      }

      return proxify(tracking, target[prop], nestedPath);
    },
    set(target, prop, value) {
      const nestedPath = concat(currentPath, prop);

      if (!tracking.isTrackingMutations) {
        throw new Error(
          `proxy-state-tree - You are mutating the path "${nestedPath}", but it is not allowed`
        );
      }

      if (shouldTrackMutation(tracking, nestedPath)) {
        tracking.mutated = true;
        tracking.mutations.push({
          method: "set",
          path: nestedPath,
          args: [value]
        });
      }

      return (target[prop] = value);
    }
  });
}

export { IS_PROXY };

export default function proxify(tracking, value, currentPath) {
  if (value) {
    if (tracking.cache.has(value)) return tracking.cache.get(value);

    let proxy;
    if (Array.isArray(value)) {
      proxy = createArrayProxy(tracking, value, currentPath);
    } else if (isPlainObject(value)) {
      proxy = createObjectProxy(tracking, value, currentPath);
    }

    if (proxy) {
      tracking.cache.set(value, proxy);
      return proxy;
    }
  }
  return value;
}
