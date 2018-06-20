import ProxyStateTree from "../src/index.js";
import deepClone from "lodash.clonedeep";

describe("very basic performance test", () => {
  const MAX = 10000;

  function measure(name, fn) {
    global.gc && global.gc();
    test(name, fn);
  }

  const baseState = [...Array(100).keys()];

  {
    const state = deepClone(baseState);
    measure("access property (plain)", () => {
      let counter = 0;
      for (let i = 0; i < MAX; i++) {
        counter += state[i % state.length];
      }
      expect(counter).toBe(
        (((state.length - 1) * state.length) / 2) * (MAX / state.length)
      );
    });
  }

  {
    const tree = new ProxyStateTree(deepClone(baseState));
    const state = tree.get();
    measure("tracking access to property (proxy)", () => {
      let counter = 0;
      tree.startPathsTracking();
      for (let i = 0; i < MAX; i++) {
        counter += state[i % state.length];
      }
      tree.stopPathsTracking();
      expect(counter).toBe(
        (((state.length - 1) * state.length) / 2) * (MAX / state.length)
      );
    });
  }
});
