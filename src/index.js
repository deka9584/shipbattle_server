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
});

const messageHandler = (message, wsClient) => {
    switch (message.type) {
        case "add-shot":
            game.addShot(wsClient, message.roomId, message.pos);
            break;
        case "create-room":
            game.createRoom(wsClient);
            break;
        case "enter-room":
            game.enterRoom(wsClient, message.playerName, message.roomId);
            break;
        case "place-ship":
            game.placeShip(wsClient, message.roomId, message.pos);
            break;
        case "quit-room":
            game.signoutPlayer(wsClient);
            break;
    }
}