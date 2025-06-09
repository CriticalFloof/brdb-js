# brdb.js

(Soon to be able to) Read and write Brickadia world files (.brdb)

## Install

1. Clone the repository.
2. Install the [zstd](https://github.com/facebook/zstd) compression library.
3. Ensure that zstd is visible from your system path.
4. Go to the root directory of the repository, and run `npm i` to install dependencies.
5. Then run `npm run build`.
6. Finally, run `node dist/dist.node.js`.

Currently running the file will result in a dump folder within the project root that contains all of the decoded globs of the world, as well as their decoded schemas.

#### Notice

This current version can only process "Parkour.brdb" from the input folder, if you want to process another world, you'll have to modify index.ts and rebuild.

The [msgpack-schema](https://gist.github.com/Zeblote/053d54cc820df3bccad57df676202895) decoder is mostly compliant, although currently with some missing features.
* Flat array buffers are currently not processed, and are instead stored directly.
* [Non-schema map containers](https://gist.github.com/Zeblote/053d54cc820df3bccad57df676202895#containers) aren't implemented, though an instance of one in a .brdb file has not been encountered yet.
* Schema tag validation is missing, so any malformed raw data will result in undefined behavior.


This tool was developed on windows, linux environments are untested.