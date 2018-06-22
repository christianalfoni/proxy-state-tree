import ProxyStateTree, { IS_PROXY } from "./";

describe("CREATION", () => {
  test("should create a ProxyStateTree instance", () => {
    const tree = new ProxyStateTree({});

    expect(tree).toBeInstanceOf(ProxyStateTree);
  });

  test("should create proxy of root state", () => {
    const state = {};
    const tree = new ProxyStateTree(state);

    expect(tree.newTracker().get()[IS_PROXY]).toBeTruthy();
  });

  test("should not create proxies when initialized", () => {
    const state = {
      foo: {}
    };
    new ProxyStateTree(state); // eslint-disable-line

    expect(state.foo[IS_PROXY]).not.toBeTruthy();
  });
});

describe("OBJECTS", () => {
  describe("ACCESS", () => {
    test("should not create proxy when accessed via tracker", () => {
      const state = {
        foo: {}
      };
      const tree = new ProxyStateTree(state);
      const tracker = tree.newTracker();
      tracker.get().foo; // eslint-disable-line
      expect(state.foo[IS_PROXY]).toBeUndefined();
      expect(tracker.get().foo[IS_PROXY]).toBeTruthy();
    });
    test("should access properties", () => {
      const state = {
        foo: {
          bar: "baz"
        }
      };
      const tree = new ProxyStateTree(state);
      expect(tree.newTracker().get().foo.bar).toBe("baz");
    });
    test("should track access properties", () => {
      const state = {
        foo: {
          bar: "baz"
        }
      };
      const tree = new ProxyStateTree(state);
      const tracker = tree.newTracker();
      tracker.startPathsTracking();
      expect(tracker.get().foo.bar).toBe("baz");
      const paths = tracker.stopPathsTracking();
      expect(paths).toEqual(["foo", "foo.bar"]);
    });
  });
  describe("MUTATIONS", () => {
    test("should throw when mutating without tracking", () => {
      const state = {
        foo: "bar"
      };
      const tree = new ProxyStateTree(state);
      const tracker = tree.newTracker();
      expect(() => {
        tracker.get().foo = "bar2";
      }).toThrow();
    });
    test("should track any SET mutations in dev mode", () => {
      const state = {
        foo: "bar"
      };
      const tree = new ProxyStateTree(state, true);
      const tracker = tree.newTracker();
      tracker.startMutationTracking();
      tracker.get().foo = "bar2";
      const mutations = tracker.stopMutationTracking();
      expect(mutations).toEqual([
        {
          method: "set",
          path: "foo",
          args: ["bar2"]
        }
      ]);
      expect(tracker.get().foo).toBe("bar2");
    });
    test("should track any UNSET mutations in dev mode", () => {
      const state = {
        foo: "bar"
      };
      const tree = new ProxyStateTree(state, true);
      const tracker = tree.newTracker();
      tracker.startMutationTracking();
      delete tracker.get().foo;
      const mutations = tracker.stopMutationTracking();
      expect(mutations).toEqual([
        {
          method: "unset",
          path: "foo",
          args: []
        }
      ]);
      expect(tracker.get().foo).toBe(undefined);
    });
  });
});

