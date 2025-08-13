// DOM Elements
const sections = document.querySelectorAll('section');
const sidebarNavLinks = document.querySelectorAll('.nav-link');


// Add click event listeners to sidebar navigation links
sidebarNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        
        // Remove active class from all links
        sidebarNavLinks.forEach(l => l.classList.remove('active'));
        
        // Add active class to clicked link
        link.classList.add('active');
        
        // Smooth scroll to section
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth' });
            
            // Update active state after scroll completes
            setTimeout(() => {
                updateActiveNavLink();
            }, 1000); // Wait for scroll to complete
        } else {
            console.log('Section not found:', targetId);
        }
    });
});

// Update active navigation link based on scroll position
function updateActiveNavLink() {
    const scrollPosition = window.scrollY + 100; // Offset for better detection
    
    // Only update if user is not currently hovering over any link
    const hoveredLink = document.querySelector('.nav-link:hover');
    if (hoveredLink) {
        return; // Don't update active state if user is hovering
    }
    
    // Remove active class from all sidebar links first
    sidebarNavLinks.forEach(link => link.classList.remove('active'));
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            // Add active class to corresponding link
            const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    });
}

// Add scroll event listener
window.addEventListener('scroll', updateActiveNavLink);

// Animate skill bars when they come into view
function animateSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');
    skillBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = width;
        }, 100);
    });
}

// Animate skill bars immediately when page loads
document.addEventListener('DOMContentLoaded', function() {
    const skillBars = document.querySelectorAll('.skill-progress');
    skillBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = width;
        }, 100);
    });
});

// Download CV button functionality
const downloadCvBtn = document.querySelector('.download-cv');
if (downloadCvBtn) {
    downloadCvBtn.addEventListener('click', () => {
        // Simulate CV download
        const link = document.createElement('a');
        link.href = '#';
        link.download = 'Rayan_Adlardard_CV.pdf';
        link.click();
        
        // Show success message
        alert('CV download started!');
    });
}

// Hire Me button functionality
const hireMeBtn = document.querySelector('.hire-me-btn');
if (hireMeBtn) {
    hireMeBtn.addEventListener('click', () => {
        // Scroll to contact section or show contact modal
        const contactSection = document.querySelector('#contact');
        if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Contact information will be displayed here!');
        }
    });
}

// Order Now link functionality
const orderNowLinks = document.querySelectorAll('.order-now');
orderNowLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Order form will be displayed here!');
    });
});

// Smooth scrolling for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add hover effects to service cards
const serviceCards = document.querySelectorAll('.service-card');
serviceCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Add scroll-based navigation highlighting
// Add scroll event listener
window.addEventListener('scroll', updateActiveNavLink);

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Add typing effect to hero title (optional)
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect for hero title (optional)
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
    // Uncomment the line below to enable typing effect
    // typeWriter(heroTitle, 'I\'m Rayan Adlardard', 150);
}

// Add scroll-based animations
function handleScrollAnimations() {
    const elements = document.querySelectorAll('.service-card, .skill-item');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
}

// Initialize scroll animations
window.addEventListener('scroll', handleScrollAnimations);

// Set initial opacity for animated elements
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.service-card, .skill-item');
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    // Trigger initial animation check
    handleScrollAnimations();
});

// Add particle effect background (optional)
function createParticles() {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particles';
    particleContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
        overflow: hidden;
    `;
    
    document.body.appendChild(particleContainer);
    
    // Create particles
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 3px;
            height: 3px;
            background: rgba(255, 215, 0, 0.1);
            border-radius: 50%;
            animation: float 8s ease-in-out infinite;
        `;
        
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        
        particleContainer.appendChild(particle);
    }
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
            50% { transform: translateY(-30px) rotate(180deg); opacity: 0.3; }
        }
    `;
    document.head.appendChild(style);
}

// Uncomment the line below to enable particle effect
// createParticles(); 