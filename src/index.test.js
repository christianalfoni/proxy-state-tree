import ProxyStateTree from './';

describe('CREATION', () => {
	test('should create a ProxyStateTree instance', () => {
		const tree = new ProxyStateTree({});

		expect(tree).toBeInstanceOf(ProxyStateTree);
	});

	test('should create proxy of root state', () => {
		const state = {};
		const tree = new ProxyStateTree(state);

		expect(tree.get().__is_proxy).toBeTruthy();
	});

	test('should not create nested proxies when initialized', () => {
		const state = {
			foo: {}
		};
		new ProxyStateTree(state); // eslint-disable-line

		expect(state.foo.__is_proxy).not.toBeTruthy();
	});
});

describe('OBJECTS', () => {
	describe('ACCESS', () => {
		test('should create proxy when accessed', () => {
			const state = {
				foo: {}
			};
			const tree = new ProxyStateTree(state);
			tree.get().foo; // eslint-disable-line
			expect(state.foo.__is_proxy).toBeTruthy();
		});
		test('should access properties', () => {
			const state = {
				foo: {
					bar: 'baz'
				}
			};
			const tree = new ProxyStateTree(state);
			expect(tree.get().foo.bar).toBe('baz');
		});
		test('should track access properties', () => {
			const state = {
				foo: {
					bar: 'baz'
				}
			};
			const tree = new ProxyStateTree(state);
			const paths = tree.trackPaths(() => {
				expect(tree.get().foo.bar).toBe('baz');
			});
			expect(paths).toEqual([ [ 'foo' ], [ 'foo', 'bar' ] ]);
		});
	});
	describe('MUTATIONS', () => {
		test('should throw when mutating without tracking', () => {
			const state = {
				foo: 'bar'
			};
			const tree = new ProxyStateTree(state);
			expect(() => {
				tree.get().foo = 'bar2';
			}).toThrow();
		});
		test('should track SET mutations', () => {
			const state = {
				foo: 'bar'
			};
			const tree = new ProxyStateTree(state);
			const mutations = tree.trackMutations(() => {
				tree.get().foo = 'bar2';
			});
			expect(mutations).toEqual([
				{
					method: 'set',
					path: [ 'foo' ],
					args: [ 'bar2' ]
				}
			]);
			expect(tree.get().foo).toBe('bar2');
		});
		test('should track UNSET mutations', () => {
			const state = {
				foo: 'bar'
			};
			const tree = new ProxyStateTree(state);
			const mutations = tree.trackMutations(() => {
				delete tree.get().foo;
			});
			expect(mutations).toEqual([
				{
					method: 'unset',
					path: [ 'foo' ],
					args: []
				}
			]);
			expect(tree.get().foo).toBe(undefined);
		});
	});
});