describe("ARRAYS", () => {
  describe("ACCESS", () => {
    test("should create proxies of arrays", () => {
      const state = {
        foo: []
      };
      const tree = new ProxyStateTree(state);
      const tracker = tree.newTracker();
      tracker.get().foo; // eslint-disable-line
      expect(tracker.get().foo).toBeTruthy();
    });
    test("should access properties", () => {
      const state = {
        foo: "bar"
      };
      const tree = new ProxyStateTree(state);
      const tracker = tree.newTracker();
      expect(tracker.get().foo[0]).toBe("b");
    });
    test("should track access properties", () => {
      const state = {
        foo: ["bar"]
      };
      const tree = new ProxyStateTree(state);
      const tracker = tree.newTracker();
      tracker.startPathsTracking();
      expect(tracker.get().foo[0]).toBe("bar");
      const paths = tracker.stopPathsTracking();
      expect(paths).toEqual(["foo", "foo.0"]);
    });
  });
  describe("MUTATIONS", () => {
    test("should throw when mutating without tracking", () => {
      const state = {
        foo: []
      };
      const tree = new ProxyStateTree(state);
      const tracker = tree.newTracker();
      expect(() => {
        tracker.get().foo.push("foo");
      }).toThrow();
    });
    test("should track any PUSH mutations in dev mode", () => {
      const state = {
        foo: []
      };
      const tree = new ProxyStateTree(state, true);
      const tracker = tree.newTracker();
      tracker.startMutationTracking();
      tracker.get().foo.push("bar");
      const mutations = tracker.stopMutationTracking();
      expect(mutations).toEqual([
        {
          method: "push",
          path: "foo",
          args: ["bar"]
        }
      ]);

      // expect(tree.get().foo).toEqual(["bar"]); BUG IN JEST
      expect(tracker.get().foo[0]).toBe("bar");
    });
    test("should track any POP mutations in dev mode", () => {
      const state = {
        foo: ["foo"]
      };
      const tree = new ProxyStateTree(state, true);
      const tracker = tree.newTracker();
      tracker.startMutationTracking();
      tracker.get().foo.pop();
      const mutations = tracker.stopMutationTracking();
      expect(mutations).toEqual([
        {
          method: "pop",
          path: "foo",
          args: []
        }
      ]);

      expect(tracker.get().foo.length).toBe(0);
    });
    test("should track any POP mutations in dev mode", () => {
      const state = {
        foo: ["foo"]
      };
      const tree = new ProxyStateTree(state, true);
      const tracker = tree.newTracker();
      tracker.startMutationTracking();
      tracker.get().foo.shift();
      const mutations = tracker.stopMutationTracking();
      expect(mutations).toEqual([
        {
          method: "shift",
          path: "foo",
          args: []
        }
      ]);

      expect(tracker.get().foo.length).toBe(0);
    });
    test("should track any UNSHIFT mutations in dev mode", () => {
      const state = {
        foo: []
      };
      const tree = new ProxyStateTree(state, true);
      const tracker = tree.newTracker();
      tracker.startMutationTracking();
      tracker.get().foo.unshift("foo");
      const mutations = tracker.stopMutationTracking();
      expect(mutations).toEqual([
        {
          method: "unshift",
          path: "foo",
          args: ["foo"]
        }
      ]);

      expect(tracker.get().foo[0]).toBe("foo");
    });
    test("should track any SPLICE mutations in", () => {
      const state = {
        foo: ["foo"]
      };
      const tree = new ProxyStateTree(state, true);
      const tracker = tree.newTracker();
      tracker.startMutationTracking();
      tracker.get().foo.splice(0, 1, "bar");
      const mutations = tracker.stopMutationTracking();
      expect(mutations).toEqual([
        {
          method: "splice",
          path: "foo",
          args: [0, 1, "bar"]
        }
      ]);

      expect(tracker.get().foo[0]).toBe("bar");
    });
  });
});

describe("FUNCTIONS", () => {
  test("should call functions in the tree when accessed", () => {
    const state = {
      foo: () => "bar"
    };
    const tree = new ProxyStateTree(state);
    const tracker = tree.newTracker();

    expect(tracker.get().foo).toBe("bar");
  });
  test("should pass proxy-state-tree instance and path", () => {
    const state = {
      foo: (tracker, path) => {
        expect(tracker).toBe(tracker);
        expect(path).toEqual("foo");

        return "bar";
      }
    };
    const tree = new ProxyStateTree(state);
    const tracker = tree.newTracker();

    expect(tracker.get().foo).toBe("bar");
  });
});

