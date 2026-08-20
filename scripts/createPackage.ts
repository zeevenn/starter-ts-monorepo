import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { confirm, input } from '@inquirer/prompts'

export interface RepositoryInfo {
  owner: string
  repo: string
}

export interface Author {
  name: string
  email: string
}

export interface ParsedPackageName {
  name: string
  directoryName: string
}

export interface CreatePackageOptions {
  rootDir: string
  name: string
  description: string
  isPrivate: boolean
  author: Author
  repository?: RepositoryInfo | null
}

export interface CreatedPackage {
  name: string
  directoryName: string
  packageDir: string
}

const packageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?([a-z0-9][a-z0-9._-]*)$/
const reservedPackageNames = new Set(['node_modules', 'favicon.ico'])

export function parsePackageName(rawName: string): ParsedPackageName {
  const name = rawName.trim()
  const match = name.match(packageNamePattern)
  const directoryName = match?.[1]

  if (!directoryName || name.length > 214 || reservedPackageNames.has(directoryName)) {
    throw new Error(
      `Invalid package name "${rawName}". Use a lowercase npm name such as "utils" or "@scope/utils".`,
    )
  }

  return { name, directoryName }
}

export function parseGitHubRepository(remoteUrl: string): RepositoryInfo | null {
  const match = remoteUrl.trim().match(/github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/)
  if (!match)
    return null

  const [, owner, repo] = match
  return owner && repo ? { owner, repo } : null
}

function getGitRepository(rootDir: string): RepositoryInfo | null {
  try {
    const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return parseGitHubRepository(remoteUrl)
  }
  catch {
    return null
  }
}

