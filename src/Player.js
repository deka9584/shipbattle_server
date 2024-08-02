class Player {
    #actualShip;
    #wsClient;
    #name;
    #ready = false;
    #ships = [];
    #shots = [];

    get actualShip () {
        return this.#actualShip;
    }

    get wsClient () {
        return this.#wsClient;
    }

    get name () {
        return this.#name;
    }

    get ready () {
        return this.#ready;
    }
    
    get ships () {
        return this.#ships;
    }

    get shipsLost () {
        return this.#ships.filter(ship => ship.destroyed).length;
    }

    get shots () {
        return this.#shots;
    }

    constructor (wsClient, name) {
        this.#wsClient = wsClient;
        this.#name = name;
    }

    setActualShip (actualShip) {
        this.#actualShip = actualShip;
    }

    setReady (ready) {
        this.#ready = ready;
    }

    send (data) {
        try {
            this.#wsClient.send(JSON.stringify(data));
        }
        catch (error) {
            console.error("Error sending data to player:", error);
        }
    }
}

export default Player;