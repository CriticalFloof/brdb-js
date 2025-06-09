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

    type TagInfo = {
        type: type,
        value: any,
        size: number
    }

    const structDefinitions: Object[] = schema[1];
    const structDefinitionsKeys: string[] = Object.keys(structDefinitions)
    const startStruct = structDefinitions[structDefinitionsKeys[structDefinitionsKeys.length - 1]];

    let output = {}
    output[structDefinitionsKeys[structDefinitionsKeys.length - 1]] = {}

    let dataIndex: number = 0;


    function recursive_decode(inputSchemaStruct: Object, outputRef: Object, insideArray: boolean = false, repeat: number = 1) {

        const inputSchemaKeys = Object.keys(inputSchemaStruct)

        const iterations = insideArray ? 1 : inputSchemaKeys.length;
        for (let i = 0; i < iterations; i++) {
            const schemaFieldName = inputSchemaKeys[i];
            const schemaEntryType = inputSchemaStruct[schemaFieldName];
            //console.log(schemaEntryType)
            //console.log("INPUT STRUCT")
            //console.log(inputSchemaStruct)

            for (let j = 0; j < repeat; j++) {
                
                if(insideArray && schemaFieldName != '_primitive') {
                    //console.log("Forced Struct Array Scope")
                    //console.log(inputSchemaStruct)
                    //console.log(schemaFieldName)
                    outputRef[j] = {};
                    recursive_decode(inputSchemaStruct, outputRef[j], false);
                    //console.log("Dive Out!!! 1")
                    continue;
                }

                if (schemaEntryType instanceof Array) {
                    const tag = readNextTag();
                    //console.log(`${getType(tag.type)} | ${tag.size} | ${tag.value}`)

                    if (schemaEntryType.length == 1) {
                        //console.log("Array Path")
                        outputRef[schemaFieldName] = [];

                        if (isPrimitiveType(schemaEntryType[0])) {
                            //console.log("Primitive Branch")
                            //console.log(repeat)
                            //console.log(tag.size)
                            recursive_decode({ "_primitive": schemaEntryType[0] }, outputRef[schemaFieldName], true, tag.size);
                        } else {
                            //console.log("Struct Branch")
                            //console.log(repeat)
                            //console.log(tag.size)
                            recursive_decode(structDefinitions[schemaEntryType[0]], outputRef[schemaFieldName], true, tag.size);
                        }

                    } else {
                        outputRef[schemaFieldName] = tag.value;
                        //console.log("Buffer Path")
                    }
                } else {
                    //console.log("Property Path")
                    const tag = readNextTag();
                    if(insideArray) {
                        outputRef[j] = tag.value;
                    } else {
                        outputRef[schemaFieldName] = tag.value;
                    }
                    //console.log(`${getType(tag.type)} | ${tag.size} | ${tag.value}`)
                }
            }
        }


        /*
        console.log(data.byteLength)
        while (dataIndex < data.byteLength) {
            const tag = readNextTag();
            console.log(`${getType(tag.type)} | ${tag.size} | ${tag.value}`)
        }
        */
    }
    recursive_decode(startStruct, output[structDefinitionsKeys[structDefinitionsKeys.length - 1]]);

    function readNextTag(): TagInfo {
        const token: number = data[dataIndex];

        let tagInfo: TagInfo = {
            type: type.neverused,
            value: null,
            size: null
        }

        switch (token) {
            case type.nil: {
                tagInfo.type = type.nil;
            }
            case type.neverused: {
                break;
            }
            case type.false: {
                tagInfo.type = type.false;
                break;
            }
            case type.true: {
                tagInfo.type = type.true;
                break;
            }
            case type.bin8: {
                const size = data.readUint8(dataIndex + 1);
                dataIndex++;

                const buffer = readBin(data, dataIndex, size);
                tagInfo.type = type.bin8;
                tagInfo.value = buffer;
                tagInfo.size = size;

                dataIndex += size;
                break;
            }
            case type.bin16: {
                const size = data.readUint16BE(dataIndex + 1);
                dataIndex += 2;

                const buffer = readBin(data, dataIndex, size);
                tagInfo.type = type.bin8;
                tagInfo.value = buffer;
                tagInfo.size = size;
                dataIndex += size;
                break;
            }
            case type.bin32: {
                const size = data.readUint32BE(dataIndex + 1);
                dataIndex += 4;

                const buffer = readBin(data, dataIndex, size);
                tagInfo.type = type.bin8;
                tagInfo.value = buffer;
                tagInfo.size = size;
                dataIndex += size;
                break;
            }
            case type.ext8: {
                console.log("Not Implemented!");
                const size = data.readUint8(dataIndex + 1);
                dataIndex += 1 + 1;

                dataIndex += size;
                break;
            }
            case type.ext16: {
                console.log("Not Implemented!");
                const size = data.readUint16BE(dataIndex + 1);
                dataIndex += 2 + 1;

                dataIndex += size;
                break;
            }
            case type.ext32: {
                console.log("Not Implemented!");
                const size = data.readUint32BE(dataIndex + 1);
                dataIndex += 4 + 1;

                dataIndex += size;
                break;
            }
            case type.float32: {
                tagInfo.type = type.float32;
                tagInfo.value = data.readFloatBE(dataIndex + 1);
                dataIndex += 4;
                break;
            }
            case type.float64: {
                tagInfo.type = type.float64;
                tagInfo.value = data.readDoubleBE(dataIndex + 1);
                dataIndex += 8;
                break;
            }
            case type.uint8: {
                tagInfo.type = type.uint8;
                tagInfo.value = data.readUint8(dataIndex + 1);
                dataIndex++;
                break;
            }
            case type.uint16: {
                tagInfo.type = type.uint16;
                tagInfo.value = data.readUint16BE(dataIndex + 1);
                dataIndex += 2;
                break;
            }
            case type.uint32: {
                tagInfo.type = type.uint32;
                tagInfo.value = data.readUint32BE(dataIndex + 1);
                dataIndex += 4;
                break;
            }
            case type.uint64: {
                tagInfo.type = type.uint64;
                tagInfo.value = data.readBigUInt64BE(dataIndex + 1);
                dataIndex += 8;
                break;
            }
            case type.int8: {
                tagInfo.type = type.int8;
                tagInfo.value = data.readInt8(dataIndex + 1);
                dataIndex++;
                break;
            }
            case type.int16: {
                tagInfo.type = type.int16;
                tagInfo.value = data.readInt16BE(dataIndex + 1);
                dataIndex += 2;
                break;
            }
            case type.int32: {
                tagInfo.type = type.int32;
                tagInfo.value = data.readInt32BE(dataIndex + 1);
                dataIndex += 4;
                break;
            }
            case type.int64: {
                tagInfo.type = type.int64;
                tagInfo.value = data.readBigInt64BE(dataIndex + 1);
                dataIndex += 8;
                break;
            }
            case type.fixext1: {
                console.log("Not Implemented!");
                dataIndex += 1 + 1;
                break;
            }
            case type.fixext2: {
                console.log("Not Implemented!");
                dataIndex += 2 + 1;
                break;
            }
            case type.fixext4: {
                console.log("Not Implemented!");
                dataIndex += 4 + 1;
                break;
            }
            case type.fixext8: {
                console.log("Not Implemented!");
                dataIndex += 8 + 1;
                break;
            }
            case type.fixext16: {
                console.log("Not Implemented!");
                dataIndex += 16 + 1;
                break;
            }
            case type.str8: {
                const size = data[dataIndex + 1];
                dataIndex++;

                const str = readStr(data, dataIndex + 1, size);
                tagInfo.type = type.str8;
                tagInfo.value = str;
                tagInfo.size = size;

                dataIndex += size;
                break;
            }
            case type.str16: {
                const size = data.readUint16BE(dataIndex + 1);
                dataIndex += 2;

                const str = readStr(data, dataIndex + 1, size);
                tagInfo.type = type.str16;
                tagInfo.value = str;
                tagInfo.size = size;
                dataIndex += size;
                break;
            }
            case type.str32: {
                const size = data.readUint32BE(dataIndex + 1);
                dataIndex += 4;

                const str = readStr(data, dataIndex + 1, size);
                tagInfo.type = type.str32;
                tagInfo.value = str;
                tagInfo.size = size;
                dataIndex += size;
                break;
            }
            case type.array16: {
                const size = data.readUint16BE(dataIndex + 1);
                dataIndex += 2;

                tagInfo.type = type.array16;
                tagInfo.size = size;

                break;
            }
            case type.array32: {
                const size = data.readUint32BE(dataIndex + 1);
                dataIndex += 4;

                tagInfo.type = type.array32;
                tagInfo.size = size;

                break;
            }
            case type.map16: {
                const size = data.readUint16BE(dataIndex + 1);
                dataIndex += 2;

                tagInfo.type = type.map16;
                tagInfo.size = size;
                break;
            }
            case type.map32: {
                const size = data.readUint32BE(dataIndex + 1);
                dataIndex += 4;

                tagInfo.type = type.map32;
                tagInfo.size = size;
                break;
            }
            default: {
                if (token <= type.fixintp) {
                    tagInfo.type = type.fixintp
                    tagInfo.value = (token & 0x7f)

                } else if (token <= type.fixmap) {
                    tagInfo.type = type.fixmap
                    tagInfo.size = (token & 0x0f)

                } else if (token <= type.fixarray) {
                    tagInfo.type = type.fixarray
                    tagInfo.size = (token & 0x0f)

                } else if (token <= type.fixstr) {
                    const size = (token & 0x1f);
                    const str = readStr(data, dataIndex + 1, size);
                    tagInfo.type = type.fixstr
                    tagInfo.size = (token & 0x1f)
                    tagInfo.value = str

                    dataIndex += size;
                } else {
                    tagInfo.type = type.fixintn
                    tagInfo.value = -(token & 0x1f)
                }
            }
        }

        dataIndex++
        return tagInfo;
    }

    return output;
}

