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

test(`combine`, () => {
  let push_s
  let push_t
  const s = Stream(push => { push_s = push })
  const t = Stream(push => { push_t = push })

  const c = Stream.combine(s, t)

  let result = { s: [], t: [], c: [] }
  s.subscribe(value => result.s.push(value))
  t.subscribe(value => result.t.push(value))
  c.subscribe(value => result.c.push(value))

  push_s(1)
  push_t(2)
  push_s(3)
  push_t(4)

  expect(result.s).toEqual([1,3])
  expect(result.t).toEqual([2,4])
  expect(result.c).toEqual([ [1,2], [3,2], [3,4] ])

})

test(`merge()`, () => {
  let push_s
  let push_t
  let push_u
  const s = Stream(push => { push_s = push })
  const t = Stream(push => { push_t = push })
  const u = Stream(push => { push_u = push })

  const m = Stream.merge(s, t, u)

  let result = { s: [], t: [], u: [], m: [] }
  s.subscribe(value => result.s.push(value))
  t.subscribe(value => result.t.push(value))
  u.subscribe(value => result.u.push(value))
  m.subscribe(value => result.m.push(value))

  push_s(1)
  push_t(2)
  push_u(3)
  push_s(4)
  push_t(5)
  push_u(6)

  expect(result.s).toEqual([1,4])
  expect(result.t).toEqual([2,5])
  expect(result.u).toEqual([3,6])
  expect(result.m).toEqual([1,2,3,4,5,6])
})

test(`log()`, () => {
  let push
  const s = Stream(push_ => { push = push_ })
  const t = s.map(x => x * 5)

  let result = { s: [], t: [] }
  s.subscribe(value => result.s.push(value))
  s.log()
  t.log().subscribe(value => result.t.push(value))

  push(1)
  push(2)
  push(3)

  expect(result.s).toEqual([1,2,3])
  expect(result.t).toEqual([5,10,15])
})

test(`combine().log().map()`, () => {
  let push_s
  let push_t
  const s = Stream(push => { push_s = push })
  const t = Stream(push => { push_t = push })

  const clm = Stream.combine(s, t).log().map(([s, t]) => s * t + s + t)
  t.subscribe()
  s.subscribe()
  clm.subscribe()

  let result = { s: [], t: [], clm: [] }
  s.subscribe(value => result.s.push(value))
  t.subscribe(value => result.t.push(value))
  clm.subscribe(value => result.clm.push(value))

  push_s(1)
  push_t(2)
  push_s(3)
  push_t(4)

  expect(result.s).toEqual([1,3])
  expect(result.t).toEqual([2,4])
  expect(result.clm).toEqual([5,11,19])
})

test(`take()`, () => {
  let push
  const s = Stream(push_ => { push = push_ })

  let result = { s: [], t: [] }
  s.subscribe(value => result.s.push(value))
  s.take(1).subscribe(value => result.t.push(value))


  push(1)
  push(2)
  push(3)
  push(4)

  expect(result.s).toEqual([1,2,3,4])
  expect(result.t).toEqual([1])
})

test(`.combine().take()`, () => {
  let push_s
  let push_t
  const s = Stream(push => { push_s = push })
  const t = Stream(push => { push_t = push })

  const c = Stream.combine(s, t)

  let result = { s: [], t: [], c: [], ct: [] }
  s.subscribe(value => result.s.push(value))
  t.subscribe(value => result.t.push(value))
  c.subscribe(value => result.c.push(value))
  c.take(1)
   .subscribe(value => result.ct.push(value))

  push_s(1)
  push_t(2)
  push_s(3)
  push_t(4)

  expect(result.s).toEqual([1,3])
  expect(result.t).toEqual([2,4])
  expect(result.c).toEqual([ [1,2], [3,2], [3,4] ])
  expect(result.ct).toEqual([ [1,2] ])
})

test(`.startWith().combine()`, () => {
  let push_s
  let push_t
  const s = Stream(push => { push_s = push })
  const t = Stream(push => { push_t = push })

  const c1 = Stream.combine(
    s, t.startWith('start'))
  const c2 = Stream.combine(
    s.startWith('start'), t)

  let result = { s: [], t: [], c1: [], c2: [] }
  s.subscribe(value => result.s.push(value))
  t.subscribe(value => result.t.push(value))
  c1.subscribe(value => result.c1.push(value))
  c2.subscribe(value => result.c2.push(value))

  push_s(1)
  push_t(2)
  push_s(3)
  push_t(4)

  expect(result.s).toEqual([1,3])
  expect(result.t).toEqual([2,4])
  expect(result.c1).toEqual([ [1, 'start'], [1,2], [3,2], [3,4] ])
  expect(result.c2).toEqual([ [1,2], [3,2], [3,4] ])
})

test(`.startWith().combine().take()`, () => {
  let push_s
  let push_t
  const s = Stream(push => { push_s = push })
  const t = Stream(push => { push_t = push })

  const c = Stream.combine(
    s, t.startWith('start'))
  const ct = c.take(1)

  let result = { s: [], t: [], c: [], ct: [] }
  s.subscribe(value => result.s.push(value))
  t.subscribe(value => result.t.push(value))
  c.subscribe(value => result.c.push(value))
  ct.subscribe(value => result.ct.push(value))

  push_s(1)
  push_t(2)
  push_s(3)
  push_t(4)

  expect(result.s).toEqual([1,3])
  expect(result.t).toEqual([2,4])
  expect(result.c).toEqual([ [1,'start'], [1,2], [3,2], [3,4] ])
  expect(result.ct).toEqual([ [1,'start'] ])
})
