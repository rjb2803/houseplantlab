const base = new URL('https://houseplantlab.co.uk');
const pages = [
  '/problems/',
  '/problems/yellow-leaves/',
  '/problems/brown-leaves-and-spots/',
  '/problems/curling-and-drooping/',
  '/problems/root-problems/',
  '/problems/pests/',
  '/care-guides/',
  '/care-guides/watering/',
  '/care-guides/repotting/',
  '/care-guides/propagation/',
  '/care-guides/light-and-location/',
  '/care-guides/humidity/',
  '/tools/',
  '/tools/plant-problem-checker/',
];

const pageResults = [];
const internalLinks = new Set();

for (const path of pages) {
  const url = new URL(path, base);
  url.searchParams.set('verify', 'hubs');
  const response = await fetch(url, { redirect: 'manual' });
  const html = await response.text();
  pageResults.push({
    path,
    status: response.status,
    redirect: response.headers.get('location'),
    title: html.match(/<title>(.*?)<\/title>/is)?.[1] ?? '',
    shortcode: /\[houseplantlab_/i.test(html),
    suggested: /suggested text/i.test(html),
    placeholder: /coming soon|in preparation/i.test(html),
    checker: path.includes('plant-problem-checker') ? {
      form: /class="hpl-checker__form"/.test(html),
      selects: html.match(/<select/g)?.length ?? 0,
      guides: html.match(/class="hpl-checker__result"/g)?.length ?? 0,
    } : undefined,
  });

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const target = new URL(match[1], base);
    if (
      target.hostname === base.hostname
      && target.pathname !== '/'
      && target.pathname !== '/xmlrpc.php'
      && !target.pathname.startsWith('/wp-')
    ) {
      internalLinks.add(target.pathname);
    }
  }
}

const linkResults = [];
for (const path of internalLinks) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  linkResults.push({ path, status: response.status, location: response.headers.get('location') });
}

const homeResponse = await fetch(new URL('/?verify=nav', base));
const home = await homeResponse.text();
const report = {
  pages: pageResults,
  internalLinks: {
    checked: linkResults.length,
    failures: linkResults.filter((result) => result.status !== 200),
  },
  navigation: {
    problems: /href="\/problems\/"/.test(home),
    care: /href="\/care-guides\/"/.test(home),
    tools: /href="\/tools\/"/.test(home),
    checker: /href="\/tools\/plant-problem-checker\/"/.test(home),
    oldProblem: /href="\/problem\/"/.test(home),
    oldCategory: /href="\/category\/care-guides\/"/.test(home),
  },
};

console.log(JSON.stringify(report, null, 2));

const failedPages = pageResults.filter((result) => (
  result.status !== 200
  || result.redirect
  || result.shortcode
  || result.suggested
  || result.placeholder
));
const checker = pageResults.find((result) => result.checker)?.checker;
if (
  failedPages.length > 0
  || report.internalLinks.failures.length > 0
  || !checker?.form
  || checker.selects !== 2
  || checker.guides < 20
  || !report.navigation.problems
  || !report.navigation.care
  || !report.navigation.tools
  || !report.navigation.checker
  || report.navigation.oldProblem
  || report.navigation.oldCategory
) {
  process.exitCode = 1;
}
