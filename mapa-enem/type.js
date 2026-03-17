/**
 * Simulates a typewriter effect for a given text within an HTML element.
 * Adds a pause after encountering a period (.).
 *
 * @param {HTMLElement} element - The HTML element to display the text in.
 * @param {string} text - The text to type out.
 * @param {number} speed - The typing speed in milliseconds per character.
 * @param {number} [periodPause=500] - The pause duration in milliseconds after a period.
 * @returns {Promise<void>} A promise that resolves when typing is complete.
 */
function typewriterEffect(element, text, speed, periodPause = 500) { // Added periodPause parameter
    return new Promise((resolve) => {
        if (!element || typeof text !== 'string' || typeof speed !== 'number' || speed <= 0) {
            console.error("Invalid arguments for typewriterEffect", { element, text, speed });
            if (element && typeof text === 'string') element.textContent = text;
            resolve();
            return;
        }

        element.textContent = '';
        let i = 0;
        let timer; // Declare timer variable outside

        const typeCharacter = () => {
            if (i < text.length) {
                const char = text.charAt(i);
                element.textContent += char;
                i++;

                // Check if the character just added was a period
                if (char === '.' && periodPause > 0) {
                    // Pause after the period
                    timer = setTimeout(typeCharacter, periodPause); // Use periodPause for the delay
                } else {
                    // Continue with normal speed
                    timer = setTimeout(typeCharacter, speed); // Use normal speed
                }
            } else {
                // Typing finished
                resolve(); // Resolve the promise
            }
        };

        // Start the typing process
        timer = setTimeout(typeCharacter, speed); // Initial start with normal speed

        // Note: We don't use setInterval anymore to handle variable delays easily
    });
}


/**
 * Simulates typewriter effect for an array of paragraphs within a container element.
 * Adds each paragraph sequentially and types it out.
 * Uses the modified typewriterEffect which includes period pauses.
 *
 * @param {HTMLElement} containerElement - The container element for the paragraphs.
 * @param {string[]} paragraphs - An array of strings, where each string is a paragraph.
 * @param {number} speed - The typing speed in milliseconds per character for each paragraph.
 * @param {number} initialDelay - Delay in milliseconds before starting the first paragraph.
 * @param {number} paragraphDelay - Delay in milliseconds between typing consecutive paragraphs.
 * @param {number} [periodPause=500] - The pause duration in milliseconds after a period within paragraphs.
 * @returns {Promise<void>} A promise that resolves when all paragraphs are typed.
 */
async function typeParagraphs(containerElement, paragraphs, speed, initialDelay = 0, paragraphDelay = 1000, periodPause = 700) { // Added periodPause
     if (!containerElement || !Array.isArray(paragraphs)) {
        console.error("Invalid arguments for typeParagraphs", { containerElement, paragraphs });
        return;
    }

    containerElement.innerHTML = '';

    if (initialDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, initialDelay));
    }

    for (let i = 0; i < paragraphs.length; i++) {
        const paragraphText = paragraphs[i];
        if (typeof paragraphText === 'string' && paragraphText.trim()) {
            const pElement = document.createElement('p');
            containerElement.appendChild(pElement);
            // Pass the periodPause to typewriterEffect
            await typewriterEffect(pElement, paragraphText.trim(), speed, periodPause);

            if (i < paragraphs.length - 1 && paragraphDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, paragraphDelay));
            }
        }
    }
}

/**
 * Orchestrates the typewriter effect for the title, subtitle, and text paragraphs of a slide.
 * Uses the modified typeParagraphs which includes period pauses.
 *
 * @param {HTMLElement} titleElement - The element for the slide title.
 * @param {HTMLElement} subtitleElement - The element for the slide subtitle.
 * @param {HTMLElement} textContainerElement - The container element for the main text paragraphs.
 * @param {object} slideData - An object containing { title: string, subtitle: string, text: string[] }.
 * @param {object} config - Configuration for typing speeds and delays.
 * @param {number} [config.titleSpeed=70] - Speed for title typing (ms/char).
 * @param {number} [config.subtitleSpeed=50] - Speed for subtitle typing (ms/char).
 * @param {number} [config.textSpeed=20] - Speed for paragraph typing (ms/char).
 * @param {number} [config.initialDelay=0] - Delay before starting title (ms).
 * @param {number} [config.delayAfterTitle=100] - Delay after title finishes, before subtitle starts (ms).
 * @param {number} [config.delayAfterSubtitle=500] - Delay after subtitle finishes, before text starts (ms).
 * @param {number} [config.paragraphDelay=300] - Delay between paragraphs in text section (ms).
 * @param {number} [config.periodPause=500] - Pause after periods in paragraphs (ms).
 * @returns {Promise<void>} A promise that resolves when all typing is complete.
 */
async function typeSlideContent(
    titleElement,
    subtitleElement,
    textContainerElement,
    slideData,
    config = {}
) {
    const defaults = {
        titleSpeed: 30,
        subtitleSpeed: 20,
        textSpeed: 5,
        initialDelay: 0,
        delayAfterTitle: 100,
        delayAfterSubtitle: 400,
        paragraphDelay: 300,
        periodPause: 400 // Added default period pause
    };
    const effectiveConfig = { ...defaults, ...config };

    if (titleElement) titleElement.textContent = '';
    if (subtitleElement) subtitleElement.textContent = '';
    if (textContainerElement) textContainerElement.innerHTML = '';

    if (effectiveConfig.initialDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, effectiveConfig.initialDelay));
    }

    if (titleElement && slideData?.title) {
        // Title typing likely doesn't need period pause, so we don't pass it
        await typewriterEffect(titleElement, slideData.title, effectiveConfig.titleSpeed);
        if (effectiveConfig.delayAfterTitle > 0) {
            await new Promise(resolve => setTimeout(resolve, effectiveConfig.delayAfterTitle));
        }
    } else if (titleElement) {
        titleElement.textContent = '';
    }

    if (subtitleElement && slideData?.subtitle) {
        // Subtitle typing likely doesn't need period pause either
        await typewriterEffect(subtitleElement, slideData.subtitle, effectiveConfig.subtitleSpeed);
        if (effectiveConfig.delayAfterSubtitle > 0) {
            await new Promise(resolve => setTimeout(resolve, effectiveConfig.delayAfterSubtitle));
        }
    } else if (subtitleElement) {
        subtitleElement.textContent = '';
    }

    if (textContainerElement) {
        const paragraphs = Array.isArray(slideData?.text) ? slideData.text : [];
        if (paragraphs.length > 0) {
            // Pass the periodPause from config to typeParagraphs
            await typeParagraphs(
                textContainerElement,
                paragraphs,
                effectiveConfig.textSpeed,
                0,
                effectiveConfig.paragraphDelay,
                effectiveConfig.periodPause // Pass the pause value
            );
        } else {
            const p = document.createElement('p');
            p.textContent = "Nenhum texto principal encontrado para este slide.";
            p.style.fontStyle = 'italic';
            textContainerElement.appendChild(p);
        }
    }
}


// Export all functions
export { typewriterEffect, typeParagraphs, typeSlideContent };