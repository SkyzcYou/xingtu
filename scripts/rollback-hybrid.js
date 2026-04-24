#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * 加载 .env 配置文件
 */
function loadEnvConfig() {
  const envPath = path.join(ROOT_DIR, '.env');
  const config = {
    DEPLOY_HOST: '',
    DEPLOY_USER: '',
    DEPLOY_PORT: '22',
    DEPLOY_SSH_KEY: '',
    DEPLOY_SSH_PASSWORD: '',
    DEPLOY_SCRIPT_PATH: '',
  };

  if (!fs.existsSync(envPath)) {
    return config;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) {
      return;
    }

    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (Object.prototype.hasOwnProperty.call(config, key)) {
      config[key] = value;
    }
  });

  return config;
}

/**
 * 解析 SSH 密钥路径
 */
function resolveSshKeyPath(sshKey) {
  if (!sshKey) return '';
  if (sshKey.startsWith('/')) return sshKey;
  if (sshKey.startsWith('~/')) return path.join(process.env.HOME || '', sshKey.slice(2));
  return path.join(process.env.HOME || '', sshKey);
}

/**
 * 检查 sshpass 是否安装
 */
function checkSshpassInstalled() {
  try {
    execSync('which sshpass', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 转义 Shell 参数
 */
function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * 执行命令并实时输出
 */
function executeCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} 执行失败，退出码: ${result.status}`);
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const isProd = args.includes('--prod');
  const isTest = args.includes('--test') || !isProd; // 默认测试环境
  const envFlag = isProd ? '--prod' : '--test';
  const envName = isProd ? '生产' : '预览';

  // 获取版本号（如果有的话）
  const version = args.find(arg => !arg.startsWith('--'));

  const config = loadEnvConfig();

  if (!config.DEPLOY_HOST || !config.DEPLOY_USER) {
    console.error('❌ 错误: 缺少 DEPLOY_HOST 或 DEPLOY_USER 配置');
    process.exit(1);
  }

  if (!config.DEPLOY_SCRIPT_PATH) {
    console.error('❌ 错误: 缺少 DEPLOY_SCRIPT_PATH 配置');
    process.exit(1);
  }

  // 构建远程命令
  // 关键：参数顺序必须是 --rollback [version] [--test|--prod]
  // 否则 deploy.sh 可能会把 --test 误认为是版本号
  let remoteCommand = `bash ${config.DEPLOY_SCRIPT_PATH} --rollback`;
  if (version) {
    remoteCommand += ` ${shellEscape(version)}`;
  }
  remoteCommand += ` ${envFlag}`;

  const sshArgs = [];
  const sshKeyPath = resolveSshKeyPath(config.DEPLOY_SSH_KEY);
  const useSshKey = sshKeyPath && fs.existsSync(sshKeyPath);
  const usePassword = !useSshKey && config.DEPLOY_SSH_PASSWORD;

  if (config.DEPLOY_PORT && config.DEPLOY_PORT !== '22') {
    sshArgs.push('-p', config.DEPLOY_PORT);
  }
  if (useSshKey) {
    sshArgs.push('-i', sshKeyPath);
  }
  // 添加 -t 以支持 sudo 可能需要的 tty
  sshArgs.push('-t');
  sshArgs.push('-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null');
  sshArgs.push(`${config.DEPLOY_USER}@${config.DEPLOY_HOST}`, remoteCommand);

  console.log(`\n🚀 开始回滚${envName}环境...`);
  console.log(`📄 远程脚本: ${config.DEPLOY_SCRIPT_PATH}`);
  if (version) {
    console.log(`📦 目标版本: ${version}`);
  } else {
    console.log(`📦 目标版本: 前一版本`);
  }

  try {
    if (usePassword) {
      if (!checkSshpassInstalled()) {
        throw new Error('检测到 DEPLOY_SSH_PASSWORD，但本机未安装 sshpass');
      }
      executeCommand('sshpass', ['-p', config.DEPLOY_SSH_PASSWORD, 'ssh', ...sshArgs]);
    } else {
      executeCommand('ssh', sshArgs);
    }
    console.log(`\n✅ ${envName}环境回滚指令执行完成`);
  } catch (error) {
    console.error(`\n❌ 回滚失败: ${error.message}`);
    process.exit(1);
  }
}

main();
