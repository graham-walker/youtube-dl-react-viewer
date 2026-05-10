const fs = require('fs');

const source = ['../.env.manual', '../.env'].find(name => fs.existsSync(name));

if (source) {
    fs.copyFileSync(source, './.env');
} else if (fs.existsSync('./.env')) {
    fs.unlinkSync('./.env');
}
