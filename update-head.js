async function update_head() {
    const replace = require('replace-in-file');
    const utils = require('./utils.js');

    let [newBranch, newHead] = await utils.getRef(await utils.getHEAD());

    const options = {
        files: 'environment.js',
        from: [/head: '.*',?/g],
        to: [`head: '${newHead}',`],
        countMatches: true,
        allowEmptyPaths: false
    };
    if(newBranch) {
        options.from.push(/branch: '.*',?/g);
        options.to.push(`branch: '${newBranch}',`);
    }

    try {
        const changedFiles = await replace(options);
        if(changedFiles.length === 0) {
            throw 'pattern not found';
        }
        if(changedFiles[0].numReplacements < options.from.length) {
            throw 'at least one head parameter was not updated\nthis may be caused by switching to a new branch with the same head';
        }
    }
    catch(er) {
        console.error('error caught while trying to update head parameter in environment.js:');
        console.error(er);
    }

    console.log(`head updated to ${newHead.slice(0, 7)}${newBranch ? `\nbranch updated to ${newBranch}` : ''}`);
}
update_head();
