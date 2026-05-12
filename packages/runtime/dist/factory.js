"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRuntime = createRuntime;
const ContoraRuntime_1 = require("./ContoraRuntime");
/** Returns the bundled Contora {@link RuntimeProvider}. */
function createRuntime() {
    return new ContoraRuntime_1.ContoraRuntime();
}
