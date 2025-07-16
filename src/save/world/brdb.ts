// Implementation of a brickadia savefile wrapper, focusing on the BRDB format.

import type { Database } from "better-sqlite3";
import * as DatabaseConstructor from "better-sqlite3";

import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline, Readable, Stream } from "node:stream";

import { BLOBS, FILES, FOLDERS } from "../../constants";
import { BlobsTable, FilesTable, FoldersTable } from "../../db_types";
import { MsgPackDecodeStream } from "../../msgpack";
import { buildFileSystem, findAssociatedSchema } from "../../filesystem";
import { ZSTDCompress, ZSTDDecompress } from "simple-zstd";

export default class BRDB {

    private database: Database;

    public constructor(filepath: string) {

        const options = {
            readonly: true,
            fileMustExist: true,
        };

        this.database = new DatabaseConstructor(filepath, options);
    }

    public async read(): Promise<void> {

        const folders = this.getFolders();
        const files = this.getFiles();
        const blobs = this.getBlobs();

        const file = files[16 - 1]
        console.log(file)
        const blob = blobs[file.content_id - 1]

        

        let streams: NodeJS.ReadWriteStream[] = []

        if(blob.compression === 1) {
            streams.push(ZSTDDecompress())
        }

        streams.push(new MsgPackDecodeStream().on("data", (data)=>{
            console.log("output:")
            console.dir(data, { depth:6 })
        }))
        

        pipeline(Readable.from(blob.content), ...streams as [NodeJS.ReadWriteStream], (err) => {
            console.error(err)
        })

    }

    private getFolders(): FoldersTable[] {
        return this.database.prepare(`SELECT * FROM "${FOLDERS}"`).all() as FoldersTable[];
    }

    private getFiles(): FilesTable[] {
        return this.database.prepare(`SELECT * FROM "${FILES}"`).all() as FilesTable[];
    }

    private getBlobs(): BlobsTable[] {
        return this.database.prepare(`SELECT * FROM "${BLOBS}"`).all() as BlobsTable[];
    }



}