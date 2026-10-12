const allowedHosts = new Set(['houseplantlab.co.uk', 'www.houseplantlab.co.uk']);
const siteUrl = process.env.WP_SITE_URL?.trim();
const username = process.env.WP_USERNAME?.trim();
const appPassword = process.env.WP_APP_PASSWORD?.trim();

if (process.argv[2] !== '--apply') {
  throw new Error('Pass --apply to publish the trust pages and unpublish the confirmed Sample Page.');
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

const pages = [
  {
    title: 'About HouseplantLab',
    slug: 'about',
    excerpt: 'How HouseplantLab researches, reviews and maintains practical UK houseplant guidance.',
    content: `
<p><strong>HouseplantLab is an independent UK houseplant-care publication built to make plant advice clearer, calmer and more useful.</strong></p>
<p>Our guides are written for people growing plants in real homes: rooms with changing light, centrally heated winters, limited windowsill space and the ordinary uncertainty that comes with learning what a plant needs.</p>
<h2>What we publish</h2>
<p>We focus on practical plant profiles, symptom-led troubleshooting, propagation and repotting guidance. Our aim is to help readers observe first, rule out likely causes and take proportionate action instead of reaching immediately for a product or a dramatic treatment.</p>
<h2>Our editorial process</h2>
<p>Articles are prepared from a defined brief and checked against reputable horticultural evidence. We separate supported guidance from assumptions, avoid guarantees and fixed schedules where growing conditions matter, and review every article for clarity, usefulness and factual support before publication.</p>
<p>Automated tools may help with research organisation, drafting checks and image production. They do not replace editorial review. AI-generated editorial illustrations are used as illustrations only; they are not presented as photographs of a diagnosed plant or as proof of a particular symptom.</p>
<h2>How we recommend products</h2>
<p>A product is mentioned only when it has a clear role in a care task. Where a link is an affiliate link, HouseplantLab may earn a commission at no extra cost to the reader. Commercial relationships do not determine our care advice, and every paid or affiliate link is identified where it appears.</p>
<h2>Corrections and updates</h2>
<p>Plant care is affected by species, season, home conditions and the evidence available at the time. We update guides when better evidence or clearer practical advice becomes available. If you spot an error, an unclear claim or a broken link, please use our <a href="/contact/">Contact page</a> and include the article URL.</p>
<p>For details of how the site handles personal information and cookies, see our <a href="/privacy-policy/">Privacy Policy</a> and <a href="/cookie-policy/">Cookie Policy</a>.</p>`,
  },
  {
    title: 'Contact HouseplantLab',
    slug: 'contact',
    excerpt: 'Contact HouseplantLab about editorial corrections, plant-care feedback, partnerships or privacy questions.',
    content: `
<p><strong>Use this form to contact the HouseplantLab editor.</strong> We welcome factual corrections, feedback about our guides, questions about image or product disclosures, and relevant partnership enquiries.</p>
<h2>Before you send a message</h2>
<ul>
<li>For a correction, include the full URL and the sentence or section concerned.</li>
<li>For a plant question, describe the plant, its location, recent care and the pattern of the problem. We cannot guarantee an individual diagnosis from a message.</li>
<li>Do not send passwords, payment details or other unnecessary sensitive information.</li>
</ul>
<p>The form sends your name, email address and message to the site administrator’s mailbox so we can reply. Submissions are not saved as public comments or stored in the WordPress database. Read the <a href="/privacy-policy/">Privacy Policy</a> for more information.</p>
[houseplantlab_contact_form]`,
  },
  {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    excerpt: 'How HouseplantLab handles contact details, technical data, analytics, advertising and affiliate services.',
    content: `
<p><strong>Last updated: 12 October 2026.</strong></p>
<p>HouseplantLab is responsible for personal information handled through this website. This policy explains what information may be processed, why it is used and the choices available to you.</p>
<h2>Information you provide</h2>
<p>If you use the contact form, we receive the name, email address, subject and message you submit. We use this information to read, manage and reply to your enquiry. The form sends the message to the site administrator’s mailbox and does not store a copy in the public website or WordPress database.</p>
<p>Please do not include sensitive personal information unless it is genuinely necessary. Our lawful basis for ordinary enquiries is our legitimate interest in communicating with readers and operating the publication. Where an enquiry concerns a specific agreement, processing may also be necessary to take steps at your request.</p>
<h2>Technical and security information</h2>
<p>The website and its hosting or security services may process technical information such as an IP address, browser type, requested URL, date and time, and security events. This information is used to deliver the site, prevent abuse, investigate faults and protect the website. Server and security logs are retained according to the relevant provider’s operational and security settings.</p>
<h2>Analytics</h2>
<p>HouseplantLab uses Google Analytics and Google measurement technology to understand how the site is found and used. These services can process information such as pages viewed, approximate location derived from an IP address, device and browser information, and interactions with the site. We use aggregated reporting to improve navigation and editorial coverage rather than to identify individual readers.</p>
<p>Analytics storage is non-essential and requires consent where applicable. See the <a href="/cookie-policy/">Cookie Policy</a> for details and controls.</p>
<h2>Advertising and affiliate services</h2>
<p><strong>Current advertising status:</strong> HouseplantLab does not currently display third-party advertising, and Google AdSense advertising cookies are not active.</p>
<p>HouseplantLab has selected Google AdSense as its advertising provider. When advertising is activated, Google and its advertising partners may use cookies, web beacons, IP addresses and other identifiers to deliver and measure advertising, limit repeated adverts, prevent fraud and, where you have consented, personalise advertising. Third parties may place and read cookies in your browser or use web beacons and IP addresses as a result of ad serving.</p>
<p>Non-essential advertising storage and personalised advertising require the relevant consent choice. Advertising will not be activated for visitors covered by UK, EEA or Swiss consent rules until those choices are available through a Google-certified consent platform. Google also provides controls through <a href="https://adssettings.google.com/" rel="external">Google Ads Settings</a>.</p>
<p>Where a link is identified as an affiliate link, HouseplantLab may receive a commission at no extra cost to you. The destination retailer processes visits and purchases under its own privacy policy. HouseplantLab does not receive your payment-card details from those retailers.</p>
<h2>Who receives information</h2>
<p>Information may be handled by service providers needed to operate the site, including the web host, security services, email provider and analytics provider. They process information under their own terms and safeguards. Information may also be disclosed where required by law or necessary to protect legal rights and site security.</p>
<h2>International transfers</h2>
<p>Some technology providers may process information outside the UK. Where required, we rely on recognised safeguards such as adequacy regulations or approved contractual protections.</p>
<h2>How long information is kept</h2>
<p>Contact messages are kept only for as long as reasonably needed to answer the enquiry, maintain an appropriate record of the conversation, meet legal obligations or resolve a dispute. Technical, analytics and security information follows the retention settings of the relevant service.</p>
<h2>Your rights</h2>
<p>Depending on the circumstances, UK data-protection law may give you rights to request access, correction or deletion of personal information; restrict or object to processing; and request data portability. Where processing relies on consent, you can withdraw that consent for future processing.</p>
<p>To make a privacy request, use the <a href="/contact/">Contact page</a> and state that your message concerns privacy. We may need to verify your identity. You can also complain to the UK Information Commissioner’s Office at <a href="https://ico.org.uk/make-a-complaint/" rel="external">ico.org.uk</a>.</p>
<h2>Children</h2>
<p>HouseplantLab is a general-audience publication and is not designed to collect personal information from children. If you believe a child has submitted personal information, contact us so it can be reviewed.</p>
<h2>Changes to this policy</h2>
<p>We will update this page when the site’s services or data practices change. The date at the top shows the latest revision.</p>`,
  },
  {
    title: 'Cookie Policy',
    slug: 'cookie-policy',
    excerpt: 'The cookies and similar technologies used by HouseplantLab and how visitors can control them.',
    content: `
<p><strong>Last updated: 12 October 2026.</strong></p>
<p>This policy explains how HouseplantLab uses cookies and similar browser technologies. A cookie is a small text file stored by a website or service in your browser. Similar technologies can include local storage, tags and pixels.</p>
<h2>Strictly necessary technologies</h2>
<p>WordPress, the hosting platform and security services may use essential cookies or similar technologies to deliver pages, protect forms, prevent abuse and support signed-in administrators. These are used because the website cannot provide the relevant security or account function without them.</p>
<p>The public contact form uses a short-lived WordPress security token to check that a submission came from the form. The message itself is emailed to the site administrator and is not stored as a public comment or WordPress database entry.</p>
<h2>Analytics</h2>
<p>The site includes Google measurement technology to help us understand visits and improve the publication. When analytics storage is permitted, Google Analytics cookies commonly use names beginning with <code>_ga</code>. Their precise names and duration can depend on the measurement configuration.</p>
<p>Analytics is not strictly necessary to display the site. Analytics storage requires an affirmative consent choice where applicable. You can also block or delete cookies using your browser controls.</p>
<h2>Advertising</h2>
<p><strong>Current advertising-cookie status:</strong> HouseplantLab does not currently display third-party advertising, and Google AdSense advertising cookies are not active.</p>
<p>HouseplantLab has selected Google AdSense as its advertising provider. When advertising is activated, Google and its advertising partners may use cookies, web beacons, IP addresses and other identifiers to deliver and measure adverts, limit repeated adverts, prevent fraud and, where you have consented, personalise advertising.</p>
<p>Advertising storage and personalised advertising are non-essential. Advertising will not be activated for visitors covered by UK, EEA or Swiss consent rules until the relevant choices are available through a Google-certified consent platform. Google also provides controls through <a href="https://adssettings.google.com/" rel="external">Google Ads Settings</a>.</p>
<h2>Managing cookies</h2>
<p>You can review, block or delete cookies through your browser settings. Blocking strictly necessary technologies may prevent security, login or form features from working correctly. Browser controls do not automatically prevent every server log or cookie-free measurement technique.</p>
<p>When a consent panel is available, use its settings to accept, reject or revisit non-essential categories. You can also find browser-specific guidance through the help pages for Chrome, Edge, Firefox and Safari.</p>
<h2>Changes and questions</h2>
<p>Cookie use can change when site services are added or removed. We will revise this page when that happens. For questions about cookies or privacy, use the <a href="/contact/">Contact page</a>. You can read more about personal-data handling in our <a href="/privacy-policy/">Privacy Policy</a>.</p>`,
  },
];

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

const existing = await request('/wp-json/wp/v2/pages?per_page=100&context=edit&status=publish,draft,pending,private,future&_fields=id,status,slug,title,link');
const results = [];

for (const page of pages) {
  // WordPress protects the page selected as its Privacy Policy with the
  // manage_privacy_options capability. Always update that original record;
  // do not silently create or maintain a second public policy page.
  const matches = page.slug === 'privacy-policy'
    ? existing.filter((candidate) => candidate.id === 3)
    : existing.filter((candidate) => candidate.slug === page.slug || candidate.title?.raw === page.title);
  if (matches.length > 1) throw new Error(`Multiple WordPress pages use the slug ${page.slug}.`);
  if (page.slug === 'privacy-policy' && matches.length !== 1) {
    throw new Error('The canonical WordPress Privacy Policy page (ID 3) was not found.');
  }
  const endpoint = matches[0] ? `/wp-json/wp/v2/pages/${matches[0].id}` : '/wp-json/wp/v2/pages';
  const saved = await request(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      ...page,
      status: 'publish',
      comment_status: 'closed',
      ping_status: 'closed',
    }),
  });
  results.push({ id: saved.id, status: saved.status, slug: saved.slug, title: saved.title?.rendered, url: saved.link });
}

