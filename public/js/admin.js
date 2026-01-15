// Global Vars
let canvas;
let adminPassword = '';
let currentFields = [];
let currentTemplateId = null;
let templates = [];

// DOM Elements
const loginSection = document.getElementById('loginSection');
const adminDashboard = document.getElementById('adminDashboard');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const adminPasswordInput = document.getElementById('adminPassword');

// Template Elements
const templateSelect = document.getElementById('templateSelect');
const newTemplateBtn = document.getElementById('newTemplateBtn');
const templateActions = document.getElementById('templateActions');
const templateNameInput = document.getElementById('templateNameInput');
const isActiveTemplate = document.getElementById('isActiveTemplate');
const deleteTemplateBtn = document.getElementById('deleteTemplateBtn');
const saveTemplateNameBtn = document.getElementById('saveTemplateNameBtn');

const canvasWidthInput = document.getElementById('canvasWidth');
const canvasHeightInput = document.getElementById('canvasHeight');
const redirectUrlInput = document.getElementById('redirectUrlInput');
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
    await loadTemplates();

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

// --- Templates ---

async function loadTemplates() {
    const res = await fetch('/api/templates');
    templates = await res.json();

    templateSelect.innerHTML = '';

    if (templates.length === 0) {
        // Should not happen as DB creates default
        return;
    }

    templates.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.innerText = t.name + (t.is_active ? ' (Actif)' : '');
        templateSelect.appendChild(opt);
    });

    // Select active or first
    if (!currentTemplateId) {
        const active = templates.find(t => t.is_active);
        currentTemplateId = active ? active.id : templates[0].id;
    }

    templateSelect.value = currentTemplateId;
    loadTemplateDetails(currentTemplateId);
}

templateSelect.addEventListener('change', (e) => {
    currentTemplateId = parseInt(e.target.value);
    loadTemplateDetails(currentTemplateId);
});

async function loadTemplateDetails(id) {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    // Update UI
    templateActions.style.display = 'block';
    templateNameInput.value = template.name;
    isActiveTemplate.checked = !!template.is_active;

    // Config inputs
    canvasWidthInput.value = template.canvas_width;
    canvasHeightInput.value = template.canvas_height;
    redirectUrlInput.value = template.redirect_url || '';

    // Canvas dimensions
    canvas.setWidth(template.canvas_width);
    canvas.setHeight(template.canvas_height);

    // Background
    if (template.bg_image_path) {
        setBackgroundImage(template.bg_image_path);
    } else {
        canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
        canvas.backgroundColor = '#ffffff';
    }

    // Load Fields
    await loadFields(id);
}

newTemplateBtn.addEventListener('click', async () => {
    const name = prompt("Nom du nouveau template:", "Nouveau Template");
    if (!name) return;

    const res = await fetch('/api/templates', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword
        },
        body: JSON.stringify({ name })
    });

    const data = await res.json();
    if (data.id) {
        currentTemplateId = data.id;
        await loadTemplates(); // Reload list and select new
        alert('Template créé');
    } else {
        alert('Erreur: ' + data.error);
    }
});

saveTemplateNameBtn.addEventListener('click', async () => {
    if (!currentTemplateId) return;
    // We reuse the update config endpoint but just for name? 
    // Actually the PUT /api/templates/:id endpoint handles name too.
    // We should probably just trigger the saveConfigBtn logic or separate it.
    // Let's assume saveConfigBtn handles everything for the template entry.
    // For specific "rename" button, we can just save config.
    saveConfigBtn.click();
});

isActiveTemplate.addEventListener('change', async (e) => {
    if (!currentTemplateId) return;
    if (e.target.checked) {
        // Set active
        const res = await fetch(`/api/templates/${currentTemplateId}/active`, {
            method: 'PUT',
            headers: { 'x-admin-password': adminPassword }
        });
        const data = await res.json();
        if (data.success) {
            await loadTemplates(); // Refresh to show (Active) label
        }
    }
});

deleteTemplateBtn.addEventListener('click', async () => {
    if (!currentTemplateId) return;
    if (!confirm("Supprimer ce template ?")) return;

    const res = await fetch(`/api/templates/${currentTemplateId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
    });

    const data = await res.json();
    if (data.success) {
        currentTemplateId = null;
        await loadTemplates();
    } else {
        alert('Erreur lors de la suppression');
    }
});


// --- Font Management ---

async function loadAvailableFonts() {
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
            location.reload();
        } else {
            alert('Échec du téléversement');
        }
    } catch (e) {
        console.error(e);
        alert('Échec du téléversement');
    }
});

// --- Config, Fields, & Canvas ---

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
    if (!currentTemplateId) return;

    const formData = new FormData();
    formData.append('canvas_width', canvasWidthInput.value);
    formData.append('canvas_height', canvasHeightInput.value);
    formData.append('name', templateNameInput.value);
    formData.append('redirect_url', redirectUrlInput.value);

    if (bgImageInput.files[0]) {
        formData.append('bgImage', bgImageInput.files[0]);
    }

    try {
        // PUT to /api/templates/:id
        const res = await fetch(`/api/templates/${currentTemplateId}`, {
            method: 'PUT',
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
            await loadTemplates(); // Refresh name in list if changed
        } else {
            alert('Erreur lors de l\'enregistrement de la config');
        }
    } catch (e) {
        console.error(e);
        alert('Erreur lors de l\'enregistrement de la config');
    }
});

async function loadFields(templateId) {
    const res = await fetch(`/api/fields?template_id=${templateId}`);
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
    // Re-apply background
    const template = templates.find(t => t.id === currentTemplateId);
    if (template && template.bg_image_path) {
        setBackgroundImage(template.bg_image_path);
    }

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
    if (!currentTemplateId) return alert("Aucun template sélectionné");

    const label = newFieldLabel.value;
    const variable = newFieldVar.value;

    if (!label || !variable) return alert('Veuillez remplir le Nom et l\'ID Variable');

    const newField = {
        template_id: currentTemplateId,
        field_label: label,
        variable_id: variable,
        x_pos: 50,
        y_pos: 50,
        font_family: propFontFamily.options.length > 0 ? propFontFamily.options[0].value : 'Arial',
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
        await loadFields(currentTemplateId);
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
        template_id: currentTemplateId, // Important to keep it linked
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
        await loadFields(currentTemplateId);
        alert('Champ mis à jour');
    }
}

async function deleteField(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce champ ?')) return;

    const res = await fetch(`/api/fields/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
    });

    await loadFields(currentTemplateId);
    propertiesPanel.style.display = 'none';
}
