# proxy-state-tree
An implementation of the Mobx/Vue state tracking approach, for library authors 

**THIS IS A WORK IN PROGRESS**

## Why
There are two main approaches to change detection. **immutability** and **setter/getter interception**. Immutability is easy to implement as a library author cause it is really all about comparing values. It is less work for you as a library author, but more work for the developers using the tool. The **setter/getter** approach, popularized by projects like [mobx](), [mobx-state-tree]() and [vuejs](), was traditionally more work for you as a library author, but far less work for the developers consuming your tool. The **setter/getter** approach also has two other prominent benefits:

- You mutate your state as normal. No special immutable API or writing your changes in an immutable way
- Rerendering and recalculation is optimized out of the box as you track exactly the state that is being used

**proxy-state-tree** allows you to expose a single state tree to your library and track its usage and changes.

## Create a tree

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({})

console.log(tree.get()) // {}
```

As a library author you would typically expose a mechanism to define the initial state of the application, which you would pass to the **ProxyStateTree**. You would also expose a way to access the state, hiding the `tree.get()` from the consumer of your library.

## Track access

You can track access to the state by using the **trackPaths** method.

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({
  foo: 'bar',
  bar: 'baz'
})
const state = tree.get()

const paths = tree.trackPaths(() => {
  const foo = state.foo
  const bar = state.bar
})

console.log(paths) // [['foo'], ['bar']]
```

You would typically use this mechanism to track usage of state. For example rendering a component, calculating a a computed value etc. The returned paths array is stored for later usage.

## Track mutations

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({
  foo: 'bar',
  bar: []
})
const state = tree.get()

const mutations = tree.trackMutations(() => {
  state.foo = 'bar2'
  state.bar.push('baz')
})

console.log(mutations)
/*
  [{
    method: 'set',
    path: ['foo'],
    args: ['bar2']  
  }, {
    method: 'push',
    path: ['bar'],
    args: ['baz']
  }]
*/
```

You would use **trackMutations** around logic that is allowed to do mutations, for example actions or similar.

## React to mutations

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({
  foo: 'bar',
  bar: []
})

tree.onMutation((mutations) => {
  mutations
  /*
    [{
      method: 'set',
      path: ['foo'],
      args: ['bar2']  
    }, {
      method: 'push',
      path: ['bar'],
      args: ['baz']
    }]
  */
})

const state = tree.get()

const mutations = tree.trackMutations(() => {
  state.foo = 'bar2'
  state.bar.push('baz')
})
```

You would typically expose onMutation to parts of your application that has tracked some state. For example a component, a computed etc. This allows parts of the system to react to mutations.

## Check need to update

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({
  foo: 'bar',
  bar: 'baz'
})
const state = tree.get()

function render () {
  return tree.trackPaths(() => {
    const foo = state.foo
    const bar = state.bar
  })
}

const listener = tree.addMutationListener(render(), (mutations) => {
  // Runs when mutations matches paths passed in

  // Update listener with new paths. Typically you track
  // a new set of paths on mutation change, to pick up changes
  // to the paths. If statements etc. causes this
  listener.update(render()) 

  // Remove listener
  listener.dispose()
})

tree.trackMutations(() => {
  state.foo = 'bar2'
  state.bar.push('baz')
})
```

Here we combine the tracked paths with the mutations performed to see if this components, computed or whatever indeed needs to run again, doing a new **trackPaths**.

## Dynamic state values

If you insert a function into the state tree it will be called when accessed. The function is passed the **proxy-state-tree** instance and the path of where the function lives in the tree. The allows you to easily extend functionality with for example a computed concept:

```js
import ProxyStateTree from 'proxy-state-tree'

class Computed {
  constructor(cb) {
    this.isDirty = true;
    this.discardOnMutation = null;
    this.value = null;
    this.paths = null;
    this.cb = cb;
    return this.evaluate.bind(this);
  }
  evaluate(proxyStateTree, path) {
    if (!this.discardOnMutation) {
      this.discardOnMutation = proxyStateTree.onMutation(mutations => {
        if (!this.isDirty) {
          this.isDirty = proxyStateTree.hasMutated(this.paths, mutations);
        }
      });
    }
    if (this.isDirty) {
      this.paths = proxyStateTree.trackPaths(() => {
        this.value = this.cb(proxyStateTree.get());
        this.isDirty = false;
      });
    }
    return this.value;
  }
}

const tree = new ProxyStateTree({
  foo: 'bar',
  upperFoo: new Computed(state => state.foo.toUpperCase()),
})

tree.get().upperFoo // 'BAR'
```

And this computed only recalculates if "foo" changes.