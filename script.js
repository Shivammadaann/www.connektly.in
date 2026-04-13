const solutions = {
  sales: {
    tag: "Sales workflow",
    title: "Close faster with a pipeline that talks back.",
    body:
      "Keep CRM stages, WhatsApp conversations, and reminders synced so reps always know what to do next.",
    points: [
      "Auto-create leads from inbound WhatsApp chats",
      "Assign reps by territory, source, or priority score",
      "Push every meeting, note, and follow-up back into the CRM"
    ],
    metrics: ["27% faster qualification", "2-way CRM sync", "Missed lead alerts"],
    pill: "Lead qualification",
    meta: "Auto synced to CRM",
    messages: [
      {
        author: "Prospect",
        body: "Hi, I need pricing for 20 sales agents and a shared inbox.",
        variant: "client"
      },
      {
        author: "Connektly bot",
        body: "Thanks. I have routed this lead to Priya and created an opportunity in Growth.",
        variant: "brand"
      },
      {
        author: "Priya",
        body: "I can walk you through pricing and setup on a 15-minute demo this afternoon.",
        variant: "brand"
      }
    ]
  },
  marketing: {
    tag: "Marketing broadcast",
    title: "Broadcast WhatsApp messages to thousands in one click.",
    body:
      "Launch rich campaigns with segments, templates, and audience intelligence without switching tools.",
    points: [
      "Segment audiences by lifecycle stage and campaign behavior",
      "Schedule personalized broadcasts with approval-safe templates",
      "Track CTR, replies, and attributed revenue in one view"
    ],
    metrics: ["18.4% CTR", "A/B test ready", "Template governance"],
    pill: "Campaign launch",
    meta: "Template approved",
    messages: [
      {
        author: "Campaign",
        body: "Festive offer: get 20% off before midnight with code CONNECT20.",
        variant: "brand"
      },
      {
        author: "Recipient",
        body: "I clicked through and want to know if this applies to annual plans too.",
        variant: "client"
      },
      {
        author: "Connektly AI",
        body: "This reply was tagged as purchase intent and sent to the sales queue.",
        variant: "brand"
      }
    ]
  },
  support: {
    tag: "Support automation",
    title: "Resolve issues without losing the human touch.",
    body:
      "Automate repetitive questions, escalate urgent threads, and keep every resolution visible to the whole team.",
    points: [
      "SLA timers and owner changes happen automatically",
      "Macros and knowledge snippets speed up repeated replies",
      "Escalations stay attached to customer history and billing context"
    ],
    metrics: ["34% faster resolution", "SLA tracking", "Live escalation alerts"],
    pill: "Support queue",
    meta: "Priority customer",
    messages: [
      {
        author: "Customer",
        body: "Our invoice export is failing and we need it fixed before payroll close.",
        variant: "client"
      },
      {
        author: "Connektly AI",
        body: "Priority escalation created. Finance support specialist notified instantly.",
        variant: "brand"
      },
      {
        author: "Support lead",
        body: "We're already on it. I attached the export logs and a fix ETA for 3:15 PM.",
        variant: "brand"
      }
    ]
  }
};

const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const navDropdowns = document.querySelectorAll(".nav-dropdown");
const tabs = document.querySelectorAll(".solution-tab");
const tagNode = document.getElementById("solution-tag");
const titleNode = document.getElementById("solution-title");
const bodyNode = document.getElementById("solution-body");
const pointsNode = document.getElementById("solution-points");
const metricsNode = document.getElementById("solution-metrics");
const stagePillNode = document.getElementById("stage-pill");
const stageMetaNode = document.getElementById("stage-meta");
const chatStackNode = document.getElementById("chat-stack");
const stageNode = document.getElementById("solution-stage");
const accordionItems = document.querySelectorAll(".accordion__item");
const form = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");
const revealNodes = document.querySelectorAll(".reveal");
const sectionNodes = document.querySelectorAll("main section[id]");
const tocLinks = document.querySelectorAll("[data-toc-link]");
const docSections = document.querySelectorAll("[data-doc-section]");
const faqFilters = document.querySelectorAll(".faq-filter");
const faqItems = document.querySelectorAll(".faq-item");
const faqToggles = document.querySelectorAll(".faq-toggle");
const pricingCycleButtons = document.querySelectorAll("[data-pricing-cycle]");
const pricingAmountNodes = document.querySelectorAll("[data-price-annual][data-price-monthly]");
const pricingBillingNodes = document.querySelectorAll("[data-billing-annual][data-billing-monthly]");
const pricingPromoNode = document.querySelector("[data-pricing-promo]");

