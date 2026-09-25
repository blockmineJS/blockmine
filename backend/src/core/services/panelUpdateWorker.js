process.env.BLOCKMINE_UPDATE_WORKER = '1';

const fs = require('fs');
const os = require('os');
const path = require('path');

const logPath = path.join(os.homedir(), '.blockmine', 'update-worker.log');

function wlog(message) {
    try {
        fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
    } catch {
        return;
    }
}

wlog(`boot ${process.argv.join(' ')}`);

const { runPanelUpdateJob, isSafeRef } = require('./PanelUpdateService');

async function main() {
    const branch = process.argv[2] || 'master';
    const restartMethod = process.argv[3] || process.env.BLOCKMINE_RESTART_METHOD || '';
    if (!isSafeRef(branch)) {
        wlog('invalid branch');
        process.exit(1);
    }
    wlog(`job ${branch} ${restartMethod}`);
    await runPanelUpdateJob(branch, restartMethod);
    wlog('job done');
}

main().then(() => {
    process.exit(0);
}).catch((error) => {
    wlog(`job error ${error && error.stack ? error.stack : error}`);
    console.error('[PanelUpdateWorker]', error.message || error);
    process.exit(1);
});
