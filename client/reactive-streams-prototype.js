

const Some = (value) => ({ match: cases => cases.Some(value) })
const None = ()      => ({ match: cases => cases.None()      })


// Perfomrmance can be improved by using prototypal inheritance instead of making so many objects.

// No to premature optimisation

// Hidden state on the inherited Proxy object?

const Listeners

const _Stream = (() => {
  function push(value) {
    this.listeners.forEach(listener => listener(value))
    this.is_memory_stream && ( this.previous = Some(value) )
  }
  let stop = () => {}
  function start() {
    stop_ = this.provider(push)
  }

  function addListener(listener) {
    this.listeners.includes(listener) || (
      this.is_memory_stream && this.previous.match({
        Some(value) { listener(value) },
        None() {}
      }),
      this.listeners.push(listener)
    )
    this.listeners.length === 1 && start()
  }
  function removeListener(listener) {
    this.listeners.remove(listener)
    this.listeners.length === 0 && (stop(), stop = () => {})
  }
  function subscribe(listener) {
    addListener(listener)
    return () => removeListener(listener)
  }


  return {
    addListener,
    removeListener,
    subscribe,
    map: callback => Stream(push_ => subscribe(value => push_(callback(value)))),
    mapTo: value => Stream(push_ => subscribe(() => push_(value))),
    take: n => Stream(push_ => {
      let i = 0
      return unsubscribe = subscribe(value => i < n ? push_(value) && i++ : unsubscribe())
    }),
    takeUntil: until => Stream(push_ => {
      const unsubscribe1 = subscribe(push_)
      const unsubscribe2 = until.subscribe(() => {unsubscribe1(); unsubscribe2()})
      return () => {unsubscribe1(); unsubscribe2()}
    }),
    filter: callback => Stream(push_ => subscribe(value => callback(value) && push_(value))),
    flatten: () => Stream(push_ =>
      subscribe(stream =>
        stream.subscribe(value =>
          push_(value)
        ))),
    startWith: value => Stream(push_ => { push_(value); return subscribe(push_) }),
    log() { addListener(console.log.bind(console)); return this },
    remember: () => Stream(push_ => subscribe(push_), {is_memory_stream: true}),
    scan: (callback, seed) => {/* to be implemented */}
  }
})()


export default Stream = (provider, {is_memory_stream = false} = {}) => {
  const listeners = Object.assign([], {
    remove(listener) { listeners.splice(listeners.indexOf(listener), 1) }})
  return Object.create(_Stream, {
    provider: { value: provider },
    is_memory_stream: { value: is_memory_stream },
    listeners: { get: () => listeners },
    ...is_memory_stream ? { previous: { value: None, writable: true }} : {}
  })
}

// const log = string => (...xs) => console.log(string, xs)

Stream.merge = (a, b) => Stream(push => {
  a.addListener(push)
  b.addListener(push)
})
Stream.of = value => Stream(push => setTimeout(() => push(value)))

Stream.periodic = period => Stream(push_ => {
  let count = 0
  let interval = setInterval(() => { push_(count); count++ }, period)
  return () => { clearInterval(interval) }
})

Stream.empty = () => Stream(() => () => {})

Stream.combine = () => Stream(() => {/* TO BE IMPLEMENTED */})

Stream.event = (element, name, {preventDefault = false} = {}) =>
  Stream(push =>
    element.addEventListener(name, event => {
      preventDefault && event.preventDefault(); push(event)
    }))