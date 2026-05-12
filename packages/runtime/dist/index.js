"use strict";
/**
 * @contora/runtime — Contora runtime (RuntimeProvider, prompt builders, ranking hooks).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUNTIME_LAYER = exports.getContoraHooks = exports.buildCompressionPromptPair = exports.buildSemanticSummaryPromptPair = exports.buildIntentPromptPair = exports.RANKING_FACTORS = exports.rankingScoreMultiplier = exports.enrichPromptForProvider = exports.createRuntime = exports.ContoraRuntime = void 0;
var ContoraRuntime_1 = require("./ContoraRuntime");
Object.defineProperty(exports, "ContoraRuntime", { enumerable: true, get: function () { return ContoraRuntime_1.ContoraRuntime; } });
var factory_1 = require("./factory");
Object.defineProperty(exports, "createRuntime", { enumerable: true, get: function () { return factory_1.createRuntime; } });
var contoraHooks_1 = require("./contoraHooks");
Object.defineProperty(exports, "enrichPromptForProvider", { enumerable: true, get: function () { return contoraHooks_1.enrichPromptForProvider; } });
Object.defineProperty(exports, "rankingScoreMultiplier", { enumerable: true, get: function () { return contoraHooks_1.rankingScoreMultiplier; } });
Object.defineProperty(exports, "RANKING_FACTORS", { enumerable: true, get: function () { return contoraHooks_1.RANKING_FACTORS; } });
Object.defineProperty(exports, "buildIntentPromptPair", { enumerable: true, get: function () { return contoraHooks_1.buildIntentPromptPair; } });
Object.defineProperty(exports, "buildSemanticSummaryPromptPair", { enumerable: true, get: function () { return contoraHooks_1.buildSemanticSummaryPromptPair; } });
Object.defineProperty(exports, "buildCompressionPromptPair", { enumerable: true, get: function () { return contoraHooks_1.buildCompressionPromptPair; } });
Object.defineProperty(exports, "getContoraHooks", { enumerable: true, get: function () { return contoraHooks_1.getContoraHooks; } });
exports.RUNTIME_LAYER = '@contora/runtime';
