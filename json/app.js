// Global variables
let jsonEditor, resultsEditor;
let parsedJSON = null;
let currentTreeState = new Map(); // Track expanded/collapsed state per path
let allTreePaths = new Set();     // Track all collapsible paths for expand/collapse all

// Autocomplete state
const JSONATA_BUILTINS = [
    '$string', '$length', '$substring', '$substringBefore', '$substringAfter',
    '$uppercase', '$lowercase', '$trim', '$pad', '$contains', '$split', '$join',
    '$match', '$replace', '$now', '$millis', '$fromMillis', '$toMillis',
    '$sum', '$max', '$min', '$average',
    '$boolean', '$not', '$exists',
    '$count', '$append', '$sort', '$reverse', '$shuffle', '$distinct', '$zip',
    '$keys', '$values', '$lookup', '$spread', '$merge', '$each', '$sift', '$type',
    '$floor', '$ceil', '$round', '$abs', '$power', '$sqrt', '$random',
    '$formatNumber', '$formatBase', '$formatInteger', '$parseInteger',
    '$map', '$filter', '$reduce',
    '$error', '$assert', '$eval',
    '$base64encode', '$base64decode', '$encodeUrlComponent', '$decodeUrlComponent',
    '$encodeUrl', '$decodeUrl'
];
let autocompleteItems = [...JSONATA_BUILTINS];
let autocompleteSelectedIndex = -1;
let autocompleteDropdown = null;

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs' } });

require(['vs/editor/editor.main'], function () {
    if (typeof monaco === 'undefined') {
        console.error('Monaco Editor failed to load');
        return;
    }

    // Create JSON input editor
    jsonEditor = monaco.editor.create(document.getElementById('jsonEditor'), {
        value: getSampleJSON(),
        language: 'json',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        lineNumbers: 'on',
        folding: true,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true
    });

    // Create results editor
    resultsEditor = monaco.editor.create(document.getElementById('resultsEditor'), {
        value: '',
        language: 'json',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        readOnly: true,
        lineNumbers: 'on',
        folding: true,
        wordWrap: 'on',
        placeholder: 'Execute a query to see results here…'
    });

    // Explicit layout then parse — avoids the fragile setTimeout timing hack
    jsonEditor.layout();
    resultsEditor.layout();
    parseJSON();
});

// Sample JSON for demonstration
function getSampleJSON() {
    return `{
  "store": {
    "name": "Book Haven",
    "location": "123 Main St",
    "book": [
      {
        "category": "reference",
        "author": "Nigel Rees",
        "title": "Sayings of the Century",
        "price": 8.95,
        "isbn": "0-553-21311-3"
      },
      {
        "category": "fiction",
        "author": "Evelyn Waugh",
        "title": "Sword of Honour",
        "price": 12.99,
        "isbn": "0-553-21312-1"
      },
      {
        "category": "fiction",
        "author": "Herman Melville",
        "title": "Moby Dick",
        "price": 8.99,
        "isbn": "0-553-21313-X"
      },
      {
        "category": "fiction",
        "author": "J.R.R. Tolkien",
        "title": "The Lord of the Rings",
        "price": 22.99,
        "isbn": "0-395-19395-8"
      }
    ],
    "bicycle": {
      "color": "red",
      "price": 19.95
    }
  }
}`;
}

// Parse JSON and build tree
function parseJSON() {
    const jsonText = jsonEditor.getValue();
    const errorDiv = document.getElementById('parseError');

    try {
        parsedJSON = JSON.parse(jsonText);
        errorDiv.classList.remove('show');
        buildTree(parsedJSON);
        buildAutocompleteItems();
        executeQuery();
    } catch (error) {
        errorDiv.textContent = `Parse Error: ${error.message}`;
        errorDiv.classList.add('show');
        document.getElementById('treeView').innerHTML = '<div class="empty-state">Invalid JSON. Please fix errors and try again.</div>';
        parsedJSON = null;
    }
}

// Build tree structure
function buildTree(data) {
    const treeView = document.getElementById('treeView');
    treeView.innerHTML = '';
    allTreePaths = new Set();

    const rootNode = createTreeNode('root', data, '$', true, 0);
    treeView.appendChild(rootNode);
}

