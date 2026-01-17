# Versioning Guide

ShelfSeeker uses [Semantic Versioning](https://semver.org/) (semver) with automated version management based on [Conventional Commits](https://www.conventionalcommits.org/).

## Version Format

Versions follow the format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes or major feature additions
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes and minor improvements (backwards compatible)

## Commit Message Format

Use conventional commit messages to automatically determine version bumps:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- `feat`: New feature → bumps **MINOR** version
- `fix`: Bug fix → bumps **PATCH** version
- `perf`: Performance improvement → bumps **PATCH** version
- `refactor`: Code refactoring → bumps **PATCH** version
- `docs`: Documentation changes → no version bump
- `style`: Code style changes → no version bump
- `test`: Test changes → no version bump
- `chore`: Build/tooling changes → no version bump

### Breaking Changes

To create a **MAJOR** version bump, add `BREAKING CHANGE:` in the commit footer or use `!` after the type:

```
feat!: redesign search API

BREAKING CHANGE: The search API now requires authentication
```

## Creating a Release

To create a new release:

```bash
npm run release
```

This will:
1. Analyze commit messages since the last tag
2. Determine the appropriate version bump
3. Update version in all `package.json` files
4. Generate/update `CHANGELOG.md`
5. Create a git commit with the new version
6. Create a git tag (e.g., `v1.2.3`)

After the release is created, push the changes and tags:

```bash
git push --follow-tags origin main
```

## Manual Version Control

For manual version bumps:

```bash
# Bump patch version (1.0.0 → 1.0.1)
npm run release -- --release-as patch

# Bump minor version (1.0.0 → 1.1.0)
npm run release -- --release-as minor

# Bump major version (1.0.0 → 2.0.0)
npm run release -- --release-as major

# Set specific version
npm run release -- --release-as 1.2.3
```

## Version Syncing

The version is maintained in three `package.json` files:
- Root: `/package.json`
- Server: `/server/package.json`
- Web: `/web/package.json`

The `npm run sync-version` script automatically syncs the version from the root package.json to both server and web packages.

## Examples

### Adding a feature:
```bash
git commit -m "feat: add dark mode support"
npm run release  # Creates v1.1.0
```

### Fixing a bug:
```bash
git commit -m "fix: resolve search timeout issue"
npm run release  # Creates v1.0.1
```

### Breaking change:
```bash
git commit -m "feat!: redesign configuration API"
npm run release  # Creates v2.0.0
```

## Viewing Version

The application version is displayed in:
- Settings → About page (Web UI)
- API endpoint: `GET /api/system/info`
- All three `package.json` files

## Changelog

The `CHANGELOG.md` file is automatically generated and updated with each release. It includes:
- Version number and date
- Categorized changes (Features, Bug Fixes, etc.)
- Links to commits and issues on GitHub
