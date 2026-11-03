const apply = process.argv.includes('--apply');
const siteUrl = process.env.WP_SITE_URL?.trim();
const username = process.env.WP_USERNAME?.trim();
const appPassword = process.env.WP_APP_PASSWORD?.trim();

if (!siteUrl) throw new Error('WP_SITE_URL is required.');
if (apply && (!username || !appPassword)) {
  throw new Error('WP_USERNAME and WP_APP_PASSWORD are required with --apply.');
}

const origin = new URL(siteUrl).origin;
const auth = apply
  ? `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`
  : undefined;

const categoryDefinitions = [
  {
    key: 'plant-problems',
    name: 'Plant Problems',
    slug: 'plant-problems',
    description: 'Symptom-led guides for diagnosing houseplant problems carefully before changing care.',
  },
  {
    key: 'watering-moisture',
    name: 'Watering & Moisture',
    slug: 'watering-moisture',
    description: 'Practical watering, moisture-checking and water-quality guidance without rigid schedules.',
  },
  {
    key: 'light-temperature-position',
    name: 'Light, Temperature & Position',
    slug: 'light-temperature-position',
    description: 'Guidance on light, seasonal conditions, heating, humidity, draughts and plant placement.',
  },
  {
    key: 'soil-pots-roots',
    name: 'Soil, Pots & Roots',
    slug: 'soil-pots-roots',
    description: 'Repotting, root health, containers, drainage and growing-medium guidance.',
  },
  {
    key: 'propagation',
    name: 'Propagation',
    slug: 'propagation',
    description: 'Step-by-step guides to cuttings, division, offsets and safe plant propagation.',
  },
  {
    key: 'pests-diseases',
    name: 'Pests & Diseases',
    slug: 'pests-diseases',
    description: 'Identification, isolation and proportionate responses to indoor plant pests and diseases.',
  },
  {
    key: 'everyday-care',
    name: 'Everyday Plant Care',
    slug: 'everyday-plant-care',
    description: 'Practical routines, observation and maintenance for healthier houseplants.',
  },
  {
    key: 'plant-safety',
    name: 'Plant Safety',
    slug: 'plant-safety',
    description: 'Carefully sourced guidance about houseplants, pets and household safety.',
  },
];

const categoryByKey = new Map(categoryDefinitions.map((category) => [category.key, category]));

const classificationRules = [
  ['plant-safety', /toxic-to-cats-and-dogs/],
  ['pests-diseases', /(aphids|whiteflies|springtails|white-mould|thrips|scale-insects|spider-mites|mealybugs|fungus-gnats|isolate-a-houseplant-with-pests)/],
  ['propagation', /(propagate|propagation|divide-a-peace-lily|separate-aloe-vera-pups)/],
  ['soil-pots-roots', /(repot|rootbound|roots-growing-out-of-the-pot|healthy-and-unhealthy-.*-roots|check-houseplant-roots|root-rot|aerial-roots|pot-size|drainage-holes|growing-medi(?:um|a)|houseplant-compost|repotting-shock)/],
  ['watering-moisture', /(how-to-water|how-often-to-water|bottom-watering|tap-water|leaves-drip-water|water-run-straight-through)/],
  ['light-temperature-position', /(light-for-|grow-lights|humidity-for-|winter-houseplant|moving-house|heat-stress|sunburn|cold-damage|near-radiators|rotate-houseplants|acclimatise-a-new-houseplant)/],
  ['everyday-care', /(clean-houseplant-leaves|choose-the-right-pot-size|flower-again)/],
];

function classify(slug) {
  for (const [categoryKey, pattern] of classificationRules) {
    if (pattern.test(slug)) return categoryKey;
  }
  return 'plant-problems';
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  if (auth) headers.set('Authorization', auth);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(new URL(path, origin), { ...init, headers });
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

async function fetchAllPosts(context = 'view') {
  const posts = [];
  for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({
      status: 'publish',
      per_page: '100',
      page: String(page),
      context,
      _fields: 'id,slug,title,categories,link',
    });
    const response = await request(`/wp-json/wp/v2/posts?${params}`);
    posts.push(...await response.json());
    if (page >= Number(response.headers.get('x-wp-totalpages') || 1)) break;
  }
  return posts;
}

async function fetchCategories() {
  const response = await request('/wp-json/wp/v2/categories?per_page=100&hide_empty=false&_fields=id,name,slug,count');
  return response.json();
}

const posts = await fetchAllPosts(apply ? 'edit' : 'view');
const assignments = posts.map((post) => ({ ...post, categoryKey: classify(post.slug) }));
const counts = Object.fromEntries(categoryDefinitions.map((category) => [category.key, 0]));
for (const assignment of assignments) counts[assignment.categoryKey] += 1;

console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
console.log(`Published posts: ${assignments.length}`);
for (const category of categoryDefinitions) {
  console.log(`${category.name}: ${counts[category.key]}`);
}

if (!apply) {
  for (const assignment of assignments) {
    console.log(`${assignment.id}\t${categoryByKey.get(assignment.categoryKey).name}\t${assignment.slug}`);
  }
  console.log('No WordPress changes made. Re-run with --apply after reviewing this mapping.');
  process.exit(0);
}

const existingCategories = await fetchCategories();
const idByKey = new Map();

for (const definition of categoryDefinitions) {
  let category = existingCategories.find((item) => item.slug === definition.slug);
  if (!category) {
    const response = await request('/wp-json/wp/v2/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
      }),
    });
    category = await response.json();
    console.log(`Created category: ${definition.name} (${category.id})`);
  }
  idByKey.set(definition.key, category.id);
}

const uncategorized = existingCategories.find((category) => category.slug === 'uncategorized');
let updated = 0;
let unchanged = 0;

for (const assignment of assignments) {
  const targetId = idByKey.get(assignment.categoryKey);
  const retained = assignment.categories.filter((id) => id !== uncategorized?.id && id !== targetId);
  const nextCategories = [...retained, targetId];
  const current = [...assignment.categories].sort((a, b) => a - b);
  const next = [...nextCategories].sort((a, b) => a - b);
  if (JSON.stringify(current) === JSON.stringify(next)) {
    unchanged += 1;
    continue;
  }
  await request(`/wp-json/wp/v2/posts/${assignment.id}`, {
    method: 'POST',
    body: JSON.stringify({ categories: nextCategories }),
  });
  updated += 1;
  console.log(`Updated ${assignment.id}: ${assignment.slug} -> ${categoryByKey.get(assignment.categoryKey).name}`);
}

const verifiedPosts = await fetchAllPosts('edit');
const invalid = verifiedPosts.filter((post) => {
  const targetId = idByKey.get(classify(post.slug));
  return !post.categories.includes(targetId) || post.categories.includes(uncategorized?.id);
});

if (invalid.length > 0) {
  throw new Error(`Verification failed for ${invalid.length} posts: ${invalid.map((post) => post.id).join(', ')}`);
}

console.log(`Updated posts: ${updated}`);
console.log(`Already correct: ${unchanged}`);
console.log(`Verified posts: ${verifiedPosts.length}`);
console.log('Uncategorized was preserved but removed from every published post.');
