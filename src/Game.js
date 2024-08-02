import Room from "./Room.js";

class Game {
    #roomMap = new Map();
    #tempChatRooms = new Map();

    addShip (wsClient, pos) {
        if (this.#roomMap.has(wsClient.gameRoom)) {
            const room = this.#roomMap.get(wsClient.gameRoom);
            room.addShip(wsClient, pos);
        }
    }

    addShot (wsClient, pos) {
        const roomId = wsClient.gameRoom;

        if (this.#roomMap.has(roomId)) {
            this.#roomMap.get(roomId).addShot(wsClient, pos);
        }
    }

    newRoomFromBrowser (wsClient) {
        const options = {
            gridSize: 10,
            maxShipCount: 5,
        };

        let roomId = wsClient.tempRoom;

        if (!roomId || !this.#roomMap.has(roomId)) {
            roomId = this.#createRoom(options);
            wsClient.tempRoom = roomId;
        }
        
        wsClient.send(JSON.stringify({
            type: "room-created",
            roomId,
        }));
    }

    newRoomFromBot (wsClient, chatId) {
        const options = {
            botClient: wsClient,
            chatId,
            gridSize: 10,
            maxShipCount: 5,
        };

        let roomId = this.#tempChatRooms.get(chatId);
        
        if (!roomId) {
            roomId = this.#createRoom(options);
            this.#tempChatRooms.set(chatId, roomId);
        }
        
        wsClient.send(JSON.stringify({
            type: "room-created",
            roomId,
            chatId,
        }));
    }

    signoutPlayer (wsClient) {
        const roomId = wsClient.gameRoom;
        const tempRoomId = wsClient.tempRoom;

        if (roomId && this.#roomMap.has(roomId)) {
            const room = this.#roomMap.get(roomId);
            const player = room.getPlayerFromWS(wsClient);

            if (player) {
                room.removePlayer(player);
                wsClient.playerRoom = null;
            }

            if (room.isEmpty()) {
                this.#deleteRoom(roomId);
            }
        }

        if (tempRoomId && this.#roomMap.has(tempRoomId)) {
            console.log("[SIGNOUT] Removed unused player room:", tempRoomId);
            this.#deleteRoom(tempRoomId);
        }

        if (wsClient?.readyState === 1) {
            wsClient.send(JSON.stringify({
                type: "signout",
                message: "Signed out",
            }));
        }
    }

    enterRoom (wsClient, name, roomId) {
        if (wsClient.readyState !== 1) {
            console.error("WS not open", wsClient);
            return;
        }

        if (!name || `${name}`.includes(" ")) {
            this.#sendJoinError(wsClient, "Invalid nickname");
            return;
        }

        const room = this.#roomMap.get(roomId);

        if (!room || room.isFull()) {
            this.#sendJoinError(wsClient, "Room not available");
            return;
        }

        if (room.getPlayerByName(name)) {
            this.#sendJoinError(wsClient, "Your name is not available");
            return;
        }

        const tempRoomId = wsClient.tempRoom;

        if (tempRoomId && tempRoomId !== roomId) {
            this.#deleteRoom(tempRoomId);
            console.log("[JOIN] Client joined different room. Removed:", tempRoomId);
        }

        if (room.chatId && this.#tempChatRooms.has(room.chatId)) {
            this.#tempChatRooms.delete(room.chatId);
        }

        wsClient.tempRoom = null;
        wsClient.gameRoom = roomId;
        room.addPlayer(wsClient, name);
        
        wsClient.send(JSON.stringify({
            type: "signin",
            roomId,
        }));
    }

    #createRoom (options) {
        const roomId = this.#generateRoomId();
        const room = new Room(roomId, options);
        
        room.addListener("ship-destroyed", this.#shipDestroyedHandler.bind(this));
        room.addListener("game-over", this.#gameOverHandler.bind(this));
        
        this.#roomMap.set(roomId, room);
        console.log("Created room:", roomId);
        return roomId;
    }

    #deleteRoom (roomId) {
        const room = this.#roomMap.get(roomId);

        room.removeAllListeners("ship-destroyed");
        room.removeAllListeners("game-over");

        this.#roomMap.delete(roomId);
        console.log("Removed room:", roomId);
    }

    #gameOverHandler (event) {
        console.log(`${event.winner} won the Battle`, `Room ${event.roomId}`);
    }

    #generateRoomId () {
        let id;

        do {
            id = (Math.random() * 1_000_000_000).toString(36).replace(".", "");
        } while (this.#roomMap.has(id));
        
        return id;
    }

    #sendJoinError (wsClient, message) {
        try {
            wsClient.send(JSON.stringify({
                type: "room-error",
                message,
            }));
        }
        catch (error) {
            console.error("Unable to send room-error message:", error);
        }
    }

    #shipDestroyedHandler (event) {
        console.log(event.roomId, `${event.shipOwner} losed a ship. ${event.remainingShips} remaining.`);
    }
}

export default Game;