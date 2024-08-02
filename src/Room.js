import { EventEmitter } from "events";
import Player from "./Player.js";
import Ship from "./Ship.js";

class Room extends EventEmitter {
    #chatId;
    #isGameOver = false;
    #gridSize = 10;
    #maxShipCount = 5;
    #player1;
    #player2;
    #roomId;
    #turn = 0;
    #winnerName;

    get chatId () {
        return this.#chatId;
    }

    get roomId () {
        return this.#roomId;
    }

    get gameOver () {
        return this.#isGameOver;
    }

    constructor (roomId, options = null) {
        super();

        this.#roomId = roomId;

        if (options) {
            this.#chatId = options.chatId;
            this.#gridSize = options.gridSize;
            this.#maxShipCount = options.maxShipCount;
        }
    }

    addPlayer (wsClient, name) {
        const player = new Player(wsClient, name);

        if (!this.#player1) {
            this.#player1 = player;
        }
        else {
            this.#player2 = player;
        }

        this.#prependNewShip(player);
        this.#sendUpdate();
    }

    addShip (wsClient, pos) {
        const player = [this.#player1, this.#player2].find(p => p && p.wsClient === wsClient);

        if (player && player.ships.length < this.#maxShipCount && this.isFull()) {
            const width = player.actualShip.width;
            const height = player.actualShip.height
            const x = pos.x;
            const y = pos.y;
            const isInGrid = x >= 0 && x + width <= this.#gridSize && y >= 0 && y + height <= this.#gridSize;
            const hasFreeSpace = !player.ships.some(s =>
                (x + width - 1 >= s.x && x <= s.x + s.width - 1) &&
                (y + height - 1 >= s.y && y <= s.y + s.height - 1)
            );

            if (isInGrid && hasFreeSpace) {
                const ship = new Ship(width, height, x, y);
    
                player.ships.push(ship);
                this.#prependNewShip(player);
                this.#sendUpdate();
            }
        }
    }

    addShot (wsClient, pos) {
        const player = this.#turn ? this.#player2 : this.#player1;

        if (player && player.wsClient === wsClient) {
            const x = pos.x;
            const y = pos.y;
            const isInGrid = x >= 0 && x <= this.#gridSize && y >= 0 && y <= this.#gridSize;
            const isFreeCell = !player.shots.some(s => s.x === x && s.y === y);

            if (isInGrid && isFreeCell) {
                const victim = player === this.#player1 ? this.#player2 : this.#player1;
                const hit = this.#checkHit(victim, x, y);

                player.shots.push({ x, y, hit });
                this.#changeTurn();
            }
        }
    }

    getPlayerByName (name) {
        return [this.#player1, this.#player2].find(p => p && p.name === name);
    }

    getPlayerFromWS (wsClient) {
        return [this.#player1, this.#player2].find(p => p && p.wsClient === wsClient);
    }

    isEmpty () {
        return !this.#player1 && !this.#player2;
    }

    isFull () {
        return this.#player1 && this.#player2;
    }

    isInGame () {
        return this.#player1?.ready && this.#player2?.ready;
    }

    removePlayer (player) {
        const isP1 = player === this.#player1;
        const isP2 = player === this.#player2;

        if (this.isInGame() && !this.#isGameOver) {
            if (isP1) {
                this.#gameOver(this.#player2);
            }

            if (isP2) {
                this.#gameOver(this.#player1);
            }
        }

        if (isP1) {
            this.#player1 = null;
        }

        if (isP2) {
            this.#player2 = null;
        }

        this.#sendUpdate();
    }

    #changeTurn () {
        this.#turn = !this.#turn;
        this.#sendUpdate(); 
    }

    #checkHit (player, x, y) {
        if (!(player instanceof Player)) {
            console.error("Invalid player instance");
            return false;
        }

        for (const ship of player.ships) {
            if (ship.isInArea(x, y)) {
                ship.addHit();

                if (ship.destroyed) {
                    this.#onShipDestroyed(player);
                }

                return true;
            }
        }

        return false;
    }

    #dispatchGameOverEvent () {
        const data = {
            chatId: this.#chatId,
            roomId: this.#roomId,
            winner: this.#winnerName,
        }

        this.emit("game-over", data);
    }

    #dispatchShipDestroyedEvent (shipOwner, remainingShips) {
        const data = {
            chatId: this.#chatId,
            roomId: this.#roomId,
            shipOwner,
            remainingShips,
        };

        this.emit("ship-destroyed", data);
    }

    #gameOver (player) {
        this.#isGameOver = true;

        if (player) {
            this.#winnerName = player.name;
            this.#sendGameOver();
            this.#dispatchGameOverEvent();
        }
    }

    #onShipDestroyed (owner) {
        if (owner) {
            this.#dispatchShipDestroyedEvent(owner.name, owner.ships.length - owner.shipsLost);
    
            if (owner.shipsLost >= owner.ships.length) {
                this.#gameOver(this.#turn ? this.#player2 : this.#player1);
            }
        }
    }

    #prependNewShip (player) {
        if (player instanceof Player) {
            const shipCount = player.ships.length;
            let actualShip;
    
            switch (shipCount) {
                case 0:
                    actualShip = { width: 1, height: 2 };
                    break;
                case 1:
                    actualShip = { width: 3, height: 1 };
                    break;
                case 2:
                    actualShip = { width: 1, height: 4 };
                    break;
                case 3:
                    actualShip = { width: 5, height: 1 };
                    break;
                default:
                    actualShip = { width: 1, height: 1 };
                    break;
            }
            
            player.setActualShip(actualShip);

            if (shipCount === this.#maxShipCount) {
                player.setReady(true);
            }
        }
    }

    #sendGameOver () {
        const data = {
            winner: this.#winnerName,
            roomId: this.#roomId,
            type: "game-over",
        }

        if (this.#player1) {
            this.#sendDataToClient(this.#player1.wsClient, data);
        }

        if (this.#player2) {
            this.#sendDataToClient(this.#player2.wsClient, data);
        }
    }

    #sendUpdate () {
        const roomData = {
            gameOver: this.#isGameOver,
            gridSize: this.#gridSize,
            roomId: this.#roomId,
            players: [
                {
                    name: this.#player1?.name,
                    shots: this.#player1?.shots,
                    ready: this.#player1?.ready
                },
                {
                    name: this.#player2?.name,
                    shots: this.#player2?.shots,
                    ready: this.#player2?.ready
                }
            ],
        };

        const playerTurn = this.#turn ? this.#player2 : this.#player1;

        for (const player of [this.#player1, this.#player2]) {
            if (!player) {
                continue;
            }
            
            const ships = player.ships.map(s => s.toObject());
    
            const data = {
                isYourTurn: player === playerTurn,
                yourShips: ships,
                room: roomData,
                ship: player.actualShip,
                type: "room-update"
            }
    
            this.#sendDataToClient(player.wsClient, data);
        }
    }

    #sendDataToClient (wsClient, data) {
        if (wsClient?.readyState === 1) {
            wsClient.send(JSON.stringify(data));
        }
    }
}

export default Room;