const hasSolutionModule =
  tabs.length &&
  tagNode &&
  titleNode &&
  bodyNode &&
  pointsNode &&
  metricsNode &&
  stagePillNode &&
  stageMetaNode &&
  chatStackNode &&
  stageNode;

let activeSolution = "sales";
let autoRotate;
let activeFaqFilter = "all";
let activePricingCycle = "annual";

function normalizePathname(pathname) {
  const rawPath = pathname || "/";
  let normalized = rawPath.split("?")[0].split("#")[0] || "/";

  normalized = normalized.replace(/\/index\.html$/i, "/");
  normalized = normalized.replace(/\.html$/i, "");

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, "");
  }

  return normalized || "/";
}

function renderSolution(key) {
  if (!hasSolutionModule) {
    return;
  }

  const solution = solutions[key];

  if (!solution) {
    return;
  }

  activeSolution = key;
  tagNode.textContent = solution.tag;
  titleNode.textContent = solution.title;
  bodyNode.textContent = solution.body;
  stagePillNode.textContent = solution.pill;
  stageMetaNode.textContent = solution.meta;

  pointsNode.innerHTML = solution.points.map((point) => `<li>${point}</li>`).join("");
  metricsNode.innerHTML = solution.metrics.map((metric) => `<span>${metric}</span>`).join("");

  chatStackNode.innerHTML = solution.messages
    .map(
      (message) => `
        <article class="chat-message chat-message--${message.variant}">
          <strong>${message.author}</strong>
          <span>${message.body}</span>
        </article>
      `
    )
    .join("");

  tabs.forEach((tab) => {
    const isCurrent = tab.dataset.solution === key;
    tab.classList.toggle("is-current", isCurrent);
    tab.setAttribute("aria-selected", String(isCurrent));
  });

  stageNode.animate(
    [
      { opacity: 0.82, transform: "translateY(8px)" },
      { opacity: 1, transform: "translateY(0)" }
    ],
    {
      duration: 280,
      easing: "ease-out"
    }
  );
}

function toggleMenu(forceState) {
  if (!header || !navToggle) {
    return;
  }

  const shouldOpen =
    typeof forceState === "boolean" ? forceState : !header.classList.contains("is-open");

  header.classList.toggle("is-open", shouldOpen);
  navToggle.setAttribute("aria-expanded", String(shouldOpen));

  if (!shouldOpen) {
    navDropdowns.forEach((dropdown) => closeNavDropdown(dropdown));
  }
}

function openNavDropdown(dropdown, options = {}) {
  if (!dropdown) {
    return;
  }

  const { pinned = false } = options;

  navDropdowns.forEach((entry) => {
    if (entry !== dropdown) {
      closeNavDropdown(entry);
    }
  });

  dropdown.setAttribute("open", "");

  if (pinned) {
    dropdown.dataset.pinned = "true";
  } else {
    delete dropdown.dataset.pinned;
  }
}

function closeNavDropdown(dropdown) {
  if (!dropdown) {
    return;
  }

  dropdown.removeAttribute("open");
  delete dropdown.dataset.pinned;
}

function closeAllNavDropdowns() {
  navDropdowns.forEach((dropdown) => closeNavDropdown(dropdown));
}

