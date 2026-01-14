📄 PRD : Générateur de Signatures DynamiquesRôle : Product OwnerStatut : Validé pour DéveloppementStack : Frontend (JS/Canvas), Backend (Node/SQLite)1. Vue d'ensemble du projetL'application "Signature Generator" permet de standardiser les signatures email des collaborateurs. L'administrateur définit un template visuel (image de fond + positions des textes) et l'utilisateur final n'a qu'à saisir ses informations pour obtenir un export image (.png) prêt à l'emploi.2. Architecture Technique & Persistance2.1 Moteur de Rendu (Canvas)Librairie conseillée : Fabric.js ou Konva.js pour faciliter le Drag & Drop et la manipulation d'objets côté Admin.Sortie : canvas.toDataURL('image/png') avec un ratio de pixel élevé pour éviter le flou sur les écrans Retina.2.2 Base de données (SQLite)La persistance doit être gérée via SQLite.Table Config : Stocke les paramètres globaux (dimensions, URL du fond).Table Fields : Liste des champs éditables (ID, position X, position Y, styles).Table Users : Stocke l'ID de l'utilisateur et un objet JSON contenant ses valeurs personnalisées.3. Spécifications Fonctionnelles3.1 Interface Administrateur (Admin-Only)Authentification : Accès protégé par un mot de passe défini en variable d'environnement (ADMIN_PASSWORD).Configuration du Support :Upload d'image de fond (Background).Définition de la largeur et hauteur cible (ex: 600x200px).Éditeur de Champs (WYSIWYG) :Création de variables (ex: nom_complet, titre_poste).Positionnement par Drag & Drop sur le canevas.Panneau de propriétés : Sélection de police (Google Fonts), Taille, Couleur (Hex), Letter-spacing.3.2 Interface UtilisateurConnexion simplifiée : Saisie d'un identifiant (Email ou Matricule).Récupération SQLite : * Si l'ID existe : Pré-remplissage automatique du formulaire.Sinon : Champs vides.Formulaire Dynamique : Les champs s'affichent selon la configuration Fields de l'admin.Live Preview : Chaque caractère saisi met à jour le Canvas instantanément.Export : Bouton "Télécharger ma signature" (Fichier PNG).4. Modèle de Données (SQLite)-- Table des configurations de template
CREATE TABLE template_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bg_image_path TEXT,
    canvas_width INTEGER DEFAULT 600,
    canvas_height INTEGER DEFAULT 200
);

-- Table des champs dynamiques
CREATE TABLE signature_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    field_label TEXT,    -- Nom affiché (ex: "Votre Poste")
    variable_id TEXT,    -- ID technique (ex: "job_title")
    x_pos INTEGER,
    y_pos INTEGER,
    font_family TEXT,
    font_size INTEGER,
    font_color TEXT,
    font_weight TEXT,    -- "normal", "bold"
    letter_spacing REAL
);

-- Table des données utilisateurs
CREATE TABLE user_data (
    user_identifier TEXT PRIMARY KEY, -- Email ou Login
    payload TEXT                      -- JSON stringifié des valeurs saisies
);
5. User StoriesIDEn tant que...Je veux...Afin de...US.1AdministrateurPlacer le nom de l'employé à un endroit précis du fondCréer un design harmonieux.US.2UtilisateurRetrouver mon téléphone déjà saisi lors de ma dernière visiteGagner du temps pour une mise à jour.US.3UtilisateurVoir ma signature s'afficher au fur et à mesure que je tapeVérifier qu'il n'y a pas de faute de frappe.US.4DéveloppeurUtiliser SQLite pour le stockageAvoir une application portable et facile à déployer.6. Critères d'Acceptation (DoD)Exactitude : L'image exportée doit correspondre au pixel près à la preview Canvas.Persistance : Un rafraîchissement de page après saisie du login doit restaurer les données depuis SQLite.Performance : Le rendu Canvas ne doit pas lagger lors de la saisie utilisateur.Responsive : L'interface de saisie doit être utilisable sur mobile (même si l'admin est desktop-first).[Image de l'architecture logicielle : Frontend Canvas communiquant avec une API Node/SQLite]