// Create tree node recursively
function createTreeNode(key, value, path, isRoot = false, depth = 0) {
    const container = document.createElement('div');

    const item = document.createElement('div');
    item.className = 'tree-item';

    const type = getType(value);
    const hasChildren = type === 'object' || type === 'array';

    // Use explicit depth instead of splitting path string (avoids array-index depth bugs)
    const isExpanded = currentTreeState.get(path) ?? (isRoot || depth <= 1);

    item.setAttribute('role', 'treeitem');
    item.setAttribute('tabindex', '0');
    if (hasChildren) item.setAttribute('aria-expanded', String(isExpanded));

    // Toggle icon
    const toggle = document.createElement('span');
    toggle.className = hasChildren ? 'tree-toggle' : 'tree-toggle empty';
    toggle.textContent = hasChildren ? (isExpanded ? '▼' : '▶') : '';
    item.appendChild(toggle);

    // Icon based on type
    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.textContent = getIcon(type);
    item.appendChild(icon);

    // Key name
    if (!isRoot) {
        const keySpan = document.createElement('span');
        keySpan.className = 'tree-key';
        keySpan.textContent = key;
        item.appendChild(keySpan);
    }

    // Type indicator
    const typeSpan = document.createElement('span');
    typeSpan.className = 'tree-type';
    typeSpan.textContent = type;
    item.appendChild(typeSpan);

    // Value preview for primitives
    if (!hasChildren) {
        const valueSpan = document.createElement('span');
        valueSpan.className = 'tree-value';
        valueSpan.textContent = formatValue(value);
        item.appendChild(valueSpan);
    }

    // JSONPath
    const pathSpan = document.createElement('span');
    pathSpan.className = 'tree-path';
    pathSpan.textContent = path;
    item.appendChild(pathSpan);

    container.appendChild(item);

    // Handle click to toggle expand or copy path to query input
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target === toggle && hasChildren) {
            const childrenContainer = container.querySelector('.tree-node');
            if (childrenContainer) {
                // Read current state from the map to avoid stale closure
                const currentState = currentTreeState.get(path) ?? isExpanded;
                const newState = !currentState;
                currentTreeState.set(path, newState);
                toggle.textContent = newState ? '▼' : '▶';
                item.setAttribute('aria-expanded', String(newState));
                childrenContainer.style.display = newState ? 'block' : 'none';
            }
        } else {
            document.getElementById('queryInput').value = path;
            item.classList.add('flash');
            setTimeout(() => item.classList.remove('flash'), 300);
        }
    });

    // Create children
    if (hasChildren) {
        allTreePaths.add(path);
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-node';
        childrenContainer.style.display = isExpanded ? 'block' : 'none';

        if (type === 'array') {
            value.forEach((child, index) => {
                const childPath = path === '$' ? `$[${index}]` : `${path}[${index}]`;
                childrenContainer.appendChild(createTreeNode(`[${index}]`, child, childPath, false, depth + 1));
            });
        } else if (type === 'object') {
            Object.keys(value).forEach(childKey => {
                const needsBackticks = /[^a-zA-Z0-9_]/.test(childKey) || /^[0-9]/.test(childKey);
                const escapedKey = needsBackticks ? `\`${childKey}\`` : childKey;

                const childPath = path === '$' ? escapedKey : `${path}.${escapedKey}`;
                childrenContainer.appendChild(createTreeNode(childKey, value[childKey], childPath, false, depth + 1));
            });
        }

        container.appendChild(childrenContainer);
    }

    return container;
}

// Execute JSONata query
async function executeQuery() {
    if (!parsedJSON) {
        showError('queryError', 'Please parse valid JSON first');
        return;
    }

    let query = document.getElementById('queryInput').value.trim();
    const errorDiv = document.getElementById('queryError');

    let resetMessage = null;
    if (!query) {
        const input = document.getElementById('queryInput');
        input.value = '$';
        query = '$';
        resetMessage = 'Query was empty — reset to $';
    }

    try {
        if (typeof jsonata === 'undefined') {
            throw new Error('JSONata library not loaded. Check your internet connection or CDN availability.');
        }

        const expression = jsonata(query);
        const results = await expression.evaluate(parsedJSON);

        errorDiv.classList.remove('show');
        if (resetMessage) {
            showError('queryError', resetMessage);
            setTimeout(() => errorDiv.classList.remove('show'), 3000);
        }

        // Guard against undefined (JSON.stringify(undefined) returns undefined, not a string)
        const formattedResults = results !== undefined
            ? JSON.stringify(results, null, 2)
            : '// No results (expression evaluated to undefined)';
        resultsEditor.setValue(formattedResults);

        // Update result count
        let count = 0;
        if (results !== null && results !== undefined) {
            if (Array.isArray(results)) {
                count = results.length;
            } else if (typeof results === 'object') {
                count = Object.keys(results).length;
            } else {
                count = 1;
            }
        }
        document.getElementById('resultCount').textContent = `${count} result${count !== 1 ? 's' : ''}`;

    } catch (error) {
        const errorMessage = error.message || error.toString();
        showError('queryError', `Query Error: ${errorMessage}`);
        resultsEditor.setValue('');
        document.getElementById('resultCount').textContent = '';
    }
}

