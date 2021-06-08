import server from 'server'
const { get, post } = server.router;
const { render, json } = server.reply;

server({ port: 3000 })
console.log("Running at http://localhost:3000")