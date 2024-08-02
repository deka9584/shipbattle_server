class Ship {
    #area;
    #destroyed = false;
    #x;
    #y;
    #height;
    #hitCount = 0;
    #width;

    get area () {
        return this.#area;
    }

    get destroyed () {
        return this.#destroyed;
    }

    get x () {
        return this.#x;
    }

    get y () {
        return this.#y;
    }

    get height () {
        return this.#height;
    }

    get hitCount () {
        return this.#hitCount;
    }

    get width () {
        return this.#width;
    }

    constructor (width, height, x, y) {
        this.#width = width;
        this.#height = height;
        this.#area = width * height;
        this.#x = x;
        this.#y = y;
    }

    addHit () {
        this.#hitCount++;

        if (this.#hitCount >= this.#area) {
            this.#destroyed = true;
        }
    }

    isInArea (x, y) {
        return x >= this.#x && x < this.#x + this.#width && y >= this.#y && y < this.#y + this.#height;
    }

    toObject () {
        return {
            x: this.#x,
            y: this.#y,
            width: this.#width,
            height: this.#height
        }
    }
}

export default Ship;