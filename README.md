# proxy-state-tree
An implementation of the Mobx/Vue state tracking approach, for library authors 

**THIS IS A WORK IN PROGRESS**

`npm install proxy-state-tree@alpha`

## Why
There are two main approaches to change detection. **immutability** and **setter/getter interception**. Immutability is easy to implement as a library author cause it is really all about comparing values. It is less work for you as a library author, but more work for the developers using the tool. The **setter/getter** approach, popularized by projects like [vuejs](https://vuejs.org/), [mobx](https://github.com/mobxjs/mobx), [mobx-state-tree](https://github.com/mobxjs/mobx-state-tree) and , was traditionally more work for you as a library author, but far less work for the developers consuming your tool. The **setter/getter** approach also has two other prominent benefits:

- You mutate your state as normal. No special immutable API or writing your changes in an immutable way
- Rerendering and recalculation is optimized out of the box as you track exactly the state that is being used

**proxy-state-tree** allows you to expose a single state tree to your library and track its usage and changes.

## Example

You can look at an example of how you could build a state-tree implementation for [vuejs](https://vuejs.org/) on this [codesandbox](https://codesandbox.io/s/5vy5jxrpop). It is a simple implementation that allows you to define a state tree and expose actions to the components. There are many ways to do this, so this is just one example of how proxy-state-tree integrates with existing solutions. You might also imagine additional features here for computing state in the tree, creating reactions in the components etc.

## Create a tree

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({})

console.log(tree.get()) // {}
```

As a library author you would typically expose a mechanism to define the initial state of the application, which you would pass to the **ProxyStateTree**. You would also expose a way to access the state, hiding the `tree.get()` from the consumer of your library.

## Track access

You can track access to the state by using the **startPathsTracking** and **stopPathsTracking** methods.

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({
  foo: 'bar',
  bar: 'baz'
})
const state = tree.get()

tree.startPathsTracking()
const foo = state.foo
const bar = state.bar
const paths = tree.stopPathsTracking()

console.log(paths) // [['foo'], ['bar']]
```

You would typically use this mechanism to track usage of state. For example rendering a component, calculating a a computed value etc. The returned paths array is stored for later usage. The paths structure is used internally by proxy-state-tree, but you can also consume it as a library author to for example showing components and what paths they depend on in a devtool.

## Track mutations

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({
  foo: 'bar',
  bar: []
})
const state = tree.get()

tree.startMutationTracking()
state.foo = 'bar2'
state.bar.push('baz')
const mutations = tree.stopMutationTracking()

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

You would use **startMutationTracking** and **stopMutationTracking** around logic that is allowed to do mutations, for example actions or similar. Internally **proxy-state-tree** will notify all mutation listeners about updated state, but you can also use this structure in combination with a devtool. Show a list of mutations that occurs in your app, and what action performed the mutation even.

## Check need to update

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({
  foo: 'bar',
  bar: 'baz'
})
const state = tree.get()

function render () {
  tree.startPathsTracking()
  const foo = state.foo
  const bar = state.bar

  return tree.stopPathsTracking()
}

const listener = tree.addMutationListener(render(), () => {
  // Runs when mutations matches paths passed in

  // Whenever mutations affecting these paths occurs
  // we typically create the paths again due to possible
  // conditional logic, in "render" in this example
  listener.update(render()) 

  // Remove listener
  listener.dispose()
})

tree.startMutationTracking()
state.foo = 'bar2'
state.bar.push('baz')
tree.stopMutationTracking()
```

Here we combine the tracked paths with the mutations performed to see if this components, computed or whatever indeed needs to run again, doing a new **startPathsTracking** and **stopPathsTracking**.

## Dynamic state values

If you insert a function into the state tree it will be called when accessed. The function is passed the **proxy-state-tree** instance and the path of where the function lives in the tree.

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({
  foo: (proxyStateTree, path) => {}
})
```

The allows you to easily extend functionality with for example a computed concept that lives in the tree, as you can see in this [codesandbox](https://codesandbox.io/s/xnv45zmkz).