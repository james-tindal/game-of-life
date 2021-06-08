
const Some = (value) => ({ match: cases => cases.Some(value) })
const None =            ({ match: cases => cases.None()      })

const noop = () => {}

// Performance can be improved by using prototypal inheritance instead of making so many objects.

const Stream = (provider, {is_memory_stream = false} = {}) => {
  let previous = None
  const listeners = []
  const push = value => {
    listeners.forEach(listener => listener && listener(value))
    is_memory_stream && ( previous = Some(value) )
  }
  let stop = noop
  const start = () => { stop = provider(push) }

  function addListener(listener = noop) {
    listeners.includes(listener) || (
      is_memory_stream && previous.match({
        Some(value) { listener(value) },
        None() {}
      }),
      listeners.push(listener)
    )
    listeners.length === 1 && start()
  }
  function removeListener(listener = noop) {
    listeners.splice(listeners.indexOf(listener), 1)
    listeners.length === 0 && (stop && stop(), stop = noop)
  }
  function subscribe(listener = noop) {
    addListener(listener)
    return () => removeListener(listener)
  }

  const next_loop = fn => setTimeout(fn, 0)

  const self = {
    listeners,
    addListener,
    removeListener,
    subscribe,
    map: callback => Stream(push_ => subscribe(value => push_(callback(value)))),
    mapTo: value => Stream(push_ => subscribe(() => push_(value))),
    take: n => Stream(push_ => {
      let i = 0
      const unsubscribe = subscribe(value => i < n ? (push_(value), i++) : next_loop(unsubscribe))
      return unsubscribe
    }),
    takeUntil: until => Stream(push_ => {
      const unsubscribe1 = subscribe(push_)
      const unsubscribe2 = until.subscribe(() => {unsubscribe1(); unsubscribe2()})
      return () => {unsubscribe1(); unsubscribe2()}
    }),
    drop: n => Stream(push_ => {
      let i = 0
      return subscribe(value => i >= n ? (push_(value), i++) : i++)
    }),
    filter: callback => Stream(push_ => subscribe(value => callback(value) && push_(value))),
    flatten: () => Stream(push_ =>
      subscribe(stream =>
        stream.subscribe(value =>
          push_(value)
        ))),
    flatMap: callback => self.map(callback).flatten(),
    // Doesn't have to be memorised. Could just push on next loop.
    startWith: value => Stream(push_ => { push_(value); return subscribe(push_) }, {is_memory_stream: true}),
    debug: label_or_spy => Stream(push_ => subscribe(value => {
      typeof label_or_spy === 'function' ? label_or_spy(value) :
      typeof label_or_spy === 'string'   ? console.log(label_or_spy, value)
                                         : console.log(value)
      push_(value) })),
    remember: () => Stream(subscribe, {is_memory_stream: true}),
    scan: (callback, seed) => {
      let acc = seed
      return Stream(push_ => subscribe(value => {
        acc = callback(acc, value)
        push_(acc)
      }))
    },
    imitate: target => target.addListener(push)
  }
  return self
}
export default Stream


Stream.merge = (...streams) =>
  Stream(push => {
    const subscriptions = 
    streams.map(stream =>
      stream && stream.subscribe(push))
    return () => subscriptions.forEach(unsubscribe => unsubscribe && unsubscribe())
  })

Stream.of = value => Stream(push => setTimeout(() => push(value)))

Stream.periodic = period => Stream(push_ => {
  let count = 0
  let interval = setInterval(() => { push_(count); count++ }, period)
  return () => { clearInterval(interval) }
})

Stream.empty = () => Stream(() => () => {})

const _combine_obj = streams => Stream(push => {
  const latest = streams.map(x => undefined)
  const have_pushed = streams.map(x => false)
  let should_push = false
  // Don't push until all streams push

  const listener = key => value => {
    latest[key] = value
    if(should_push)
      push([...latest])
    else {
      have_pushed[key] = true
      if (have_pushed.every(has_pushed => has_pushed)) {
        should_push = true
        push([...latest])
      }
    }
  }

  const subscriptions = {}

  for (key of Object.keys(streams))
    subscriptions[key] = streams[key].addListener(listener(key))

  return () => Object.values(subscriptions)
    .forEach(unsubscribe => unsubscribe())
})

const _combine_varargs = streams => Stream(push => {
  const latest = []
  const have_pushed = streams.map(_ => false)
  let should_push = false
  // Don't push until all streams push

  const listener = index => value => {
    latest[index] = value
    if(should_push)
      push([...latest])
    else {
      have_pushed[index] = true
      if (have_pushed.every(has_pushed => has_pushed)) {
        should_push = true
        push([...latest])
      }
    }
  }

  const subscriptions = []

  for (let index = 0; index < streams.length; index ++)
    subscriptions[index] = streams[index]?.subscribe(listener(index))
  
  return () => subscriptions.forEach(unsubscribe => unsubscribe && unsubscribe())
})

Stream.combine = (...args) =>
  args.length === 1
  ? _combine_obj(args[0])
  : _combine_varargs(args)

Stream.event = (element, name, {preventDefault = false} = {}) =>
  Stream(push =>
    element.addEventListener(name, event => {
      preventDefault && event.preventDefault()
      push(event)
    }))
