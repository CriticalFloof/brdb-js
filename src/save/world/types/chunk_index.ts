import { BRSavedChunk3DIndex } from "./common";

export type BRSavedEntityChunkIndexSoA = {
    NextPersistentIndex: number;
    Chunk3DIndices: BRSavedChunk3DIndex[];
    NumEntities: number[];
}