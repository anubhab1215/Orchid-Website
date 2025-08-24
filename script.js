// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// SPA-style navigation: show one section at a time
function setActiveSection(sectionId) {
    const allSections = document.querySelectorAll('section[id]');
    allSections.forEach(section => section.classList.remove('active-section'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active-section');
        window.scrollTo({ top: 0, behavior: 'auto' });
    }
    updateActiveNav(sectionId);
}

function updateActiveNav(sectionId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });
}

// Intercept navbar clicks
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const hash = link.getAttribute('href');
        const sectionId = hash.replace('#', '');
        if (sectionId) {
            // Update URL hash to enable back/forward
            if (window.location.hash !== hash) {
                window.location.hash = hash;
            }
            setActiveSection(sectionId);
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
});

// Handle direct load and hash changes
window.addEventListener('hashchange', () => {
    const sectionId = (window.location.hash || '#home').replace('#', '');
    setActiveSection(sectionId || 'home');
});

// Header scroll effect (class toggle for better styling control)
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (!header) return;
    if (window.scrollY > 100) {
        header.classList.add('is-scrolled');
    } else {
        header.classList.remove('is-scrolled');
    }
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe all sections for animation
document.querySelectorAll('section').forEach(section => {
    section.classList.add('fade-in');
    observer.observe(section);
});

// Form submission handling (Netlify when hosted, localStorage fallback when local file)
const contactForm = document.querySelector('.contact-form form');
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validation
        const fields = {
            name: this.querySelector('input[name="name"]'),
            email: this.querySelector('input[name="email"]'),
            subject: this.querySelector('input[name="subject"]'),
            message: this.querySelector('textarea[name="message"]')
        };

        const statusBox = this.querySelector('.form-status');
        const errors = {};

        // Basic rules
        if (!fields.name.value.trim()) errors.name = 'Please enter your name';
        const emailVal = fields.email.value.trim();
        if (!emailVal) {
            errors.email = 'Please enter your email';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            errors.email = 'Please enter a valid email';
        }
        if (!fields.subject.value.trim()) errors.subject = 'Please add a subject';
        if (!fields.message.value.trim()) errors.message = 'Please write a message';

        // Paint errors
        ['name','email','subject','message'].forEach((key) => {
            const input = fields[key];
            const errorEl = this.querySelector(`.field-error[data-for="${key}"]`);
            if (errors[key]) {
                input.classList.add('is-invalid');
                input.classList.remove('is-valid');
                if (errorEl) errorEl.textContent = errors[key];
            } else {
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
                if (errorEl) errorEl.textContent = '';
            }
        });

        if (Object.keys(errors).length) {
            if (statusBox) {
                statusBox.textContent = 'Please fix the highlighted fields.';
                statusBox.className = 'form-status show error';
            }
            return;
        }

        const formData = new FormData(this);
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.innerHTML = '<span class="loading"></span> Sending...';
        submitBtn.disabled = true;

        const isHosted = window.location.protocol !== 'file:';
        const isNetlifyForm = this.hasAttribute('data-netlify');

        if (isHosted && isNetlifyForm) {
            // Submit to Netlify Forms
            try {
                const body = new URLSearchParams();
                for (const [key, value] of formData.entries()) {
                    body.append(key, value);
                }
                // Netlify requires form-name field
                if (!body.get('form-name')) {
                    body.append('form-name', this.getAttribute('name') || 'contact');
                }

                const res = await fetch('/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: body.toString()
                });

                if (res.ok) {
                    showNotification('Message sent! Check Netlify → Forms for submissions.', 'success');
                    if (statusBox) {
                        statusBox.textContent = 'Message sent successfully!';
                        statusBox.className = 'form-status show success';
                    }
                    this.reset();
                    Object.values(fields).forEach(f => f.classList.remove('is-valid'));
                } else {
                    throw new Error('Network response was not ok');
                }
            } catch (err) {
                console.error(err);
                showNotification('Could not submit to server. Saved locally instead.', 'error');
                saveSubmissionLocally(formData);
                if (statusBox) {
                    statusBox.textContent = 'Saved locally. Host on Netlify to collect online.';
                    statusBox.className = 'form-status show error';
                }
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } else {
            // Local file: save to localStorage
            saveSubmissionLocally(formData);
            showNotification('Saved locally. Host on Netlify to collect online.', 'success');
            if (statusBox) {
                statusBox.textContent = 'Saved locally. Host on Netlify to collect online.';
                statusBox.className = 'form-status show success';
            }
            this.reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // Real-time validation
    const attachBlur = (selector, validator) => {
        const input = contactForm.querySelector(selector);
        if (!input) return;
        input.addEventListener('blur', () => {
            const errorEl = contactForm.querySelector(`.field-error[data-for="${input.name}"]`);
            const message = validator(input.value);
            if (message) {
                input.classList.add('is-invalid');
                input.classList.remove('is-valid');
                if (errorEl) errorEl.textContent = message;
            } else {
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
                if (errorEl) errorEl.textContent = '';
            }
        });
    };

    attachBlur('input[name="name"]', (v) => v.trim() ? '' : 'Please enter your name');
    attachBlur('input[name="email"]', (v) => {
        if (!v.trim()) return 'Please enter your email';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid email';
    });
    attachBlur('input[name="subject"]', (v) => v.trim() ? '' : 'Please add a subject');
    attachBlur('textarea[name="message"]', (v) => v.trim() ? '' : 'Please write a message');
}

