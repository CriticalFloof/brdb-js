import { Transform } from "node:stream";
import { TransformCallback } from "stream";

const enum msgpackType {
    fixintp = 0x7f,
    fixmap = 0x8f,
    fixarray = 0x9f,
    fixstr = 0xbf,
    nil = 0xc0,
    neverused = 0xc1,
    false = 0xc2,
    true = 0xc3,
    bin8 = 0xc4,
    bin16 = 0xc5,
    bin32 = 0xc6,
    ext8 = 0xc7,
    ext16 = 0xc8,
    ext32 = 0xc9,
    float32 = 0xca,
    float64 = 0xcb,
    uint8 = 0xcc,
    uint16 = 0xcd,
    uint32 = 0xce,
    uint64 = 0xcf,
    int8 = 0xd0,
    int16 = 0xd1,
    int32 = 0xd2,
    int64 = 0xd3,
    fixext1 = 0xd4,
    fixext2 = 0xd5,
    fixext4 = 0xd6,
    fixext8 = 0xd7,
    fixext16 = 0xd8,
    str8 = 0xd9,
    str16 = 0xda,
    str32 = 0xdb,
    array16 = 0xdc,
    array32 = 0xdd,
    map16 = 0xde,
    map32 = 0xdf,
    fixintn = 0xff
}

enum ReadStage {
    StaticQuery,
    DynamicQuery,
    Complete
}

type ContextStackFrame = {
    pendingReadStage: ReadStage;
    type: msgpackType | null;
    sizeLeft: number;
    value: any;
    objectKeyStorage?: any;
}

type TrackedBuffer = {
    readPtrPos: number;
    buf: Buffer;
}

export class MsgPackDecodeStream extends Transform {

    private bufferQueue: TrackedBuffer[] = [];
    private bufferQueueBytes: number = 0;

    private contextStack: ContextStackFrame[] = [];

    public constructor() {
        super({ objectMode: true });
    }

    public _transform(chunk: Buffer, _: BufferEncoding, callback: TransformCallback): void {
        // The process of reading a tag goes in most 4 stages:
        // Read the type tag, which is always 1 byte, and push to the context stack [Identification]
        // Then read the rest of the static info coupled to the tag we just read. [Static Query]
        // Finally, if we're in a tag container we repeat the other stages without popping off the stack until the read size is reached [Dynamic Query / Tag Container]
        // If we're not in a tag container then we continuously read a set size of bytes until the read size is reached. [Dynamic Query / Buffer Container]
        // Once finished, we pop off context stack, and repeat everything until no more data. [Complete]

        // The Static Query stage only relies upon the type that we read in the ID stage.
        // The Dynamic Query stage only relies upon the size that we read in either the ID or Static Query stage.
        // Therefore it's possible to either skip Dynamic Query if there's no size information,
        // or skip Static Query if the type read has no extra static info such as fixtypes.

        this.bufferQueue.push({ buf: chunk, readPtrPos: 0 });
        this.bufferQueueBytes += chunk.byteLength;


        let nextQuerySize: number = this.getNextQuerySize();
        while (this.bufferQueueBytes >= nextQuerySize) {
            

            //console.log("QUERY " + nextQuerySize)
            //console.log("FREE BYTES " + this.bufferQueueBytes)

            const msgpackData: Buffer = this.eatBufferQueue(nextQuerySize);
            const result = this.advanceContext(msgpackData);

            if (result !== undefined) {
                this.push(result);
            }
            nextQuerySize = this.getNextQuerySize();
            //console.log("QUERY " + nextQuerySize)
            //console.log("FREE BYTES AFTER " + this.bufferQueueBytes)
            //console.log("======")
            //console.log("SNAP")
            //console.dir(this.contextStack, {depth:null})
        }
    }

