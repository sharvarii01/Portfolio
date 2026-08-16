const html = document.documentElement;
const body = document.body;
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const themeToggle = document.getElementById("themeToggle");
const backToTop = document.getElementById("backToTop");
const progressBar = document.getElementById("scrollProgress");
const form = document.getElementById("contactForm");
const formMessage = document.getElementById("formMessage");
const cursorGlow = document.getElementById("cursorGlow");

// Entry animation
body.classList.add("loaded");

// GSAP registration
if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
}

// Theme handling
const storedTheme = localStorage.getItem("theme");
if (storedTheme === "light" || storedTheme === "dark") {
    html.setAttribute("data-theme", storedTheme);
} else {
    html.setAttribute("data-theme", "light");
}

function syncThemeIcon() {
    const icon = themeToggle.querySelector("i");
    if (html.getAttribute("data-theme") === "light") {
        icon.className = "fa-solid fa-sun";
    } else {
        icon.className = "fa-solid fa-moon";
    }
}

syncThemeIcon();

themeToggle.addEventListener("click", () => {
    const current = html.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    syncThemeIcon();
});

// Mobile menu
menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});

document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("active");
    });
});

// Scroll indicators
function updateScrollIndicators() {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop;
    const maxScroll = doc.scrollHeight - doc.clientHeight;
    const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

    progressBar.style.width = `${progress}%`;

    if (scrollTop > 460) {
        backToTop.classList.add("visible");
    } else {
        backToTop.classList.remove("visible");
    }
}

window.addEventListener("scroll", updateScrollIndicators, { passive: true });
updateScrollIndicators();

backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// Active section observer
const sections = [...document.querySelectorAll("main section")];
const sectionObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            document.querySelectorAll(".nav-links a, .nav-right a").forEach((link) => {
                const href = link.getAttribute("href");
                if (href && href.startsWith("#")) {
                    link.classList.toggle(
                        "active",
                        href === `#${entry.target.id}`
                    );
                }
            });
        });
    },
    { threshold: 0.3 }
);

sections.forEach((section) => sectionObserver.observe(section));

// GSAP entrance and scroll animations
if (window.gsap) {
    // Subtle staggered entrance for hero copy
    gsap.from(".hero-copy > *", {
        y: 20,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.15
    });

    // Subtle entrance for hero panel
    gsap.from(".hero-panel", {
        y: 20,
        opacity: 0,
        duration: 0.9,
        delay: 0.3,
        ease: "power3.out"
    });

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const revealDistance = isMobile ? 12 : 20;
    const revealDuration = isMobile ? 0.7 : 0.85;
    const revealStagger = isMobile ? 0.1 : 0.14;

    const revealSelector = [
        "h1",
        "h2",
        "h3",
        "p",
        ".btn",
        ".btn-text",
        ".project-actions a",
        ".project-tech span",
        ".cert-year",
        ".cert-row-link",
        ".timeline-item span",
        ".contact-copy a",
        ".social-links a"
    ].join(", ");

    if (prefersReducedMotion) {
        gsap.set(revealSelector, { autoAlpha: 1, y: 0, clearProps: "all" });
    } else {
        gsap.utils.toArray("main .section").forEach((section) => {
            const textTargets = section.querySelectorAll(revealSelector);
            if (!textTargets.length) {
                return;
            }

            gsap.set(textTargets, {
                autoAlpha: 0,
                y: revealDistance,
                force3D: true
            });

            gsap.to(textTargets, {
                autoAlpha: 1,
                y: 0,
                duration: revealDuration,
                stagger: revealStagger,
                ease: "power2.out",
                overwrite: "auto",
                clearProps: "willChange",
                scrollTrigger: {
                    trigger: section,
                    start: "top 82%",
                    once: true
                }
            });
        });

        gsap.from("#skills .skill-chip", {
            scrollTrigger: {
                trigger: "#skills",
                start: "top 78%",
                once: true
            },
            y: 12,
            opacity: 0,
            duration: 0.45,
            ease: "power2.out",
            stagger: 0.05
        });
    }
}

const skillsShowcase = document.getElementById("skillsShowcase");
if (skillsShowcase) {
    const updateSpotlight = (event) => {
        const rect = skillsShowcase.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        skillsShowcase.style.setProperty("--spotlight-x", `${x}px`);
        skillsShowcase.style.setProperty("--spotlight-y", `${y}px`);
    };

    skillsShowcase.addEventListener("mousemove", updateSpotlight);
}

// Custom cursor glow trace
window.addEventListener("mousemove", (event) => {
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
});

// Contact form processing
form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
        formMessage.style.color = "var(--text)";
        formMessage.textContent = "Please fill out all fields before submitting.";
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        formMessage.style.color = "var(--text)";
        formMessage.textContent = "Please enter a valid email address.";
        return;
    }

    formMessage.style.color = "var(--brand)";
    formMessage.textContent = "Message received. Thank you, I will get back to you soon.";
    form.reset();
});
