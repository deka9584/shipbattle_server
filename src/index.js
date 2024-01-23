const WebServerSocket = require("ws").Server;

const wss = new WebServerSocket({ port: 8086 });

wss.on("connection", wsClient => {
    console.log(wsClient);
});

console.log("pippo");