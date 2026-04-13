const SITE_RESOURCES = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Use" },
  { href: "/data-deletion", label: "Data Deletion" },
  { href: "/faq", label: "FAQ" },
  { href: "/blogs", label: "Blogs" },
  { href: "/help", label: "Help Center" }
];

const SITE_SOLUTIONS = [
  { href: "/solutions/unified-inbox", label: "Unified Inbox" },
  { href: "/solutions/whatsapp-api", label: "Whatsapp Business API" },
  { href: "/solutions/analytics", label: "Analytics" },
  { href: "/solutions/social-crm", label: "Social CRM" },
  { href: "/solutions/ad-management", label: "Ad Management" },
  { href: "/solutions/automations", label: "Automations" },
  { href: "/solutions/integrations", label: "Integrations" }
];

const FOOTER_SOCIALS = [
  {
    href: "https://www.instagram.com/connektlyy/",
    label: "Instagram",
    icon: "/Social%20Media%20Icons/Instagram.png"
  },
  {
    href: "https://www.facebook.com/connektly",
    label: "Facebook",
    icon: "/Social%20Media%20Icons/Facebook.svg"
  },
  {
    href: "https://wa.me/12899070610",
    label: "WhatsApp",
    icon: "/Social%20Media%20Icons/WhatsApp.svg"
  }
];

const globalNavLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact Us" }
];

const SITE_LAYOUTS = {
  home: {
    brandHref: "/",
    navLinks: globalNavLinks,
    footer: {
      copy: "&copy; 2026 Connektly. All Rights Reserved."
    }
  },
  pricing: {
    brandHref: "/",
    navLinks: globalNavLinks,
    footer: {
      copy: "&copy; 2026 Connektly. Pricing built for fast-moving customer teams."
    }
  },
  "privacy-policy": {
    brandHref: "/",
    navLinks: globalNavLinks,
    footer: {
      copy: "&copy; 2026 Connektly. Messaging infrastructure for modern customer teams."
    }
  },
  "terms-of-service": {
    brandHref: "/",
    navLinks: globalNavLinks,
    footer: {
      copy: "&copy; 2026 Connektly. Messaging infrastructure for modern customer teams."
    }
  },
  "terms-of-use": {
    brandHref: "/",
    navLinks: globalNavLinks,
    footer: {
      copy: "&copy; 2026 Connektly. Messaging infrastructure for modern customer teams."
    }
  },
  "data-deletion": {
    brandHref: "/",
    navLinks: globalNavLinks,
    footer: {
      copy: "&copy; 2026 Connektly. Messaging infrastructure for modern customer teams."
    }
  },
  faq: {
    brandHref: "/",
    navLinks: globalNavLinks,
    footer: {
      copy: "&copy; 2026 Connektly. Messaging infrastructure for modern customer teams."
    }
  },
  "whatsapp-api": {
    brandHref: "/",
    navLinks: globalNavLinks,
    footer: {
      copy: "&copy; 2026 Connektly. Accelerate growth with the WhatsApp Business API."
    }
  },
  "unified-inbox": {
    brandHref: "/",
    navLinks: globalNavLinks,
    footer: {
      copy: "&copy; 2026 Connektly. One single workspace for all your customer conversations."
    }
  }
};

function detectSitePage() {
  const datasetPage = document.body?.dataset.page;

  if (datasetPage && SITE_LAYOUTS[datasetPage]) {
    return datasetPage;
  }

  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  if (!currentPath || currentPath === "index.html") {
    return "home";
  }

  return currentPath.replace(".html", "");
}

function renderBrand(href) {
  return `
    <a class="brand" href="${href}" aria-label="Connektly home">
      <span class="brand__mark brand__mark--image">
        <img src="/connektly-favicon.png" alt="" />
      </span>
      <span class="brand__text">
        <strong>Connektly</strong>
      </span>
    </a>
  `;
}

function renderResourcesDropdown() {
  const links = SITE_RESOURCES.map((item) => `<a href="${item.href}">${item.label}</a>`).join("");

  return `
    <details class="nav-dropdown">
      <summary class="nav-dropdown__toggle">Resources</summary>
      <div class="nav-dropdown__menu">
        ${links}
      </div>
    </details>
  `;
}

function renderSolutionsDropdown() {
  const links = SITE_SOLUTIONS.map((item) => `<a href="${item.href}">${item.label}</a>`).join("");

  return `
    <details class="nav-dropdown">
      <summary class="nav-dropdown__toggle">Solutions</summary>
      <div class="nav-dropdown__menu">
        ${links}
      </div>
    </details>
  `;
}

function renderHeader(layout) {
  const getLinkHtml = (label) => {
    const item = layout.navLinks.find(l => l.label === label);
    return item ? `<a href="${item.href}">${item.label}</a>` : '';
  };

  return `
    <header class="site-header">
      ${renderBrand(layout.brandHref)}

      <button
        class="nav-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="site-nav"
        aria-label="Toggle navigation"
      >
        <span></span>
        <span></span>
      </button>

      <nav class="site-nav" id="site-nav" aria-label="Primary">
        ${getLinkHtml("Home")}
        ${renderSolutionsDropdown()}
        ${getLinkHtml("Features")}
        ${getLinkHtml("Pricing")}
        ${renderResourcesDropdown()}
        ${getLinkHtml("Contact Us")}
        
        <div class="mobile-actions">
          <a class="nav-login" href="https://app.connektly.in/login" target="_blank" rel="noopener noreferrer">Login</a>
          <a class="button button--sm nav-cta" href="https://app.connektly.in/signup" target="_blank" rel="noopener noreferrer">Get Started</a>
        </div>
      </nav>

      <div class="header-actions">
        <a class="nav-login" href="https://app.connektly.in/login" target="_blank" rel="noopener noreferrer">Login</a>
        <a class="button button--sm nav-cta" href="https://app.connektly.in/signup" target="_blank" rel="noopener noreferrer">Get Started</a>
      </div>
    </header>
  `;
}

function renderFooter(layout) {
  const links = SITE_RESOURCES.map((item) => `<li><a href="${item.href}">${item.label}</a></li>`).join("");
  const socials = FOOTER_SOCIALS.map(
    (item) => `
          <a href="${item.href}" aria-label="${item.label}" target="_blank" rel="noopener noreferrer">
            <img src="${item.icon}" alt="${item.label}" />
          </a>`
  ).join("");

  return `
    <footer class="site-footer">
      <div class="site-footer__top">
        <div class="site-footer__support">
          <span class="eyebrow">Support links</span>
          <ul class="footer-links">
            ${links}
          </ul>
        </div>
      </div>

      <div class="site-footer__bottom">
        <p>${layout.footer.copy}</p>
        <div class="socials" aria-label="Social links">
          ${socials}
        </div>
      </div>
    </footer>
  `;
}

function mountSiteLayout() {
  const pageKey = detectSitePage();
  const layout = SITE_LAYOUTS[pageKey] || SITE_LAYOUTS.home;
  const headerRoot = document.querySelector("[data-site-header]");
  const footerRoot = document.querySelector("[data-site-footer]");

  if (headerRoot) {
    headerRoot.innerHTML = renderHeader(layout);
  }

  if (footerRoot) {
    footerRoot.innerHTML = renderFooter(layout);
  }
}

mountSiteLayout();