    private getNextQuerySize(): number {
        if (this.contextStack.length === 0) return 1;


        let currentContext: ContextStackFrame = this.contextStack[this.contextStack.length - 1];

        switch (currentContext.pendingReadStage) {
            case (ReadStage.StaticQuery): {
                return msgpackStaticQuerySize(currentContext.type);
            }
            case (ReadStage.DynamicQuery): {
                if (msgpackIsTagContainer(currentContext.type)) {
                    return 1;
                } else {
                    return currentContext.sizeLeft;
                }

            }
            case (ReadStage.Complete): {
                // If we ever read this, then the context stack wasn't cleared correctly
                throw new Error("Invalid Stack Stage");
            }
        }
    }

    private advanceContext(readContents: Buffer): any {
        let outputObject = undefined;

        if (this.contextStack.length === 0) {
            // We should be reading an ID.
            if (readContents.byteLength !== 1) {
                throw new Error("Buffer Data is not a msgpack tag when expected");
            }
            const readTag: number = readContents.readUint8();
            this.contextStack.push(msgpackTagToContextFrame(readTag));
            let currentContext: ContextStackFrame = this.contextStack[this.contextStack.length - 1];
            if (msgpackIsTagContainer(currentContext.type) && currentContext.sizeLeft < 1) {
                currentContext.pendingReadStage = ReadStage.Complete;
            }

            if (this.contextStack[0].pendingReadStage !== ReadStage.Complete) {
                return undefined;
            }
        }

        let needData = false;
        while (!needData) {
            let currentContext: ContextStackFrame = this.contextStack[this.contextStack.length - 1];

            switch (currentContext.pendingReadStage) {
                case (ReadStage.StaticQuery): {
                    // We should be reading exttype, size or value data based on current context's type.

                    msgpackParseStaticQuery(currentContext, readContents)
                    break;
                }
                case (ReadStage.DynamicQuery): {
                    // We are either reading a continuous buffer (str/bin/ext) or more tags (array/map)

                    if (msgpackIsTagContainer(currentContext.type)) {
                        // We should be reading an ID.
                        if (readContents.byteLength !== 1) {
                            throw new Error("Buffer Data is not a msgpack tag when expected");
                        }
                        const readTag: number = readContents.readUint8();
                        this.contextStack.push(msgpackTagToContextFrame(readTag));
                        currentContext = this.contextStack[this.contextStack.length - 1];
                        if (msgpackIsTagContainer(currentContext.type) && currentContext.sizeLeft < 1) {
                            currentContext.pendingReadStage = ReadStage.Complete;
                        }
                    } else {
                        msgpackParseDynamicQuery(currentContext, readContents);
                    }
                    break;
                }
                case (ReadStage.Complete): {
                    // Data is complete, move the data and pop the context off the stack.

                    if (this.contextStack.length > 1) {
                        // The data we're about to pop can be stored in a parent context.

                        const parentContext: ContextStackFrame = this.contextStack[this.contextStack.length - 2];

                        if (parentContext.type === msgpackType.fixarray || parentContext.type === msgpackType.array16 || parentContext.type === msgpackType.array32) {
                            parentContext.value.push(currentContext.value);
                        } else if (parentContext.type === msgpackType.fixmap || parentContext.type === msgpackType.map16 || parentContext.type === msgpackType.map32) {
                            if (parentContext.sizeLeft & 1) {
                                parentContext.value[parentContext.objectKeyStorage] = currentContext.value;
                            } else {
                                parentContext.objectKeyStorage = currentContext.value;
                            }
                        } else {
                            throw new Error("Why is the parent context not a container??")
                        }

                        parentContext.sizeLeft -= 1;
                        if (parentContext.sizeLeft <= 0) {
                            parentContext.pendingReadStage = ReadStage.Complete;
                        }
                    } else {
                        // No parent context means that this object is ready to be pushed out of the stream.

                        outputObject = this.contextStack[this.contextStack.length - 1].value;
                    }

                    this.contextStack.pop();
                    currentContext = this.contextStack[this.contextStack.length - 1];
                    break;
                }
            }


            if (currentContext === undefined || currentContext.pendingReadStage !== ReadStage.Complete) {
                needData = true;
            } else {
                needData = false;
            }
        }

        return outputObject;
    }

