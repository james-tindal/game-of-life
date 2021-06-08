import Stream from './reactive-streams.js'

const h = type => args => ({ ...args, type })

const is_element = x => !! x.type
const h_ = type => (...args_) => {
  let args = {}
  for (const arg of args_)
    typeof arg === 'string' ? (args.children = [arg]) :
    is_element(arg)         ? (args.children = [arg]) :
    Array.isArray(arg)      ? (args.children = arg)   :
    typeof arg === 'object' ? (args = {...arg, ...args})
                            : undefined

  return h(type)(args)
}

export const { button, table, tbody, tr, td, input } =
[ 'button', 'table', 'tbody', 'tr', 'td', 'input' ]
.reduce((acc, type) => ({ ...acc, [type]: h_(type) }), {})

export const number_input = args =>
  input({ ...args, attr: { ...args.attr, type: 'number' }})

const proxy = handler => new Proxy(() => {}, handler)
proxy.get = get => new Proxy(() => {}, {get})

const intent_streams = { document: {}, window: {} }
export const intent =
proxy.get((_, id) =>
  proxy.get((_, event_name) => {
    if (intent_streams[id]?.[event_name]) return intent_streams[id][event_name]
    const stream = Stream.empty()
    if (id === 'document')
      intent_streams.document[event_name] = Stream.event(window.document, event_name)
    else if (id === 'window')
      intent_streams.window[event_name] = Stream.event(window, event_name)
    else
      intent_streams[id] === undefined
      ? intent_streams[id] = { [event_name]: stream }
      : intent_streams[id][event_name] = stream
    return stream
  }))

//  --  virtual dom  --  //

const set_attr = ($target, name, value) =>
  $target.setAttribute(name, value)

const set_attrs = ($target, attrs) =>
  Object.keys(attrs).forEach(name =>
    set_attr($target, name, attrs[name]))

const set_data_attr = ($target, name, value) =>
  $target.dataset[name] = value

const set_data_attrs = ($target, attrs) =>
  Object.keys(attrs).forEach(name =>
    set_data_attr($target, name, attrs[name]))

const set_id = ($target, id) => {
  $target.setAttribute('id', id)
  intent_streams.hasOwnProperty(id) &&
    Object.entries(intent_streams[id])
    .forEach(([event_name, intent_stream]) =>
      intent_stream.imitate(Stream.event($target, event_name)))
}



const set_props = ($target, vnode) => {
  vnode.attr && set_attrs($target, vnode.attr)
  vnode.data && set_data_attrs($target, vnode.data)
  vnode.id   && set_id($target, vnode.id)
}

function create_element(vnode) {
  if (typeof vnode === 'string')
    return document.createTextNode(vnode)
  const $el = document.createElement(vnode.type)
  set_props($el, vnode)
  vnode.children && vnode.children
    .map(create_element)
    .forEach($el.appendChild.bind($el))
  return $el
}

function remove_attr($target, name) {
  $target.removeAttribute(name)
}

function remove_data_attr($target, name) {
  delete $target.dataset[name]
}

function update_attr($target, name, new_val, old_val) {
  old_val && !new_val             ? remove_attr($target, name) :
  !old_val || new_val !== old_val ? set_attr($target, name, new_val)
                                  : undefined
}

function update_data_attr($target, name, new_val, old_val) {
  old_val && !new_val             ? remove_data_attr($target, name) :
  !old_val || new_val !== old_val ? set_data_attr($target, name, new_val)
                                  : undefined
}

const merge_keys = (a = {}, b = {}) => Object.keys({...a, ...b})

// Only run to compare elements. Not strings.
function update_props($target, a, b) {
  for(key of merge_keys(a.attr, b.attr))
    update_attr($target, key, a.attr[key], b.attr[key])

  for(key of merge_keys(a.data, b.data))
    update_data_attr($target, key, a.data[key], b.data[key])
}

function _update_element($target, new_node, old_node) {
  if( old_node && new_node.should_update === false ) return
  update_props($target, new_node, old_node)
  update_children($target, new_node, old_node)
}

const changed = (node1, node2) =>
  typeof node1 !== typeof node2 ||
  typeof node1 === 'string' && node1 !== node2 ||
  node1.type !== node2.type

const update_element = ($parent, new_node, old_node, index = 0) =>
  ! old_node                  ? $parent.appendChild(create_element(new_node)) :
  ! new_node                  ? $parent.removeChild($parent.childNodes[index]) :
  changed(new_node, old_node) ? $parent.replaceChild(create_element(new_node), $parent.childNodes[index]) :
  new_node.type               ? _update_element($parent.childNodes[index], new_node, old_node)
                              : undefined

export
function update_children($target, new_node, old_node) {
  const newLength = new_node.children.length
  const oldLength = old_node.children.length
  for (let i = 0; i < newLength || i < oldLength; i++)
    update_element($target, new_node.children[i], old_node.children[i], i)
}

const first_render = ($root, arr) =>
  arr.forEach(vnode => $root.append(create_element(vnode)))

export const render = ($root, ui$) => {
  ui$.take(1).map(first => first_render($root, first)).subscribe()
  // ui$.drop(1)
  // .scan((previous, next) => {
  //   console.log('scan')
  //   update_children
  //   ( root.parentElement
  //   , { children: Array.isArray(next) ? next : [next] }
  //   , previous)
  //   return next
  // })
  // .subscribe()
}
