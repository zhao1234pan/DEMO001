// 所有构建目标共用配置检查，不能通过切换平台绕过。
exports.configs = { '*': { hooks: './hooks.js' } };
