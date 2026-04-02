# `sync.js` 执行指导

## 位置

脚本文件位于：

`D:\my_data\code\PM_agent\pm-agent-cli\sync.js`

## 功能说明

该脚本会在**当前执行目录**提取项目骨架上下文，并将结果 POST 到：

`http://localhost:3000/api/upload-context`

提取内容包括：

- 项目目录树，最多遍历 4 层
- 根目录 `package.json` 中的 `dependencies` 和 `devDependencies`
- 项目内命中的 `schema.sql`、`schema.prisma` 文件前 100 行

说明：

- 脚本基于 `process.cwd()` 工作，因此它扫描的是你执行命令时所在的目录
- 脚本不会主动读取业务源码文件内容，只有命中 schema 文件时才读取其前 100 行

## 环境准备

先激活 conda 环境：

```powershell
conda activate langchain
```

再确认 Node.js 版本不低于 18：

```powershell
node -v
```

## 在当前项目执行

如果你已经进入目标项目根目录，可以直接执行：

```powershell
node D:\my_data\code\PM_agent\pm-agent-cli\sync.js
```

示例：

```powershell
cd D:\work\my-project
conda activate langchain
node D:\my_data\code\PM_agent\pm-agent-cli\sync.js
```

## 在其他本地项目执行

可以。只要先切换到目标项目目录，再执行同一份脚本即可。

示例：

```powershell
cd D:\repos\another-project
node D:\my_data\code\PM_agent\pm-agent-cli\sync.js
```

这时脚本扫描的是：

`D:\repos\another-project`

而不是脚本所在目录。

## 成功与失败提示

成功时终端会输出：

```text
✅ Context synced successfully.
```

失败时终端会输出：

```text
❌ Context sync failed: <具体错误>
```

## 常见失败原因

1. 本地上传服务未启动

脚本会请求：

`http://localhost:3000/api/upload-context`

如果该服务没有运行，会出现连接失败。

2. Node 版本过低

脚本使用了全局 `fetch`，建议使用 Node.js 18+。

3. 当前目录不是目标项目根目录

如果你在错误的目录执行，脚本提取到的就不是你想要的项目。

## 建议执行方式

标准执行顺序如下：

```powershell
cd <目标项目根目录>
conda activate langchain
node D:\my_data\code\PM_agent\pm-agent-cli\sync.js
```
