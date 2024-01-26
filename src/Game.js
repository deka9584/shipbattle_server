import Room from "./Room.js";

class Game {
    #roomMap = new Map();

    addShot (wsClient, roomId, pos) {
        if (this.#roomMap.has(roomId)) {
            const room = this.#roomMap.get(roomId);
            room.addShot(wsClient, pos);
        }
    }

    createRoom (wsClient) {
        const roomId = this.#generateRoomId();
        const room = new Room(roomId);
    
        const res = {
            type: "room-created",
            roomId: room.roomId,
        };
    
        this.#roomMap.set(roomId, room);
        console.log(res);
        wsClient.send(JSON.stringify(res));
    }

    signoutPlayer (wsClient) {
        let roomToRemove;

        this.#roomMap.forEach(room => {
            const index = room.getPlayerIndex(wsClient);

            if (index > -1) {
                room.removePlayer(index);

                if (room.isEmpty()) {
                    roomToRemove = room.roomId;
                }
            }
        });

        if (roomToRemove) {
            this.#roomMap.delete(roomToRemove);
            console.log("Removed room:", roomToRemove)
        }

        if (wsClient.readyState == wsClient.OPEN) {
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

        room.addPlayer(wsClient, name);
        this.#sendToPlayer(wsClient, {
            type: "signin",
            roomId,
        });

        console.log(room);
    }

    placeShip (wsClient, roomId, pos) {
        if (this.#roomMap.has(roomId)) {
            const room = this.#roomMap.get(roomId);
            room.placeShip(wsClient, pos);
        }
    }

    #generateRoomId () {
        let id;
        do {
            id = (Math.random() * 1_000_000_000).toString(36).replace(".", "");
        }  while (this.#roomMap.has(id));
        return id;
    }

    #sendJoinError (wsClient, message) {
        if (wsClient.readyState == wsClient.OPEN) {
            wsClient.send(JSON.stringify({
                type: "room-error",
                message,
            }));
        }
    }

    #sendToPlayer (wsClient, data) {
        wsClient.send(JSON.stringify(data));
    }
}

export default Game;