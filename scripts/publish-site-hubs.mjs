const allowedHosts = new Set(['houseplantlab.co.uk', 'www.houseplantlab.co.uk']);
const siteUrl = process.env.WP_SITE_URL?.trim();
const username = process.env.WP_USERNAME?.trim();
const appPassword = process.env.WP_APP_PASSWORD?.trim();

if (process.argv[2] !== '--apply') {
  throw new Error('Pass --apply to publish the populated site hubs.');
}
if (!siteUrl || !username || !appPassword) {
  throw new Error('WP_SITE_URL, WP_USERNAME and WP_APP_PASSWORD are required.');
}

const origin = new URL(siteUrl);
if (origin.protocol !== 'https:' || origin.port || origin.username || origin.password || !allowedHosts.has(origin.hostname)) {
  throw new Error('WP_SITE_URL must be the HTTPS HouseplantLab production origin.');
}

const authorization = `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`;
const headers = { Authorization: authorization, 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(new URL(path, origin), {
    redirect: 'error',
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.message ? ` ${body.message}` : '';
    } catch {
      // The HTTP status remains useful if WordPress returns HTML.
    }
    throw new Error(`${path} failed with HTTP ${response.status}.${detail}`);
  }
  return response.json();
}

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const posts = await request('/wp-json/wp/v2/posts?per_page=100&context=edit&status=publish&_fields=id,slug,title,link,status');
const postsBySlug = new Map(posts.map((post) => [post.slug, post]));

function guideList(slugs) {
  const missing = slugs.filter((slug) => !postsBySlug.has(slug));
  if (missing.length > 0) throw new Error(`Hub references unpublished article slugs: ${missing.join(', ')}`);
  return `<ul class="hpl-guide-list">${slugs.map((slug) => {
    const post = postsBySlug.get(slug);
    return `<li><a href="${escapeHtml(post.link)}"><strong>${post.title.rendered}</strong></a></li>`;
  }).join('')}</ul>`;
}

function hubIntro(kicker, intro) {
  return `<p class="hpl-hub-kicker">${escapeHtml(kicker)}</p><p class="hpl-hub-intro">${escapeHtml(intro)}</p>`;
}

function hubCards(cards) {
  return `<div class="hpl-hub-grid">${cards.map((card) => `<section class="hpl-hub-card"><h2><a href="${escapeHtml(card.path)}">${escapeHtml(card.title)}</a></h2><p>${escapeHtml(card.description)}</p><p><a href="${escapeHtml(card.path)}">Browse this section →</a></p></section>`).join('')}</div>`;
}

function articleHub({ kicker, intro, guidance, slugs, closing }) {
  return `${hubIntro(kicker, intro)}<h2>How to use these guides</h2><p>${escapeHtml(guidance)}</p><h2>Relevant guides</h2>${guideList(slugs)}<h2>Look at the whole plant</h2><p>${escapeHtml(closing)}</p><p><a href="/tools/plant-problem-checker/">Use the Plant Problem Checker →</a></p>`;
}

