const SHEET_ID = "1i82Y0PlKaeGQRmtVuLIEvM-LgyoyjcL3IRIERnleDWo";

const sheetTabs = {
  copy: "Website Copy",
  offers: "Offers",
  fixes: "Fixes",
  steps: "Process Steps",
  faqs: "FAQs",
  settings: "Settings",
};

const statusEl = document.querySelector("#cmsStatus");

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

async function fetchGvizSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${sheetName}`);
  const text = await response.text();
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return json.table.rows.map((row) => row.c.map((cell) => cell?.v ?? ""));
}

function active(value) {
  return String(value).toLowerCase() === "true";
}

function rowsToKeyValue(rows) {
  return rows.slice(1).reduce((acc, row) => {
    if (row[0] && active(row[4])) acc[row[0]] = row[3];
    return acc;
  }, {});
}

function settingsToObject(rows) {
  return rows.slice(1).reduce((acc, row) => {
    if (row[0] && active(row[2])) acc[row[0]] = row[1];
    return acc;
  }, {});
}

function rowsToOffers(rows) {
  return rows.slice(1).filter((row) => active(row[8])).map((row) => ({
    name: row[1],
    price: row[2],
    description: row[3],
    bullets: [row[4], row[5], row[6]].filter(Boolean),
    cta: row[7],
  }));
}

function rowsToFixes(rows) {
  return rows.slice(1).filter((row) => active(row[2])).map((row) => ({
    title: row[0],
    description: row[1],
  }));
}

function rowsToSteps(rows) {
  return rows.slice(1).filter((row) => active(row[3])).map((row) => ({
    step: row[0],
    title: row[1],
    description: row[2],
  }));
}

function rowsToFaqs(rows) {
  return rows.slice(1).filter((row) => active(row[2])).map((row) => ({
    question: row[0],
    answer: row[1],
  }));
}

async function loadCmsData() {
  try {
    const [copyRows, offerRows, fixRows, stepRows, faqRows, settingRows] = await Promise.all([
      fetchGvizSheet(sheetTabs.copy),
      fetchGvizSheet(sheetTabs.offers),
      fetchGvizSheet(sheetTabs.fixes),
      fetchGvizSheet(sheetTabs.steps),
      fetchGvizSheet(sheetTabs.faqs),
      fetchGvizSheet(sheetTabs.settings),
    ]);

    statusEl.textContent = "Copy loaded from Google Sheet";
    return {
      copy: rowsToKeyValue(copyRows),
      offers: rowsToOffers(offerRows),
      fixes: rowsToFixes(fixRows),
      steps: rowsToSteps(stepRows),
      faqs: rowsToFaqs(faqRows),
      settings: settingsToObject(settingRows),
    };
  } catch (error) {
    const local = await fetchJson("./site-copy.json");
    statusEl.textContent = "Preview using local copy. Publish/share the CMS sheet for live GViz.";
    return local;
  }
}

function setText(selector, text) {
  const node = document.querySelector(selector);
  if (node && text) node.textContent = text;
}

function renderCopy(copy) {
  document.title = copy.site_title || document.title;
  document.querySelectorAll("[data-copy]").forEach((node) => {
    const key = node.dataset.copy;
    if (copy[key]) node.textContent = copy[key];
  });

  document.querySelectorAll("[data-href-copy]").forEach((node) => {
    const key = node.dataset.hrefCopy;
    if (copy[key]) node.setAttribute("href", copy[key]);
  });
}

function renderSettings(settings) {
  const profileImage = document.querySelector("#profileImage");
  if (profileImage && settings.profile_image_url) {
    profileImage.src = settings.profile_image_url;
  }
  const footerEmail = document.querySelector("#footerEmail");
  if (footerEmail && settings.email) {
    const email = settings.email.replace(/^mailto:/, "");
    footerEmail.textContent = email;
    footerEmail.href = settings.email;
  }
  const footerContact = document.querySelector("#footerContact");
  if (footerContact) {
    if (settings.phone_display) {
      footerContact.hidden = false;
      footerContact.textContent = settings.phone_display;
      const digits = settings.phone_display.replace(/\D/g, "");
      if (digits.length >= 10) footerContact.href = `tel:+1${digits.slice(-10)}`;
    } else {
      footerContact.hidden = true;
    }
  }
  applyTheme(settings);
}

function applyTheme(settings) {
  const root = document.documentElement;
  const cssVars = {
    color_background: "--paper",
    color_text: "--ink",
    color_muted: "--muted",
    color_primary: "--green-dark",
    color_secondary: "--gold",
    color_tertiary: "--rose",
  };

  Object.entries(cssVars).forEach(([key, cssVar]) => {
    if (settings[key]) root.style.setProperty(cssVar, settings[key]);
  });
  updateFavicon(settings.color_primary || "#2f5f8f");

  const headingFont = settings.font_heading || "Fraunces";
  const bodyFont = settings.font_body || "Inter";
  root.style.setProperty("--font-heading", `"${headingFont}", Georgia, serif`);
  root.style.setProperty("--font-body", `"${bodyFont}", system-ui, sans-serif`);

  const fontFamilies = [headingFont, bodyFont].map((font) => `family=${encodeURIComponent(font).replaceAll("%20", "+")}:wght@400;500;650;750`).join("&");
  const fontUrl = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
  let link = document.querySelector("#dynamicFonts");
  if (!link) {
    link = document.createElement("link");
    link.id = "dynamicFonts";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = fontUrl;
}

function updateFavicon(primaryColor) {
  const svg = `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="18" fill="${primaryColor}"/>
      <path d="M18 45L23 19L46 45L51 19" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="18" cy="45" r="4" fill="white"/>
      <circle cx="51" cy="19" r="4" fill="white"/>
    </svg>
  `.trim();
  const favicon = document.querySelector("link[rel='icon']");
  if (favicon) {
    favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
}

function renderFixes(fixes) {
  const grid = document.querySelector("#fixGrid");
  grid.innerHTML = fixes.map((fix) => `
    <article class="fix-card">
      <h3>${fix.title}</h3>
      <p>${fix.description}</p>
    </article>
  `).join("");
}

function renderSteps(steps) {
  const list = document.querySelector("#stepList");
  list.innerHTML = steps.map((item) => `
    <article class="step-item">
      <div class="step-number">${item.step}</div>
      <div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
      </div>
    </article>
  `).join("");
}

function renderOffers(offers, ctaUrl) {
  const grid = document.querySelector("#offerGrid");
  grid.innerHTML = offers.map((offer) => `
    <article class="offer-card">
      <div>
        <h3>${offer.name}</h3>
        <p class="price">${offer.price}</p>
        <p>${offer.description}</p>
        <ul>${offer.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>
      </div>
      <a class="button secondary" href="${ctaUrl}">${offer.cta}</a>
    </article>
  `).join("");
}

function renderFaqs(faqs) {
  const list = document.querySelector("#faqList");
  list.innerHTML = faqs.map((faq) => `
    <article class="faq-item">
      <h3>${faq.question}</h3>
      <p>${faq.answer}</p>
    </article>
  `).join("");
}

loadCmsData().then((data) => {
  renderCopy(data.copy);
  renderSettings(data.settings);
  renderFixes(data.fixes);
  renderSteps(data.steps);
  renderOffers(data.offers, data.copy.primary_cta_url || "#");
  renderFaqs(data.faqs);
  document.body.classList.remove("cms-loading");
}).catch(() => {
  document.body.classList.remove("cms-loading");
});