// Helper functions
function getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function getIcon(type) {
    const icons = {
        'object': '{}',
        'array': '[]',
        'string': '"',
        'number': '#',
        'boolean': '✓',
        'null': '∅'
    };
    return icons[type] || '?';
}

function formatValue(value) {
    if (typeof value === 'string') {
        return value.length > 50 ? `"${value.substring(0, 50)}..."` : `"${value}"`;
    }
    return String(value);
}

function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

// Expand all nodes — iterates tracked path Set instead of scraping DOM text
function expandAll() {
    document.querySelectorAll('.tree-toggle:not(.empty)').forEach(t => { t.textContent = '▼'; });
    document.querySelectorAll('.tree-node').forEach(n => { n.style.display = 'block'; });
    document.querySelectorAll('.tree-item[aria-expanded]').forEach(i => { i.setAttribute('aria-expanded', 'true'); });
    allTreePaths.forEach(path => { currentTreeState.set(path, true); });
}

function collapseAll() {
    document.querySelectorAll('.tree-toggle:not(.empty)').forEach(t => { t.textContent = '▶'; });
    document.querySelectorAll('.tree-node').forEach(n => { n.style.display = 'none'; });
    document.querySelectorAll('.tree-item[aria-expanded]').forEach(i => { i.setAttribute('aria-expanded', 'false'); });
    allTreePaths.forEach(path => { currentTreeState.set(path, false); });

    // Keep root expanded
    const rootNode = document.querySelector('.tree-view > div > .tree-node');
    if (rootNode) {
        rootNode.style.display = 'block';
        const rootToggle = document.querySelector('.tree-view > div > .tree-item > .tree-toggle');
        if (rootToggle) rootToggle.textContent = '▼';
        const rootItem = document.querySelector('.tree-view > div > .tree-item');
        if (rootItem) rootItem.setAttribute('aria-expanded', 'true');
        currentTreeState.set('$', true);
    }
}

// Copy results to clipboard
function copyResults() {
    const results = resultsEditor.getValue();
    if (!results) return;

    navigator.clipboard.writeText(results).then(() => {
        const btn = document.getElementById('copyResultsBtn');
        const originalText = btn.textContent;
        btn.classList.add('copied');
        btn.textContent = 'Copied!';

        setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        showError('queryError', `Failed to copy to clipboard: ${err.message}`);
    });
}

// Format JSON with consistent 2-space indentation
function formatJSON() {
    const jsonText = jsonEditor.getValue();
    const errorDiv = document.getElementById('parseError');
    try {
        const parsed = JSON.parse(jsonText);
        jsonEditor.setValue(JSON.stringify(parsed, null, 2));
        errorDiv.classList.remove('show');
    } catch (e) {
        showError('parseError', `Parse Error: ${e.message}`);
    }
}

// Recursively sort object keys alphabetically
function sortKeysDeep(value) {
    if (Array.isArray(value)) {
        return value.map(sortKeysDeep);
    } else if (value !== null && typeof value === 'object') {
        return Object.keys(value).sort().reduce((acc, key) => {
            acc[key] = sortKeysDeep(value[key]);
            return acc;
        }, {});
    }
    return value;
}

function sortKeys() {
    const jsonText = jsonEditor.getValue();
    const errorDiv = document.getElementById('parseError');
    try {
        const parsed = JSON.parse(jsonText);
        jsonEditor.setValue(JSON.stringify(sortKeysDeep(parsed), null, 2));
        errorDiv.classList.remove('show');
    } catch (e) {
        showError('parseError', `Parse Error: ${e.message}`);
    }
}

