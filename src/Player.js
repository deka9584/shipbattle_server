class Player {
    #wsClient;
    #name;
    #ready = false;
    #shipCursor;
    #ships = [];
    #shots = [];

    get wsClient () {
        return this.#wsClient;
    }

    get name () {
        return this.#name;
    }

    get ready () {
        return this.#ready;
    }

    get shipCursor () {
        return this.#shipCursor;
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
    
    setReady (ready) {
        this.#ready = ready;
    }

    setShipCursor (shipCursor) {
        this.#shipCursor = shipCursor;
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