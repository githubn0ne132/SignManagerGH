// Global Vars
let canvas;
let adminPassword = '';
let currentFields = [];

// DOM Elements
const loginSection = document.getElementById('loginSection');
const adminDashboard = document.getElementById('adminDashboard');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const adminPasswordInput = document.getElementById('adminPassword');

const canvasWidthInput = document.getElementById('canvasWidth');
const canvasHeightInput = document.getElementById('canvasHeight');
const bgImageInput = document.getElementById('bgImageInput');
const saveConfigBtn = document.getElementById('saveConfigBtn');

// Font Elements
const fontNameInput = document.getElementById('fontNameInput');
const fontFileInput = document.getElementById('fontFileInput');
const uploadFontBtn = document.getElementById('uploadFontBtn');

const newFieldLabel = document.getElementById('newFieldLabel');
const newFieldVar = document.getElementById('newFieldVar');
const addFieldBtn = document.getElementById('addFieldBtn');
const fieldsList = document.getElementById('fieldsList');

const propertiesPanel = document.getElementById('propertiesPanel');
const propFieldName = document.getElementById('propFieldName');
const propFontFamily = document.getElementById('propFontFamily');
const propFontSize = document.getElementById('propFontSize');
const propColor = document.getElementById('propColor');
// New property inputs
const propX = document.getElementById('propX');
const propY = document.getElementById('propY');
const propSpacing = document.getElementById('propSpacing');

const updateFieldBtn = document.getElementById('updateFieldBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

// --- Auth ---

loginBtn.addEventListener('click', async () => {
    const password = adminPasswordInput.value;
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (data.success) {
            adminPassword = password;
            loginSection.style.display = 'none';
            adminDashboard.style.display = 'flex';
            initAdmin();
        } else {
            loginError.style.display = 'block';
        }
    } catch (e) {
        console.error(e);
        alert('Erreur de connexion');
    }
});

// --- Initialization ---

async function initAdmin() {
    // Initialize Fabric Canvas
    canvas = new fabric.Canvas('signatureCanvas');

    await loadAvailableFonts(); // Load custom fonts first
    await loadConfig();
    await loadFields();

    // Event Listeners for Canvas
    canvas.on('object:modified', (e) => {
        updatePropertiesPanel(e.target);
    });

    canvas.on('selection:created', (e) => updatePropertiesPanel(e.selected[0]));
    canvas.on('selection:updated', (e) => updatePropertiesPanel(e.selected[0]));
    canvas.on('selection:cleared', () => {
        propertiesPanel.style.display = 'none';
    });
}

// --- Font Management ---

async function loadAvailableFonts() {
    // Existing defaults
    // Fetch customs
    try {
        const res = await fetch('/api/fonts');
        const fonts = await res.json();

        // Inject styles
        const styleSheet = document.createElement("style");
        document.head.appendChild(styleSheet);

        fonts.forEach(font => {
            // Add option to select
            const option = document.createElement('option');
            option.value = font.font_name;
            option.innerText = font.font_name;
            propFontFamily.appendChild(option);

            // Add @font-face
            // Path is absolute relative to server root
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

uploadFontBtn.addEventListener('click', async () => {
    const name = fontNameInput.value.trim();
    if (!name || !fontFileInput.files[0]) return alert("Nom et Fichier requis");

    const formData = new FormData();
    formData.append('font_name', name);
    formData.append('fontFile', fontFileInput.files[0]);

    try {
        const res = await fetch('/api/fonts', {
            method: 'POST',
            headers: { 'x-admin-password': adminPassword },
            body: formData
        });
        const data = await res.json();
        if (data.id) {
            alert("Police téléversée. Rechargement...");
            location.reload(); // Simple reload to refresh font options and css
        } else {
            alert('Échec du téléversement');
        }
    } catch (e) {
        console.error(e);
        alert('Échec du téléversement');
    }
});

// --- Config, Fields, & Canvas ---

async function loadConfig() {
    const res = await fetch('/api/config');
    const config = await res.json();

    if (config) {
        canvasWidthInput.value = config.canvas_width;
        canvasHeightInput.value = config.canvas_height;

        canvas.setWidth(config.canvas_width);
        canvas.setHeight(config.canvas_height);

        if (config.bg_image_path) {
            setBackgroundImage(config.bg_image_path);
        }
    }
}

function setBackgroundImage(url) {
    const imgUrl = url.startsWith('http') || url.startsWith('/') ? url : '/' + url;
    fabric.Image.fromURL(imgUrl, (img) => {
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            scaleX: canvas.width / img.width,
            scaleY: canvas.height / img.height
        });
    }, { crossOrigin: 'anonymous' });
}

saveConfigBtn.addEventListener('click', async () => {
    const formData = new FormData();
    formData.append('canvas_width', canvasWidthInput.value);
    formData.append('canvas_height', canvasHeightInput.value);

    if (bgImageInput.files[0]) {
        formData.append('bgImage', bgImageInput.files[0]);
    }

    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'x-admin-password': adminPassword },
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            alert('Configuration enregistrée !');
            canvas.setWidth(parseInt(canvasWidthInput.value));
            canvas.setHeight(parseInt(canvasHeightInput.value));
            if (data.bg_image_path) {
                setBackgroundImage(data.bg_image_path);
            }
        } else {
            alert('Erreur lors de l\'enregistrement de la config');
        }
    } catch (e) {
        console.error(e);
        alert('Erreur lors de l\'enregistrement de la config');
    }
});

