import type { CreatePackageOptions } from './createPackage'
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createPackage,
  parseGitHubRepository,
  parsePackageName,
} from './createPackage'

const temporaryRoots: string[] = []
const author = { name: 'Template Author', email: 'author@example.com' }
const repository = { owner: 'acme', repo: 'toolkit' }

function createRoot(withLicense = true): string {
  const rootDir = mkdtempSync(join(tmpdir(), 'starter-ts-monorepo-'))
  temporaryRoots.push(rootDir)

  if (withLicense)
    writeFileSync(join(rootDir, 'LICENSE.md'), 'MIT License\n')

  return rootDir
}

function createOptions(overrides: Partial<CreatePackageOptions> = {}): CreatePackageOptions {
  return {
    rootDir: createRoot(),
    name: 'demo',
    description: 'Demo package',
    isPrivate: false,
    author,
    repository,
    ...overrides,
  }
}

afterEach(() => {
  for (const rootDir of temporaryRoots.splice(0))
    rmSync(rootDir, { recursive: true, force: true })
})

describe('parsePackageName', () => {
  it('maps unscoped and scoped package names to a safe directory', () => {
    expect(parsePackageName('utils')).toEqual({ name: 'utils', directoryName: 'utils' })
    expect(parsePackageName('@acme/utils')).toEqual({
      name: '@acme/utils',
      directoryName: 'utils',
    })
  })

  it.each([
    '../outside',
    '/absolute',
    '@scope',
    '@scope/../outside',
    'UpperCase',
    'name with spaces',
    'node_modules',
  ])('rejects unsafe package name %s', (name) => {
    expect(() => parsePackageName(name)).toThrow('Invalid package name')
  })
})

describe('parseGitHubRepository', () => {
  it('supports SSH and HTTPS GitHub remotes', () => {
    expect(parseGitHubRepository('git@github.com:acme/toolkit.git')).toEqual(repository)
    expect(parseGitHubRepository('https://github.com/acme/toolkit.git')).toEqual(repository)
  })

  it('rejects non-GitHub remotes', () => {
    expect(parseGitHubRepository('git@gitlab.com:acme/toolkit.git')).toBeNull()
  })
})

describe('createPackage', () => {
  it('creates a scoped public package in a workspace-compatible directory', () => {
    const options = createOptions({ name: '@acme/demo' })
    const created = createPackage(options)
    const packageJson = JSON.parse(readFileSync(join(created.packageDir, 'package.json'), 'utf8'))
    const readme = readFileSync(join(created.packageDir, 'README.md'), 'utf8')

    expect(created.directoryName).toBe('demo')
    expect(created.packageDir).toBe(join(options.rootDir, 'packages', 'demo'))
    expect(packageJson.name).toBe('@acme/demo')
    expect(packageJson.repository.directory).toBe('packages/demo')
    expect(readme).not.toContain('undefined')
    expect(readFileSync(join(created.packageDir, 'LICENSE'), 'utf8')).toBe('MIT License\n')
  })

  it('does not overwrite an existing package', () => {
    const options = createOptions()
    const packageDir = join(options.rootDir, 'packages', 'demo')
    mkdirSync(packageDir, { recursive: true })
    writeFileSync(join(packageDir, 'sentinel.txt'), 'keep me')

    expect(() => createPackage(options)).toThrow('already exists')
    expect(readFileSync(join(packageDir, 'sentinel.txt'), 'utf8')).toBe('keep me')
    expect(existsSync(join(packageDir, 'package.json'))).toBe(false)
  })

  it('requires GitHub repository information for public packages before writing', () => {
    const options = createOptions({ repository: null })

    expect(() => createPackage(options)).toThrow('requires a GitHub origin remote')
    expect(existsSync(join(options.rootDir, 'packages'))).toBe(false)
  })

  it('allows private packages without repository information', () => {
    const options = createOptions({ isPrivate: true, repository: null })
    const created = createPackage(options)
    const packageJson = JSON.parse(readFileSync(join(created.packageDir, 'package.json'), 'utf8'))
    const readme = readFileSync(join(created.packageDir, 'README.md'), 'utf8')

    expect(packageJson.repository).toBeUndefined()
    expect(readme).not.toContain('undefined')
  })

  it('fails before writing when the root license is missing', () => {
    const rootDir = createRoot(false)
    const options = createOptions({ rootDir })

    expect(() => createPackage(options)).toThrow('Missing root license file')
    expect(existsSync(join(rootDir, 'packages'))).toBe(false)
  })

  it('includes the license in the npm pack file list', () => {
    const created = createPackage(createOptions())
    const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: created.packageDir,
      encoding: 'utf8',
    })
    const [pack] = JSON.parse(output)
    const files = pack.files.map((file: { path: string }) => file.path)

    expect(files).toContain('LICENSE')
  })
})
