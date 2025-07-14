
import BRDB from "./save/world/brdb"

console.log("Hello, BRDB!");

let brdb: BRDB = new BRDB("./input/Parkour.brdb");
brdb.read();
