# Common Browser Memory Leaks

Use this after memlab or snapshot comparison identifies growing objects.

## Event Listeners

Global or long-lived listeners keep callback captures alive. Fix by removing listeners on unmount, route change, or teardown.

## Detached DOM Nodes

Detached nodes can be leaks or intentional caches. Report the evidence first. Do not null references until the cache intent is checked.

## Global Variables

Implicit globals and `window` attachments live for the page lifetime. Fix by declaring scoped variables and avoiding global state.

## Closures

Closures can retain large outer-scope objects. Fix by narrowing captured values or clearing large references when work completes.

## Unbounded Caches

Arrays, Maps, and objects used as caches need limits, eviction, or `WeakMap`/`WeakSet` when keys are object lifecycles.
