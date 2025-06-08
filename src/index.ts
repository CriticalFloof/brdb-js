import type { Database } from 'better-sqlite3';
import * as DatabaseConstructor from "better-sqlite3";
import { ZSTDCompress, ZSTDDecompress } from "simple-zstd";

import { Readable, Stream, Writable } from "node:stream";
import * as fs from "node:fs";
import * as path from "node:path";
import { BLOBS, FILES, FOLDERS } from "./constants";
import { BlobsTable, FilesTable, FoldersTable } from "./db_types";
import * as msgpack from "./msgpack"
import { buildFileSystem, search } from './filesystem';


const options = {
    readonly: true,
    fileMustExist: true
}

const DUMP_PATH = "./dump"

let db = new DatabaseConstructor('./example/Parkour.brdb', options);

console.log("Hello, BRDB!");

read(db);

async function read(db: Database) {

    const folders = db.prepare(`SELECT * FROM "${FOLDERS}"`).all() as FoldersTable[];
    const files = db.prepare(`SELECT * FROM "${FILES}"`).all() as FilesTable[];

    const blobs = db.prepare(`SELECT * FROM "${BLOBS}"`).all() as BlobsTable[];

    const dbFs: Object = buildFileSystem(folders, files);

    for (const file of files) {




        //console.log(file)



        //console.log(dbFs);



        if (file.name.endsWith(".json")) {
            //console.log(bufferData.toString());
        } else if (file.name.endsWith(".mps")) {

            // Process Schema

            //try {
                const schemaFile: FilesTable = search(dbFs, file.name.replace(".mps", ".schema"));

                const schemaBlobInfo = blobs[schemaFile.content_id - 1];
                let schemaBuffer: Buffer = schemaBlobInfo.compression == 0 ? schemaBlobInfo.content : await decompressBlob(schemaBlobInfo.content);

                const schema: Object = msgpack.decode_schema(schemaBuffer);
                console.log("====SCHEMA====")
                console.dir(schema, { depth: null });

                // Process Raw

                const rawBlobInfo = blobs[file.content_id - 1];

                const rawBuffer: Buffer = rawBlobInfo.compression == 0 ? rawBlobInfo.content : await decompressBlob(rawBlobInfo.content);

                const output = msgpack.decode_raw(schema, rawBuffer);
                console.log("====OUTPUT====")
                console.dir(output, { depth: null });
                //return;
            //} catch (error) {
            //    console.log(`Failed to decode '${file.name}'`)
            //}

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
