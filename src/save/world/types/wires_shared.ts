import { BRSavedChunk3DIndex } from "./common";

export type BRSavedWireChunkSoA = {
    RemoteWireSources: BRSavedRemoteWirePortSource[];
    LocalWireSources: BRSavedLocalWirePortSource[];
    RemoteWireTargets: BRSavedWirePortTarget[];
    LocalWireTargets: BRSavedWirePortTarget[];
    PendingPropagationFlags: BRSavedBitFlags;
}

export type BRSavedLocalWirePortSource = {
    BrickIndexInChunk: number;
    ComponentTypeIndex: number;
    PortIndex: number;
}

export type BRSavedWirePortTarget = {
    BrickIndexInChunk: number;
    ComponentTypeIndex: number;
    PortIndex: number;
}

export type BRSavedRemoteWirePortSource = {
    GridPersistentIndex: number,
    ChunkIndex: BRSavedChunk3DIndex,
    BrickIndexInChunk: number;
    ComponentTypeIndex: number;
    PortIndex: number;
}

export type BRSavedBitFlags = number[];