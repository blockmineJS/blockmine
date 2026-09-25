process.env.BLOCKMINE_UPDATE_WORKER = '1';

const { runPanelUpdateJob, isSafeRef } = require('./PanelUpdateService');

async function main() {
    const branch = process.argv[2] || 'master';
    if (!isSafeRef(branch)) {
        process.exit(1);
    }
    await runPanelUpdateJob(branch);
}

main().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('[PanelUpdateWorker]', error.message || error);
    process.exit(1);
});
