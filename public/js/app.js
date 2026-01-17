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
const downloadBtn = document.getElementById('downloadBtn');

// --- Auth / Entry ---

startBtn.addEventListener('click', async () => {
    const id = userIdInput.value.trim();
    if (!id) return alert('Veuillez entrer un identifiant');

    currentUser = id;

    // UX: Loading state
    const originalText = startBtn.innerText;
    startBtn.innerText = 'Chargement...';
    startBtn.disabled = true;

    try {
        await initUser();

        // Only switch view after successful load
        loginSection.style.display = 'none';
        userDashboard.style.display = 'flex';

        // Reset button state in case we return
        startBtn.innerText = originalText;
        startBtn.disabled = false;
    } catch (error) {
        console.error("Initialization failed", error);
        alert("Une erreur est survenue lors du chargement. Veuillez réessayer.");
        startBtn.innerText = originalText;
        startBtn.disabled = false;
    }
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
    const res = await fetch('/api/config');
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

        const inputId = `field_${field.variable_id}`; // Unique ID

        const label = document.createElement('label');
        label.innerText = field.field_label;
        label.htmlFor = inputId; // Accessible link
        label.style.display = 'block';
        label.style.fontWeight = '600';
        label.style.marginBottom = '5px';

        const input = document.createElement('input');
        input.id = inputId; // Accessible ID
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
    } catch (e) {
        console.error('Save failed', e);
    }
}

// --- Download ---
downloadBtn.addEventListener('click', () => {
    const dataURL = canvas.toDataURL({
        format: 'png',
        multiplier: 2 // Retina support / higher quality
    });

    const link = document.createElement('a');
    link.download = `signature-${currentUser}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
