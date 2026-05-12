/**
 * Base multipliers for ranking signals (mode strategy weights apply on top).
 */
export declare const RANKING_FACTORS: {
    readonly gitStagedPresence: 10;
    readonly gitWorkingPresence: 8;
    readonly openTabPresence: 6;
    readonly workingSetRecencyMax: 20;
    readonly perFocusUnit: 4;
    readonly perSaveUnit: 5;
    readonly taskKeywordHit: 6;
};
