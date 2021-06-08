import Stream from './reactive-streams.js'

test(`take() doesn't affect parent stream`, () => {
  let push
  const s = Stream(push_ => { push = push_ })
  const t = s.take(1)

  let result = { s: [], t: [] }
  s.subscribe(value => result.s.push(value))
  t.subscribe(value => result.t.push(value))

  push(1)
  push(2)
  push(3)

  expect(result.s).toEqual([1,2,3])
  expect(result.t).toEqual([1])
})

test(`2 subscriptions push same values`, () => {
  let push
  const s = Stream(push_ => { push = push_ })

  let result = { s: [], t: [] }
  s.subscribe(value => result.s.push(value))
  s.subscribe(value => result.t.push(value))

  push(1)
  push(2)
  push(3)

  expect(result.s).toEqual([1,2,3])
  expect(result.t).toEqual([1,2,3])
})

test(`startWith()`, () => {
  let push
  const s = Stream(push_ => { push = push_ })
  const t = s.startWith(0)

  let result = { s: [], t: [] }
  s.subscribe(value => result.s.push(value))
  t.subscribe(value => result.t.push(value))

  s.subscribe()
  t.subscribe()

  push(1)
  push(2)
  push(3)

  expect(result.s).toEqual([1,2,3])
  expect(result.t).toEqual([0,1,2,3])
})

test(`scan().startWith()`, () => {
  let push
  const s = Stream(push_ => { push = push_ })
  const t = s.scan((a, b) => a + b, 0).startWith(-1)

  let result = { s: [], t: [] }
  s.subscribe(value => result.s.push(value))
  t.subscribe(value => result.t.push(value))

  s.subscribe()
  t.subscribe()

  push(1)
  push(2)
  push(3)

  expect(result.s).toEqual([1,2,3])
  expect(result.t).toEqual([-1,1,3,6])
})

// Is it imitate() that's breaking stuff?

test(`imitate()`, () => {
  let push
  const i = Stream(push_ => { push = push_ })

  const e = Stream.empty()
  e.imitate(i)

  const f = e.scan((a, b) => a + b, 0).startWith(99)

  let result = { i: [], e: [], f: [] }
  i.subscribe(value => result.i.push(value))
  e.subscribe(value => result.e.push(value))
  f.subscribe(value => result.f.push(value))

  push(1)
  push(2)
  push(3)

  expect(result.i).toEqual([1,2,3])
  expect(result.e).toEqual([1,2,3])
  expect(result.f).toEqual([99,1,3,6])
})