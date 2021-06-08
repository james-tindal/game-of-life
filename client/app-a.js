import Stream from './reactive-streams.js'
import { intent, button, table, tbody, tr, td, number_input } from './dom-driver.js'

const COLS = 100
const ROWS = 108


const go_click = true, clear_click = false
const running$ = Stream.merge(
  intent.go_button.click.mapTo(go_click),
  intent.clear_button.click.mapTo(clear_click))
.scan((state, click) =>
  click === go_click    && !state ||
  click === clear_click && false 
, false)
.startWith(false)


const speed_input$ = intent.speed_input.input
  .map(e => Number(e.target.value))
  .startWith(500)

const tick_speed$ = running$
  .map(running => running ? speed_input$.take(1) : Stream.empty())
  .flatten()


// const tick_speed$ = Stream.merge(running$, speed_input$)
//   .map(([running, speed]) => running ? speed_input.take(1) : Stream.empty())

const tick$ = Stream.combine(
  running$,
  tick_speed$
)
.map(([ running, speed ]) => 
  running ? Stream.periodic(speed) : Stream.empty())
.flatten()
.mapTo()

const mousedown$ = intent.grid.mousedown
const mouseover$ = intent.grid.mouseover
const mouseup$ = intent.grid.mouseup
const mouseoutside$ = intent.document.mouseover
  .filter(({target}) => target.parentNode.parentNode !== intent.grid.node)
const dragend$ = Stream.merge(mouseup$, mouseoutside$)

// intent.grid.node needs to be a stream

const drag$ = mousedown$
.map(({target: {dataset: { live, row: row1, col: col1 }}}) => 
  mouseover$
  .takeUntil(dragend$)
  .map(({target: {dataset: { row: row2, col: col2 }}}) =>
            ({ live: !live, row: row2, col: col2 }))
  .startWith({ live: !live, row: row1, col: col1 }))
.flatten()

// drag$.log()
// mousedown$.map(({target: {dataset}}) => dataset).log()



const drawing_mode = (row_, col_) =>
  Stream.combine(
    running$,
    drag$
      .filter(({ row, col }) => [row, col] === [row_, col_])
      .map(({ live }) => live))
  .map(([running, live]) => running ? empty() : of(live))
  .flatten()

  
  // drawing_mode(1,1).log()

const live_neighbour_count = (row, col) => tick$
  .map(() =>
    Stream.merge(
      grid[row - 1]?.[col - 1],
      grid[row - 1]?.[col    ],
      grid[row - 1]?.[col + 1],
      grid[row    ]?.[col - 1],
      grid[row    ]?.[col + 1],
      grid[row + 1]?.[col - 1],
      grid[row + 1]?.[col    ],
      grid[row + 1]?.[col + 1] )
    .take(1)
    .map(neighbours => neighbours.reduce((a, b) => a + b)))
  .flatten()

  // live_neighbour_count(1,1).log()

const grid =
Array(ROWS).fill().map((_, row) =>
  Array(COLS).fill().map((_, col) => {
    const drawing_mode$ = drawing_mode(row, col)
    // drawing_mode$.log()
    const live_neighbour_count$ = live_neighbour_count(row, col)

    const running_mode = (is_live, live_neighbour_count) =>
      is_live
        ? is_2_or_3(live_neighbour_count)
        : is_3     (live_neighbour_count)

    const is_live$ = live_neighbour_count$
      .scan(running_mode, false)
      .flatMap(running_mode =>
        running$.flatMap(running =>
          running
          ? of(running_mode)
          : drawing_mode$ ))

    return is_live$
  }))

const grid_component =
table({ should_update: false, attr: { ondragstart: 'return false', ondrop: 'return false' } },
  tbody({ id: 'grid' }, grid.map((row, row_i) =>
    tr(row.map((live$, col_i) =>
      td({ subscribe: [live$, (node, live) => console.log(node, live)], data: { row: row_i, col: col_i }}))))))


// /for each arg. if it's an object, it is options. if it's an array, children, if string, text content
// Don't put events: click on the elements. Just ask for them in the stream api. Only need id.
// intent.go_button.click

// Stream.combine(running$, speed_input$).log()

export const ui$ = Stream.combine(running$, speed_input$)
// .log()
.map(([running, speed]) => [
  // 'Rows: ', number_input(         { id: 'rows_input' }),
  // ' Columns: ', number_input(     { id: 'cols_input' }),
  // button('Update',                { id: 'update_button' }),
  ' Speed: ', number_input(       { id: 'speed_input' , attr: { value: speed }}),
  button(running ? 'Stop' : 'Go', { id: 'go_button'}),
  button('Tick',                  { id: 'tick_button', attr: {...running && { disabled: '' }} }),
  button('Clear',                 { id: 'clear_button' }),
  grid_component
])
// .log()