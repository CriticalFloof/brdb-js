const enum type {
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



export function decode_schema(data: Buffer): Object {

    const CONTAINER_ARRAY = false;
    const CONTAINER_MAP = true;

    let key_store: any = null;

    let output: any = null;
    let output_ref_stack: any[] = [];

    let container_stack: boolean[] = [];
    let index_stack: number[] = [];
    let lifetime_stack: number[] = [];

    let debug_arr: any[] = [];

    for (let i = 0; i < data.byteLength; i++) {

        const token: number = data[i];

        switch (token) {
            case type.nil: {
                store_value(null);
                break;
            }
            case type.neverused: {
                break;
            }
            case type.false: {
                store_value(false);
                break;
            }
            case type.true: {
                store_value(true);
                break;
            }
            case type.bin8: {
                const size = data.readUint8(i + 1);
                i++;

                const buffer = readBin(data, i, size);
                store_value(buffer)
                i += size;
                break;
            }
            case type.bin16: {
                const size = data.readUint16BE(i + 1);
                i += 2;

                const buffer = readBin(data, i, size);
                store_value(buffer)
                i += size;
                break;
            }
            case type.bin32: {
                const size = data.readUint32BE(i + 1);
                i += 4;

                const buffer = readBin(data, i, size);
                store_value(buffer)
                i += size;
                break;
            }
            case type.ext8: {
                console.log("Not Implemented!");
                const size = data.readUint8(i + 1);
                i += 1 + 1;

                i += size;
                break;
            }
            case type.ext16: {
                console.log("Not Implemented!");
                const size = data.readUint16BE(i + 1);
                i += 2 + 1;

                i += size;
                break;
            }
            case type.ext32: {
                console.log("Not Implemented!");
                const size = data.readUint32BE(i + 1);
                i += 4 + 1;

                i += size;
                break;
            }
            case type.float32: {
                store_value(data.readFloatBE(i + 1));
                i += 4;
                break;
            }
            case type.float64: {
                store_value(data.readDoubleBE(i + 1));
                i += 8;
                break;
            }
            case type.uint8: {
                store_value(data.readUint8(i + 1));
                i++;
                break;
            }
            case type.uint16: {
                store_value(data.readUInt16BE(i + 1));
                i += 2;
                break;
            }
            case type.uint32: {
                store_value(data.readUInt32BE(i + 1));
                i += 4;
                break;
            }
            case type.uint64: {
                store_value(data.readBigUInt64BE(i + 1));
                i += 8;
                break;
            }
            case type.int8: {
                store_value(data.readInt8(i + 1));
                i++;
                break;
            }
            case type.int16: {
                store_value(data.readInt16BE(i + 1));
                i += 2;
                break;
            }
            case type.int32: {
                store_value(data.readInt32BE(i + 1));
                i += 4;
                break;
            }
            case type.int64: {
                store_value(data.readBigInt64BE(i + 1));
                i += 8;
                break;
            }
            case type.fixext1: {
                console.log("Not Implemented!");
                i += 1 + 1;
                break;
            }
            case type.fixext2: {
                console.log("Not Implemented!");
                i += 2 + 1;
                break;
            }
            case type.fixext4: {
                console.log("Not Implemented!");
                i += 4 + 1;
                break;
            }
            case type.fixext8: {
                console.log("Not Implemented!");
                i += 8 + 1;
                break;
            }
            case type.fixext16: {
                console.log("Not Implemented!");
                i += 16 + 1;
                break;
            }
            case type.str8: {
                const size = data[i + 1];
                i++;

                const str = readStr(data, i + 1, size);
                store_value(str);
                i += size;
                break;
            }
            case type.str16: {
                const size = data.readUint16BE(i + 1);
                i += 2;

                const str = readStr(data, i + 1, size);
                store_value(str);
                i += size;
                break;
            }
            case type.str32: {
                const size = data.readUint32BE(i + 1);
                i += 4;

                const str = readStr(data, i + 1, size);
                store_value(str);
                i += size;
                break;
            }
            case type.array16: {
                const size = data.readUint16BE(i + 1);
                i += 2;

                store_value([]);
                add_scope(size);
                break;
            }
            case type.array32: {
                const size = data.readUint32BE(i + 1);
                i += 4;

                store_value([]);
                add_scope(size);
                break;
            }
            case type.map16: {
                const size = data.readUint16BE(i + 1);
                i += 2;

                store_value({});
                add_scope(size * 2);
                break;
            }
            case type.map32: {
                const size = data.readUint32BE(i + 1);
                i += 4;

                store_value({});
                add_scope(size * 2);
                break;
            }
            default: {
                if (token <= type.fixintp) {
                    store_value(token & 0x7f);

                } else if (token <= type.fixmap) {
                    store_value({});
                    add_scope((token & 0x0f) * 2);

                } else if (token <= type.fixarray) {
                    store_value([]);
                    add_scope(token & 0x0f);

                } else if (token <= type.fixstr) {
                    const size = (token & 0x1f);
                    const str = readStr(data, i + 1, size);
                    store_value(str);
                    i += size;
                } else {
                    store_value(-(token & 0x1f));
                }
            }
        }

        tick_scope();
    }

    function store_value(value: any) {

        debug_arr.push(value);

        if (output_ref_stack.length == 0) {
            output = value;
        } else if (container_stack[container_stack.length - 1] == CONTAINER_MAP) {
            if (index_stack[index_stack.length - 1] & 1) {
                output_ref_stack[output_ref_stack.length - 1][key_store] = value;
            } else {
                key_store = value;
            }
        } else {
            output_ref_stack[output_ref_stack.length - 1][index_stack[index_stack.length - 1]] = value;
        }
    }

    function add_scope(lifetime: number) {

        if (output_ref_stack.length == 0) {
            output_ref_stack.push(output);
        } else {
            if (container_stack[container_stack.length - 1] == CONTAINER_MAP) {
                output_ref_stack.push(output_ref_stack[output_ref_stack.length - 1][key_store]);
            } else {
                output_ref_stack.push(output_ref_stack[output_ref_stack.length - 1][index_stack[index_stack.length - 1]])
            }

        }

        index_stack.push(-1);
        lifetime_stack.push(lifetime);

        container_stack.push(output_ref_stack[output_ref_stack.length - 1] instanceof Array ? CONTAINER_ARRAY : CONTAINER_MAP);

    }

    function tick_scope() {

        while (lifetime_stack[lifetime_stack.length - 1] <= 0) {
            index_stack.pop();
            lifetime_stack.pop();
            container_stack.pop();
            output_ref_stack.pop();
        }

        lifetime_stack[lifetime_stack.length - 1]--;
        index_stack[index_stack.length - 1]++;
    }

    return output;
}

export function decode_raw(schema: Object, data: Buffer) {

    type RawDecoderStack = [{
        pushedBySchema: Boolean,
        schemaRef: Object;
        schemaIndex: number;
        maxSchemaIndex: number;
        outputRef: any;
        containedInMap: boolean;
    }]

    enum EContainer {
        none,
        array,
        flatarray,
        map
    }

    const CONTAINER_ARRAY = false;
    const CONTAINER_MAP = true;

    const structSchemas = schema[1];
    const structSchemasKeys = Object.keys(structSchemas);

    let msgpackLifetime: number = 0;

    // Stack preparation

    const startingSchemaStructKey = structSchemasKeys[structSchemasKeys.length - 1]

    let output: any = {};
    let stack: RawDecoderStack = [
        {
            pushedBySchema: true,
            schemaRef: structSchemas,
            schemaIndex: structSchemasKeys.length - 1,
            maxSchemaIndex: structSchemasKeys.length,
            outputRef: output,
            containedInMap: !(output instanceof Array)
        }
    ];

    output[startingSchemaStructKey] = {};

    stack.push({
        pushedBySchema: true,
        schemaRef: structSchemas[startingSchemaStructKey],
        schemaIndex: 0,
        maxSchemaIndex: Object.keys(structSchemas[startingSchemaStructKey]).length,
        outputRef: output[startingSchemaStructKey],
        containedInMap: !(stack[stack.length - 1].outputRef[startingSchemaStructKey] instanceof Array)
    });

    //



    for (let i = 0; i < data.byteLength; i++) {
        console.log("NEW ITERATION")
        
        console.dir(stack, {depth: 4});
        
        //console.dir(msgpackLifetime);
        if (msgpackLifetime <= 0) {
            // msgpack decoding has expired, brief with the schema for next orders.

            if ((i > 0 && stack[stack.length - 1].pushedBySchema == false) || stack[stack.length - 1].schemaIndex >= stack[stack.length - 1].maxSchemaIndex) {
                stack.pop();
                stack[stack.length - 1].schemaIndex++;
            }

            const stackInfo = stack[stack.length - 1];

            const schemaRefKeys = Object.keys(stackInfo.schemaRef);

            const expectedType = stackInfo.schemaRef[schemaRefKeys[stackInfo.schemaIndex]];
            let extractedKeyType: string = null;
            let extractedType: string = "";
            let containerEnum: EContainer = EContainer.none;
            // We can now check if expectedType is representing an array, map, flatarray, or basic type.

            if (typeof expectedType == 'string') {
                // We're expecting any tag based on the given string.
                extractedType = expectedType;
            } else if (expectedType instanceof Array && expectedType[expectedType.length - 1] == null) {
                // We're expecting a buffer tag, which has to be parsed with the sub-schema.
                // The sub-schema in this case is the current stackInfo.schemaRef[schemaRefKeys[stackInfo.schemaIndex]][0];
                extractedType = expectedType[0];
                containerEnum = EContainer.flatarray;
            } else if (expectedType instanceof Array) {
                // We're expecting an array tag which will tell us how many more msg tags we're encountering as well as it's inner type.
                // therefore any array tag will extend msgpackLifetime by it's size.
                extractedType = expectedType[0];
                containerEnum = EContainer.array;
            } else if (expectedType instanceof Object) {
                // We're expecting a map tag, which will tell us how many more msg tags we're encountering as well as key/value types.
                // therefore any array tag will extend msgpackLifetime by it's size * 2.

                extractedKeyType = expectedType[Object.keys(expectedType)[0]];
                extractedType = expectedType[Object.keys(expectedType)[1]];
                containerEnum = EContainer.map;
            }
            else {
                //console.log("Invalid.")
                //console.log(expectedType)
            }

            if (containerEnum == EContainer.map) {
                // msgpack should now expect alternating types
            } else if(containerEnum == EContainer.flatarray) {
                // msgpack should expect a buffer.
            } else {
                // msgpack should now expect 1 type.
                switch (extractedType) {
                    case 'bool':
                    case 'u8':
                    case 'u16':
                    case 'u32':
                    case 'u64':
                    case 'i8':
                    case 'i16':
                    case 'i32':
                    case 'i64':
                    case 'f32':
                    case 'f64':
                    case 'str':
                    case 'object':
                    case 'class': {
                        break;
                    }
                    default: {
                        // We've encountered a schema struct/enum.
                        break;
                    }
                }
            }

            msgpackLifetime++;
        }

        const token: number = data[i];

        switch (token) {
            case type.nil: {
                store_value(null);
                break;
            }
            case type.neverused: {
                break;
            }
            case type.false: {
                store_value(false);
                break;
            }
            case type.true: {
                store_value(true);
                break;
            }
            case type.bin8: {
                const size = data.readUint8(i + 1);
                i++;

                const buffer = readBin(data, i, size);
                store_value(buffer)
                i += size;
                break;
            }
            case type.bin16: {
                const size = data.readUint16BE(i + 1);
                i += 2;

                const buffer = readBin(data, i, size);
                store_value(buffer)
                i += size;
                break;
            }
            case type.bin32: {
                const size = data.readUint32BE(i + 1);
                i += 4;

                const buffer = readBin(data, i, size);
                store_value(buffer)
                i += size;
                break;
            }
            case type.ext8: {
                console.log("Not Implemented!");
                const size = data.readUint8(i + 1);
                i += 1 + 1;

                i += size;
                break;
            }
            case type.ext16: {
                console.log("Not Implemented!");
                const size = data.readUint16BE(i + 1);
                i += 2 + 1;

                i += size;
                break;
            }
            case type.ext32: {
                console.log("Not Implemented!");
                const size = data.readUint32BE(i + 1);
                i += 4 + 1;

                i += size;
                break;
            }
            case type.float32: {
                store_value(data.readFloatBE(i + 1));
                i += 4;
                break;
            }
            case type.float64: {
                store_value(data.readDoubleBE(i + 1));
                i += 8;
                break;
            }
            case type.uint8: {
                store_value(data.readUint8(i + 1));
                i++;
                break;
            }
            case type.uint16: {
                store_value(data.readUInt16BE(i + 1));
                i += 2;
                break;
            }
            case type.uint32: {
                store_value(data.readUInt32BE(i + 1));
                i += 4;
                break;
            }
            case type.uint64: {
                store_value(data.readBigUInt64BE(i + 1));
                i += 8;
                break;
            }
            case type.int8: {
                store_value(data.readInt8(i + 1));
                i++;
                break;
            }
            case type.int16: {
                store_value(data.readInt16BE(i + 1));
                i += 2;
                break;
            }
            case type.int32: {
                store_value(data.readInt32BE(i + 1));
                i += 4;
                break;
            }
            case type.int64: {
                store_value(data.readBigInt64BE(i + 1));
                i += 8;
                break;
            }
            case type.fixext1: {
                console.log("Not Implemented!");
                i += 1 + 1;
                break;
            }
            case type.fixext2: {
                console.log("Not Implemented!");
                i += 2 + 1;
                break;
            }
            case type.fixext4: {
                console.log("Not Implemented!");
                i += 4 + 1;
                break;
            }
            case type.fixext8: {
                console.log("Not Implemented!");
                i += 8 + 1;
                break;
            }
            case type.fixext16: {
                console.log("Not Implemented!");
                i += 16 + 1;
                break;
            }
            case type.str8: {
                const size = data[i + 1];
                i++;

                const str = readStr(data, i + 1, size);
                store_value(str);
                i += size;
                break;
            }
            case type.str16: {
                const size = data.readUint16BE(i + 1);
                i += 2;

                const str = readStr(data, i + 1, size);
                store_value(str);
                i += size;
                break;
            }
            case type.str32: {
                const size = data.readUint32BE(i + 1);
                i += 4;

                const str = readStr(data, i + 1, size);
                store_value(str);
                i += size;
                break;
            }
            case type.array16: {
                const size = data.readUint16BE(i + 1);
                i += 2;

                store_value([]);
                add_scope(size);
                break;
            }
            case type.array32: {
                const size = data.readUint32BE(i + 1);
                i += 4;

                store_value([]);
                add_scope(size);
                break;
            }
            case type.map16: {
                const size = data.readUint16BE(i + 1);
                i += 2;

                store_value({});
                add_scope(size * 2);
                break;
            }
            case type.map32: {
                const size = data.readUint32BE(i + 1);
                i += 4;

                store_value({});
                add_scope(size * 2);
                break;
            }
            default: {
                if (token <= type.fixintp) {
                    store_value(token & 0x7f);

                } else if (token <= type.fixmap) {
                    store_value({});
                    add_scope((token & 0x0f) * 2);

                } else if (token <= type.fixarray) {
                    store_value([]);
                    add_scope(token & 0x0f);

                } else if (token <= type.fixstr) {
                    const size = (token & 0x1f);
                    const str = readStr(data, i + 1, size);
                    store_value(str);
                    i += size;
                } else {
                    store_value(-(token & 0x1f));
                }
            }
        }

        tick_scope();
    }

    function store_value(value: any) {
        const stackInfo = stack[stack.length - 1];

        if (stackInfo.containedInMap) {
            const schemaRefKeys = Object.keys(stackInfo.schemaRef)

            stackInfo.outputRef[schemaRefKeys[stackInfo.schemaIndex]] = value;
        } else {
            stackInfo.outputRef[stackInfo.schemaIndex - 1] = value;
        }
    }

    function add_scope(lifetime: number) {
        msgpackLifetime += lifetime;

        const lastStack = stack[stack.length - 1];

        stack.push({
            pushedBySchema: false,
            schemaRef: lastStack.containedInMap ? lastStack.schemaRef[Object.keys(lastStack.schemaRef)[lastStack.schemaIndex]] : lastStack.schemaRef[lastStack.schemaIndex],
            schemaIndex: 0,
            maxSchemaIndex: lifetime,
            outputRef: lastStack.containedInMap ? lastStack.outputRef[Object.keys(lastStack.schemaRef)[lastStack.schemaIndex]] : lastStack.outputRef[lastStack.schemaIndex],
            containedInMap: !((lastStack.containedInMap ? lastStack.outputRef[Object.keys(lastStack.schemaRef)[lastStack.schemaIndex]] : lastStack.outputRef[lastStack.schemaIndex]) instanceof Array)
        });

    }

    function tick_scope() {
        msgpackLifetime--;
        stack[stack.length - 1].schemaIndex++;
    }

    //console.log("====OUTPUT====")
    //console.dir(output, {depth:null});

    return output;
}

function readStr(data: Buffer, offset: number, size: number): string {
    return data.subarray(offset, offset + size).toString('utf-8');
}

function readBin(data: Buffer, offset: number, size: number): Buffer {
    return data.subarray(offset, offset + size);
}