function saveSubmissionLocally(formData) {
    const submission = {
        name: formData.get('name') || '',
        email: formData.get('email') || '',
        subject: formData.get('subject') || '',
        message: formData.get('message') || '',
        submittedAt: new Date().toISOString()
    };
    try {
        const existingRaw = localStorage.getItem('contactSubmissions');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        existing.push(submission);
        localStorage.setItem('contactSubmissions', JSON.stringify(existing));
    } catch (err) {
        console.error('Failed to save to localStorage:', err);
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Counter animation for stats
function animateCounters() {
    const counters = document.querySelectorAll('.stat-item h3');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent);
        const increment = target / 100;
        let current = 0;
        
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                counter.textContent = Math.ceil(current) + '+';
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target + '+';
            }
        };
        
        updateCounter();
    });
}

// Trigger counter animation when stats section is visible
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.hero-stats');
if (statsSection) {
    statsObserver.observe(statsSection);
}

// Gallery lightbox functionality
document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
        if (item.classList.contains('dojo-trigger')) return; // handled separately
        const img = item.querySelector('.gallery-img');
        const title = item.querySelector('.gallery-overlay h3').textContent;
        const description = item.querySelector('.gallery-overlay p').textContent;
        showLightbox(img.src, title, description);
    });
});

function showLightbox(imageSrc, title, description) {
    // Create lightbox overlay
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-close">&times;</button>
            <img src="${imageSrc}" alt="${title}">
            <div class="lightbox-info">
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        </div>
    `;
    
    // Add styles
    lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    const content = lightbox.querySelector('.lightbox-content');
    content.style.cssText = `
        position: relative;
        max-width: 90%;
        max-height: 90%;
        background: white;
        border-radius: 15px;
        overflow: hidden;
        transform: scale(0.8);
        transition: transform 0.3s ease;
    `;
    
    // Add to page
    document.body.appendChild(lightbox);
    
    // Animate in
    setTimeout(() => {
        lightbox.style.opacity = '1';
        content.style.transform = 'scale(1)';
    }, 100);
    
    // Close functionality
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const closeLightbox = () => {
        lightbox.style.opacity = '0';
        content.style.transform = 'scale(0.8)';
        setTimeout(() => lightbox.remove(), 300);
    };
    
    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });
}

// Add CSS for lightbox
const lightboxStyles = document.createElement('style');
lightboxStyles.textContent = `
    .lightbox-close {
        position: absolute;
        top: 15px;
        right: 20px;
        background: #8B0000;
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 24px;
        cursor: pointer;
        z-index: 1;
        transition: background 0.3s ease;
    }
    
    .lightbox-close:hover {
        background: #6B0000;
    }
    
    .lightbox-content img {
        width: 100%;
        height: auto;
        display: block;
    }
    
    .lightbox-info {
        padding: 20px;
        text-align: center;
    }
    
    .lightbox-info h3 {
        color: #8B0000;
        margin-bottom: 10px;
    }
    
    .lightbox-info p {
        color: #666;
        margin: 0;
    }
`;

document.head.appendChild(lightboxStyles);

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    }
});

// Add CSS for notification system
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification-content {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.3s ease;
    }
    
    .notification-close:hover {
        background: rgba(255,255,255,0.2);
    }
    
    .notification-message {
        flex: 1;
    }
`;

document.head.appendChild(notificationStyles);

// Initialize tooltips for facility cards
document.querySelectorAll('.facility-card').forEach(card => {
    const title = card.querySelector('h3').textContent;
    const description = card.querySelector('p').textContent;
    
    card.setAttribute('title', `${title}: ${description}`);
});

// Add scroll progress indicator
const progressBar = document.createElement('div');
progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 3px;
    background: linear-gradient(90deg, #8B0000, #FFD700);
    z-index: 10001;
    transition: width 0.3s ease;
`;

document.body.appendChild(progressBar);

window.addEventListener('scroll', () => {
    const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    progressBar.style.width = scrolled + '%';
});

// Add back to top button
const backToTop = document.createElement('button');
backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
backToTop.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    background: #8B0000;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
    opacity: 0;
    visibility: hidden;
    z-index: 1000;
`;

document.body.appendChild(backToTop);

// Show/hide back to top button
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTop.style.opacity = '1';
        backToTop.style.visibility = 'visible';
    } else {
        backToTop.style.opacity = '0';
        backToTop.style.visibility = 'hidden';
    }
});