const definitions = [
  {
    key: 'problems',
    title: 'Plant Problems',
    slug: 'problems',
    excerpt: 'Symptom-led houseplant troubleshooting guides for yellow leaves, brown damage, drooping, roots and pests.',
    content: `${hubIntro('Observe before you act', 'Start with the pattern you can see, then compare watering, roots, light, temperature and recent changes before choosing a response. A symptom is evidence, not a diagnosis on its own.')}${hubCards([
      { title: 'Yellow leaves', path: '/problems/yellow-leaves/', description: 'Work through common reasons leaves lose colour without assuming that every yellow leaf means overwatering.' },
      { title: 'Brown leaves and spots', path: '/problems/brown-leaves-and-spots/', description: 'Separate dry tips and edges from discrete spots, damaged tissue and spreading lesions.' },
      { title: 'Curling and drooping', path: '/problems/curling-and-drooping/', description: 'Check whether the whole plant, individual leaves or only new growth has changed.' },
      { title: 'Root problems', path: '/problems/root-problems/', description: 'Assess compost condition, drainage, root health and repotting decisions proportionately.' },
      { title: 'Houseplant pests', path: '/problems/pests/', description: 'Identify common indoor pests and choose measured, evidence-led control steps.' },
      { title: 'Plant Problem Checker', path: '/tools/plant-problem-checker/', description: 'Choose a visible symptom and plant to narrow the most useful reading list.' },
    ])}<h2>A calm troubleshooting method</h2><ol><li>Describe the pattern: which leaves, which part of each leaf and how quickly it changed.</li><li>Check the compost and roots before changing the watering routine.</li><li>Consider recent moves, repotting, feeding, temperature changes or pest exposure.</li><li>Make one proportionate change where possible, then observe the response.</li></ol><p>For routine growing advice rather than a symptom, use the <a href="/care-guides/">Care Guides hub</a>.</p>`,
  },
  {
    key: 'care-guides',
    title: 'Houseplant Care Guides',
    slug: 'care-guides',
    excerpt: 'Practical UK houseplant guides covering watering, repotting, propagation, light and humidity.',
    content: `${hubIntro('Practical care for real homes', 'Good houseplant care is built from repeatable observations rather than rigid calendars. These guides explain what to check, why it matters and when not to intervene.')}${hubCards([
      { title: 'Watering', path: '/care-guides/watering/', description: 'Judge moisture, plant demand and seasonal change without relying on a fixed weekly schedule.' },
      { title: 'Repotting and growing media', path: '/care-guides/repotting/', description: 'Recognise genuine root crowding, choose a proportionate pot and support recovery.' },
      { title: 'Propagation', path: '/care-guides/propagation/', description: 'Use plant-appropriate methods and understand which parts can produce new growth.' },
      { title: 'Light and location', path: '/care-guides/light-and-location/', description: 'Read the light in a room and use supplementary lighting appropriately.' },
      { title: 'Humidity', path: '/care-guides/humidity/', description: 'Understand what household humidity can and cannot explain about plant condition.' },
    ])}<h2>Choose the smallest useful intervention</h2><p>Before changing several parts of a routine at once, identify the decision that is most likely to matter. Stable care makes it easier to see whether a plant is improving and reduces unnecessary root disturbance, feeding or treatment.</p><p>If the plant is already showing damage, begin with the <a href="/problems/">Plant Problems hub</a>.</p>`,
  },
  {
    key: 'tools',
    title: 'Houseplant Tools',
    slug: 'tools',
    excerpt: 'Interactive tools that connect visible houseplant symptoms with relevant evidence-led guidance.',
    content: `${hubIntro('Useful tools, clear limits', 'HouseplantLab tools help organise observations and find relevant guidance. They do not replace careful inspection or claim certainty from a single symptom.')}${hubCards([
      { title: 'Plant Problem Checker', path: '/tools/plant-problem-checker/', description: 'Filter the current troubleshooting library by visible symptom and plant.' },
    ])}<h2>What the checker does</h2><p>It narrows the reading list using information you select. It does not collect the answers, upload photographs or provide an automated medical-style diagnosis. Always inspect the full plant and read the relevant guide before acting.</p>`,
  },
  {
    key: 'yellow-leaves', parent: 'problems', title: 'Yellow Leaves on Houseplants', slug: 'yellow-leaves',
    excerpt: 'Identify useful next checks when houseplant leaves turn yellow.',
    content: articleHub({ kicker: 'Plant problem guide', intro: 'Yellowing can reflect natural leaf ageing, root stress, watering conditions, light, nutrition or several factors together. The position and spread of the change are more useful than colour alone.', guidance: 'Choose the guide for your plant, then compare the affected leaves with the pattern described. Avoid treating “yellow leaves” as a diagnosis or changing watering solely because of one leaf.', slugs: ['why-are-my-pothos-leaves-turning-yellow','why-are-my-peace-lily-leaves-turning-yellow','why-are-my-snake-plant-leaves-turning-yellow','why-are-my-rubber-plant-leaves-turning-yellow','why-are-my-fiddle-leaf-fig-leaves-turning-yellow','why-are-my-phalaenopsis-orchid-leaves-turning-yellow','why-are-my-spider-plant-leaves-turning-yellow','why-are-my-zz-plant-leaves-turning-yellow'], closing: 'Note whether older or newer leaves are affected first, whether the compost stays wet, and whether the plant recently moved or was repotted.' }),
  },
  {
    key: 'brown-leaves', parent: 'problems', title: 'Brown Leaves, Tips and Spots', slug: 'brown-leaves-and-spots',
    excerpt: 'Compare brown tips, edges and spots across common houseplants.',
    content: articleHub({ kicker: 'Plant problem guide', intro: 'Brown damage is permanent, but its shape and position can help you investigate the cause. Dry tips, crisp margins and isolated spots should not automatically be treated as the same problem.', guidance: 'Match the plant and damage pattern first. Check whether the brown area is dry or soft, stable or spreading, and whether pests or root stress are also present.', slugs: ['brown-spots-monstera-deliciosa-leaves','brown-spots-on-pothos-leaves','brown-spots-rubber-plant-leaves','brown-spots-fiddle-leaf-fig-leaves','why-are-my-aloe-vera-leaves-turning-brown-at-the-tips','why-are-my-calathea-leaves-turning-brown-at-the-edges','why-are-my-spider-plant-tips-turning-brown'], closing: 'Damaged tissue will not become green again. Judge progress by whether new damage stops and healthy new growth develops.' }),
  },
  {
    key: 'curling-drooping', parent: 'problems', title: 'Curling and Drooping Houseplant Leaves', slug: 'curling-and-drooping',
    excerpt: 'Troubleshoot curling, drooping and loss of firmness without guessing from one symptom.',
    content: articleHub({ kicker: 'Plant problem guide', intro: 'Curling and drooping describe shape, not cause. Water availability, damaged roots, heat, cold, light and normal plant movement can produce superficially similar changes.', guidance: 'Check compost moisture and root condition alongside the leaf pattern. A plant in wet compost can droop, so do not assume that wilting always means it needs more water.', slugs: ['why-are-my-calathea-leaves-curling','why-are-my-monstera-deliciosa-leaves-curling','why-are-my-pothos-leaves-curling','why-is-my-monstera-deliciosa-drooping','why-is-my-peace-lily-drooping','why-is-my-rubber-plant-drooping'], closing: 'Compare the plant with its usual posture at the same time of day and look for changes affecting roots, stems and new growth.' }),
  },
  {
    key: 'root-problems', parent: 'problems', title: 'Houseplant Root Problems', slug: 'root-problems',
    excerpt: 'Assess suspected root rot, crowded roots, drainage and repotting decisions.',
    content: articleHub({ kicker: 'Roots and growing media', intro: 'Roots need a workable balance of water and air. A wet surface, a crowded pot or a yellow leaf is not enough on its own to establish root rot or prove that repotting is needed.', guidance: 'Begin with the general root-rot and growing-medium guides. Use a plant-specific repotting guide when a healthy plant is genuinely crowded or the growing medium needs attention.', slugs: ['suspected-root-rot-houseplants','well-drained-growing-medium-houseplants','best-growing-media-for-monstera-deliciosa','how-to-repot-monstera-deliciosa','how-to-repot-a-zz-plant','how-to-repot-phalaenopsis-orchid','repot-snake-plant','when-how-to-repot-aloe-vera','when-how-to-repot-peace-lily','when-how-to-repot-pothos','when-how-to-repot-spider-plant'], closing: 'Avoid unnecessary root disturbance. When inspection is justified, work cleanly, record what you find and match the next step to actual root condition.' }),
  },
  {
    key: 'pests', parent: 'problems', title: 'Common Houseplant Pests', slug: 'pests',
    excerpt: 'Identify and control fungus gnats, mealybugs, scale, spider mites and thrips.',
    content: articleHub({ kicker: 'Identify before treating', intro: 'Pest control works best when the organism is identified correctly and the response is repeated at an interval suited to its life cycle. Similar-looking marks can also come from non-pest causes.', guidance: 'Inspect leaf undersides, stems, growing points and the compost surface in good light. Isolate an affected plant when practical and choose the guide that matches what you can actually see.', slugs: ['fungus-gnats-houseplants-identification-control','mealybugs-on-houseplants','scale-insects-on-houseplants','spider-mites-on-houseplants','thrips-on-houseplants'], closing: 'Continue checking nearby plants after treatment and avoid combining products or methods without confirming they are compatible and appropriate indoors.' }),
  },
  {
    key: 'watering', parent: 'care-guides', title: 'Watering Houseplants', slug: 'watering',
    excerpt: 'Water common houseplants according to conditions rather than a fixed calendar.',
    content: articleHub({ kicker: 'Care guide collection', intro: 'A useful watering decision combines the plant, pot, growing medium, room conditions and season. The same calendar interval will not suit every home or time of year.', guidance: 'Open the guide for your plant and use its checks as a decision process. Record how quickly the pot changes rather than treating a stated interval as a deadline.', slugs: ['how-often-to-water-monstera-deliciosa','how-to-water-a-zz-plant-without-a-fixed-schedule','how-to-water-aloe-vera-indoors','how-to-water-calathea-without-a-rigid-schedule','how-to-water-fiddle-leaf-fig','how-to-water-peace-lily','how-to-water-pothos','how-to-water-rubber-plant','how-to-water-snake-plant','how-to-water-spider-plant'], closing: 'When a plant looks unwell, inspect moisture and roots before adding more water. Both dry and poorly aerated wet compost can interfere with water uptake.' }),
  },
  {
    key: 'repotting', parent: 'care-guides', title: 'Repotting and Growing Media', slug: 'repotting',
    excerpt: 'Choose when to repot, how much to increase pot size and what growing medium needs to do.',
    content: articleHub({ kicker: 'Care guide collection', intro: 'Repotting is useful when there is a clear reason, such as genuine crowding or an unsuitable growing medium. It is also a disturbance, so timing and proportion matter.', guidance: 'Start with the general growing-medium guide, then use the plant-specific method. Avoid jumping several pot sizes or repotting a stressed plant merely because a calendar says it is due.', slugs: ['well-drained-growing-medium-houseplants','best-growing-media-for-monstera-deliciosa','how-to-repot-monstera-deliciosa','how-to-repot-a-zz-plant','how-to-repot-phalaenopsis-orchid','repot-snake-plant','when-how-to-repot-aloe-vera','when-how-to-repot-peace-lily','when-how-to-repot-pothos','when-how-to-repot-spider-plant'], closing: 'After repotting, return the plant to stable suitable conditions and avoid stacking additional changes while roots re-establish.' }),
  },
  {
    key: 'propagation', parent: 'care-guides', title: 'Propagating Houseplants', slug: 'propagation',
    excerpt: 'Plant-specific propagation guides for cuttings, divisions and offsets.',
    content: articleHub({ kicker: 'Care guide collection', intro: 'Successful propagation depends on using a plant part capable of producing new growth. The right method differs between vines, rosette-forming plants and plants that produce offsets.', guidance: 'Choose the guide for your plant and identify the required node, division or offset before cutting. Use clean tools and avoid taking more material than the parent plant can comfortably lose.', slugs: ['how-to-propagate-pothos-from-stem-cuttings','how-to-propagate-spider-plant-babies','propagate-snake-plants','monstera-deliciosa-aerial-roots'], closing: 'New propagations usually need steadier conditions than established plants. Watch for actual root and shoot development rather than assuming success from leaf appearance alone.' }),
  },
  {
    key: 'light-location', parent: 'care-guides', title: 'Houseplant Light and Location', slug: 'light-and-location',
    excerpt: 'Assess indoor light and use grow lights without relying on vague room labels.',
    content: `${hubIntro('Care guide collection', 'Indoor light changes with window direction, distance, season, obstructions and the time of day. “Bright room” is not a dependable measurement by itself.')}<h2>Start with the available light</h2><p>Observe how long direct sun reaches the position, how far the plant sits from the window and whether buildings, trees or blinds reduce it. Move plants gradually where a large change in exposure could cause stress.</p>${guideList(['how-to-use-grow-lights-for-houseplants','why-is-my-monstera-deliciosa-not-splitting','how-to-get-a-phalaenopsis-orchid-to-flower-again'])}<h2>Use grow lights as a measured supplement</h2><p>Choose equipment designed for plant use, follow electrical and distance guidance, and provide a regular dark period. Plant response over time is more useful than marketing labels alone.</p><p><a href="/care-guides/">Return to all Care Guides →</a></p>`,
  },
  {
    key: 'humidity', parent: 'care-guides', title: 'Humidity for Houseplants', slug: 'humidity',
    excerpt: 'Understand indoor humidity, measurement and the limits of humidity-based explanations.',
    content: `${hubIntro('Care guide collection', 'Humidity affects how plants lose water, but it should not become a catch-all explanation for every brown edge or curled leaf. Measure conditions and consider roots, watering, heat and pests as well.')}<h2>Understand the room before changing it</h2>${guideList(['humidity-for-houseplants'])}<p>A basic hygrometer can help establish whether a room is consistently dry or whether conditions fluctuate around heating, ventilation and weather. Grouping plants changes the immediate environment only modestly, while misting provides a brief surface wetting rather than dependable room-wide humidity control.</p><h2>Related symptom guides</h2>${guideList(['why-are-my-calathea-leaves-curling','why-are-my-calathea-leaves-turning-brown-at-the-edges','why-are-my-spider-plant-tips-turning-brown'])}<p>These symptoms can have several causes. Use the linked guides to compare the complete pattern rather than assuming humidity is responsible.</p>`,
  },
  {
    key: 'plant-problem-checker', parent: 'tools', title: 'Plant Problem Checker', slug: 'plant-problem-checker',
    excerpt: 'Choose a visible symptom and plant to find the most relevant HouseplantLab troubleshooting guides.',
    content: `${hubIntro('Interactive guide finder', 'Select the clearest visible symptom and, if you know it, the plant. The checker filters HouseplantLab’s current troubleshooting library without collecting your answers.')}[houseplantlab_problem_checker]<h2>Before changing the care routine</h2><p>Read the complete guide, inspect the plant in good light and check the growing medium. One symptom can have several explanations, and changing water, position, feed and potting mix simultaneously can make the result harder to interpret.</p>`,
  },
];

