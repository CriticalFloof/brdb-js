import { BRSavedChunk3DIndex  } from "./common";

export type BRSavedBrickChunkIndexSoA = {
    Chunk3DIndices: BRSavedChunk3DIndex[];
    NumBricks: number[];
    NumComponents: number[];
    NumWires: number[];
}