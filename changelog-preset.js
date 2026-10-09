const createPreset = require('conventional-changelog-conventionalcommits');
const { COMMIT_TYPES } = require('./commit-types');

const GIT_FORMAT = '%B%n-hash-%n%H%n-gitTags-%n%d%n-committerDate-%n%ci%n-authorName-%n%an';

function countUserFacing(commits) {
  let extra = 0;
  for (const commit of commits) {
    const type = String(commit.type || '').toLowerCase();
    if (type !== 'add' && type !== 'remove') continue;
    if (commit.notes && commit.notes.length > 0) continue;
    extra += 1;
  }
  return extra;
}

module.exports = createPreset({ types: COMMIT_TYPES }).then((preset) => {
  preset.gitRawCommitsOpts = Object.assign({}, preset.gitRawCommitsOpts, {
    format: GIT_FORMAT,
  });

  if (!String(preset.writerOpts.commitPartial).includes('authorName')) {
    preset.writerOpts.commitPartial = preset.writerOpts.commitPartial.replace(
      /\s*$/,
      ' {{#if authorName}}— **{{authorName}}**{{/if}}\n'
    );
  }

  const originalBump = preset.recommendedBumpOpts.whatBump;
  preset.recommendedBumpOpts.whatBump = (commits) => {
    const result = originalBump(commits);
    const extra = countUserFacing(commits);
    if (!extra || result.level < 2) return result;
    return {
      level: 1,
      reason: `${result.reason}; ${extra} add/remove`,
    };
  };

  const originalTransform = preset.writerOpts.transform;
  preset.writerOpts.transform = (commit, context) => {
    const next = originalTransform(commit, context);
    if (next && typeof next.authorName === 'string') {
      next.authorName = next.authorName.replace(/\s+/g, ' ').trim();
    }
    return next;
  };

  return preset;
});
