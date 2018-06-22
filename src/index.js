import proxify, { IS_PROXY } from "./proxify";

class ProxyStateTree {
  constructor(state) {
    this.state = state;
    this.pathDependencies = {};
    this.mutations = [];
    this.paths = new Set();
    this.isTrackingPaths = false;
    this.isTrackingMutations = false;
    this.proxy = proxify(this, state);
  }
  get() {
    return this.proxy;
  }
  flush() {
    const pathCallbacksCalled = [];

    for (let mutation in this.mutations) {
      const path = this.mutations[mutation].path;

      if (this.pathDependencies[path]) {
        for (let pathCallback in this.pathDependencies[path]) {
          const callback = this.pathDependencies[path][pathCallback];

          if (pathCallbacksCalled.indexOf(callback) === -1) {
            pathCallbacksCalled.push(callback);
            callback();
          }
        }
      }
    }
    pathCallbacksCalled.length = 0;
  }
  startMutationTracking() {
    const currentMutations = this.mutations.slice();

    this.isTrackingMutations = true;
    this.mutations.length = 0;

    return currentMutations;
  }
  stopMutationTracking() {
    this.isTrackingMutations = false;

    return this.mutations;
  }
  startPathsTracking() {
    this.isTrackingPaths = true;
    const currentPaths = Array.from(this.paths);
    this.paths.clear();
    return currentPaths;
  }
  stopPathsTracking() {
    this.isTrackingPaths = false;
    return Array.from(this.paths);
  }
  addMutationListener(initialPaths, cb) {
    const pathDependencies = this.pathDependencies;
    let currentStringPaths = initialPaths;

    for (let index in currentStringPaths) {
      const currentStringPath = currentStringPaths[index];
      pathDependencies[currentStringPath] = pathDependencies[currentStringPath]
        ? pathDependencies[currentStringPath].concat(cb)
        : [cb];
    }

    return {
      update(newPaths) {
        const newStringPaths = newPaths;

        for (let index in currentStringPaths) {
          const currentStringPath = currentStringPaths[index];

          if (newStringPaths.indexOf(currentStringPath) === -1) {
            pathDependencies[currentStringPath].splice(
              pathDependencies[currentStringPath].indexOf(cb),
              1
            );
          }
        }

        for (let index in newStringPaths) {
          const newStringPath = newStringPaths[index];

          if (currentStringPaths.indexOf(newStringPath) === -1) {
            pathDependencies[newStringPath] = pathDependencies[newStringPath]
              ? pathDependencies[newStringPath].concat(cb)
              : [cb];
          }
        }

        currentStringPaths = newStringPaths;
      },
      dispose() {
        for (let index in currentStringPaths) {
          const currentStringPath = currentStringPaths[index];

          pathDependencies[currentStringPath].splice(
            pathDependencies[currentStringPath].indexOf(cb),
            1
          );

          if (!pathDependencies[currentStringPath].length) {
            delete pathDependencies[currentStringPath];
          }
        }
      }
    };
  }
}

export { IS_PROXY };
export default ProxyStateTree;
