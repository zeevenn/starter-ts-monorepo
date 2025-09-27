# Changesets 使用指南

本项目使用 [Changesets](https://github.com/changesets/changesets) 来管理版本和发布。

## 🚀 快速开始

### 1. 创建 Changeset

当您做出需要发布的更改时，运行：

```bash
pnpm changeset
```

这将启动交互式流程，询问：
- 哪些包受到了影响
- 更改的类型（major、minor、patch）
- 更改的描述

### 2. 提交 Changeset

```bash
git add .changeset/your-changeset-file.md
git commit -m "feat: your feature description"
```

### 3. 发布（维护者）

```bash
# 更新版本号和生成 CHANGELOG
pnpm changeset:version

# 发布到 NPM
pnpm changeset:publish
```

## 📋 可用命令

| 命令 | 描述 |
|------|------|
| `pnpm changeset` | 创建新的 changeset |
| `pnpm changeset:version` | 应用 changesets，更新版本和 CHANGELOG |
| `pnpm changeset:publish` | 构建并发布包到 NPM |
| `pnpm changeset:status` | 查看待发布的更改状态 |
| `pnpm changeset:pre` | 进入预发布模式 |
| `pnpm changeset:exit` | 退出预发布模式 |

## 🔄 版本类型

- **patch** (0.0.X) - 错误修复，向后兼容
- **minor** (0.X.0) - 新功能，向后兼容
- **major** (X.0.0) - 破坏性更改，不向后兼容

## 🤖 自动化

项目配置了 GitHub Actions 来自动化发布流程：

1. **PR 检查** - 确保 PR 包含 changeset
2. **自动发布** - 合并到 main 分支时自动创建发布 PR
3. **NPM 发布** - 合并发布 PR 时自动发布到 NPM

## 📝 最佳实践

1. **每个功能一个 changeset** - 不要将多个不相关的更改放在一个 changeset 中
2. **清晰的描述** - 写清楚用户需要知道的更改内容
3. **正确的版本类型** - 仔细选择 patch/minor/major
4. **及时创建** - 在开发过程中就创建 changeset，不要等到最后

## 🔧 配置

配置文件位于 `.changeset/config.json`，包含：

- **changelog** - 使用 GitHub 集成生成 changelog
- **access** - 包的访问权限（public/restricted）
- **baseBranch** - 基础分支（main）
- **repo** - GitHub 仓库地址

## 📚 更多信息

- [Changesets 官方文档](https://github.com/changesets/changesets)
- [语义化版本规范](https://semver.org/) 