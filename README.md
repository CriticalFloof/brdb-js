# brdb.js

(Soon to be able to) Read and write Brickadia world files (.brdb)

## Install

1. Clone the repository.
2. Install the [zstd](https://github.com/facebook/zstd) compression library.
3. Ensure that zstd is visible from your system path.
4. Go to the root directory of the repository, and run `npm run build`
5. Finally, run `node dist/dist.node.js`

#### Notice

This current version can only process "Parkour.brdb" from the input folder, if you want to process another world, you'll have to modify index.ts and rebuild.

This tool was developed on windows, linux environments are untested.