const path = require('node:path');
const { spawnSync } = require('node:child_process');
exports.throwError = true;
exports.onBeforeBuild = function () {
  const root = path.resolve(__dirname, '../..');
  const run = spawnSync('node', [path.join(root, 'tools/config/export.cjs'), '--check'], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  if (run.error || run.status !== 0) {
    throw new Error('配置检查未通过，构建已停止。请修正原始 XLSX 并重新导表。\n' + (run.error || run.stderr || run.stdout));
  }
  console.log('[config-table-check] ' + run.stdout.trim());
};