    private eatBufferQueue(bytes: number): Buffer {
        if (bytes > this.bufferQueueBytes) {
            throw new Error("Unable to request more bytes than the BufferQueue contains.")
        }

        let bytesLeft: number = bytes;
        let outputBuffer: Buffer = Buffer.alloc(bytes);

        const MAX_ITER = 4_294_967_296;
        for (let i = 0; i < MAX_ITER; i++) {
            let currentBuffer: TrackedBuffer = this.bufferQueue[0];
            if (currentBuffer.buf.byteLength - currentBuffer.readPtrPos >= bytesLeft) {
                // We can read all we need from the current buffer
                currentBuffer.buf.copy(outputBuffer, bytes - bytesLeft, currentBuffer.readPtrPos, currentBuffer.readPtrPos + bytesLeft);
                this.bufferQueueBytes -= bytesLeft;
                currentBuffer.readPtrPos += bytesLeft;
                return outputBuffer;

            } else {
                // We can read the entire buffer, but we need the next buffer to grab more information.
                currentBuffer.buf.copy(outputBuffer, bytes - bytesLeft, currentBuffer.readPtrPos, currentBuffer.buf.byteLength)
                this.bufferQueueBytes -= currentBuffer.readPtrPos - currentBuffer.buf.byteLength;
                bytesLeft -= currentBuffer.readPtrPos - currentBuffer.buf.byteLength;
                this.bufferQueue.shift();
            }
        }

        throw new Error("Max Iterations Exceeded!")
    }
}

function msgpackStaticQuerySize(type: msgpackType): number {
    switch (type) {
        case msgpackType.fixintp: return 0;
        case msgpackType.fixmap: return 0;
        case msgpackType.fixarray: return 0;
        case msgpackType.fixstr: return 0;
        case msgpackType.nil: return 0;
        case msgpackType.neverused: return 0;
        case msgpackType.false: return 0;
        case msgpackType.true: return 0;
        case msgpackType.bin8: return 1;
        case msgpackType.bin16: return 2;
        case msgpackType.bin32: return 4;
        case msgpackType.ext8: return 2;
        case msgpackType.ext16: return 3;
        case msgpackType.ext32: return 5;
        case msgpackType.float32: return 4;
        case msgpackType.float64: return 8;
        case msgpackType.uint8: return 1;
        case msgpackType.uint16: return 2;
        case msgpackType.uint32: return 4;
        case msgpackType.uint64: return 8;
        case msgpackType.int8: return 1;
        case msgpackType.int16: return 2;
        case msgpackType.int32: return 4;
        case msgpackType.int64: return 8;
        case msgpackType.fixext1: return 2;
        case msgpackType.fixext2: return 3;
        case msgpackType.fixext4: return 5;
        case msgpackType.fixext8: return 9;
        case msgpackType.fixext16: return 17;
        case msgpackType.str8: return 1;
        case msgpackType.str16: return 2;
        case msgpackType.str32: return 4;
        case msgpackType.array16: return 2;
        case msgpackType.array32: return 4;
        case msgpackType.map16: return 2;
        case msgpackType.map32: return 4;
        case msgpackType.fixintn: return 0;
    }
}

