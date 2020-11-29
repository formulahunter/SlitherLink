const path = require('path');
const fs = require('fs/promises');
const env = require('./environment.js');

module.exports = {
    async getHEAD() {
        return (await fs.readFile(path.resolve(__dirname, '.git', 'HEAD'), 'utf8')).trim();
    },
    async getRef(ref) {
        if(this.isHash(ref)) {
            return ref;
        }
        if(ref.search(/ref:\b?refs\//) === 0) {
            ref = ref.slice(ref.indexOf('refs/') + 5).trim();
        }
        const parts = ref.split('/');
        return [parts[parts.length - 1], (await fs.readFile(path.resolve(__dirname, '.git', 'refs', ...parts), 'utf8')).trim()];
    },
    getBuild() {
        return env.build;
    },
    getEnvBranch() {
        return env.branch;
    },
    isHash(str) {
        return str.search(/(?:[0-9a-f]{7}|[0-9a-f]{40})/i) === 0;
    }
};