// Back to top functionality
backToTop.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Hover effects for back to top button
backToTop.addEventListener('mouseenter', () => {
    backToTop.style.background = '#6B0000';
    backToTop.style.transform = 'translateY(-3px)';
});

backToTop.addEventListener('mouseleave', () => {
    backToTop.style.background = '#8B0000';
    backToTop.style.transform = 'translateY(0)';
});

// Hero Slideshow functionality
let currentSlide = 0;
let slideInterval;

function initSlideshow() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.slideshow-btn.prev');
    const nextBtn = document.querySelector('.slideshow-btn.next');
    
    console.log('Slideshow init - slides found:', slides.length);
    
    if (!slides.length) {
        console.log('No slides found, returning');
        return;
    }
    
    function showSlide(n) {
        // Remove active class from all slides and dots
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Add active class to current slide and dot
        slides[n].classList.add('active');
        dots[n].classList.add('active');
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }
    
    function prevSlide() {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    }
    
    function goToSlide(n) {
        currentSlide = n;
        showSlide(currentSlide);
    }
    
    // Event listeners for navigation
    if (prevBtn) prevBtn.addEventListener('click', () => {
        prevSlide();
        resetInterval();
    });
    
    if (nextBtn) nextBtn.addEventListener('click', () => {
        nextSlide();
        resetInterval();
    });
    
    // Event listeners for dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
            resetInterval();
        });
    });
    
    // Auto-advance slides
    function startInterval() {
        slideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    }
    
    function resetInterval() {
        clearInterval(slideInterval);
        startInterval();
    }
    
    // Pause on hover
    const slideshow = document.querySelector('.hero-slideshow');
    if (slideshow) {
        slideshow.addEventListener('mouseenter', () => clearInterval(slideInterval));
        slideshow.addEventListener('mouseleave', startInterval);
    }
    
    // Start the slideshow
    showSlide(0); // Ensure first slide is active
    startInterval();
}

