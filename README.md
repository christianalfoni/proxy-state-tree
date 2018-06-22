# proxy-state-tree
An implementation of the Mobx/Vue state tracking approach, for library authors 

**THIS IS A WORK IN PROGRESS**

`npm install proxy-state-tree@alpha`

## Why
The **proxy-state-tree** project is created to stimulate innovation in state management. The introduction of [Flux](https://facebook.github.io/flux/) was followed by a big wave of libraries trying to improve on the idea. All these iterations helped moving the community forward and [Redux](https://redux.js.org/) was born a year later. It was frustrating to have all these variations of the same idea, but at the same time it made the core idea better. One factor I believe made this possible is that Flux state management is based on **immutability**. It is a difficult concept to understand, but when you understand it, it is easy to implement the concept of **change**. You literally just check if a value you depend on has changed. That said, immutability tends to put a lof effort on the hands of the consumer. You have to think really hard about how you structure state and expose state to components to avoid performance issues and prevent boilerplate.

[vuejs](https://vuejs.org/) and [mobx](https://github.com/mobxjs/mobx) has a different approach to **change**. They use **getter/setter interception** to track access to state and changes to state. This concept completely removes the consumers burden of how the state is structured and how it is exposed to the different parts of the app. You just expose state in any form and the usage is automatically tracked and optimized. The problem with this approach though is that it is difficult to implement as a library author. **I want to change that!**

**proxy-state-tree** is a low level implementation of the **getter/setter interception** with a **single state tree** to help library authors innovate. I hope to see innovations that removes the burden that immutability currently causes, but keeps the guarantees that was introduced in **Flux**. I invite you to make a mobx and redux baby! ;-)

## Example

You can look at an example of how you could build a state-tree implementation for [vuejs](https://vuejs.org/) on this [codesandbox](https://codesandbox.io/s/5vy5jxrpop). It is a simple implementation that allows you to define a state tree and expose actions to the components. There are many ways to do this, so this is just one example of how proxy-state-tree integrates with existing solutions. You might also imagine additional features here for computing state in the tree, creating reactions in the components etc.

## Create a tree

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({})

console.log(tree.newTracker().get()) // {}
```

As a library author you would typically expose a mechanism to define the initial state of the application, which you would pass to the **ProxyStateTree**. You would also expose a way to access the state, hiding the `tree.newTracker().get()` from the consumer of your library.

## Track access

You can track access to the state by creating a new tracker using `tree.newTracker()` and by invoking **startPathsTracking** and **stopPathsTracking** methods.

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({
  foo: 'bar',
  bar: 'baz'
})
const tracker = tree.newTracker();
const state = tracker.get()

tracker.startPathsTracking()
const foo = state.foo
const bar = state.bar
const paths = tracker.stopPathsTracking()

console.log(paths) // ['foo', 'bar']
```

You would typically use this mechanism to track usage of state. For example rendering a component, calculating a a computed value etc. The returned paths array is stored for later usage. The paths structure is used internally by proxy-state-tree, but you can also consume it as a library author to for example showing components and what paths they depend on in a devtool.

## Track mutations

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree(
  {
    foo: 'bar',
    bar: []
  },
  true // DevMode, track all mutations
)

const tracker = tree.newTracker()
const state = tracker.get()

tracker.startMutationTracking()
state.foo = 'bar2'
state.bar.push('baz')
const mutations = tracker.stopMutationTracking()

console.log(mutations)
/*
  [{
    method: 'set',
    path: 'foo',
    args: ['bar2']  
  }, {
    method: 'push',
    path: 'bar',
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

const tracker = tree.newTracker()
const state = tracker.get()

function render () {
  tracker.startPathsTracking()
  const foo = state.foo
  const bar = state.bar
  tracker.stopPathsTracking()
}

render();

const listener = tree.addMutationListener(() => {
  // Remove listener
  listener.dispose()
})

tracker.startMutationTracking()
state.foo = 'bar2'
state.bar.push('baz')
tracker.stopMutationTracking()
```

Here we combine the tracked paths with the mutations performed to see if this components, computed or whatever indeed needs to run again, doing a new **startPathsTracking** and **stopPathsTracking**.

## Dynamic state values

If you insert a function into the state tree it will be called when accessed. The function is passed the **proxy-state-tree** instance and the path of where the function lives in the tree.

```js
import ProxyStateTree from 'proxy-state-tree'

const tree = new ProxyStateTree({
  foo: (proxyTracker, path) => {}
})
```

The allows you to easily extend functionality with for example a computed concept that lives in the tree, as you can see in this [codesandbox](https://codesandbox.io/s/xnv45zmkz).