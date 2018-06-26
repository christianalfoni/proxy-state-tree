import proxify, { IS_PROXY, STATUS } from "./proxify";

class ProxyStateTree {
  constructor(state) {
    this.state = state;
    this.pathDependencies = {};
    this.mutations = [];
    this.paths = [];
    this.status = STATUS.IDLE;
    this.proxy = proxify(this, state);
  }
  get() {
    return this.proxy;
  }
  flush() {
    const pathCallbacksCalled = new Set();

    for (let mutation in this.mutations) {
      const path = this.mutations[mutation].path;

      if (this.pathDependencies[path]) {
        for (let callback of this.pathDependencies[path]) {
          if (!pathCallbacksCalled.has(callback)) {
            pathCallbacksCalled.add(callback);
            callback();
          }
        }
      }
    }
    pathCallbacksCalled.clear();
  }
  startMutationTracking() {
    if (this.status !== STATUS.IDLE) {
      throw new Error(
        `You can not start tracking mutations unless idle. The status is: ${
          this.status
        }`
      );
    }

    const currentMutations = this.mutations.slice();

    this.status = STATUS.TRACKING_MUTATIONS;
    this.mutations.length = 0;

    return currentMutations;
  }
  clearMutationTracking() {
    this.status = STATUS.IDLE;

    return this.mutations.slice();
  }
  startPathsTracking() {
    if (this.status === STATUS.TRACKING_MUTATIONS) {
      throw new Error(
        `You can not start tracking paths when tracking mutations.`
      );
    }

    this.status = STATUS.TRACKING_PATHS;

    return this.paths.push(new Set()) - 1;
  }
  clearPathsTracking(index) {
    if (index !== this.paths.length - 1) {
      throw new Error(
        "Nested path tracking requires you to stop the nested path tracker before the outer"
      );
    }
    const pathSet = this.paths[index];
    this.paths.pop();

    if (!this.paths.length) {
      this.status = STATUS.IDLE;
    }

    return pathSet;
  }
  addMutationListener(initialPaths, cb) {
    const pathDependencies = this.pathDependencies;
    let currentStringPaths = initialPaths;

    for (let currentStringPath of currentStringPaths) {
      pathDependencies[currentStringPath] = pathDependencies[currentStringPath]
        ? pathDependencies[currentStringPath].add(cb)
        : new Set([cb]);
    }

    return {
      update(newStringPaths) {
        for (let currentStringPath of currentStringPaths) {
          if (!newStringPaths.has(currentStringPath)) {
            pathDependencies[currentStringPath].delete(cb);
          }
        }

        for (let newStringPath of newStringPaths) {
          if (!currentStringPaths.has(newStringPath)) {
            pathDependencies[newStringPath] = pathDependencies[newStringPath]
              ? pathDependencies[newStringPath].add(cb)
              : new Set([cb]);
          }
        }

        currentStringPaths = newStringPaths;
      },
      dispose() {
        for (let currentStringPath of currentStringPaths) {
          pathDependencies[currentStringPath].delete(cb);

          if (pathDependencies[currentStringPath].size === 0) {
            delete pathDependencies[currentStringPath];
          }
        }
      }
    };
  }
}

export { IS_PROXY };
export default ProxyStateTree;
