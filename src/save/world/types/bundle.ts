export type Bundle = {
    type: BundleTypes;
	iD: string; // TODO: UUID type
	name: string;
	version: string;
	tags: string[]; // needs verification
	authors: string[]; // needs verification
	createdAt: string; // TODO: Timestamp type.
	updatedAt: string; // TODO: Timestamp type.
	description: string;
	dependencies: any[] // needs verification
}

export type BundleTypes = "World"