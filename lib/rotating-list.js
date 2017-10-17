/**
 * A rotating list.
 *
 * @license MPL-2.0
 */
"use strict";

class RotatingList {
    constructor(iterable = []) {
        this.items = Array.from(iterable);
        this.current = 0;
    }

    get size() {
        return this.items.length;
    }

    get(i) {
        return this.items[i];
    }

    add(item) {
        this.items.push(item);
    }

    delete(item) {
        const index = this.items.indexOf(item);
        this.items.splice(index, 1);
        if(index < this.current) {
            --this.current;
        }
    }

    clear() {
        this.items.length = 0;
        this.current = 0;
    }

    getNext() {
        const item = this.get(this.current);
        ++this.current;
        this.current %= this.size;
        return item;
    }
}

module.exports = RotatingList;