const existing = await request('/wp-json/wp/v2/pages?per_page=100&context=edit&status=publish,draft,pending,private,future&_fields=id,status,slug,title,link,parent');
const savedByKey = new Map();
const publishedPages = [];

for (const definition of definitions) {
  const parent = definition.parent ? savedByKey.get(definition.parent) : null;
  if (definition.parent && !parent) throw new Error(`Parent page ${definition.parent} was not saved.`);
  const parentId = parent?.id ?? 0;
  const matches = existing.filter((candidate) => candidate.slug === definition.slug && candidate.parent === parentId);
  if (matches.length > 1) throw new Error(`Multiple pages match ${definition.slug} under parent ${parentId}.`);
  const endpoint = matches[0] ? `/wp-json/wp/v2/pages/${matches[0].id}` : '/wp-json/wp/v2/pages';
  const saved = await request(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      title: definition.title,
      slug: definition.slug,
      excerpt: definition.excerpt,
      content: definition.content,
      parent: parentId,
      status: 'publish',
      comment_status: 'closed',
      ping_status: 'closed',
    }),
  });
  const expectedPath = parent ? `/${parent.slug}/${definition.slug}/` : `/${definition.slug}/`;
  if (new URL(saved.link).pathname !== expectedPath) {
    throw new Error(`${definition.title} published at unexpected path ${saved.link}; expected ${expectedPath}.`);
  }
  const record = { id: saved.id, title: saved.title?.rendered, slug: saved.slug, status: saved.status, url: saved.link };
  savedByKey.set(definition.key, record);
  publishedPages.push(record);
}

console.log(JSON.stringify({ publishedPages }, null, 2));
