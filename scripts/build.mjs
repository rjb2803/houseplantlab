import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const output = 'dist/wp-content';

await rm('dist', { recursive: true, force: true });
await mkdir(`${output}/themes`, { recursive: true });
await mkdir(`${output}/plugins`, { recursive: true });
await cp('themes/houseplantlab', `${output}/themes/houseplantlab`, { recursive: true });
await cp('plugins/houseplantlab-core', `${output}/plugins/houseplantlab-core`, { recursive: true });
await writeFile(
  path.join('dist', 'BUILD.txt'),
  `HouseplantLab ${pkg.version}\nGenerated: ${new Date().toISOString()}\nDeploy the wp-content directory to WordPress.\n`,
);

console.log('Built deployable WordPress files in dist/wp-content.');

