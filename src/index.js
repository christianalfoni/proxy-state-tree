const proxify = require("./proxify");

class ProxyStateTree {
  constructor(state) {
    this.state = state;
    this.mutationCallbacks = [];
    this.mutations = [];
    this.paths = [];
    this.isTrackingPaths = false;
    this.isTrackingMutations = false;
    this.proxy = proxify(this, state, []);
  }
  get() {
    return this.proxy;
  }
  trackMutations(cb) {
    this.isTrackingMutations = true;
    this.mutations.length = 0;
    cb();
    for (let callback in this.mutationCallbacks) {
      this.mutationCallbacks[callback](this.mutations);
    }
    this.isTrackingMutations = false;
    return this.mutations;
  }
  trackPaths(cb) {
    this.isTrackingPaths = true;
    this.paths.length = 0;
    cb();
    this.isTrackingPaths = false;
    return this.paths;
  }
  hasMutated(paths, mutations) {
    for (let mutation in mutations) {
      const pathString = mutations[mutation].path.join(".");
      for (let path in paths) {
        if (paths[path].join(".") === pathString) {
          return true;
        }
      }
    }
    return false;
  }
  onMutation(cb) {
    this.mutationCallbacks.push(cb);
    return () => {
      this.mutationCallbacks.splice(this.mutationCallbacks.indexOf(cb), 1);
    };
  }
}

module.exports = ProxyStateTree;
