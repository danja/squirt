import { JSDOM } from 'jsdom'

// Create a basic DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost', // Necessary for things like localStorage
    pretendToBeVisual: true, // Helps with layout-related APIs if needed
    // Allow scripts to run if your tests need that (use with caution)
    // runScripts: "dangerously", 
})

// Assign window and document
global.window = dom.window
global.document = dom.window.document

// Copy properties from jsdom window to global scope
// This includes navigator, localStorage, etc., making them available globally
// Avoids direct assignment errors for getters like global.navigator
Object.keys(dom.window).forEach((key) => {
    if (typeof global[key] === 'undefined') {
        global[key] = dom.window[key]
    }
})

// Ensure navigator exists on the window object for compatibility
// (jsdom might already do this, but explicit doesn't hurt)
if (!global.window.navigator) {
    global.window.navigator = global.navigator
}

// Mock fetch if it hasn't been mocked by specific tests
if (!global.fetch) {
    // Use jsdom's Response class if available
    const Response = global.Response || dom.window.Response
    global.fetch = () => Promise.resolve(new Response(null, { status: 404 }))
}

console.log('JSDOM setup complete (v2).') 