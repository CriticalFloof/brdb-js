export type BRSavedOwnerTableSOA = {
    UserIds: UserIds; // Flat C Array
    UserNames: string[];
    DisplayNames: string[];
    EntityCounts: number[];
    BrickCounts: number[];
    ComponentCounts: number[];
    WireCounts: number[];
}

export type UserIds = {
    type: string;
    data: number[]; 
}