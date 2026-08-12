const { inspect } = require("node:util");

const REDACTED = "*******";

// Redaction-only handle. There is no getter for the real value anywhere on
// this class — that's what makes the guarantee structural rather than a
// matter of caller discipline. Every JS-level operation that could leak the
// value (console.log, template interpolation, JSON.stringify, fs writes,
// which stringify non-Buffer input) resolves to the placeholder instead.
//
// This does NOT resist a debugger: a debugger attached to this process can
// still expand the private #value field, because it reads the V8 heap
// directly, below JS-level encapsulation. Use src/secretWorker/client.js
// for flows that need to survive a debugger attached to this process.
class MaskedSecret {
  #value;

  constructor(value) {
    this.#value = value;
    Object.freeze(this);
  }

  toString() {
    return REDACTED;
  }

  toJSON() {
    return REDACTED;
  }

  [Symbol.toPrimitive]() {
    return REDACTED;
  }

  [inspect.custom]() {
    return REDACTED;
  }
}

module.exports = { MaskedSecret, REDACTED };
