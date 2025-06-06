import type {Database} from 'better-sqlite3';
import * as DatabaseConstructor from "better-sqlite3";
import {ZSTDCompress, ZSTDDecompress} from "simple-zstd";

import { Readable } from "node:stream";
import * as fs from "node:fs";
import * as path from "node:path";
import { FILES, FOLDERS } from "./constants";
import { FilesTable, FoldersTable } from "./db_types";


const options = {
    readonly: true,
    fileMustExist: true
}

const DUMP_PATH = "./dump"

let db = new DatabaseConstructor('./example/Parkour.brdb', options);

console.log("Hello, BRDB!");

/*
const files = db.prepare(`SELECT * FROM "${FILES}" LIMIT 1`).all();
if (files.length === 0) {
    console.log('(empty)');
} else {
    for (const file of files as any) {
        console.log(file);

        const blob = db.prepare(`
            SELECT * FROM blobs WHERE blob_id = ?
        `).get(file.content_id) as any;

        const content: Buffer = blob.content;

        Readable.from(content)
            .pipe(ZSTDDecompress())
            .pipe(fs.createWriteStream(path.join(DUMP_PATH, )));
    }
}
*/

mapVirtualFileSystem(db);

function isFileTable(node: FilesTable | FoldersTable): node is FilesTable {
   return (<FilesTable>node).file_id !== undefined;
}

function mapVirtualFileSystem(db: Database) {
    const MAX_DEPTH = 32;

    const folders = db.prepare(`SELECT * FROM "${FOLDERS}"`).all() as FoldersTable[];
    const files = db.prepare(`SELECT * FROM "${FILES}"`).all() as FilesTable[];



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
    
    //console.log("Done!")
    fs.writeFileSync("./dump/virtual_file_system.json",JSON.stringify(vfs, null, 4))
    console.dir(vfs, {depth: null});
}

db.close();