// FAQ Accordion functionality
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const faqItem = question.parentElement;
        const isActive = faqItem.classList.contains('active');
        
        // Close all other FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Toggle current item
        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Add loading animation to page
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);

    // Initialize SPA routing: show hash section or Home
    const initialId = (window.location.hash || '#home').replace('#', '') || 'home';
    setActiveSection(initialId);
    
    // Initialize slideshow
    initSlideshow();
});

// Dojo gallery grouped lightbox
const dojoTrigger = document.getElementById('dojo-gallery-trigger');
if (dojoTrigger) {
    const dojoImages = [
        { src: 'images/Dojo1.jpg', title: 'Dojo Competition', desc: 'Highlight 1' },
        { src: 'images/dojo.jpg', title: 'Dojo Competition', desc: 'Highlight 2' },
        { src: 'images/dojo2.jpg', title: 'Dojo Competition', desc: 'Highlight 3' },
        { src: 'images/dojo3.jpg', title: 'Dojo Competition', desc: 'Highlight 4' },
        { src: 'images/dojo4.jpg', title: 'Dojo Competition', desc: 'Highlight 5' },
        { src: 'images/dojo6.jpg', title: 'Dojo Competition', desc: 'Highlight 6' },
    ];

    dojoTrigger.addEventListener('click', () => {
        showDojoGallery(dojoImages);
    });
}

function showDojoGallery(items) {
    const overlay = document.createElement('div');
    overlay.className = 'dojo-overlay';
    overlay.innerHTML = `
        <div class="dojo-content">
            <button class="dojo-close">&times;</button>
            <h3>Dojo Competition</h3>
            <div class="dojo-grid">
                ${items.map(i => `
                    <div class=\"dojo-cell\">
                        <img src=\"${i.src}\" alt=\"${i.title}\">
                        <span>${i.desc}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // styles
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.92);
        display: flex; align-items: center; justify-content: center;
        z-index: 10000; opacity: 0; transition: opacity .25s ease;
    `;
    const content = overlay.querySelector('.dojo-content');
    content.style.cssText = `
        position: relative; width: min(1100px, 96vw); max-height: 92vh;
        background: #fff; border-radius: 16px; overflow: auto; padding: 20px 20px 30px;
        transform: scale(.96); transition: transform .25s ease;
    `;
    const closeBtn = overlay.querySelector('.dojo-close');
    closeBtn.style.cssText = `
        position: absolute; top: 12px; right: 16px; width: 40px; height: 40px;
        background: #8B0000; color: #fff; border: none; border-radius: 50%; font-size: 22px; cursor: pointer;
    `;
    const title = overlay.querySelector('h3');
    title.style.cssText = `margin: 0 0 16px 0; color: #8B0000;`;
    const grid = overlay.querySelector('.dojo-grid');
    grid.style.cssText = `
        display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
    `;
    overlay.querySelectorAll('.dojo-cell').forEach(cell => {
        cell.style.cssText = `background:#fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,.08);`;
        const img = cell.querySelector('img');
        img.style.cssText = `width: 100%; height: 180px; object-fit: cover; display:block;`;
        const span = cell.querySelector('span');
        span.style.cssText = `display:block; padding: 10px 12px; color:#333; font-weight:600;`;
    });

    document.body.appendChild(overlay);
    setTimeout(() => { overlay.style.opacity = '1'; content.style.transform = 'scale(1)'; }, 20);

    const close = () => {
        overlay.style.opacity = '0'; content.style.transform = 'scale(.96)';
        setTimeout(() => overlay.remove(), 200);
    };
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, { once: true });
}

// Add CSS for active navigation state
const activeNavStyles = document.createElement('style');
activeNavStyles.textContent = `
    .nav-link.active {
        color: #8B0000 !important;
    }
    
    .nav-link.active::after {
        width: 100% !important;
    }
`;

document.head.appendChild(activeNavStyles);