function msgpackParseStaticQuery(context: ContextStackFrame, data: Buffer) {
    const expectedSize = msgpackStaticQuerySize(context.type);
    if (data.byteLength !== expectedSize) {
        throw new Error("Buffer Data is not expected size.");
    }

    switch (context.type) {
        case (msgpackType.fixintp):
        case (msgpackType.fixmap):
        case (msgpackType.fixarray):
        case (msgpackType.fixstr):
        case (msgpackType.nil):
        case (msgpackType.neverused):
        case (msgpackType.false):
        case (msgpackType.true):
        case (msgpackType.fixintn): {
            throw new Error("Invalid State");
        }
        case (msgpackType.bin8): {
            context.sizeLeft = data.readUint8();
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.bin16): {
            context.sizeLeft = data.readUint16BE();
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.bin32): {
            context.sizeLeft = data.readUint32BE();
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.ext8): {
            context.sizeLeft = data.readUint8();
            //data.readUint8(expectedSize - 1); // type
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.ext16): {
            context.sizeLeft = data.readUint16BE();
            //data.readUint8(expectedSize - 1); // type
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.ext32): {
            context.sizeLeft = data.readUint32BE();
            //data.readUint8(expectedSize - 1); // type
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.float32): {
            context.value = data.readFloatBE();
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.float64): {
            context.value = data.readDoubleBE();
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.uint8): {
            context.value = data.readUInt8();
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.uint16): {
            context.value = data.readUint16BE();
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.uint32): {
            context.value = data.readUint32BE();
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.uint64): {
            context.value = data.readBigUint64BE();
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.int8): {
            context.value = data.readInt8();
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.int16): {
            context.value = data.readInt16BE();
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.int32): {
            context.value = data.readInt32BE();
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.int64): {
            context.value = data.readBigInt64BE();
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.fixext1):
        case (msgpackType.fixext2):
        case (msgpackType.fixext4):
        case (msgpackType.fixext8):
        case (msgpackType.fixext16): {
            //data.readUint8(); // type
            context.value = data.subarray(1);
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.str8): {
            context.sizeLeft = data.readUint8();
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.str16): {
            context.sizeLeft = data.readUint16BE();
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.str32): {
            context.sizeLeft = data.readUint32BE();
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.array16): {
            context.sizeLeft = data.readUint16BE();
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.array32): {
            context.sizeLeft = data.readUint32BE();
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.map16): {
            context.sizeLeft = data.readUint16BE() * 2;
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }
        case (msgpackType.map32): {
            context.sizeLeft = data.readUint32BE() * 2;
            context.pendingReadStage = ReadStage.DynamicQuery;
            break;
        }

    }

}

