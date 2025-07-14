import { BRSavedChunk3DIndex } from "./common";

export type BRSavedBrickChunkSoA = {
    ProceduralBrickStartingIndex: number;
    BrickSizeCounters: BrickSizeCounter[];
    BrickSizes: BRSavedChunk3DIndex[];
    BrickTypeIndices: number[];
    OwnerIndices: number[];
    RelativePositions: number[];
    Orientations: number[];
    CollisionFlags_Player: number[];
    CollisionFlags_Weapon: number[];
    CollisionFlags_Interaction: number[];
    CollisionFlags_Tool: number[];
    CollisionFlags_Physics: number[];
    VisibilityFlags: number[];
    MaterialIndices: number[];
    ColorsAndAlphas: any;
}

export type BrickSizeCounter = {
    AssetIndex: number;
    NumSizes: number;
}