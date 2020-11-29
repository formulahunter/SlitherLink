async function reset_build() {
    const replace = require('replace-in-file');

    let options = {
        files: 'environment.js',
        from: /build: [0-9]*,?/g,
        to: `build: 1,`,
        countMatches: true,
        allowEmptyPaths: false
    };

    try {
        const changedFiles = await replace(options);
        if(changedFiles.length === 0) {
            throw 'pattern not found';
        }
        if(changedFiles[0].numReplacements === 0) {
            throw 'build number was not reset as intended';
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
        to: `> build: 1`,
        countMatches: true,
        allowEmptyPaths: false
    };

    try {
        const changedFiles = await replace(options);
        if(changedFiles.length === 0) {
            throw 'pattern not found';
        }
        if(changedFiles[0].numReplacements === 0) {
            throw 'build number was not reset as intended';
        }
    }
    catch(er) {
        console.error('error caught while trying to update build number in commit-message.md:');
        console.error(er);
        return er;
    }

    console.log(`build 1`);
}
reset_build();
