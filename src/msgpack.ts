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
    //console.log("Running!!!");

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
                //console.log("nil");
                store_value(null);
                break;
            }
            case type.neverused: {
                //console.log("neverused");
                break;
            }
            case type.false: {
                //console.log("false");
                store_value(false);
                break;
            }
            case type.true: {
                //console.log("true");
                store_value(true);
                break;
            }
            case type.bin8: {
                //console.log("bin8");
                const size = data.readUint8(i + 1);
                i++;
                const buffer = readBin(data, i, size);
                store_value(buffer)
                //console.log(buffer);

                i += size;
                break;
            }
            case type.bin16: {
                //console.log("bin16");
                const size = data.readUint16BE(i + 1);
                i += 2;
                const buffer = readBin(data, i, size);
                store_value(buffer)
                //console.log(buffer);

                i += size;
                break;
            }
            case type.bin32: {
                //console.log("bin32");
                const size = data.readUint32BE(i + 1);
                i += 4;
                const buffer = readBin(data, i, size);
                store_value(buffer)

                i += size;
                break;
            }
            case type.ext8: {
                //console.log("ext8");
                const size = data.readUint8(i + 1);
                i += 2;

                i += size;
                break;
            }
            case type.ext16: {
                //console.log("ext16");
                const size = data.readUint16BE(i + 1);
                i += 3;

                i += size;
                break;
            }
            case type.ext32: {
                //console.log("ext32");
                const size = data.readUint32BE(i + 1);
                i += 5;

                i += size;
                break;
            }
            case type.float32: {
                //console.log("float32");
                i += 4;
                break;
            }
            case type.float64: {
                //console.log("float64");
                i += 8;
                break;
            }
            case type.uint8: {
                //console.log("uint8");
                store_value(data.readUint8(i + 1));
                i++;
                break;
            }
            case type.uint16: {
                //console.log("uint16");
                store_value(data.readUInt16BE(i + 1));
                i += 2;
                break;
            }
            case type.uint32: {
                //console.log("uint32");
                store_value(data.readUInt32BE(i + 1));
                i += 4;
                break;
            }
            case type.uint64: {
                //console.log("uint64");
                store_value(data.readBigUInt64BE(i + 1));
                i += 8;
                break;
            }
            case type.int8: {
                //console.log("int8");
                //const int: number = data[i + 1];
                store_value(data.readInt8(i + 1));
                i++;
                break;
            }
            case type.int16: {
                //console.log("int16");
                //const int: number = (data[i + 1] << 8) + data[i + 2];
                store_value(data.readInt16BE(i + 1));
                i += 2;
                break;
            }
            case type.int32: {
                //console.log("int32");
                //const int: number = (data[i + 1] << 24) + (data[i + 2] << 16) + (data[i + 3] << 8) + data[i + 4];
                store_value(data.readInt32BE(i + 1));
                i += 4;
                break;
            }
            case type.int64: {
                //console.log("int64");
                
                //const int_low: number = (data[i + 5] << 24) + (data[i + 6] << 16) + (data[i + 7] << 8) + data[i + 8];
                //const int_high: number = (data[i + 1] << 24) + (data[i + 2] << 16) + (data[i + 3] << 8) + data[i + 4];
                //const big_int: BigInt = BigInt(int_high) << 32n + BigInt(int_low);
                
                store_value(data.readBigInt64BE(i + 1));
                i += 8;
                break;
            }
            case type.fixext1: {
                //console.log("ext1");
                i += 2;
                break;
            }
            case type.fixext2: {
                //console.log("ext2");
                i += 3;
                break;
            }
            case type.fixext4: {
                //console.log("ext4");
                i += 5;
                break;
            }
            case type.fixext8: {
                //console.log("ext8");
                i += 9;
                break;
            }
            case type.fixext16: {
                //console.log("ext16");
                i += 17;
                break;
            }
            case type.str8: {
                //console.log("str8");
                const size = data[i + 1];
                i++;
                const str = readStr(data, i + 1, size);
                store_value(str);
                //console.log(`${size} | "${str}"`);

                i += size;
                break;
            }
            case type.str16: {
                //console.log("str16");
                const size = data.readUint16BE(i + 1);
                i += 2;
                const str = readStr(data, i + 1, size);
                store_value(str);
                //console.log(`${size} | "${str}"`);

                i += size;
                break;
            }
            case type.str32: {
                //console.log("str32");
                const size = data.readUint32BE(i + 1);
                i += 4;
                const str = readStr(data, i + 1, size);
                store_value(str);
                //console.log(`${size} | "${str}"`);

                i += size;
                break;
            }
            case type.array16: {
                //console.log("array16");
                const size = data.readUint16BE(i + 1);
                i += 2;
                store_value([]);
                add_scope(size);
                //console.log(`${size}`)
                break;
            }
            case type.array32: {
                //console.log("array32");
                const size = data.readUint32BE(i + 1);
                i += 4;
                store_value([]);
                add_scope(size);
                //console.log(`${size}`)
                break;
            }
            case type.map16: {
                //console.log("map16");
                const size = data.readUint16BE(i + 1);
                i += 2;
                store_value({});
                add_scope(size * 2);
                //console.log(`${size} * 2`)
                break;
            }
            case type.map32: {
                //console.log("map32");
                const size = data.readUint32BE(i + 1);
                i += 4;
                store_value({});
                add_scope(size * 2);
                //console.log(`${size} * 2`)
                break;
            }
            default: {
                if (token <= type.fixintp) {
                    //console.log("fixintp");
                    store_value(token & 0x7f);
                } else if (token <= type.fixmap) {
                    //console.log("fixmap");
                    store_value({});
                    add_scope((token & 0x0f) * 2);
                    //console.log(`${token & 0x0f} * 2`)
                } else if (token <= type.fixarray) {
                    //console.log("fixarray");
                    store_value([]);
                    add_scope(token & 0x0f);
                    //console.log(`${token & 0x0f}`)
                    
                } else if (token <= type.fixstr) {
                    //console.log("fixstr");
                    const size = (token & 0x1f);
                    const str = readStr(data, i + 1, size);
                    //console.log(`${size} | "${str}"`);
                    store_value(str);

                    i += size;
                } else {
                    //console.log("fixintn");
                    store_value(-(token & 0x1f));
                }
            }
            
        }

        ////console.log(lifetime_stack);
        ////console.log(container_stack);
        ////console.log(index_stack);
        ////console.dir(output, {depth: null});
        tick_scope();
    }

    function store_value(value: any) {

        debug_arr.push(value);

        if(output_ref_stack.length == 0) {
            output = value;
        } else if(container_stack[container_stack.length - 1] == CONTAINER_MAP) {
            if(index_stack[index_stack.length - 1] & 1) {
                output_ref_stack[output_ref_stack.length - 1][key_store] = value;
            } else {
                key_store = value;
            }
        } else {
            //console.log("STORING IN ARRAY")
            //console.log(index_stack[index_stack.length - 1])
            output_ref_stack[output_ref_stack.length - 1][index_stack[index_stack.length - 1]] = value;
        }
    }

    function add_scope(lifetime: number) {

        if(output_ref_stack.length == 0) {
            output_ref_stack.push(output);
        } else {
            if(container_stack[container_stack.length - 1] == CONTAINER_MAP) {
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

    //console.dir(output, {depth: null});
    return output;
}

function readStr(data: Buffer, offset: number, size: number): string {
    return data.subarray(offset, offset + size).toString('utf-8');
}

function readBin(data: Buffer, offset: number, size: number): Buffer {
    return data.subarray(offset, offset + size);
}
