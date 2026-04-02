#!/usr/bin/env node

/**
 * PM-Agent 终极本地探针 (The Local Probe)
 * 作用：提取物理骨架数据，上云同步，并在本地建立 .pm-agent 领地。
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const TREE_MAX_DEPTH = 4;

// 扩充了高价值的架构信号文件，让大模型能推演出更准的架构
const SCHEMA_TARGETS = new Set([
  'schema.sql', 'schema.prisma', 'docker-compose.yml', 
  '.env.example', 'init.sql', 'db.js', 'models.py'
]);

const IGNORED_DIRS = new Set([
  '.git', '.hg', '.idea', '.next', '.nuxt', '.svn', '.turbo', '.venv', '.vscode', '.yarn',
  '__pycache__', 'build', 'coverage', 'dist', 'env', 'node_modules', 'out', 'target', 'tmp', 'vendor', 'venv',
  '.pm-agent' // 忽略自身的隐藏目录
]);

function isIgnoredDir(entryName) {
  return IGNORED_DIRS.has(entryName);
}

function readDirSafe(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    return [];
  }
}

function sortEntries(entries) {
  return entries
    .filter((entry) => !(entry.isDirectory() && isIgnoredDir(entry.name)))
    .sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
}

function buildFileTreeLines(rootDir, maxDepth) {
  const rootName = path.basename(rootDir) || rootDir;
  const lines = [rootName];

  function walk(currentDir, depth, prefix) {
    if (depth >= maxDepth) {
      return;
    }

    const entries = sortEntries(readDirSafe(currentDir));

    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      lines.push(prefix + connector + entry.name);

      if (entry.isDirectory()) {
        walk(path.join(currentDir, entry.name), depth + 1, childPrefix);
      }
    });
  }

  walk(rootDir, 0, '');
  return lines.join('\n');
}

function readPackageManifest(rootDir) {
  const packageJsonPath = path.join(rootDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return {
      found: false,
      path: packageJsonPath,
      dependencies: {},
      devDependencies: {},
    };
  }

  try {
    const rawContent = fs.readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(rawContent);

    return {
      found: true,
      path: packageJsonPath,
      dependencies: parsed.dependencies || {},
      devDependencies: parsed.devDependencies || {},
    };
  } catch (error) {
    return {
      found: true,
      path: packageJsonPath,
      dependencies: {},
      devDependencies: {},
      error: error.message,
    };
  }
}

function readFirstLines(filePath, lineLimit) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split(/\r?\n/).slice(0, lineLimit).join('\n');
}

function findSchemaFiles(rootDir) {
  const matches = [];

  function walk(currentDir) {
    const entries = sortEntries(readDirSafe(currentDir));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      // 匹配明确的目标文件，或者文件名包含 schema 的文件
      if (SCHEMA_TARGETS.has(entry.name) || entry.name.toLowerCase().includes('schema')) {
        try {
          matches.push({
            path: path.relative(rootDir, fullPath) || entry.name,
            preview: readFirstLines(fullPath, 100),
          });
        } catch (error) {
          matches.push({
            path: path.relative(rootDir, fullPath) || entry.name,
            error: error.message,
          });
        }
      }
    }
  }

  walk(rootDir);
  return matches;
}

// ================= 新增：本地领地管理 =================
function ensureLocalAgentDirectory() {
  const pmAgentDir = path.join(ROOT_DIR, '.pm-agent');
  if (!fs.existsSync(pmAgentDir)) {
    fs.mkdirSync(pmAgentDir, { recursive: true });
  }
  return pmAgentDir;
}

function buildPayload() {
  return {
    projectRoot: ROOT_DIR,
    collectedAt: new Date().toISOString(),
    fileTree: buildFileTreeLines(ROOT_DIR, TREE_MAX_DEPTH),
    packageJson: readPackageManifest(ROOT_DIR),
    schemaFiles: findSchemaFiles(ROOT_DIR),
  };
}

async function uploadContext(payload) {
  if (typeof fetch !== 'function') {
    throw new Error('Current Node.js runtime does not provide global fetch. Node.js 18+ is required.');
  }

  const response = await fetch('http://localhost:3000/api/upload-context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${responseText || 'Upload failed'}`);
  }

  return responseText;
}

async function main() {
  console.log('\n🧠 [PM-Agent Sync] 开始扫描本地物理骨架...');
  
  try {
    // 1. 构建基础 Payload
    const payload = buildPayload();
    
    // 2. 建立本地领地并保存快照 (为本地防线插件做准备)
    const pmAgentDir = ensureLocalAgentDirectory();
    const snapshotPath = path.join(pmAgentDir, 'local_context_snapshot.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`📁 骨架快照已落盘至: ${snapshotPath}`);

    // 3. 上传至云端控制台
    console.log('☁️  正在推送到 Cloud Brain (http://localhost:3000/api/upload-context)...');
    await uploadContext(payload);
    
    console.log('✅ 同步成功！您现在可以前往网页端进行架构规划了。\n');
  } catch (error) {
    console.error(`\n❌ 同步失败: ${error.message}`);
    console.log('💡 提示: 请确保云端服务 (node server.js) 正在运行中。\n');
    process.exitCode = 1;
  }
}

main();