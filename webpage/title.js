// import {Typed} from 'https://unpkg.com/typed.js@2.1.0/dist/typed.es.js';
import Typed from 'https://cdn.skypack.dev/typed.js@2.1.0';

console.log("connected to title.js")
const options = {
    strings: [
        "How does stress impact test grades?",
        "How does stress impact anxiety?",
        "How does stress impact performance?",
        "How does stress impact heart rate?"
    ],
    typeSpeed: 50,
    backSpeed: 75,
    backDelay: 1000,
    startDelay: 500,
    loop: true, 
    showCursor: false,
};

document.addEventListener('DOMContentLoaded', function() {
    const typedInstance = new Typed('#title', options);
});

// Code for cards
function flipCard(card) {
     card.classList.toggle('flipped');
}

// Add keyboard navigation
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function() {
            flipCard(this);
        });
        
        // Accessibility
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Flip card to reveal description');
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            const focusedCard = document.activeElement.closest('.card');
            if (focusedCard) {
                e.preventDefault();
                flipCard(focusedCard);
            }
        }
    });
});