describe('ARRAYS', () => {
	describe('ACCESS', () => {
		test('should create proxies of arrays', () => {
			const state = {
				foo: []
			};
			const tree = new ProxyStateTree(state);
			tree.get().foo; // eslint-disable-line
			expect(state.foo.__is_proxy).toBeTruthy();
		});
		test('should access properties', () => {
			const state = {
				foo: [ 'bar' ]
			};
			const tree = new ProxyStateTree(state);
			expect(tree.get().foo[0]).toBe('bar');
		});
		test('should track access properties', () => {
			const state = {
				foo: [ 'bar' ]
			};
			const tree = new ProxyStateTree(state);
			const paths = tree.trackPaths(() => {
				expect(tree.get().foo[0]).toBe('bar');
			});
			expect(paths).toEqual([ [ 'foo' ], [ 'foo', '0' ] ]);
		});
	});
	describe('MUTATIONS', () => {
		test('should throw when mutating without tracking', () => {
			const state = {
				foo: []
			};
			const tree = new ProxyStateTree(state);
			expect(() => {
				tree.get().foo.push('foo');
			}).toThrow();
		});
		test('should track PUSH mutations', () => {
			const state = {
				foo: []
			};
			const tree = new ProxyStateTree(state);
			const mutations = tree.trackMutations(() => {
				tree.get().foo.push('bar');
			});
			expect(mutations).toEqual([
				{
					method: 'push',
					path: [ 'foo' ],
					args: [ 'bar' ]
				}
			]);

			// expect(tree.get().foo).toEqual(["bar"]); BUG IN JEST
			expect(tree.get().foo[0]).toBe('bar');
		});
		test('should track POP mutations', () => {
			const state = {
				foo: [ 'foo' ]
			};
			const tree = new ProxyStateTree(state);
			const mutations = tree.trackMutations(() => {
				tree.get().foo.pop();
			});
			expect(mutations).toEqual([
				{
					method: 'pop',
					path: [ 'foo' ],
					args: []
				}
			]);

			expect(tree.get().foo.length).toBe(0);
		});
		test('should track POP mutations', () => {
			const state = {
				foo: [ 'foo' ]
			};
			const tree = new ProxyStateTree(state);
			const mutations = tree.trackMutations(() => {
				tree.get().foo.shift();
			});
			expect(mutations).toEqual([
				{
					method: 'shift',
					path: [ 'foo' ],
					args: []
				}
			]);

			expect(tree.get().foo.length).toBe(0);
		});
		test('should track UNSHIFT mutations', () => {
			const state = {
				foo: []
			};
			const tree = new ProxyStateTree(state);
			const mutations = tree.trackMutations(() => {
				tree.get().foo.unshift('foo');
			});
			expect(mutations).toEqual([
				{
					method: 'unshift',
					path: [ 'foo' ],
					args: [ 'foo' ]
				}
			]);

			expect(tree.get().foo[0]).toBe('foo');
		});
		test('should track SPLICE mutations', () => {
			const state = {
				foo: [ 'foo' ]
			};
			const tree = new ProxyStateTree(state);
			const mutations = tree.trackMutations(() => {
				tree.get().foo.splice(0, 1, 'bar');
			});
			expect(mutations).toEqual([
				{
					method: 'splice',
					path: [ 'foo' ],
					args: [ 0, 1, 'bar' ]
				}
			]);

			expect(tree.get().foo[0]).toBe('bar');
		});
	});
});

describe('FUNCTIONS', () => {
	test('should call functions in the tree when accessed', () => {
		const state = {
			foo: () => 'bar'
		};
		const tree = new ProxyStateTree(state);

		expect(tree.get().foo).toBe('bar');
	});
	test('should pass proxy-state-tree instance and path', () => {
		const state = {
			foo: (proxyStateTree, path) => {
				expect(proxyStateTree).toBe(tree);
				expect(path).toEqual([ 'foo' ]);

				return 'bar';
			}
		};
		const tree = new ProxyStateTree(state);

		expect(tree.get().foo).toBe('bar');
	});
});

describe('REACTIONS', () => {
	test('should be able to register a listener using paths', () => {
		let reactionCount = 0;
		const tree = new ProxyStateTree({
			foo: 'bar'
		});
		const state = tree.get();
		const paths = tree.trackPaths(() => {
			state.foo;
		});
		tree.addMutationListener(paths, () => {
			reactionCount++;
		});
		tree.trackMutations(() => {
			state.foo = 'bar2';
		});
		expect(reactionCount).toBe(1);
	});
	test('should be able to update listener using paths', () => {
		const tree = new ProxyStateTree({
			foo: 'bar',
			bar: 'baz'
		});
		const state = tree.get();
		function render() {
			return tree.trackPaths(() => {
				if (state.foo === 'bar') {
				} else {
					state.bar;
				}
			});
		}
		const listener = tree.addMutationListener(render(), () => {
			listener.update(render());
		});
		tree.trackMutations(() => {
			state.foo = 'bar2';
		});
		expect(tree.pathDependencies.foo.length).toBe(1);
		expect(tree.pathDependencies.bar.length).toBe(1);
	});
	test('should be able to remove listener', () => {
		const tree = new ProxyStateTree({
			foo: 'bar',
			bar: 'baz'
		});
		const state = tree.get();
		function render() {
			return tree.trackPaths(() => {
				if (state.foo === 'bar') {
				} else {
					state.bar;
				}
			});
		}
		const listener = tree.addMutationListener(render(), () => {
			listener.dispose();
		});
		tree.trackMutations(() => {
			state.foo = 'bar2';
		});
		expect(tree.pathDependencies).toEqual({});
	});
});
