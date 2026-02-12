
import bcrypt from 'bcrypt';

const password = '12345678';
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
    console.log(hash);
});
