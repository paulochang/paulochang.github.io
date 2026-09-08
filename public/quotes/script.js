let poems = [];
let currentPoemIndex = -1;
let usedIndices = [];

// Load poems from JSON file
async function loadPoems() {
    try {
        const response = await fetch('poems.json');
        poems = await response.json();
        
        // Display first poem once loaded
        if (poems.length > 0) {
            const poem = getRandomPoem();
            displayPoem(poem);
        }
    } catch (error) {
        console.error('Error loading poems:', error);
        // Fallback poem if loading fails
        poems = [{
            text: "The wound is the place where the light enters you.",
            author: "Rumi"
        }];
        displayPoem(poems[0]);
    }
}

function getRandomPoem() {
    // Reset if all poems have been used
    if (usedIndices.length === poems.length) {
        usedIndices = [];
    }
    
    // Get unused poem
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * poems.length);
    } while (usedIndices.includes(randomIndex));
    
    usedIndices.push(randomIndex);
    currentPoemIndex = randomIndex;
    
    return poems[randomIndex];
}

function displayPoem(poem) {
    const poemElement = document.getElementById('poem');
    const authorElement = document.getElementById('author');
    
    // Fade out
    poemElement.classList.add('fade-out');
    authorElement.classList.add('fade-out');
    
    setTimeout(() => {
        poemElement.textContent = poem.text;
        authorElement.textContent = poem.author;
        
        // Fade in
        poemElement.classList.remove('fade-out');
        authorElement.classList.remove('fade-out');
    }, 300);
}

function init() {
    // Load poems from JSON file
    loadPoems();
    
    const button = document.getElementById('newPoem');
    button.addEventListener('click', () => {
        if (poems.length > 0) {
            const newPoem = getRandomPoem();
            displayPoem(newPoem);
        }
    });
    
    // Optional: Allow space bar or enter to get new poem
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (poems.length > 0) {
                const newPoem = getRandomPoem();
                displayPoem(newPoem);
            }
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