function setCurrentPageLink() {
  const currentPath = normalizePathname(window.location.pathname);

  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const cleanHref = href.split("#")[0];

    if (!cleanHref || cleanHref === "#") {
      return;
    }

    if (normalizePathname(cleanHref) === currentPath) {
      link.classList.add("is-active");
    }
  });

  navDropdowns.forEach((dropdown) => {
    const hasActiveChild = dropdown.querySelector("a.is-active");
    dropdown.classList.toggle("nav-dropdown--current", Boolean(hasActiveChild));
  });
}

function renderPricingCycle(cycle) {
  if (!pricingCycleButtons.length || !pricingAmountNodes.length) {
    return;
  }

  activePricingCycle = cycle;

  pricingCycleButtons.forEach((button) => {
    const isCurrent = button.dataset.pricingCycle === cycle;
    button.classList.toggle("is-current", isCurrent);
    button.setAttribute("aria-pressed", String(isCurrent));
  });

  pricingAmountNodes.forEach((node) => {
    node.innerHTML = `&#8377;${node.dataset[`price${cycle === "annual" ? "Annual" : "Monthly"}`]}<span>/month</span>`;
  });

  pricingBillingNodes.forEach((node) => {
    node.textContent = node.dataset[`billing${cycle === "annual" ? "Annual" : "Monthly"}`] || "";
  });

  if (pricingPromoNode) {
    pricingPromoNode.textContent =
      cycle === "annual"
        ? "Up to 25% off and free dedicated onboarding with annual subscription"
        : "Switch to monthly for flexibility with no annual commitment";
  }
}

function setActiveSectionLink() {
  if (!sectionNodes.length) {
    return;
  }

  const offset = window.scrollY + 180;

  sectionNodes.forEach((section) => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;
    const isCurrent = offset >= top && offset < bottom;

    navLinks.forEach((link) => {
      const matches = link.getAttribute("href") === `#${section.id}`;
      if (matches) {
        link.classList.toggle("is-active", isCurrent);
      }
    });
  });
}

function setActiveTocLink() {
  if (!tocLinks.length || !docSections.length) {
    return;
  }

  const offset = window.scrollY + 220;
  let currentId = docSections[0].id;

  docSections.forEach((section) => {
    if (offset >= section.offsetTop) {
      currentId = section.id;
    }
  });

  tocLinks.forEach((link) => {
    link.classList.toggle("is-current", link.getAttribute("href") === `#${currentId}`);
  });
}

function startAutoRotate() {
  if (!hasSolutionModule) {
    return;
  }

  const keys = Object.keys(solutions);
  clearInterval(autoRotate);

  autoRotate = setInterval(() => {
    const currentIndex = keys.indexOf(activeSolution);
    const nextKey = keys[(currentIndex + 1) % keys.length];
    renderSolution(nextKey);
  }, 4800);
}

function updateFaqVisibility(filter) {
  if (!faqItems.length) {
    return;
  }

  activeFaqFilter = filter;

  faqFilters.forEach((button) => {
    const isCurrent = button.dataset.filter === filter;
    button.classList.toggle("is-current", isCurrent);
    button.setAttribute("aria-pressed", String(isCurrent));
  });

  faqItems.forEach((item) => {
    const categories = (item.dataset.category || "").split(" ").filter(Boolean);
    const visible = filter === "all" || categories.includes(filter);
    item.hidden = !visible;

    if (!visible) {
      item.classList.remove("is-open");
      const toggle = item.querySelector(".faq-toggle");
      toggle?.setAttribute("aria-expanded", "false");
    }
  });

  const openItem = Array.from(faqItems).find((item) => !item.hidden && item.classList.contains("is-open"));
  const firstVisibleItem = Array.from(faqItems).find((item) => !item.hidden);

  if (!openItem && firstVisibleItem) {
    firstVisibleItem.classList.add("is-open");
    firstVisibleItem.querySelector(".faq-toggle")?.setAttribute("aria-expanded", "true");
  }
}

navToggle?.addEventListener("click", () => toggleMenu());

navLinks.forEach((link) => {
  link.addEventListener("click", () => toggleMenu(false));
});

