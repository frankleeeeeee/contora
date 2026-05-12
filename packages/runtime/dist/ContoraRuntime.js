"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContoraRuntime = void 0;
/**
 * Default {@link RuntimeProvider} for Contora: intent stub, score-based ordering, bounded compression.
 */
class ContoraRuntime {
    buildIntent(_input) {
        return { type: 'contora-general', confidence: 0.62 };
    }
    rankContext(context) {
        return [...context].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    compressContext(context) {
        return context.slice(0, 8);
    }
    buildPrompt(data) {
        const body = data.context.map((c) => c.content).join('\n');
        return [`[Contora] intent=${data.intent.type}`, `mode=${data.mode}`, body].join('\n\n');
    }
}
exports.ContoraRuntime = ContoraRuntime;