function msgpackParseDynamicQuery(context: ContextStackFrame, data: Buffer) {
    if (data.byteLength !== context.sizeLeft) {
        throw new Error("Buffer Data is not expected size.");
    }

    switch (context.type) {
        case (msgpackType.fixintp):
        case (msgpackType.nil):
        case (msgpackType.neverused):
        case (msgpackType.false):
        case (msgpackType.true):
        case (msgpackType.fixintn):
        case (msgpackType.float32):
        case (msgpackType.float64):
        case (msgpackType.uint8):
        case (msgpackType.uint16):
        case (msgpackType.uint32):
        case (msgpackType.uint64):
        case (msgpackType.int8):
        case (msgpackType.int16):
        case (msgpackType.int32):
        case (msgpackType.int64):
        case (msgpackType.fixext1):
        case (msgpackType.fixext2):
        case (msgpackType.fixext4):
        case (msgpackType.fixext8):
        case (msgpackType.fixext16):
        case (msgpackType.fixarray):
        case (msgpackType.fixmap):
        case (msgpackType.array16):
        case (msgpackType.array32):
        case (msgpackType.map16):
        case (msgpackType.map32): {
            throw new Error("Invalid State");
        }
        case (msgpackType.fixstr): {
            context.sizeLeft = 0;
            context.value = data.toString('utf-8');
            
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.bin8): {
            context.sizeLeft = 0;
            context.value = data;
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.bin16): {
            context.sizeLeft = 0;
            context.value = data;
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.bin32): {
            context.sizeLeft = 0;
            context.value = data;
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.ext8): {
            context.sizeLeft = 0;
            context.value = data;
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.ext16): {
            context.sizeLeft = 0;
            context.value = data;
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.ext32): {
            context.sizeLeft = 0;
            context.value = data;
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.str8): {
            context.sizeLeft = 0;
            context.value = data.toString('utf-8');
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.str16): {
            context.sizeLeft = 0;
            context.value = data.toString('utf-8');
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
        case (msgpackType.str32): {
            context.sizeLeft = 0;
            context.value = data.toString('utf-8');
            context.pendingReadStage = ReadStage.Complete;
            break;
        }
    }

}

function msgpackIsTagContainer(type: msgpackType): boolean {
    switch (type) {
        case msgpackType.fixintp: return false;
        case msgpackType.fixmap: return true;
        case msgpackType.fixarray: return true;
        case msgpackType.fixstr: return false;
        case msgpackType.nil: return false;
        case msgpackType.neverused: return false;
        case msgpackType.false: return false;
        case msgpackType.true: return false;
        case msgpackType.bin8: return false;
        case msgpackType.bin16: return false;
        case msgpackType.bin32: return false;
        case msgpackType.ext8: return false;
        case msgpackType.ext16: return false;
        case msgpackType.ext32: return false;
        case msgpackType.float32: return false;
        case msgpackType.float64: return false;
        case msgpackType.uint8: return false;
        case msgpackType.uint16: return false;
        case msgpackType.uint32: return false;
        case msgpackType.uint64: return false;
        case msgpackType.int8: return false;
        case msgpackType.int16: return false;
        case msgpackType.int32: return false;
        case msgpackType.int64: return false;
        case msgpackType.fixext1: return false;
        case msgpackType.fixext2: return false;
        case msgpackType.fixext4: return false;
        case msgpackType.fixext8: return false;
        case msgpackType.fixext16: return false;
        case msgpackType.str8: return false;
        case msgpackType.str16: return false;
        case msgpackType.str32: return false;
        case msgpackType.array16: return true;
        case msgpackType.array32: return true;
        case msgpackType.map16: return true;
        case msgpackType.map32: return true;
        case msgpackType.fixintn: return false;
    }
}

function msgpackTagToContextFrame(tag: number): ContextStackFrame {

    const msgpackTypeValues: number[] = [
        msgpackType.fixintp,
        msgpackType.fixmap,
        msgpackType.fixarray,
        msgpackType.fixstr,
        msgpackType.nil,
        msgpackType.neverused,
        msgpackType.false,
        msgpackType.true,
        msgpackType.bin8,
        msgpackType.bin16,
        msgpackType.bin32,
        msgpackType.ext8,
        msgpackType.ext16,
        msgpackType.ext32,
        msgpackType.float32,
        msgpackType.float64,
        msgpackType.uint8,
        msgpackType.uint16,
        msgpackType.uint32,
        msgpackType.uint64,
        msgpackType.int8,
        msgpackType.int16,
        msgpackType.int32,
        msgpackType.int64,
        msgpackType.fixext1,
        msgpackType.fixext2,
        msgpackType.fixext4,
        msgpackType.fixext8,
        msgpackType.fixext16,
        msgpackType.str8,
        msgpackType.str16,
        msgpackType.str32,
        msgpackType.array16,
        msgpackType.array32,
        msgpackType.map16,
        msgpackType.map32,
        msgpackType.fixintn
    ]
    let deducedType: msgpackType;
    for (let i = 0; i < msgpackTypeValues.length; i++) {
        if (tag <= msgpackTypeValues[i]) {
            deducedType = msgpackTypeValues[i];
            break;
        }
    }

    let contextFrame: ContextStackFrame;

    switch (deducedType) {
        case (msgpackType.fixintp): {
            contextFrame = {
                pendingReadStage: ReadStage.Complete,
                type: deducedType,
                sizeLeft: 0,
                value: (tag & 0x7f)
            }
            break;
        }
        case (msgpackType.fixmap): {
            contextFrame = {
                pendingReadStage: ReadStage.DynamicQuery,
                type: deducedType,
                sizeLeft: (tag & 0x0f) * 2,
                value: {},
            }
            break;
        }
        case (msgpackType.fixarray): {
            contextFrame = {
                pendingReadStage: ReadStage.DynamicQuery,
                type: deducedType,
                sizeLeft: (tag & 0x0f),
                value: [],
            }
            break;
        }
        case (msgpackType.fixstr): {
            contextFrame = {
                pendingReadStage: ReadStage.DynamicQuery,
                type: deducedType,
                sizeLeft: (tag & 0x1f),
                value: "",
            }
            break;
        }
        case (msgpackType.nil): {
            contextFrame = {
                pendingReadStage: ReadStage.Complete,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.neverused): {
            contextFrame = {
                pendingReadStage: ReadStage.Complete,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.false): {
            contextFrame = {
                pendingReadStage: ReadStage.Complete,
                type: deducedType,
                sizeLeft: 0,
                value: false,
            }
            break;
        }
        case (msgpackType.true): {
            contextFrame = {
                pendingReadStage: ReadStage.Complete,
                type: deducedType,
                sizeLeft: 0,
                value: true,
            }
            break;
        }
        case (msgpackType.bin8): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.bin16): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.bin32): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.ext8): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.ext16): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.ext32): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.float32): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.float64): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.uint8): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.uint16): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.uint32): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null
            }
            break;
        }
        case (msgpackType.uint64): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.int8): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.int16): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.int32): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.int64): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.fixext1): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.fixext2): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.fixext4): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.fixext8): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.fixext16): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: null,
            }
            break;
        }
        case (msgpackType.str8): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: "",
            }
            break;
        }
        case (msgpackType.str16): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: "",
            }
            break;
        }
        case (msgpackType.str32): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: "",
            }
            break;
        }
        case (msgpackType.array16): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: [],
            }
            break;
        }
        case (msgpackType.array32): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: [],
            }
            break;
        }
        case (msgpackType.map16): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: {},
            }
            break;
        }
        case (msgpackType.map32): {
            contextFrame = {
                pendingReadStage: ReadStage.StaticQuery,
                type: deducedType,
                sizeLeft: 0,
                value: {},
            }
            break;
        }
        case (msgpackType.fixintn): {
            contextFrame = {
                pendingReadStage: ReadStage.Complete,
                type: deducedType,
                sizeLeft: 0,
                value: -(tag & 0x1f),
            }
            break;
        }
    }

    return contextFrame;
}