// Autocomplete: extract all dot-paths from parsed JSON
function extractPaths(data, prefix = '', depth = 0) {
    if (depth > 6) return [];
    const paths = [];
    if (data !== null && typeof data === 'object') {
        if (Array.isArray(data)) {
            if (data.length > 0) paths.push(...extractPaths(data[0], prefix, depth + 1));
        } else {
            Object.keys(data).forEach(key => {
                const needsBackticks = /[^a-zA-Z0-9_$]/.test(key) || /^[0-9]/.test(key);
                const escapedKey = needsBackticks ? `\`${key}\`` : key;
                const path = prefix ? `${prefix}.${escapedKey}` : escapedKey;
                paths.push(path);
                paths.push(...extractPaths(data[key], path, depth + 1));
            });
        }
    }
    return paths;
}

function buildAutocompleteItems() {
    const paths = parsedJSON ? extractPaths(parsedJSON) : [];
    autocompleteItems = [...new Set(paths), ...JSONATA_BUILTINS];
}

function getTokenBounds(value, cursorPos) {
    const before = value.slice(0, cursorPos);
    // Bracket-aware: captures $[0].field, $.store.book[0].title, etc. as one token
    const pathMatch = before.match(/(\$(?:\[\d+\]|\.`[^`]+`|\.[\w$]+)*(?:\.`[^`]*`?|\.[\w$]*)?)$/);
    if (pathMatch && pathMatch[1].includes('[')) {
        return { token: pathMatch[1], start: cursorPos - pathMatch[1].length };
    }
    const match = before.match(/[^\s(),\[\]{}\+\-\*\/=<>!|&^"']+$/);
    return { token: match ? match[0] : '', start: match ? cursorPos - match[0].length : cursorPos };
}

function getAutocompleteToken(value, cursorPos) {
    return getTokenBounds(value, cursorPos).token;
}

function resolvePathValue(pathStr) {
    if (!parsedJSON) return null;
    if (pathStr === '$') return parsedJSON;
    let path = pathStr.slice(1); // strip leading $
    let current = parsedJSON;
    const seg = /\.`([^`]+)`|\.([^.[`\]]+)|\[(\d+)\]/g;
    let m;
    while ((m = seg.exec(path)) !== null) {
        if (current === null || typeof current !== 'object') return null;
        current = m[1] !== undefined ? current[m[1]]
                : m[2] !== undefined ? current[m[2]]
                : current[parseInt(m[3], 10)];
        if (current === undefined) return null;
    }
    return current;
}

function showAutocomplete(input) {
    const cursorPos = input.selectionStart;
    const token = getAutocompleteToken(input.value, cursorPos);

    if (!token) { hideAutocomplete(); return; }

    const tokenLower = token.toLowerCase();
    let matches;

    if (token.startsWith('$') && (token.startsWith('$.') || token.includes('['))) {
        const lastDot = token.lastIndexOf('.');
        if (lastDot !== -1) {
            const contextPath = token.slice(0, lastDot) || '$';
            const partialField = token.slice(lastDot + 1).toLowerCase();
            const resolved = resolvePathValue(contextPath);
            if (resolved !== null && typeof resolved === 'object') {
                const obj = Array.isArray(resolved) ? (resolved.length > 0 ? resolved[0] : null) : resolved;
                if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                    const prefix = token.slice(0, lastDot + 1);
                    matches = Object.keys(obj)
                        .filter(key => key.toLowerCase().startsWith(partialField) && key.toLowerCase() !== partialField)
                        .map(key => {
                            const needsBackticks = /[^a-zA-Z0-9_$]/.test(key) || /^[0-9]/.test(key);
                            return prefix + (needsBackticks ? `\`${key}\`` : key);
                        });
                }
            }
        } else {
            matches = autocompleteItems.filter(item =>
                item.toLowerCase().startsWith(tokenLower) && item.toLowerCase() !== tokenLower
            );
        }
    } else {
        matches = autocompleteItems.filter(item =>
            item.toLowerCase().startsWith(tokenLower) && item.toLowerCase() !== tokenLower
        );
    }
    if (!matches) matches = [];

    if (matches.length === 0) { hideAutocomplete(); return; }

    if (!autocompleteDropdown) {
        autocompleteDropdown = document.createElement('div');
        autocompleteDropdown.className = 'autocomplete-dropdown';
        document.body.appendChild(autocompleteDropdown);
    }

    const rect = input.getBoundingClientRect();
    autocompleteDropdown.style.left = `${rect.left}px`;
    autocompleteDropdown.style.top = `${rect.bottom + 2}px`;
    autocompleteDropdown.style.width = `${rect.width}px`;

    autocompleteDropdown.innerHTML = '';
    autocompleteSelectedIndex = -1;

    matches.slice(0, 8).forEach(item => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.dataset.value = item;
        div.innerHTML = `<strong>${item.slice(0, token.length)}</strong>${item.slice(token.length)}`;
        div.addEventListener('mousedown', (e) => {
            e.preventDefault();
            applyAutocomplete(input, item);
        });
        autocompleteDropdown.appendChild(div);
    });

    autocompleteDropdown.style.display = 'block';
}

