import Room from "./Room.js";

class Game {
    #roomMap = new Map();

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

    createRoom (wsClient) {
        const options = {
            gridSize: 10,
            maxShipCount: 5,
        };

        const roomId = this.#generateRoomId();
        const room = new Room(roomId, options);
    
        const res = {
            type: "room-created",
            roomId: room.roomId,
        };

        room.addListener("ship-destroyed", this.#shipDestroyedHandler.bind(this));
        room.addListener("game-over", this.#gameOverHandler.bind(this))
    
        this.#roomMap.set(roomId, room);
        console.log(res);
        this.#sendToClient(wsClient, res);
    }

    signoutPlayer (wsClient) {
        const roomId = wsClient.gameRoom;

        if (roomId && this.#roomMap.has(roomId)) {
            const room = this.#roomMap.get(roomId);
            const index = room.getPlayerIndex(wsClient);

            if (index > -1) {
                room.removePlayer(index);
                wsClient.playerRoom = null;
            }

            if (room.isEmpty()) {
                room.removeAllListeners("ship-destroyed");
                room.removeAllListeners("game-over");
                this.#roomMap.delete(roomId);
                console.log("Removed room:", roomId);
            }
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

        wsClient.gameRoom = roomId;
        room.addPlayer(wsClient, name);
        this.#sendToClient(wsClient, {
            type: "signin",
            roomId,
        });
    }

    #gameOverHandler (event) {
        const winner = event.winner;
        const roomId = event.roomId;
        console.log(`${winner} won the Battle`, `Room ${roomId}`);
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
        const roomId = event.roomId;
        const shipOwner = event.shipOwner;
        const shipsLost = event.shipsLost;
        console.log(`${shipOwner} losed a ship. ${shipsLost} remaining.`, `Room: ${roomId}`);
    }
}

export default Game;