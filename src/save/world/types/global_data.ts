export type BRSavedGlobalDataSoA = {
    EntityTypeNames: string[];
    EntityDataClassNames: string[];
    BasicBrickAssetNames: string[];
    ProceduralBrickAssetNames: string[];
    MaterialAssetNames: MaterialAssetName[];
    ComponentTypeNames: string[];
    ComponentDataStructNames: string[];
    ComponentWirePortNames: string[];
    ExternalAssetReferences: ExternalAssetReference[];

}

export type MaterialAssetName = "BMC_Plastic" | "BMC_Glass" | "BMC_TranslucentPlastic" | "BMC_Glow" | "BMC_Metallic" | "BMC_Hologram"

export type ExternalAssetReference = {
    PrimaryAssetType: string;
    PrimaryAssetName: string;
}