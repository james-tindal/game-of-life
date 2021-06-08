
export default {
  entry: new URL('client', import.meta.url).pathname,
  output: { path: new URL('public', import.meta.url).pathname },
  mode: 'development',
  watch: true
}