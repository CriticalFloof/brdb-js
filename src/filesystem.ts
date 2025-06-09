import { FilesTable, FoldersTable } from "./db_types";

const MAX_DEPTH = 16;

export function buildFileSystem(folders: FoldersTable[], files: FilesTable[]): Object {
    let vfs = {};
    let reference = vfs;
    // Build folder tree
    for (const folder of folders) {
        if (folder.parent_id !== null) {
            let stack: string[] = [];
            let search: FoldersTable = folder;
            for (let i = 0; i < MAX_DEPTH; i++) {
                if (search.parent_id == null) {
                    break;
                }
                stack.push(folders[search.parent_id - 1].name);
                search = folders[search.parent_id - 1];
            }
            for (let i = stack.length - 1; i >= 0; i--) {
                if (!Object.keys(reference[stack[i]]).includes("_children")) {
                    reference[stack[i]]._children = {};
                }
                reference = reference[stack[i]]._children;
            }
        }
        reference[folder.name] = { ...folder };
        reference = vfs;
    }

    // Attach files to folder tree

    for (const file of files) {
        if (file.parent_id !== null) {
            let stack: string[] = [];
            let search: FoldersTable | FilesTable = file;
            for (let i = 0; i < MAX_DEPTH; i++) {
                if (search.parent_id == null) {
                    break;
                }
                stack.push(folders[search.parent_id - 1].name);
                search = folders[search.parent_id - 1];
            }
            for (let i = stack.length - 1; i >= 0; i--) {
                if (!Object.keys(reference[stack[i]]).includes("_children")) {
                    reference[stack[i]]._children = {};
                }
                reference = reference[stack[i]]._children;
            }
        }
        reference[file.name] = { ...file };
        reference = vfs;
    }

    return vfs;
}

export function findAssociatedSchema(folders: FoldersTable[], vfs: Object, mpsFile: FilesTable): FilesTable {
    let result: FilesTable = null;

    // This is very ugly, but it works, there's probably a better way.
    if (mpsFile.name == "Owners.mps") {
        result = vfs["World"]["_children"][0]["_children"]["Owners.schema"];
    } else if (mpsFile.name == "GlobalData.mps") {
        result = vfs["World"]["_children"][0]["_children"]["GlobalData.schema"];
    } else if (mpsFile.name == "ChunkIndex.mps") {
        if (folders[mpsFile.parent_id - 1].name == "Entities") {
            result = vfs["World"]["_children"][0]["_children"]["Entities"]["_children"]["ChunkIndex.schema"];
        } else if (!Number.isNaN(folders[mpsFile.parent_id - 1].name)) {
            result = vfs["World"]["_children"][0]["_children"]["Bricks"]["_children"]["ChunkIndexShared.schema"];
        }
    } else if (folders[mpsFile.parent_id - 1].name == "Chunks") {
        if (folders[folders[mpsFile.parent_id - 1].parent_id - 1].name == "Entities") {
            result = vfs["World"]["_children"][0]["_children"]["Entities"]["_children"]["ChunksShared.schema"];
        } else if (!Number.isNaN(folders[folders[mpsFile.parent_id - 1].parent_id - 1].name)) {
            result = vfs["World"]["_children"][0]["_children"]["Bricks"]["_children"]["ChunksShared.schema"];
        }
    } else if (folders[mpsFile.parent_id - 1].name == "Components") {
        if (folders[folders[mpsFile.parent_id - 1].parent_id - 1].name == "Entities") {
            result = vfs["World"]["_children"][0]["_children"]["Entities"]["_children"]["ComponentsShared.schema"];
        } else if (!Number.isNaN(folders[folders[mpsFile.parent_id - 1].parent_id - 1].name)) {
            result = vfs["World"]["_children"][0]["_children"]["Bricks"]["_children"]["ComponentsShared.schema"];
        }
    } else if (folders[mpsFile.parent_id - 1].name == "Wires") {
        if (folders[folders[mpsFile.parent_id - 1].parent_id - 1].name == "Entities") {
            result = vfs["World"]["_children"][0]["_children"]["Entities"]["_children"]["WiresShared.schema"];
        } else if (!Number.isNaN(folders[folders[mpsFile.parent_id - 1].parent_id - 1].name)) {
            result = vfs["World"]["_children"][0]["_children"]["Bricks"]["_children"]["WiresShared.schema"];
        }
    }

    return result;
}