describe("REACTIONS", () => {
  test("should be able to register a listener using paths", () => {
    let reactionCount = 0;
    const tree = new ProxyStateTree({
      foo: "bar"
    });
    const tracker = tree.newTracker();
    const state = tracker.get();
    tracker.startPathsTracking();
    state.foo; // eslint-disable-line
    tracker.stopPathsTracking();
    tracker.addMutationListener(() => {
      reactionCount++;
    });
    tracker.startMutationTracking();
    state.foo = "bar2";
    tracker.stopMutationTracking();
    expect(reactionCount).toBe(1);
  });
  test("should be able to update listener using paths", () => {
    const tree = new ProxyStateTree({
      foo: "bar",
      bar: "baz"
    });
    const tracker = tree.newTracker();
    const state = tracker.get();
    function render() {
      tracker.startPathsTracking();
      if (state.foo === "bar") {
      } else {
        state.bar; // eslint-disable-line
      }
      tracker.stopPathsTracking();
    }
    render();
    tracker.addMutationListener(() => {
      render();
    });
    tracker.startMutationTracking();
    state.foo = "bar2";
    tracker.stopMutationTracking();
    expect(tracker.paths.has("foo")).toBe(true);
    expect(tracker.paths.has("bar")).toBe(true);
  });
  test("should be able to remove listener", () => {
    const tree = new ProxyStateTree({
      foo: "bar",
      bar: "baz"
    });
    const tracker = tree.newTracker();
    const state = tracker.get();
    function render() {
      tracker.startPathsTracking();
      if (state.foo === "bar") {
      } else {
        state.bar; // eslint-disable-line
      }
      tracker.stopPathsTracking();
    }
    render();
    const listener = tracker.addMutationListener(() => {
      listener.dispose();
    });
    tracker.startMutationTracking();
    state.foo = "bar2";
    tracker.stopMutationTracking();
    expect(tracker.listeners.size).toEqual(0);
  });
  test("should condense calls to mutation callback to one per paths group", () => {
    let reactionCount = 0;
    const tree = new ProxyStateTree({
      items: [
        {
          title: "foo"
        },
        {
          title: "bar"
        }
      ]
    });
    const tracker = tree.newTracker();
    const state = tracker.get();
    tracker.startPathsTracking();
    state.items[0].title;// eslint-disable-line
    state.items[1].title;// eslint-disable-line
    tracker.stopPathsTracking();

    tracker.addMutationListener(() => {
      reactionCount++;
    });
    tracker.startMutationTracking();
    state.items[0].title = "foo1";
    state.items[1].title = "bar1";
    tracker.stopMutationTracking();
    expect(reactionCount).toBe(1);
  });
});

describe("ITERATIONS", () => {
  test("should track paths when using array iteration methods", () => {
    const tree = new ProxyStateTree({
      items: [
        {
          title: "foo"
        },
        {
          title: "bar"
        }
      ]
    });
    const tracker = tree.newTracker();
    const state = tracker.get();
    tracker.startPathsTracking();
    state.items.forEach(item => {
      item.title;// eslint-disable-line
    });
    const paths = tracker.stopPathsTracking();
    expect(paths).toEqual([
      "items",
      "items.0",
      "items.0.title",
      "items.1",
      "items.1.title"
    ]);
  });
  test("should track paths when using Object.keys", () => {
    const tree = new ProxyStateTree({
      items: {
        foo: "bar",
        bar: "baz"
      }
    });
    const tracker = tree.newTracker();
    const state = tracker.get();
    tracker.startPathsTracking();
    Object.keys(state.items).forEach(key => {
      state.items[key]; // eslint-disable-line
    });
    const paths = tracker.stopPathsTracking();
    expect(paths).toEqual(["items", "items.foo", "items.bar"]);
  });
  test("should react to array mutation methods", () => {
    let reactionCount = 0;
    const tree = new ProxyStateTree({
      items: [
        {
          title: "foo"
        },
        {
          title: "bar"
        }
      ]
    });
    const tracker = tree.newTracker();
    const state = tracker.get();
    tracker.startPathsTracking();
    state.items.map(item => item.title);
    const paths = tracker.stopPathsTracking();
    expect(paths).toEqual([
      "items",
      "items.0",
      "items.0.title",
      "items.1",
      "items.1.title"
    ]);
    tracker.addMutationListener(() => {
      reactionCount++;
    });
    tracker.startMutationTracking();
    state.items.push({
      title: "mip"
    });
    tracker.stopMutationTracking();
    expect(reactionCount).toBe(1);
  });
});