function hideAutocomplete() {
    if (autocompleteDropdown) autocompleteDropdown.style.display = 'none';
    autocompleteSelectedIndex = -1;
}

function navigateAutocomplete(direction) {
    if (!autocompleteDropdown || autocompleteDropdown.style.display === 'none') return false;
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    if (!items.length) return false;
    items[autocompleteSelectedIndex]?.classList.remove('selected');
    autocompleteSelectedIndex = Math.max(0, Math.min(autocompleteSelectedIndex + direction, items.length - 1));
    items[autocompleteSelectedIndex].classList.add('selected');
    items[autocompleteSelectedIndex].scrollIntoView({ block: 'nearest' });
    return true;
}

function applyAutocomplete(input, item) {
    const cursorPos = input.selectionStart;
    const { start } = getTokenBounds(input.value, cursorPos);
    const after = input.value.slice(cursorPos);
    input.value = input.value.slice(0, start) + item + after;
    const newPos = start + item.length;
    input.setSelectionRange(newPos, newPos);
    hideAutocomplete();
    input.focus();
}

// Sample queries panel toggle
const samplesToggle = document.getElementById('samplesToggle');
const samplesPanel = document.getElementById('samplesPanel');
const samplesToggleIcon = document.getElementById('samplesToggleIcon');

samplesToggle.addEventListener('click', () => {
    const isCollapsed = samplesPanel.classList.contains('collapsed');
    samplesPanel.classList.toggle('collapsed', !isCollapsed);
    samplesToggleIcon.textContent = isCollapsed ? '▼' : '▶';
    samplesToggle.setAttribute('aria-expanded', String(isCollapsed));
});

// Initialize panel as collapsed
samplesPanel.classList.add('collapsed');
samplesToggleIcon.textContent = '▶';

// Event delegation for sample query clicks — one listener instead of one per item
samplesPanel.addEventListener('click', (e) => {
    const item = e.target.closest('.sample-query');
    if (!item) return;
    document.getElementById('queryInput').value = item.dataset.query;
    executeQuery();
});

// Event listeners
document.getElementById('parseBtn').addEventListener('click', parseJSON);
document.getElementById('executeBtn').addEventListener('click', executeQuery);
document.getElementById('expandAllBtn').addEventListener('click', expandAll);
document.getElementById('collapseAllBtn').addEventListener('click', collapseAll);
document.getElementById('copyResultsBtn').addEventListener('click', copyResults);
document.getElementById('formatBtn').addEventListener('click', formatJSON);
document.getElementById('sortKeysBtn').addEventListener('click', sortKeys);

// Query input keyboard handling: autocomplete navigation + execute on Enter
document.getElementById('queryInput').addEventListener('keydown', (e) => {
    const dropdownVisible = autocompleteDropdown && autocompleteDropdown.style.display !== 'none';
    if (dropdownVisible) {
        if (e.key === 'ArrowDown') { e.preventDefault(); navigateAutocomplete(1); return; }
        if (e.key === 'ArrowUp')   { e.preventDefault(); navigateAutocomplete(-1); return; }
        if (e.key === 'Escape')    { hideAutocomplete(); return; }
        if (e.key === 'Tab' || (e.key === 'Enter' && autocompleteSelectedIndex >= 0)) {
            e.preventDefault();
            const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
            const idx = Math.max(0, autocompleteSelectedIndex);
            if (items[idx]) applyAutocomplete(e.target, items[idx].dataset.value);
            return;
        }
    }
    if (e.key === 'Enter') executeQuery();
});

// Show autocomplete on input (no auto-execute)
document.getElementById('queryInput').addEventListener('input', (e) => {
    showAutocomplete(e.target);
});

// Hide autocomplete when input loses focus
document.getElementById('queryInput').addEventListener('blur', () => {
    setTimeout(hideAutocomplete, 150);
});

// Hide autocomplete on window resize
window.addEventListener('resize', hideAutocomplete);
