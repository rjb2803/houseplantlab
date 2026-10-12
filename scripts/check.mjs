import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'themes/houseplantlab/style.css',
  'themes/houseplantlab/theme.json',
  'themes/houseplantlab/functions.php',
  'themes/houseplantlab/templates/index.html',
  'themes/houseplantlab/blog.php',
  'themes/houseplantlab/assets/src/field-journal.css',
  'plugins/houseplantlab-core/houseplantlab-core.php',
  'deploy/purge-houseplantlab-cache.php',
];

for (const file of requiredFiles) {
  await access(file);
}

const theme = JSON.parse(await readFile('themes/houseplantlab/theme.json', 'utf8'));
if (theme.version !== 3) {
  throw new Error('theme.json must use schema version 3.');
}

const style = await readFile('themes/houseplantlab/style.css', 'utf8');
if (!style.includes('Theme Name: HouseplantLab')) {
  throw new Error('The WordPress theme header is missing.');
}

const plugin = await readFile('plugins/houseplantlab-core/houseplantlab-core.php', 'utf8');
if (!plugin.includes('Plugin Name: HouseplantLab Core')) {
  throw new Error('The WordPress plugin header is missing.');
}

if (
  !plugin.includes('houseplantlab_reject_hacked_numeric_queries')
  || !plugin.includes('status_header(410)')
) {
  throw new Error('The hacked-query 410 protection is missing.');
}

console.log('HouseplantLab structure and metadata checks passed.');

