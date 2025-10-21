# Changesets Guide

This project uses [Changesets](https://github.com/changesets/changesets) to manage version and publish.

## 🚀 Quick Start

### 1. Create Changeset

When you make changes that need to be published, run:

```bash
pnpm changeset
```

This will start an interactive process, asking:
- Which packages were affected
- The type of change (major, minor, patch)
- The description of the change

### 2. Submit Changeset

```bash
git add .changeset/your-changeset-file.md
git commit -m "feat: your feature description"
```

### 3. Push Changeset

```bash
git push

# Then create a PR
```

## 🔄 Version Types

- **patch** (0.0.X) - Bug fixes, backward compatible
- **minor** (0.X.0) - New features, backward compatible
- **major** (X.0.0) - Breaking changes, not backward compatible

## 🤖 Automation

The project is configured with GitHub Actions to automate the publish process:

1. **PR Check** - Ensure PR contains changeset
2. **Automatic Publish** - Automatically create a publish PR when merged into main branch
3. **NPM Publish** - Automatically publish to NPM when merged into main branch

## 📝 Best Practices

1. **Each feature one changeset** - Do not put multiple unrelated changes in one changeset
2. **Clear description** - Write clearly what the user needs to know about the changes
3. **Correct version type** - Carefully select patch/minor/major
4. **Create changeset in development** - Do not wait until the end

## 📚 More Information

- [Changesets Official Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning Specification](https://semver.org/)