function getGitAuthor(rootDir: string): Author | null {
  try {
    const name = execFileSync('git', ['config', 'user.name'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const email = execFileSync('git', ['config', 'user.email'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()

    return name && email ? { name, email } : null
  }
  catch {
    return null
  }
}

function validateOptions(options: CreatePackageOptions): ParsedPackageName {
  const parsedName = parsePackageName(options.name)
  const packageDir = join(options.rootDir, 'packages', parsedName.directoryName)
  const licensePath = join(options.rootDir, 'LICENSE.md')

  if (!options.author.name.trim() || !options.author.email.trim())
    throw new Error('Author name and email are required.')

  if (!options.isPrivate && !options.repository) {
    throw new Error(
      'A public package requires a GitHub origin remote. Configure origin or create a private package.',
    )
  }

  if (!existsSync(licensePath))
    throw new Error(`Missing root license file: ${licensePath}`)

  if (existsSync(packageDir))
    throw new Error(`Package directory already exists: ${packageDir}`)

  return parsedName
}

function createTemplates(
  name: string,
  description: string,
  isPrivate: boolean,
  author: Author,
  directoryName: string,
  repository: RepositoryInfo | null,
  license: string,
): Record<string, string> {
  const encodedName = encodeURIComponent(name)
  const authorCredit = repository
    ? `[${author.name}](https://github.com/${repository.owner})`
    : author.name

  const packageJson = {
    name,
    type: 'module',
    version: '0.0.0',
    private: isPrivate,
    description,
    author: `${author.name} <${author.email}>`,
    license: 'MIT',
    ...(isPrivate
      ? {}
      : {
          homepage: `https://github.com/${repository!.owner}/${repository!.repo}/tree/main/packages/${directoryName}#readme`,
          repository: {
            type: 'git',
            url: `git+https://github.com/${repository!.owner}/${repository!.repo}.git`,
            directory: `packages/${directoryName}`,
          },
          bugs: `https://github.com/${repository!.owner}/${repository!.repo}/issues`,
          keywords: [],
          sideEffects: false,
        }),
    exports: {
      '.': './dist/index.js',
      './package.json': './package.json',
    },
    main: './dist/index.js',
    module: './dist/index.js',
    types: './dist/index.d.ts',
    files: [
      'dist',
    ],
    scripts: {
      'build': 'tsdown',
      'dev': 'tsdown --watch',
      'test': 'vitest run',
      'test:watch': 'vitest',
      'typecheck': 'tsc --noEmit',
      ...(isPrivate ? {} : { prepublishOnly: 'tsdown' }),
      'start': 'tsx src/index.ts',
    },
  }

  const readme = isPrivate
    ? `# ${name.toUpperCase()}

${description}

## License

[MIT](./LICENSE) License © ${authorCredit}
`
    : `# ${name.toUpperCase()}

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

${description}

## License

[MIT](./LICENSE) License © ${authorCredit}

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/${encodedName}?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/${encodedName}
[npm-downloads-src]: https://img.shields.io/npm/dm/${encodedName}?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/${encodedName}
[bundle-src]: https://img.shields.io/bundlephobia/minzip/${encodedName}?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=${encodedName}
[license-src]: https://img.shields.io/github/license/${repository!.owner}/${repository!.repo}
[license-href]: https://github.com/${repository!.owner}/${repository!.repo}/blob/main/packages/${directoryName}/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/${encodedName}
`

  return {
    'LICENSE': license,
    'README.md': readme,
    'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
    'src/index.ts': `export function sum(a: number, b: number): number {
  return a + b
}
`,
    'test/index.test.ts': `import { describe, expect, it } from 'vitest'
import { sum } from '../src'

describe('should', () => {
  it('one plus one equals two', () => {
    expect(sum(1, 1)).toEqual(2)
  })
})
`,
    'tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts", "test/**/*.ts", "tsdown.config.ts", "vitest.config.ts"]
}
`,
    'tsdown.config.ts': `import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: {
    sourcemap: true,
  },
})
`,
    'vitest.config.ts': `import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
`,
  }
}

export function createPackage(options: CreatePackageOptions): CreatedPackage {
  const { name, directoryName } = validateOptions(options)
  const repository = options.repository ?? null
  const packagesDir = join(options.rootDir, 'packages')
  const packageDir = join(packagesDir, directoryName)
  const license = readFileSync(join(options.rootDir, 'LICENSE.md'), 'utf8')
  const templates = createTemplates(
    name,
    options.description,
    options.isPrivate,
    options.author,
    directoryName,
    repository,
    license,
  )

  mkdirSync(packagesDir, { recursive: true })
  const temporaryDir = mkdtempSync(join(packagesDir, `.${directoryName}-`))

  try {
    mkdirSync(join(temporaryDir, 'src'))
    mkdirSync(join(temporaryDir, 'test'))

    for (const [filePath, content] of Object.entries(templates))
      writeFileSync(join(temporaryDir, filePath), content)

    renameSync(temporaryDir, packageDir)
  }
  catch (error) {
    rmSync(temporaryDir, { recursive: true, force: true })
    throw error
  }

  return { name, directoryName, packageDir }
}

async function main(): Promise<void> {
  const rootDir = process.cwd()
  const rawName = process.argv[2] ?? await input({
    message: 'Enter the name of the package',
    required: true,
  })
  const { name, directoryName } = parsePackageName(rawName)
  const description = await input({
    message: 'Enter the description of the package',
    default: '_description_',
  })
  const isPrivate = await confirm({
    message: 'Is the package private?',
    default: false,
  })
  const repository = getGitRepository(rootDir)
  const gitAuthor = getGitAuthor(rootDir)
  const author: Author = gitAuthor ?? {
    name: await input({ message: 'Enter the author name', required: true }),
    email: await input({ message: 'Enter the author email', required: true }),
  }

  console.log(`Creating package: ${name}`)
  console.log(`Description: ${description}`)
  console.log(`Repository: ${repository ? `${repository.owner}/${repository.repo}` : 'Unknown'}`)
  console.log(`Package directory: ${join(rootDir, 'packages', directoryName)}`)

  const created = createPackage({
    rootDir,
    name,
    description,
    isPrivate,
    author,
    repository,
  })

  console.log(`✅ Package ${created.name} created successfully!`)
  console.log(`📁 Location: ${created.packageDir}`)
  console.log(`📦 Next steps:`)
  console.log(`   1. cd packages/${created.directoryName}`)
  console.log(`   2. Edit src/index.ts to implement your package`)
  console.log(`   3. Run 'pnpm build' to build the package`)
  console.log(`   4. Run 'pnpm test' to run tests`)
}

const entryPath = process.argv[1]
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  try {
    await main()
  }
  catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
