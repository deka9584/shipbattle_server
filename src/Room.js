class Room {
    #roomId;
    #players = [];
    #maxShipCount = 5;
    #turn = 0;
    #gameOver = false;

    get roomId () {
        return this.#roomId;
    }

    get players () {
        return this.#players;
    }

    get gameOver () {
        return this.#gameOver;
    }

    constructor (roomId) {
        this.#roomId = roomId;
    }

    addPlayer (wsClient, name) {
        const player = {
            wsClient,
            name,
            shots: [],
            ships: [],
            shipsLost: 0,
        }

        if (!this.#players[0]) {
            this.#players[0] = player;
        }
        else {
            this.#players[1] = player;
        }

        this.#prependNewShip(player);
        this.#sendUpdate();
    }

    addShot (wsClient, pos) {
        const player = this.#players.find(p => p && p.wsClient == wsClient);

        if (player === this.#players[this.#turn]) {
            const x = pos.x;
            const y = pos.y;

            if (x >= 0 && x <= 9 && y >= 0 && y <= 9) {
                if (!player.shots.find(s => s.x === x && s.y === y)) {
                    const shot = { x, y };
                    player.shots.push(shot);
                    shot.hit = this.#checkHit(this.#turn ? 0 : 1, x, y);
                    this.#changeTurn();
                }
            }
        }
    }

    getPlayerIndex (wsClient) {
        return this.#players.findIndex(p => p && p.wsClient == wsClient);
    }

    getPlayerByName (name) {
        return this.#players.find(p => p && p.name === name);
    }

    isEmpty () {
        return !this.#players[0] && !this.#players[1];
    }

    isFull () {
        return this.#players[0] && this.#players[1];
    }

    isInGame () {
        return this.#players[0]?.ready && this.#players[1]?.ready;
    }

    placeShip (wsClient, pos) {
        const player = this.#players.find(p => p && p.wsClient == wsClient);
        const playerShipCount = player.ships ? player.ships.length : 0;

        if (player && playerShipCount < this.#maxShipCount) {
            const width = player.actualShip.width;
            const height = player.actualShip.height
            const x = pos.x;
            const y = pos.y;

            if (x >= 0 && x + width - 1 <= 9 && y >= 0 && y + height - 1 <= 9) {
                if (!player.ships.find(s => s.x === x && s.y === y)) {
                    const ship = {width, height, x, y };

                    ship.area = width * height;
                    ship.hitCount = 0;
                    ship.destroyed = false;
    
                    player.ships.push(ship);
                    this.#prependNewShip(player);
                    this.#sendUpdate();
                }
            }
        }
    }

    removePlayer (index) {
        if (this.isInGame()) {
            this.#winPlayer(index ? 0 : 1);
        }

        this.#players[index] = null;
        this.#sendUpdate();
    }

    #changeTurn () {
        this.#turn = this.#turn ? 0 : 1;
        this.#sendUpdate();
    }

    #checkHit (playerIndex, x, y) {
        const player = this.#players[playerIndex];
        let hit = false;

        if (player && player.ships) {
            player.ships.forEach(ship => {
                if (x >= ship.x && x < ship.x + ship.width && y >= ship.y && y < ship.y + ship.height) {
                    ship.hitCount++;
                    console.log("Shit hit:", ship);
                    
                    if (ship.hitCount >= ship.area) {
                        this.#destroyShip(playerIndex, ship);
                    }

                    hit = true;
                }
            });
        }

        return hit;
    }

    #destroyShip (playerIndex, ship) {
        const player = this.#players[playerIndex];

        if (player) {
            ship.destroyed = true;
            player.shipsLost++;

            if (player.shipsLost >= player.ships.length) {
                this.#winPlayer(playerIndex ? 0 : 1);
            }
        }
    }

    #prependNewShip (player) {
        const shipCount = player.ships ? player.ships.length : 0;

        switch (shipCount) {
            case 0:
                player.actualShip = { width: 1, height: 2 };
                break;
            case 1:
                player.actualShip = { width: 3, height: 1 };
                break;
            case 2:
                player.actualShip = { width: 1, height: 4 };
                break;
            case 3:
                player.actualShip = { width: 5, height: 1 };
                break;
            default:
                player.actualShip = { width: 1, height: 1 };
                break;
        }
        
        player.ready = shipCount == this.#maxShipCount
    }

    #winPlayer (index) {
        const player = this.#players[index];
        this.#gameOver = true;

        if (player) {
            player.win = true;
        }
    }

    #sendUpdate () {
        const roomData = {
            gameOver: this.#gameOver,
            roomId: this.#roomId,
                players: [
                    {
                        name: this.#players[0]?.name,
                        shots: this.#players[0]?.shots,
                        ready: this.#players[0]?.ready
                    },
                    {
                        name: this.#players[1]?.name,
                        shots: this.#players[1]?.shots,
                        ready: this.#players[1]?.ready
                    }
                ],
        };

        for (let i = 0; i < 2; i++) {
            const player = this.#players[i];

            if (player) {
                const data = {
                    allShipsPlaced: player.ready,
                    isYourTurn: this.#turn === i,
                    yourShips: player.ships,
                    room: roomData,
                    ship: player.actualShip,
                    type: "room-update",
                    win: player.win,
                }

                this.#sendDataToClient(player.wsClient, data);
            }
        }
    }

    #sendDataToClient (wsClient, data) {
        if (wsClient.readyState == wsClient.OPEN) {
            wsClient.send(JSON.stringify(data));
        }
    }
}

export default Room;