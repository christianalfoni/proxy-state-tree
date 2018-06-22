import proxify, { IS_PROXY } from "./proxify";

class TrackingProxy {
  constructor(value, devMode = false) {
    this.devMode = devMode;

    this.cache = new WeakMap();

    this.paths = new Set();
    this.listeners = new Set();
    this.mutated = false;

    this.mutations = [];

    this.isTrackingMutations = false;
    this.isTrackingPaths = false;

    this.proxy = proxify(this, value);
  }

  get() {
    return this.proxy;
  }

  startPathsTracking() {
    this.isTrackingPaths = true;
  }

  stopPathsTracking() {
    this.isTrackingPaths = false;
    return Array.from(this.paths);
  }

  clearPaths() {
    this.paths.clear();
  }

  startMutationTracking() {
    this.isTrackingMutations = true;
    this.mutated = false;
    this.mutations.length = 0;
  }

  stopMutationTracking() {
    this.isTrackingMutations = false;
    if (this.mutated) {
      this.listeners.forEach(cb => cb());
    }
    return this.mutations && this.mutations.slice();
  }

  addMutationListener(cb) {
    this.listeners.add(cb);

    const dispose = () => {
      this.listeners.delete(cb);
    };

    return {
      dispose
    };
  }
}

class ProxyStateTree {
  constructor(state, devMode) {
    this.state = state;
    this.devMode = devMode;
  }

  newTracker() {
    return new TrackingProxy(this.state, this.devMode);
  }
}

export { IS_PROXY };
export default ProxyStateTree;
