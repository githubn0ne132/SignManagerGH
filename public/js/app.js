// Global Vars
let canvas;
let currentUser = '';
let currentFields = [];
let userData = {};

// DOM
const loginSection = document.getElementById('loginSection');
const userDashboard = document.getElementById('userDashboard');
const userIdInput = document.getElementById('userIdInput');
const startBtn = document.getElementById('startBtn');
const dynamicForm = document.getElementById('dynamicForm');

// --- Auth / Entry ---

startBtn.addEventListener('click', async () => {
    const id = userIdInput.value.trim();
    if (!id) return alert('Veuillez entrer un identifiant');

    currentUser = id;
    loginSection.style.display = 'none';
    userDashboard.style.display = 'flex';

    await initUser();
});

// --- Initialization ---

async function initUser() {
    canvas = new fabric.Canvas('signatureCanvas', {
        hoverCursor: 'default',
        selection: false // User shouldn't select/move things
    });

    await loadAvailableFonts(); // Load custom fonts
    await loadConfig();
    await loadFields();
    await loadUserData();

    generateForm();
    renderCanvas();
    updateOutlookInfo();
}

async function loadAvailableFonts() {
    try {
        const res = await fetch('/api/fonts');
        const fonts = await res.json();

        const styleSheet = document.createElement("style");
        document.head.appendChild(styleSheet);

        fonts.forEach(font => {
            const fontPath = '/' + font.file_path;
            const rule = `
                @font-face {
                    font-family: '${font.font_name}';
                    src: url('${fontPath}');
                }
            `;
            styleSheet.sheet.insertRule(rule, styleSheet.sheet.cssRules.length);
        });
    } catch (e) {
        console.error("Error loading fonts", e);
    }
}

async function loadConfig() {
    const res = await fetch('/api/templates/active');
    if (!res.ok) return; // Handle 404 if no active template
    const config = await res.json();

    if (config) {
        canvas.setWidth(config.canvas_width);
        canvas.setHeight(config.canvas_height);

        if (config.bg_image_path) {
            const imgUrl = config.bg_image_path.startsWith('http') || config.bg_image_path.startsWith('/')
                ? config.bg_image_path
                : '/' + config.bg_image_path;

            fabric.Image.fromURL(imgUrl, (img) => {
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    scaleX: canvas.width / img.width,
                    scaleY: canvas.height / img.height
                });
            }, { crossOrigin: 'anonymous' });
        }
    }
}

async function loadFields() {
    const res = await fetch('/api/fields');
    currentFields = await res.json();
}

async function loadUserData() {
    try {
        const res = await fetch(`/api/user/${currentUser}`);
        const data = await res.json();
        if (data) {
            userData = data;
        }
    } catch (e) {
        console.log('No existing user data or error');
    }
}

// --- Logic ---

function generateForm() {
    dynamicForm.innerHTML = '';

    currentFields.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';

        const label = document.createElement('label');
        label.innerText = field.field_label;
        label.style.display = 'block';
        label.style.fontWeight = '600';
        label.style.marginBottom = '5px';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = userData[field.variable_id] || '';
        input.placeholder = `Entrez ${field.field_label}`;

        // Event listener for live update
        input.addEventListener('input', (e) => {
            userData[field.variable_id] = e.target.value;
            updateCanvasText(field.variable_id, e.target.value);
            debouncedSave();
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        dynamicForm.appendChild(wrapper);
    });
}

function renderCanvas() {
    // Clear objects (not background)
    canvas.remove(...canvas.getObjects());

    currentFields.forEach(field => {
        const value = userData[field.variable_id] || field.field_label;

        const textObj = new fabric.Text(value, {
            left: field.x_pos,
            top: field.y_pos,
            fontFamily: field.font_family,
            fontSize: field.font_size,
            fill: field.font_color,
            fontWeight: field.font_weight,
            charSpacing: field.letter_spacing || 0, // Apply spacing
            selectable: false, // User cannot move objects
            data: { variable_id: field.variable_id }
        });

        canvas.add(textObj);
    });
}

function updateCanvasText(variableId, newValue) {
    const objects = canvas.getObjects();
    const obj = objects.find(o => o.data && o.data.variable_id === variableId);

    if (obj) {
        obj.set('text', newValue);
        canvas.renderAll();
    }
}

// --- Persistence ---
let saveTimeout;
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveData, 1000);
}

async function saveData() {
    try {
        await fetch(`/api/user/${currentUser}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        console.log('Data saved');
        updateOutlookInfo();
    } catch (e) {
        console.error('Save failed', e);
    }
}

// --- Download ---
// --- Copy ---
const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        if (!outlookCode) return;
        outlookCode.select();
        outlookCode.setSelectionRange(0, 99999); // Mobile
        navigator.clipboard.writeText(outlookCode.value).then(() => {
            alert("Code copié !");
        });
    });
}

// --- Outlook & Static Preview ---
const outlookCode = document.getElementById('outlookCode');
const staticPreview = document.getElementById('staticPreview');

async function updateOutlookInfo() {
    const origin = window.location.origin;
    const imageUrl = `${origin}/signature/${currentUser}/image.png`;

    // HTML Code
    if (outlookCode) {
        try {
            const res = await fetch(`/signature/${currentUser}/html`);
            if (res.ok) {
                const html = await res.text();
                outlookCode.value = html;
            } else {
                // Fallback if fetch fails
                const html = `<a href="#"><img src="${imageUrl}" alt="Signature"></a>`;
                outlookCode.value = html;
            }
        } catch (e) {
            console.error("Error fetching HTML snippet", e);
            const html = `<a href="#"><img src="${imageUrl}" alt="Signature"></a>`;
            outlookCode.value = html;
        }
    }
}
