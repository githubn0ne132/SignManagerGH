Spécifications Fonctionnelles : Générateur de Signatures DynamiquesCe document définit les exigences pour la création d'une application web permettant de générer des images de signature personnalisées à partir d'un modèle administrable.1. Vue d'ensemble du projetL'objectif est de fournir aux employés une interface simple pour générer leur signature email sous forme d'image (PNG/JPG), garantissant une uniformité visuelle sur Outlook, tout en permettant à un administrateur de modifier le design sans toucher au code.2. Architecture de l'applicationL'application se divise en deux espaces distincts :Espace Admin : Configuration du template (WYSIWYG).Espace Utilisateur : Saisie des données et génération de l'image.3. Spécifications : Interface AdministrateurL'accès à cette interface est protégé par un mot de passe unique défini dans les variables d'environnement.3.1 Gestion du Support (Background)Upload : L'admin peut uploader une image de fond (PNG, JPG).Dimensions : Définition de la largeur (pixels) et de la hauteur (pixels) du canevas final.3.2 Éditeur WYSIWYG des ChampsL'admin doit pouvoir gérer des "variables" qui seront remplies par les utilisateurs.Ajout/Suppression : Bouton pour ajouter un nouveau champ de texte ou supprimer un champ existant.Propriétés par champ :Label : Nom affiché côté utilisateur (ex: "Votre matricule").ID Variable : Nom technique (ex: user_phone).Positionnement : Coordonnées X et Y (en pixels) délimitant le point d'ancrage du texte. Idéalement déplaçable au "Drag & Drop" sur une prévisualisation.Style Typographique :Police (Menu déroulant parmi une sélection de polices système ou Google Fonts).Taille (en px).Couleur (Sélecteur de couleur Hexadécimal).Letter-spacing (Espacement entre les lettres).Graisse (Normal, Gras, Italique).4. Spécifications : Interface Utilisateur4.1 Authentification simplifiéeLogin : L'utilisateur entre son identifiant (ex: email ou login interne).Persistance : * Si l'identifiant existe en base, les champs sont pré-remplis avec ses anciennes valeurs.Si l'identifiant est nouveau, les champs sont vides.Aucun mot de passe n'est requis pour cette interface.4.2 Formulaire de saisieGénération automatique des champs basés sur la configuration Admin.Prévisualisation en direct : Un canevas (HTML5 Canvas) affiche en temps réel le rendu de la signature au fur et à mesure que l'utilisateur tape.4.3 ExportationBouton "Générer l'image" : Enregistre les données utilisateur et déclenche le téléchargement.Format : Image PNG haute définition.Optimisation Outlook : L'image doit être générée à la taille exacte définie en admin pour éviter le redimensionnement flou d'Outlook.5. Spécifications Techniques5.1 Stockage des donnéesTemplate : Un objet JSON stockant l'URL de l'image de fond et le tableau des objets "champs".Utilisateurs : Une table reliant le login à un objet JSON contenant les valeurs des variables.5.2 Moteur de renduLe rendu doit être effectué via l'API HTML5 Canvas pour la prévisualisation.La génération finale peut se faire côté client (Canvas.toDataURL) ou côté serveur pour assurer une gestion parfaite des polices de caractères.6. Modèle de données (Exemple JSON){
  "config": {
    "background_url": "path/to/bg.png",
    "width": 600,
    "height": 200,
    "fields": [
      {
        "id": "full_name",
        "label": "Nom Complet",
        "x": 50,
        "y": 100,
        "font": "Arial",
        "size": 18,
        "color": "#000000",
        "spacing": 1.2
      }
    ]
  }
}
7. Critères d'acceptationL'admin peut changer la couleur d'un texte et le changement est immédiat pour tous les utilisateurs.Un utilisateur peut revenir 1 mois plus tard, taper son login, et retrouver ses informations pour une mise à jour rapide.L'image finale ne doit pas comporter de distorsion de texte.
