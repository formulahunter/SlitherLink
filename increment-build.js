async function increment_build() {
    const replace = require('replace-in-file');
    const utils = require('./utils.js');

    const build = utils.getBuild();

    let options = {
        files: 'environment.js',
        from: /build: [0-9]*,?/g,
        to: `build: ${build + 1},`,
        countMatches: true,
        allowEmptyPaths: false
    };

    try {
        const changedFiles = await replace(options);
        if(changedFiles.length === 0) {
            throw 'pattern not found';
        }
        if(changedFiles[0].numReplacements === 0) {
            throw 'build number was not incremented as intended';
        }
    }
    catch(er) {
        console.error('error caught while trying to update build number in environment.js:');
        console.error(er);
        return er;
    }

    options = {
        files: 'commit-message.md',
        from: /> build: [0-9]*,?/g,
        to: `> build: ${build + 1}`,
        countMatches: true,
        allowEmptyPaths: false
    };

    try {
        const changedFiles = await replace(options);
        if(changedFiles.length === 0) {
            throw 'pattern not found';
        }
        if(changedFiles[0].numReplacements === 0) {
            throw 'build number was not incremented as intended';
        }
    }
    catch(er) {
        console.error('error caught while trying to update build number in commit-message.md:');
        console.error(er);
        return er;
    }

    console.log(`build ${build + 1}`);
}
increment_build();
