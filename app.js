// ==========================================
// 1. CHARGEMENT DES MODULES (IMPORTS)
// ==========================================
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 2. VARIABLES DYNAMIQUES
// ==========================================
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ==========================================
// 3. CONNEXION À MYSQL
// ==========================================
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blog_db',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
}).promise();

db.getConnection()
    .then(() => console.log("✅ Connecté à MySQL"))
    .catch(err => console.error("❌ Erreur MySQL:", err));

// ==========================================
// 4. CONFIGURATION SWAGGER
// ==========================================
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Blog API Wilson',
            version: '1.0.0',
            description: 'API Backend complète pour gestion d’articles'
        },
        servers: [{ url: BASE_URL }]
    },
    apis: ['./app.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// ==========================================
// 5. ROUTE RACINE
// ==========================================
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});

// ==========================================
// 6. ROUTES API (DOCUMENTÉES POUR SWAGGER)
// ==========================================

// CREATE
/**
 * @swagger
 * /api/articles:
 *   post:
 *     summary: Créer un nouvel article
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titre
 *               - contenu
 *               - auteur
 *             properties:
 *               titre: { type: string }
 *               contenu: { type: string }
 *               auteur: { type: string }
 *               categorie: { type: string }
 *               tags: { type: string }
 *     responses:
 *       201:
 *         description: Article créé
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */
app.post('/api/articles', async (req, res) => {
    const { titre, contenu, auteur, categorie, tags } = req.body;

    if (!titre || !auteur || !contenu) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO articles (titre, contenu, auteur, categorie, tags) VALUES (?, ?, ?, ?, ?)',
            [titre, contenu, auteur, categorie, tags]
        );

        res.status(201).json({ message: "Article créé !", articleId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ ALL
/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: Récupérer tous les articles
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: Liste des articles
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM articles ORDER BY date_creation DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ ONE
/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     summary: Récupérer un article par ID
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Article trouvé
 *       404:
 *         description: Non trouvé
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Article non trouvé" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SEARCH TITLE
/**
 * @swagger
 * /api/articles/recherche/{motcle}:
 *   get:
 *     summary: Rechercher par mot-clé dans le titre
 *     tags: [Recherche]
 *     parameters:
 *       - in: path
 *         name: motcle
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Résultats de recherche
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles/recherche/:motcle', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM articles WHERE titre LIKE ? ORDER BY date_creation DESC',
            [`%${req.params.motcle}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SEARCH GLOBAL
/**
 * @swagger
 * /api/articles/recherche-global/{motcle}:
 *   get:
 *     summary: Rechercher par mot-clé dans titre et contenu
 *     tags: [Recherche]
 *     parameters:
 *       - in: path
 *         name: motcle
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Résultats de recherche
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles/recherche-global/:motcle', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM articles WHERE titre LIKE ? OR contenu LIKE ? ORDER BY date_creation DESC',
            [`%${req.params.motcle}%`, `%${req.params.motcle}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// FILTER CATEGORY
/**
 * @swagger
 * /api/articles/categorie/{nom}:
 *   get:
 *     summary: Filtrer par catégorie
 *     tags: [Filtrage]
 *     parameters:
 *       - in: path
 *         name: nom
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Articles filtrés
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles/categorie/:nom', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM articles WHERE categorie = ? ORDER BY date_creation DESC',
            [req.params.nom]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// FILTER DATE
/**
 * @swagger
 * /api/articles/date/{annee}/{mois}/{jour}:
 *   get:
 *     summary: Filtrer par date de publication
 *     tags: [Filtrage]
 *     parameters:
 *       - in: path
 *         name: annee
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: mois
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: jour
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Articles filtrés
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles/date/:annee/:mois/:jour', async (req, res) => {
    try {
        const { annee, mois, jour } = req.params;
        const date = `${annee}-${String(mois).padStart(2,'0')}-${String(jour).padStart(2,'0')}`;
        const [rows] = await db.query(
            'SELECT * FROM articles WHERE DATE(date_creation) = ? ORDER BY date_creation DESC',
            [date]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
/**
 * @swagger
 * /api/articles/{id}:
 *   put:
 *     summary: Mettre à jour un article
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titre: { type: string }
 *               contenu: { type: string }
 *               categorie: { type: string }
 *     responses:
 *       200:
 *         description: Article mis à jour
 *       404:
 *         description: Non trouvé
 *       500:
 *         description: Erreur serveur
 */
app.put('/api/articles/:id', async (req, res) => {
    const { titre, contenu, categorie } = req.body;

    try {
        const [result] = await db.query(
            'UPDATE articles SET titre=?, contenu=?, categorie=? WHERE id=?',
            [titre, contenu, categorie, req.params.id]
        );

        if (result.affectedRows === 0)
            return res.status(404).json({ message: "Article non trouvé" });

        res.json({ message: "Article mis à jour !" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
/**
 * @swagger
 * /api/articles/{id}:
 *   delete:
 *     summary: Supprimer un article
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Article supprimé
 *       404:
 *         description: Non trouvé
 *       500:
 *         description: Erreur serveur
 */
app.delete('/api/articles/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM articles WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0)
            return res.status(404).json({ message: "Article non trouvé" });

        res.json({ message: "Article supprimé !" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 7. LANCEMENT DU SERVEUR
// ==========================================
app.listen(PORT, () => {
    console.log(`\n🚀 Serveur démarré sur : ${BASE_URL}`);
    console.log(`📘 Swagger : ${BASE_URL}/api-docs\n`);
});