async function loadFields() {
    const res = await fetch('/api/fields');
    currentFields = await res.json();

    renderFieldsList();
    renderCanvasObjects();
}

function renderFieldsList() {
    fieldsList.innerHTML = '';
    currentFields.forEach(field => {
        const div = document.createElement('div');
        div.className = 'field-list-item';
        div.innerHTML = `<span>${field.field_label} (${field.variable_id})</span>`;
        div.onclick = () => selectFieldOnCanvas(field.id);
        fieldsList.appendChild(div);
    });
}

function renderCanvasObjects() {
    canvas.clear();
    loadConfig();

    currentFields.forEach(field => {
        const text = new fabric.Text(field.field_label, {
            left: field.x_pos || 10,
            top: field.y_pos || 10,
            fontFamily: field.font_family || 'Arial',
            fontSize: field.font_size || 20,
            fill: field.font_color || '#000000',
            fontWeight: field.font_weight || 'normal',
            charSpacing: field.letter_spacing || 0,
            data: { id: field.id, variable_id: field.variable_id }
        });
        canvas.add(text);
    });
}

addFieldBtn.addEventListener('click', async () => {
    const label = newFieldLabel.value;
    const variable = newFieldVar.value;

    if (!label || !variable) return alert('Veuillez remplir le Nom et l\'ID Variable');

    const newField = {
        field_label: label,
        variable_id: variable,
        x_pos: 50,
        y_pos: 50,
        font_family: 'Arial',
        font_size: 16,
        font_color: '#000000',
        font_weight: 'normal',
        letter_spacing: 0
    };

    const res = await fetch('/api/fields', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword
        },
        body: JSON.stringify(newField)
    });

    const data = await res.json();
    if (data.id) {
        newFieldLabel.value = '';
        newFieldVar.value = '';
        await loadFields();
    }
});

function selectFieldOnCanvas(id) {
    const obj = canvas.getObjects().find(o => o.data && o.data.id === id);
    if (obj) {
        canvas.setActiveObject(obj);
        canvas.renderAll();
        updatePropertiesPanel(obj);
    }
}

function updatePropertiesPanel(obj) {
    if (!obj || !obj.data) return;

    propertiesPanel.style.display = 'block';

    const field = currentFields.find(f => f.id === obj.data.id);
    if (field) {
        propFieldName.innerText = field.field_label;
        propFontFamily.value = obj.fontFamily;
        propFontSize.value = obj.fontSize;
        propColor.value = obj.fill;
        propX.value = parseInt(obj.left);
        propY.value = parseInt(obj.top);
        propSpacing.value = obj.charSpacing || 0;

        updateFieldBtn.onclick = () => saveFieldUpdate(field.id, obj);
        deleteSelectedBtn.onclick = () => deleteField(field.id);
    }
}

async function saveFieldUpdate(id, obj) {
    const newLeft = parseInt(propX.value);
    const newTop = parseInt(propY.value);

    obj.set({
        left: newLeft,
        top: newTop,
        fontFamily: propFontFamily.value,
        fontSize: parseInt(propFontSize.value),
        fill: propColor.value,
        charSpacing: parseInt(propSpacing.value)
    });
    obj.setCoords();

    const updatedProps = {
        id: id,
        field_label: propFieldName.innerText,
        variable_id: obj.data.variable_id,

        x_pos: newLeft,
        y_pos: newTop,

        font_family: propFontFamily.value,
        font_size: parseInt(propFontSize.value),
        font_color: propColor.value,
        font_weight: obj.fontWeight,
        letter_spacing: parseInt(propSpacing.value)
    };

    const res = await fetch('/api/fields', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword
        },
        body: JSON.stringify(updatedProps)
    });

    const data = await res.json();
    if (data.id) {
        canvas.renderAll();
        await loadFields();
        alert('Champ mis à jour');
    }
}

async function deleteField(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce champ ?')) return;

    const res = await fetch(`/api/fields/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
    });

    await loadFields();
    propertiesPanel.style.display = 'none';
}
