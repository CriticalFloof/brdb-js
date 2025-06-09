import type { Database } from "better-sqlite3";
import * as DatabaseConstructor from "better-sqlite3";
import { ZSTDCompress, ZSTDDecompress } from "simple-zstd";

import { Readable, Stream, Writable } from "node:stream";
import * as fs from "node:fs";
import * as path from "node:path";
import { BLOBS, FILES, FOLDERS } from "./constants";
import { BlobsTable, FilesTable, FoldersTable } from "./db_types";
import * as msgpack from "./msgpack";
import { buildFileSystem, findAssociatedSchema } from "./filesystem";

const options = {
    readonly: true,
    fileMustExist: true,
};

const DUMP_PATH = "./dump";

let db = new DatabaseConstructor("./input/Parkour.brdb", options);

console.log("Hello, BRDB!");

read(db);

async function read(db: Database) {
    const folders = db.prepare(`SELECT * FROM "${FOLDERS}"`).all() as FoldersTable[];
    const files = db.prepare(`SELECT * FROM "${FILES}"`).all() as FilesTable[];

    const blobs = db.prepare(`SELECT * FROM "${BLOBS}"`).all() as BlobsTable[];

    const vfs: Object = buildFileSystem(folders, files);

    const storedSchemas: { [index: string]: Object } = {};

    for (const file of files) {
        if (file.name.endsWith(".json")) {
            const rawBlobInfo = blobs[file.content_id - 1];
            const rawBuffer: Buffer = rawBlobInfo.compression == 0 ? rawBlobInfo.content : await decompressBlob(rawBlobInfo.content);

            //console.log(bufferData.toString());
            fs.mkdirSync(`./dump`, { recursive: true });
            fs.writeFile(path.join(`./dump/${file.name}`), rawBuffer.toString(), () => {
                console.log(`JSON File './dump/${file.name}' Dumped.`);
            });
        } else if (file.name.endsWith(".mps")) {
            const schemaFile: FilesTable = findAssociatedSchema(folders, vfs, file);

            const schemaBlobInfo = blobs[schemaFile.content_id - 1];
            let schemaBuffer: Buffer = schemaBlobInfo.compression == 0 ? schemaBlobInfo.content : await decompressBlob(schemaBlobInfo.content);

            const schema: Object = msgpack.decode_schema(schemaBuffer);
            storedSchemas[schemaFile.name] = schema;

            const rawBlobInfo = blobs[file.content_id - 1];
            const rawBuffer: Buffer = rawBlobInfo.compression == 0 ? rawBlobInfo.content : await decompressBlob(rawBlobInfo.content);

            const output = msgpack.decode_raw(schema, rawBuffer);

            fs.mkdirSync(`./dump/world_data_json/${schemaFile.name.replace(".schema", "")}`, { recursive: true });
            fs.writeFile(
                path.join(`./dump/world_data_json/${schemaFile.name.replace(".schema", "")}/${file.name.replace(".mps", "")}__${file.file_id}.json`),
                JSON.stringify(output, null, 4),
                () => {
                    console.log(
                        `File './dump/world_data_json/${schemaFile.name.replace(".schema", "")}/${file.name.replace(".mps", "")}__${
                            file.file_id
                        }.json' Dumped.`
                    );
                }
            );
        }
    }

    const storedSchemaKeys = Object.keys(storedSchemas);

    for (let i = 0; i < storedSchemaKeys.length; i++) {
        const schemaName = storedSchemaKeys[i];
        const schemaData = storedSchemas[schemaName];

        fs.mkdirSync(`./dump/found_schemas`, { recursive: true });
        fs.writeFile(`./dump/found_schemas/${schemaName.replace(".schema", ".json")}`, JSON.stringify(schemaData, null, 4), () => {
            console.log(`Schema File './dump/found_schemas/${schemaName.replace(".schema", ".json")}' Dumped.`);
        });
    }
}

function decompressBlob(data: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((res, rej) => {
        let chunks: Buffer[] = [];

        Readable.from(data)
            .pipe(ZSTDDecompress())
            .on("data", (data) => {
                chunks.push(data);
            })
            .on("close", () => {
                res(Buffer.concat(chunks));
            });
    });
}

db.close();