function readStr(data: Buffer, offset: number, size: number): string {
    return data.subarray(offset, offset + size).toString('utf-8');
}

function readBin(data: Buffer, offset: number, size: number): Buffer {
    return data.subarray(offset, offset + size);
}

function isPrimitiveType(str: string): boolean {
    switch (str) {
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
            return true
        }
        default: {

            return false
        }
    }
}

function getType(num: number): string {

    switch (num) {
        case type.fixintp: return "fixintp  ";
        case type.fixmap: return "fixmap   ";
        case type.fixarray: return "fixarray ";
        case type.fixstr: return "fixstr   ";
        case type.nil: return "nil      ";
        case type.neverused: return "neverused";
        case type.false: return "false    ";
        case type.true: return "true     ";
        case type.bin8: return "bin8     ";
        case type.bin16: return "bin16    ";
        case type.bin32: return "bin32    ";
        case type.ext8: return "ext8     ";
        case type.ext16: return "ext16    ";
        case type.ext32: return "ext32    ";
        case type.float32: return "float32  ";
        case type.float64: return "float64  ";
        case type.uint8: return "uint8    ";
        case type.uint16: return "uint16   ";
        case type.uint32: return "uint32   ";
        case type.uint64: return "uint64   ";
        case type.int8: return "int8     ";
        case type.int16: return "int16    ";
        case type.int32: return "int32    ";
        case type.int64: return "int64    ";
        case type.fixext1: return "fixext1  ";
        case type.fixext2: return "fixext2  ";
        case type.fixext4: return "fixext4  ";
        case type.fixext8: return "fixext8  ";
        case type.fixext16: return "fixext16 ";
        case type.str8: return "str8     ";
        case type.str16: return "str16    ";
        case type.str32: return "str32    ";
        case type.array16: return "array16  ";
        case type.array32: return "array32  ";
        case type.map16: return "map16    ";
        case type.map32: return "map32    ";
        case type.fixintn: return "fixintn  ";
    }
}