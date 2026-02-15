import bcrypt from 'bcrypt';

bcrypt.hash('12345678', 10).then(hash => {
    console.log(hash);
    process.exit(0);
});
