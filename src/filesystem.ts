import { FilesTable, FoldersTable } from './db_types';

export function buildFileSystem(folders: FoldersTable[], files: FilesTable[]): Object {
    const MAX_DEPTH = 16;

    let vfs = {};
    let reference = vfs;
    // Build folder tree
    for (const folder of folders) {
        if(folder.parent_id !== null) {
            let stack: string[] = [];
            let search: FoldersTable = folder;
            for(let i = 0; i < MAX_DEPTH; i++) {
                if(search.parent_id == null) {
                    break;
                }
                stack.push(folders[search.parent_id - 1].name);
                search = folders[search.parent_id - 1];
            }
            for(let i = stack.length - 1; i >= 0; i--) {
                if(!Object.keys(reference[stack[i]]).includes("_children")){
                    reference[stack[i]]._children = {};
                }
                reference = reference[stack[i]]._children;
            }
        }
        reference[folder.name] = {...folder}
        reference = vfs;
        
    }

    // Attach files to folder tree
    
    for (const file of files) {
        if(file.parent_id !== null) {
            let stack: string[] = [];
            let search: FoldersTable | FilesTable = file;
            for(let i = 0; i < MAX_DEPTH; i++) {
                if(search.parent_id == null) {
                    break;
                }
                stack.push(folders[search.parent_id - 1].name);
                search = folders[search.parent_id - 1];
            }
            for(let i = stack.length - 1; i >= 0; i--) {
                if(!Object.keys(reference[stack[i]]).includes("_children")){
                    reference[stack[i]]._children = {};
                }
                reference = reference[stack[i]]._children;
            }
        }
        reference[file.name] = {...file}
        reference = vfs;
    }

    return vfs;
}

export function search(object, key) {
    var value;
    Object.keys(object).some(function(k) {
        if (k === key) {
            value = object[k];
            return true;
        }
        if (object[k] && typeof object[k] === 'object') {
            value = search(object[k], key);
            return value !== undefined;
        }
    });
    return value;
}