import WebServerSocket from "wss";
import Game from "./Game.js";

const wss = new WebServerSocket({ port: 8086 });
const game = new Game();

wss.on("connection", wsClient => {
    wsClient.on("message", event => {
        const message = JSON.parse(event);
        messageHandler(message, wsClient);
    });

    wsClient.on("close", () => {
        game.signoutPlayer(wsClient);
    });

    wsClient.on("error", error => {
        game.signoutPlayer(wsClient);
        console.error("WebSocket error:", error.message);
    });
});

const messageHandler = (message, wsClient) => {
    switch (message.type) {
        case "add-shot":
            game.addShot(wsClient, message.pos);
            break;
        case "create-room":
            game.createRoom(wsClient);
            break;
        case "enter-room":
            game.enterRoom(wsClient, message.playerName, message.roomId);
            break;
        case "place-ship":
            game.addShip(wsClient, message.pos);
            break;
        case "quit-room":
            game.signoutPlayer(wsClient);
            break;
    }
}