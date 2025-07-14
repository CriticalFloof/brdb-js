// Utility Functions for compressing and decompressing blobs using zstd compression.

import { Readable } from "node:stream";
import { ZSTDCompress, ZSTDDecompress } from "simple-zstd";

export function decompressBlob(blob: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((res, rej) => {
        let chunks: Buffer[] = [];

        Readable.from(blob)
            .pipe(ZSTDDecompress())
            .on("data", (data) => {
                chunks.push(data);
            })
            .on("close", () => {
                res(Buffer.concat(chunks));
            });
    });
}

export function compressBlob(blob: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((res, rej) => {
        let chunks: Buffer[] = [];

        Readable.from(blob)
            .pipe(ZSTDCompress())
            .on("data", (data) => {
                chunks.push(data);
            })
            .on("close", () => {
                res(Buffer.concat(chunks));
            });
    });
}