const privacyResult = results.find((page) => page.slug === 'privacy-policy');
if (!privacyResult || privacyResult.id !== 3 || privacyResult.status !== 'publish') {
  throw new Error('The canonical WordPress Privacy Policy page was not published successfully.');
}

const duplicatePrivacyPages = existing.filter((candidate) => (
  candidate.id !== privacyResult.id
  && candidate.title?.raw === 'Privacy Policy'
  && /^privacy-policy(?:-\d+)?$/.test(candidate.slug)
));
const retiredPrivacyPages = [];
for (const duplicate of duplicatePrivacyPages) {
  const retired = await request(`/wp-json/wp/v2/pages/${duplicate.id}`, {
    method: 'POST',
    body: JSON.stringify({ status: 'draft' }),
  });
  retiredPrivacyPages.push({ id: retired.id, slug: retired.slug, status: retired.status });
}

const placeholders = existing.filter((candidate) => candidate.slug === 'sample-page' && candidate.title?.raw === 'Sample Page');
if (placeholders.length !== 1) {
  throw new Error(`Expected exactly one confirmed Sample Page; found ${placeholders.length}.`);
}
const placeholder = await request(`/wp-json/wp/v2/pages/${placeholders[0].id}`, {
  method: 'POST',
  body: JSON.stringify({ status: 'draft' }),
});

console.log(JSON.stringify({
  publishedPages: results,
  retiredPrivacyPages,
  placeholder: { id: placeholder.id, slug: placeholder.slug, status: placeholder.status },
}, null, 2));
