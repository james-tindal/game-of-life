import { render } from './dom-driver.js'
import { ui$ } from './app.js'

render(document.getElementById('app'), ui$)