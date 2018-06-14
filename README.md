# proxy-state-tree
An implementation of the Mobx/Vue state tracking approach, for library authors 

## Why
There are two main approaches to change detection. [immutability]() and [setter/getter interception](). Immutability is easy to implement as a library author cause it is really in the hands of the developer using the tool. The **setter/getter** approach requires more effort. This approach is popularized by projects like [mobx](), [mobx-state-tree]() and [vuejs](). The **setter/getter** approach has two main benefits:

- You mutate your state as normal. No special immutable API or writing your changes in an immutable way
- Rerendering and recalculation is optimized out of the box as you track exactly the state that is being used

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

## hasMutated

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

tree.onMutation((mutations) => {
  const hasMutated = tree.hasMutation(paths, mutations)
})

tree.trackMutations(() => {
  state.foo = 'bar2'
  state.bar.push('baz')
})
```

Here we combine the tracked paths with the mutations performed to see if this components, computed or whatever indeed needs to run again, doing a new **trackPaths**.