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

    return this.mutations;
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
    const paths = Array.from(pathSet);
    this.paths.pop();

    if (!this.paths.length) {
      this.status = STATUS.IDLE;
    }

    return paths;
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