navDropdowns.forEach((dropdown) => {
  const summary = dropdown.querySelector(".nav-dropdown__toggle");

  summary?.addEventListener("click", (event) => {
    event.preventDefault();

    const isPinned = dropdown.dataset.pinned === "true";

    if (isPinned) {
      closeNavDropdown(dropdown);
      return;
    }

    openNavDropdown(dropdown, { pinned: true });
  });

  dropdown.addEventListener("mouseenter", () => {
    openNavDropdown(dropdown);
  });

  dropdown.addEventListener("mouseleave", () => {
    if (dropdown.dataset.pinned === "true") {
      return;
    }

    closeNavDropdown(dropdown);
  });

  dropdown.addEventListener("toggle", () => {
    if (!dropdown.hasAttribute("open")) {
      delete dropdown.dataset.pinned;
      return;
    }

    navDropdowns.forEach((entry) => {
      if (entry !== dropdown) {
        closeNavDropdown(entry);
      }
    });
  });
});

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const clickedInsideDropdown = target.closest(".nav-dropdown");

  if (!clickedInsideDropdown) {
    closeAllNavDropdowns();
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    renderSolution(tab.dataset.solution);
    startAutoRotate();
  });
});

accordionItems.forEach((item) => {
  item.addEventListener("click", () => {
    accordionItems.forEach((entry) => entry.classList.remove("is-open"));
    item.classList.add("is-open");
  });
});

faqFilters.forEach((button) => {
  button.addEventListener("click", () => {
    updateFaqVisibility(button.dataset.filter || "all");
  });
});

pricingCycleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    renderPricingCycle(button.dataset.pricingCycle || "annual");
  });
});

faqToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const parent = toggle.closest(".faq-item");

    if (!parent || parent.hidden) {
      return;
    }

    faqItems.forEach((item) => {
      if (!item.hidden) {
        item.classList.remove("is-open");
        item.querySelector(".faq-toggle")?.setAttribute("aria-expanded", "false");
      }
    });

    parent.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  });
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const name = data.get("name");

  formStatus.textContent = `Thanks${name ? `, ${name}` : ""}. Our team will reach out within one business day.`;
  form.reset();
});

if ("IntersectionObserver" in window && revealNodes.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
  );

  revealNodes.forEach((node) => revealObserver.observe(node));
} else {
  revealNodes.forEach((node) => node.classList.add("is-visible"));
}

window.addEventListener("scroll", () => {
  setActiveSectionLink();
  setActiveTocLink();
  if (header) {
    header.classList.toggle("is-scrolled", window.scrollY > 50);
  }
}, { passive: true });

window.addEventListener("resize", () => {
  setActiveSectionLink();
  setActiveTocLink();
});

function initPlatformSwitcher() {
  const btnApp = document.getElementById("pc-btn-app");
  const btnApi = document.getElementById("pc-btn-api");
  const panelApp = document.getElementById("pc-panel-app");
  const panelApi = document.getElementById("pc-panel-api");
  
  if (!btnApp || !btnApi) return;

  btnApp.addEventListener("click", () => {
    document.body.setAttribute("data-pc-state", "app");
    btnApi.classList.remove("is-active");
    btnApi.setAttribute("aria-selected", "false");
    btnApp.classList.add("is-active");
    btnApp.setAttribute("aria-selected", "true");
    
    panelApi.classList.remove("is-active");
    panelApp.classList.add("is-active");
  });

  btnApi.addEventListener("click", () => {
    document.body.setAttribute("data-pc-state", "api");
    btnApp.classList.remove("is-active");
    btnApp.setAttribute("aria-selected", "false");
    btnApi.classList.add("is-active");
    btnApi.setAttribute("aria-selected", "true");
    
    panelApp.classList.remove("is-active");
    panelApi.classList.add("is-active");
  });
}

setCurrentPageLink();
setActiveSectionLink();
setActiveTocLink();
renderSolution(activeSolution);
startAutoRotate();
updateFaqVisibility(activeFaqFilter);
renderPricingCycle(activePricingCycle);
initPlatformSwitcher();
