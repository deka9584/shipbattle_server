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
        if (this.#roomMap.has(wsClient.gameRoom)) {
            const room = this.#roomMap.get(wsClient.gameRoom);
            room.addShot(wsClient, pos);
        }
    }

    newRoomFromBrowser (wsClient) {
        const options = {
            gridSize: 10,
            maxShipCount: 5,
        };

        const tempRoomId = wsClient.tempRoom;
        const roomId = this.#roomMap.has(tempRoomId) ? tempRoomId : this.#createRoom(options);
    
        const res = {
            type: "room-created",
            roomId,
        };
        
        wsClient.tempRoom = roomId;
        this.#sendToClient(wsClient, res);
    }

    newRoomFromBot (wsClient, chatId) {
        const options = {
            botClient: wsClient,
            chatId,
            gridSize: 10,
            maxShipCount: 5,
        };

        const roomId = this.#tempChatRooms.get(chatId) ?? this.#createRoom(options);

        const res = {
            type: "room-created",
            roomId,
            chatId,
        };
        
        this.#tempChatRooms.set(chatId, roomId);
        this.#sendToClient(wsClient, res);
    }

    signoutPlayer (wsClient) {
        const roomId = wsClient.gameRoom;
        const tempRoomId = wsClient.tempRoom;

        if (roomId && this.#roomMap.has(roomId)) {
            const room = this.#roomMap.get(roomId);
            const index = room.getPlayerIndex(wsClient);

            if (index > -1) {
                room.removePlayer(index);
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

        const res = {
            type: "signin",
            roomId,
        };

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
        this.#sendToClient(wsClient, res);
    }

    #createRoom (options) {
        const roomId = this.#generateRoomId();
        const room = new Room(roomId, options);
        this.#roomMap.set(roomId, room);

        room.addListener("ship-destroyed", this.#shipDestroyedHandler.bind(this));
        room.addListener("game-over", this.#gameOverHandler.bind(this));

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
        }  while (this.#roomMap.has(id));
        return id;
    }

    #sendJoinError (wsClient, message) {
        if (wsClient.readyState === 1) {
            wsClient.send(JSON.stringify({
                type: "room-error",
                message,
            }));
        }
    }

    #sendToClient (wsClient, data) {
        if (wsClient?.readyState === 1) {
            wsClient.send(JSON.stringify(data));
        }
    }

    #shipDestroyedHandler (event) {
        console.log(event.roomId, `${event.shipOwner} losed a ship. ${event.remainingShips} remaining.`);
    }
}

export default Game;