import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { confirm, input } from '@inquirer/prompts'

interface RepositoryInfo {
  owner: string
  repo: string
}

interface Author {
  name: string
  email: string
}

function getGitRepository(): RepositoryInfo | null {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
    const match = remoteUrl.match(/(?:github\.com|gitlab\.com|bitbucket\.org)[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
    if (match) {
      const [, owner, repo] = match
      return { owner, repo }
    }
    return null
  }
  catch (error) {
    console.warn('Failed to get git repository:', error)
    return null
  }
}

const repository = getGitRepository()

function getAuthor(): Author {
  const name = execSync('git config user.name', { encoding: 'utf8' }).trim()
  const email = execSync('git config user.email', { encoding: 'utf8' }).trim()
  return { name, email }
}

const name = process.argv[2] ?? await input({
  message: 'Enter the name of the package',
  required: true,
})

const description = await input({
  message: 'Enter the description of the package',
  default: '_description_',
})

const isPrivate = await confirm({
  message: 'Is the package private?',
  default: false,
})

const { name: authorName, email: authorEmail } = getAuthor()

const packageDir = join(process.cwd(), 'packages', name)

console.log(`Creating package: ${name}`)
console.log(`Description: ${description}`)
console.log(`Repository: ${repository ? `${repository.owner}/${repository.repo}` : 'Unknown'}`)
console.log(`Package directory: ${packageDir}`)

mkdirSync(packageDir, { recursive: true })
mkdirSync(join(packageDir, 'src'), { recursive: true })
mkdirSync(join(packageDir, 'test'), { recursive: true })

const templates = {
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
  'tsdown.config.ts': `import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
})
`,
}

Object.entries(templates).forEach(([filePath, content]) => {
  const fullPath = join(packageDir, filePath)
  writeFileSync(fullPath, content)
})

const packageJson = {
  name,
  type: 'module',
  version: '0.0.0',
  private: isPrivate,
  description,
  author: `${authorName} <${authorEmail}>`,
  license: 'MIT',
  ...(isPrivate
    ? {}
    : {
        homepage: `https://github.com/${repository?.owner}/${repository?.repo}/tree/main/packages/${name}#readme`,
        repository: {
          type: 'git',
          url: `git+https://github.com/${repository?.owner}/${repository?.repo}.git`,
          directory: `packages/${name}`,
        },
        bugs: `https://github.com/${repository?.owner}/${repository?.repo}/issues`,
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
    build: 'tsdown',
    dev: 'tsdown --watch',
    ...(isPrivate ? {} : { prepublishOnly: 'tsdown' }),
    start: 'tsx src/index.ts',
  },
}

writeFileSync(join(packageDir, 'package.json'), JSON.stringify(packageJson, null, 2))

const readmeContent = isPrivate
  ? `# ${name.toUpperCase()}

${description}

## License

[MIT](./LICENSE) License © [${authorName}](https://github.com/${repository?.owner})
`
  : `# ${name.toUpperCase()}

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

${description}

## License

[MIT](./LICENSE) License © [${authorName}](https://github.com/${repository?.owner})

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/${name}?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/${name}
[npm-downloads-src]: https://img.shields.io/npm/dm/${name}?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/${name}
[bundle-src]: https://img.shields.io/bundlephobia/minzip/@${repository?.owner}/${name}?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=${name}
[license-src]: https://img.shields.io/github/license/${repository?.owner}/${repository?.repo}/blob/main/packages/${name}/LICENSE
[license-href]: https://github.com/${repository?.owner}/${repository?.repo}/blob/main/packages/${name}/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/${name}
`

writeFileSync(join(packageDir, 'README.md'), readmeContent)

console.log(`✅ Package ${name} created successfully!`)
console.log(`📁 Location: ${packageDir}`)
console.log(`📦 Next steps:`)
console.log(`   1. cd packages/${name}`)
console.log(`   2. Edit src/index.ts to implement your package`)
console.log(`   3. Run 'pnpm build' to build the package`)
console.log(`   4. Run 'pnpm test' to run tests`)
