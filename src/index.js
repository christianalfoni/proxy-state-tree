import proxify from './proxify';

class ProxyStateTree {
	constructor(state) {
		this.state = state;
		this.pathDependencies = {};
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
		for (let mutation in this.mutations) {
			const path = this.mutations[mutation].path.join('.');
			if (this.pathDependencies[path]) {
				for (let pathCallback in this.pathDependencies[path]) {
					this.pathDependencies[path][pathCallback]();
				}
			}
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
	addMutationListener(initialPaths, cb) {
		const pathDependencies = this.pathDependencies;
		let currentStringPaths = initialPaths.map((path) => path.join('.'));

		for (let index in currentStringPaths) {
			const currentStringPath = currentStringPaths[index];
			pathDependencies[currentStringPath] = pathDependencies[currentStringPath]
				? pathDependencies[currentStringPath].concat(cb)
				: [ cb ];
		}

		return {
			update(newPaths) {
				const newStringPaths = newPaths.map((path) => path.join('.'));

				for (let index in currentStringPaths) {
					const currentStringPath = currentStringPaths[index];

					if (newStringPaths.indexOf(currentStringPath) === -1) {
						pathDependencies[currentStringPath].splice(pathDependencies[currentStringPath].indexOf(cb), 1);
					}
				}

				for (let index in newStringPaths) {
					const newStringPath = newStringPaths[index];

					if (currentStringPaths.indexOf(newStringPath) === -1) {
						pathDependencies[newStringPath] = pathDependencies[newStringPath]
							? pathDependencies[newStringPath].concat(cb)
							: [ cb ];
					}
				}

				currentStringPaths = newStringPaths;
			},
			dispose() {
				for (let index in currentStringPaths) {
					const currentStringPath = currentStringPaths[index];

					pathDependencies[currentStringPath].splice(pathDependencies[currentStringPath].indexOf(cb), 1);

					if (!pathDependencies[currentStringPath].length) {
						delete pathDependencies[currentStringPath];
					}
				}
			}
		};
	}
}

export default ProxyStateTree;
