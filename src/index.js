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

function messageHandler (message, wsClient) {
    try {
        if (message.source === "bot" && message.type === "create-room") {
            game.newRoomFromBot(wsClient, message.chatId);         
            return;   
        }
    
        switch (message.type) {
            case "add-shot":
                game.addShot(wsClient, message.pos);
                break;
            case "create-room":
                game.newRoomFromBrowser(wsClient);
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
    catch (error) {
        console.warn("Unable to handle message:", message);
        console.error("Error:", error);
    }
}