function getTypeDebug(num: number): string {

    switch (num) {
        case msgpackType.fixintp: return "fixintp  ";
        case msgpackType.fixmap: return "fixmap   ";
        case msgpackType.fixarray: return "fixarray ";
        case msgpackType.fixstr: return "fixstr   ";
        case msgpackType.nil: return "nil      ";
        case msgpackType.neverused: return "neverused";
        case msgpackType.false: return "false    ";
        case msgpackType.true: return "true     ";
        case msgpackType.bin8: return "bin8     ";
        case msgpackType.bin16: return "bin16    ";
        case msgpackType.bin32: return "bin32    ";
        case msgpackType.ext8: return "ext8     ";
        case msgpackType.ext16: return "ext16    ";
        case msgpackType.ext32: return "ext32    ";
        case msgpackType.float32: return "float32  ";
        case msgpackType.float64: return "float64  ";
        case msgpackType.uint8: return "uint8    ";
        case msgpackType.uint16: return "uint16   ";
        case msgpackType.uint32: return "uint32   ";
        case msgpackType.uint64: return "uint64   ";
        case msgpackType.int8: return "int8     ";
        case msgpackType.int16: return "int16    ";
        case msgpackType.int32: return "int32    ";
        case msgpackType.int64: return "int64    ";
        case msgpackType.fixext1: return "fixext1  ";
        case msgpackType.fixext2: return "fixext2  ";
        case msgpackType.fixext4: return "fixext4  ";
        case msgpackType.fixext8: return "fixext8  ";
        case msgpackType.fixext16: return "fixext16 ";
        case msgpackType.str8: return "str8     ";
        case msgpackType.str16: return "str16    ";
        case msgpackType.str32: return "str32    ";
        case msgpackType.array16: return "array16  ";
        case msgpackType.array32: return "array32  ";
        case msgpackType.map16: return "map16    ";
        case msgpackType.map32: return "map32    ";
        case msgpackType.fixintn: return "fixintn  ";
    }
}