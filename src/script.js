
const TICK_TIME = 100
const COLS = 100
const ROWS = 108


const go_button = document.getElementById('go-button')
const clear_button = document.getElementById('clear-button')
const tick_button = document.getElementById('tick-button')
const grid = document.getElementById('grid')


// clear_button.addEventListener(grid.forEach)

const Stream = provider => {
  const listeners = []
  const push = value =>
    listeners.forEach(listener => listener(value))
  provider(push)

  function addListener(listener) { listeners.includes(listener) || listeners.push(listener) }
  function removeListener(listener) { listeners.splice(listeners.indexOf(listener), 1) }
  function subscribe(listener) { addListener(listener); return () => removeListener(listener) }
  return {
    addListener,
    removeListener,
    subscribe,
    map: callback => Stream(push_ => addListener(value => push_(callback(value)))),
    take: n => Stream(push_ => {
      let i = 0
      const unsubscribe = subscribe(value => i < n ? push_(value) && i++ : unsubscribe())
    }),
    takeUntil: until => Stream(push_ => {
      const unsubscribe1 = subscribe(push_)
      const unsubscribe2 = until.subscribe(() => {unsubscribe1(); unsubscribe2()})
    }),
    filter: callback => Stream(push_ => addListener(value => callback(value) && push_(value))),
    flatten: () => Stream(push_ =>
      addListener(value =>
        value.addListener(value_ =>
          push_(value_)
        ))),
    startWith: value => Stream(push_ => { push_(value); addListener(push_) }),
    log: () => Stream(push_ => { addListener(console.log.bind(console)); addListener(push_) })
  }
}

const log = string => (...xs) => console.log(string, xs)

const merge = (a, b) => Stream(push => {
  a.addListener(push)
  b.addListener(push)
})
const of = value => Stream(push => setTimeout(() => push(value)))



const event = (element, name, {preventDefault} = {preventDefault: undefined}) =>
  Stream(push =>
    element.addEventListener(name, event => {
      preventDefault && event.preventDefault; push(event)
    }))



const mousedown$ = event(grid, 'mousedown', {preventDefault: true})
const mouseover$ = event(grid, 'mouseover')
const mouseup$   = event(grid, 'mouseup')
const mouseoutside$ = event(document, 'mouseover')
  .filter(({target}) => target.parentNode.parentNode !== grid)

const dragend$ = merge(mouseup$, mouseoutside$)
  

const drag$ = mousedown$
.map(({target: target1}) =>
  merge
  ( of({ target: target1, live: ! target1.attributes.live })
  , mouseover$
    .takeUntil(dragend$)
    .map(({ target: target2 }) => ({ target: target2, live: target1.attributes.live }))))
.flatten()
// on mousedown, take mouseover, until dragend
// drag$ is a stream of element and liveness


const write_cell = (cell, live) =>
  live
  ? cell.setAttribute('live', '')
  : cell.removeAttribute('live')

drag$.addListener(({ target, live }) => write_cell(target, live))

// state of grid.
// const grid$ = 

// subscribe to grid$ and update ui grid

function* range(n) {
  for (let i = 0; i < n; i++)
    yield i
}

function* iterate_grid() {
  for (const row of range(ROWS))
    for (const col of range(COLS))
      yield {row, col}
}

function build_matrix(callback) {
  const matrix = Array(ROWS).fill().map(() => Array(COLS))

  for (const {row, col} of iterate_grid())
    matrix[row][col] = callback(row, col)

  return matrix
}

const read_cell = (row, col) => !!grid.children[row].children[col].attributes.live
const read_grid = () => build_matrix(read_cell)

const write_grid = matrix => {
  for (const {row, col} of iterate_grid())
    write_cell(
      grid.children[row].children[col],
      matrix[row][col])
}

const is_2_or_3 = n => n === 2 || n === 3
const is_3      = n => n === 3

const tick = matrix => {
  const process_cell = (row, col) => ({
    is_live: matrix[row][col],
    live_neighbour_count:
      !! matrix[row - 1]?.[col - 1] +
      !! matrix[row - 1]?.[col    ] +
      !! matrix[row - 1]?.[col + 1] +
      !! matrix[row    ]?.[col - 1] +
      !! matrix[row    ]?.[col + 1] +
      !! matrix[row + 1]?.[col - 1] +
      !! matrix[row + 1]?.[col    ] +
      !! matrix[row + 1]?.[col + 1]
  })

  const will_be_live = ({is_live, live_neighbour_count}) =>
    is_live
    ? is_2_or_3(live_neighbour_count)
    : is_3     (live_neighbour_count)

  return build_matrix((row, col) => will_be_live(process_cell(row, col)))
}

function run_game() {
  let matrix = tick(read_grid())
  write_grid(matrix)
  return setInterval(() => {
    matrix = tick(matrix)
    write_grid(matrix)
  }, TICK_TIME)
}

let interval
go_button.addEventListener('click', ({target}) => {
  if(target.attributes.going) {
    clearInterval(interval)
    tick_button.disabled = false
  } else {
    interval = run_game()
    tick_button.disabled = true
  }
  target.toggleAttribute('going')
})

tick_button.addEventListener('click', ({target}) => {
  interval = run_game()
  clearInterval(interval)
})

// clear_button.addEventListener('click', ({target}) => {





    // Redesign with streams holding the state.
    // How to get grid intent on the stream?
      // Get every grid click. Update ui and state on click.
