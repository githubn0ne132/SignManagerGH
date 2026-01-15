# 📄 Documentation : Générateur de Signatures Dynamiques

**Rôle :** Documentation Technique & Fonctionnelle  
**Statut :** En Production  
**Stack :** Frontend (Vanilla JS/HTML/CSS), Backend (Node.js/Express/SQLite)

---

## 1. Vue d'ensemble du projet

L'application **"Signature Generator"** permet de standardiser les signatures email des collaborateurs. L'administrateur définit des templates visuels (image de fond + positions des textes) et l'utilisateur final n'a qu'à saisir ses informations pour obtenir un export image (.png) prêt à l'emploi.

## 2. Architecture Technique

### 2.1 Backend (Node.js/Express)
L'application repose sur un serveur **Express.js** qui gère :
*   L'API REST pour la gestion des templates, champs et utilisateurs.
*   La persistance des données via **SQLite** (`signature_app.db`).
*   Le service des fichiers statiques (Frontend dans `public/`, uploads dans `uploads/`).

### 2.2 Frontend (Vanilla JS)
L'interface est construite en **HTML/CSS/JS natif** sans framework lourd.
*   **Admin (`/admin.html`)** : Gestion des templates et des polices.
*   **App (`/index.html`)** : Formulaire utilisateur et génération de signature.
*   **Canvas** : Utilisation de l'API Canvas pour le rendu et l'export des images.

### 2.3 Base de données (SQLite)
Le schéma actuel supporte le multi-template :
*   `templates` : Configuration des modèles (fond, dimensions).
*   `signature_fields` : Champs de texte positionnés (liés à un template).
*   `user_data` : Sauvegarde des données saisies par les utilisateurs.
*   `custom_fonts` : Polices personnalisées uploadées.

## 3. Installation et Lancement

Procédure pour installer et lancer l'application depuis zéro.

### Prérequis
*   Node.js (v14 ou supérieur)
*   NPM

### Installation
1.  Cloner le dépôt dans votre dossier de travail :
    ```bash
    git clone <votre-repo-url>
    cd SignManagerGH
    ```
2.  Installer les dépendances :
    ```bash
    npm install
    ```

### Initialisation de la Base de Données
Avant le premier lancement, initialisez la base de données SQLite :
```bash
npm run init-db
```
*Cela va créer le fichier `signature_app.db` et les tables nécessaires.*

### Démarrage
Lancez le serveur :
```bash
npm start
```
Le serveur sera accessible sur [http://localhost:3000](http://localhost:3000).

---

## 4. Guide d'Utilisation

### 4.1 Interface Administrateur
Accédez à **[http://localhost:3000/admin.html](http://localhost:3000/admin.html)**.
*   **Mot de passe par défaut :** `admin123`
    *   *(Configurable via la variable d'environnement `ADMIN_PASSWORD`)*
*   **Fonctionnalités :**
    *   Créer un nouveau template.
    *   Uploader une image de fond.
    *   Ajouter des champs (ex: `{{name}}`, `{{phone}}`).
    *   Déplacer les champs par Drag & Drop.
    *   Uploader des polices personnalisées.

### 4.2 Interface Utilisateur
Accédez à **[http://localhost:3000](http://localhost:3000)**.
*   Entrez votre email ou identifiant.
*   Remplissez les champs définis par l'administrateur.
*   Visualisez le résultat en temps réel.
*   Cliquez sur **"Télécharger la Signature"** pour obtenir le PNG.

## 5. Modèle de Données (Schema SQL)

```sql
-- Table des templates
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    bg_image_path TEXT,
    canvas_width INTEGER DEFAULT 600,
    canvas_height INTEGER DEFAULT 200,
    is_active INTEGER DEFAULT 0
);

-- Table des champs
CREATE TABLE IF NOT EXISTS signature_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    field_label TEXT,
    variable_id TEXT, -- ex: "user_name"
    x_pos INTEGER,
    y_pos INTEGER,
    font_family TEXT,
    font_size INTEGER,
    font_color TEXT,
    font_weight TEXT,
    letter_spacing REAL,
    FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS user_data (
    user_identifier TEXT PRIMARY KEY,
    payload TEXT -- Données JSON
);

-- Polices personnalisées
CREATE TABLE IF NOT EXISTS custom_fonts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    font_name TEXT,
    file_path TEXT
);
```
