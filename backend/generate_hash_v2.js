
import bcrypt from 'bcrypt';
const password = '12345678';
const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);
console.log("HASH_START:" + hash + ":HASH_END");
