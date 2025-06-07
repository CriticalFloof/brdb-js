import type {Database} from 'better-sqlite3';
import * as DatabaseConstructor from "better-sqlite3";
import {ZSTDCompress, ZSTDDecompress} from "simple-zstd";

import { Readable, Stream, Writable } from "node:stream";
import * as fs from "node:fs";
import * as path from "node:path";
import { BLOBS, FILES, FOLDERS } from "./constants";
import { BlobsTable, FilesTable, FoldersTable } from "./db_types";
import * as msgpack from "./msgpack"


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

read(db);

function isFileTable(node: FilesTable | FoldersTable): node is FilesTable {
   return (<FilesTable>node).file_id !== undefined;
}

async function read(db: Database) {

    const folders = db.prepare(`SELECT * FROM "${FOLDERS}"`).all() as FoldersTable[];
    const files = db.prepare(`SELECT * FROM "${FILES}"`).all() as FilesTable[];

    const blobs = db.prepare(`SELECT * FROM "${BLOBS}"`).all() as BlobsTable[];
    
    for (const file of files) {
        const blobinfo = blobs[file.content_id - 1];
        let bufferData: Buffer = blobinfo.compression == 0 ? blobinfo.content : await decompressBlob(blobinfo.content);

        //console.log(file)

        if(file.name.endsWith(".json")) {
            console.log(bufferData.toString());
        } else if(file.name.endsWith(".schema")) {
            let schema: Object = msgpack.decode_schema(bufferData);
            fs.writeFileSync(path.join("./dump/found_schemas/", file.name.replace(".schema", ".json")), JSON.stringify(schema, null, 4))
        }
        
    }
    
    
}

function decompressBlob(data: Buffer): Promise<Buffer> {
    
    return new Promise<Buffer>((res, rej) => {
        let chunks: Buffer[] = []

        Readable.from(data)
        .pipe(ZSTDDecompress())
        .on('data', (data) => {
            chunks.push(data)
        })
        .on('close', () => {
            res(Buffer.concat(chunks));
        })
    })
}

db.close();
