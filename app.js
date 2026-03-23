// ==========================================
// 1. CHARGEMENT DES MODULES (IMPORTS)
// ==========================================
const express = require('express');
const mysql = require('mysql2');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(express.json()); 

// ==========================================
// 2. CONNEXION À MYSQL
// ==========================================
const db = mysql.createPool({
    host: 'localhost',
    user: 'wilson', 
    password: 'ton_mot_de_passe',
    database: 'blog_db'
}).promise();

db.getConnection()
    .then(() => console.log("✅ Connecté à la base de données MySQL (blog_db)"))
    .catch(err => console.error("❌ Erreur de connexion MySQL:", err));

// ==========================================
// 3. CONFIGURATION SWAGGER
// ==========================================
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Blog API Wilson',
            version: '1.0.0',
            description: 'API Backend pour la gestion d’articles de blog (TP)'
        },
        servers: [{ url: 'http://localhost:3000' }]
    },
    apis: ['./app.js'], 
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// ==========================================
// 3b. ROUTE RACINE REDIRECTION SWAGGER
// ==========================================
app.get('/', (req, res) => {
    res.redirect('/api-docs'); // Redirige vers la doc Swagger
});

// ==========================================
// 4. ROUTES (FONCTIONNALITÉS)
// ==========================================

/**
 * @openapi
 * /api/articles:
 *   post:
 *     summary: Créer un nouvel article
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
 *               titre:
 *                 type: string
 *               contenu:
 *                 type: string
 *               auteur:
 *                 type: string
 *               categorie:
 *                 type: string
 *               tags:
 *                 type: string
 *     responses:
 *       201:
 *         description: Article créé avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */
app.post('/api/articles', async (req, res) => {
    const { titre, contenu, auteur, categorie, tags } = req.body;
    if (!titre || !auteur || !contenu) {
        return res.status(400).json({ 
            error: "Bad Request", 
            message: "Le titre, l'auteur et le contenu sont obligatoires." 
        });
    }
    try {
        const query = 'INSERT INTO articles (titre, contenu, auteur, categorie, tags) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.query(query, [titre, contenu, auteur, categorie, tags]);
        res.status(201).json({ message: "Article créé avec succès !", articleId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
});

/**
 * @openapi
 * /api/articles:
 *   get:
 *     summary: Récupérer la liste de tous les articles
 *     responses:
 *       200:
 *         description: Liste des articles récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   titre:
 *                     type: string
 *                   contenu:
 *                     type: string
 *                   auteur:
 *                     type: string
 *                   date_creation:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM articles ORDER BY date_creation DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de la récupération des articles" });
    }
});

/**
 * @openapi
 * /api/articles/recherche/{motcle}:
 *   get:
 *     summary: Rechercher des articles par mot-clé dans le titre
 *     parameters:
 *       - in: path
 *         name: motcle
 *         required: true
 *         schema:
 *           type: string
 *         description: Mot-clé à rechercher dans le titre
 *     responses:
 *       200:
 *         description: Résultats de la recherche
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles/recherche/:motcle', async (req, res) => {
    const { motcle } = req.params;
    try {
        const query = 'SELECT * FROM articles WHERE titre LIKE ? ORDER BY date_creation DESC';
        const [rows] = await db.query(query, [`%${motcle}%`]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de la recherche" });
    }
});

/**
 * @openapi
 * /api/articles/recherche-global/{motcle}:
 *   get:
 *     summary: Rechercher des articles par mot-clé dans le titre et le contenu
 *     parameters:
 *       - in: path
 *         name: motcle
 *         required: true
 *         schema:
 *           type: string
 *         description: Mot-clé à rechercher
 *     responses:
 *       200:
 *         description: Résultats de la recherche globale
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles/recherche-global/:motcle', async (req, res) => {
    const { motcle } = req.params;
    try {
        const query = 'SELECT * FROM articles WHERE titre LIKE ? OR contenu LIKE ? ORDER BY date_creation DESC';
        const [rows] = await db.query(query, [`%${motcle}%`, `%${motcle}%`]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de la recherche globale" });
    }
});

/**
 * @openapi
 * /api/articles/categorie/{nom}:
 *   get:
 *     summary: Récupérer les articles d'une catégorie spécifique
 *     parameters:
 *       - in: path
 *         name: nom
 *         required: true
 *         schema:
 *           type: string
 *         description: Le nom de la catégorie (ex: NEWS, TECH)
 *     responses:
 *       200:
 *         description: Liste des articles de la catégorie
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles/categorie/:nom', async (req, res) => {
    const { nom } = req.params;
    try {
        const query = 'SELECT * FROM articles WHERE categorie = ? ORDER BY date_creation DESC';
        const [rows] = await db.query(query, [nom]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors du filtrage par catégorie" });
    }
});

/**
 * @openapi
 * /api/articles/date/{annee}/{mois}/{jour}:
 *   get:
 *     summary: Récupérer les articles publiés à une date spécifique
 *     parameters:
 *       - in: path
 *         name: annee
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: mois
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: jour
 *         required: true
 *         schema:
 *           type: integer
 *         description: Date de publication (YYYY/MM/DD)
 *     responses:
 *       200:
 *         description: Liste des articles publiés à cette date
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles/date/:annee/:mois/:jour', async (req, res) => {
    const { annee, mois, jour } = req.params;
    try {
        const date = `${annee}-${mois.padStart(2,'0')}-${jour.padStart(2,'0')}`;
        const query = 'SELECT * FROM articles WHERE DATE(date_creation) = ? ORDER BY date_creation DESC';
        const [rows] = await db.query(query, [date]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors du filtrage par date" });
    }
});

/**
 * @openapi
 * /api/articles/{id}:
 *   get:
 *     summary: Récupérer un seul article par son ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID de l'article à afficher
 *     responses:
 *       200:
 *         description: Article trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Article non trouvé
 *       500:
 *         description: Erreur serveur
 */
app.get('/api/articles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: "Article non trouvé." });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération de l'article" });
    }
});

/**
 * @openapi
 * /api/articles/{id}:
 *   put:
 *     summary: Modifier un article existant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID de l'article à modifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titre:
 *                 type: string
 *               contenu:
 *                 type: string
 *               categorie:
 *                 type: string
 *     responses:
 *       200:
 *         description: Article mis à jour avec succès
 *       404:
 *         description: Article non trouvé
 *       500:
 *         description: Erreur serveur
 */
app.put('/api/articles/:id', async (req, res) => {
    const { id } = req.params;
    const { titre, contenu, categorie } = req.body;
    try {
        const query = 'UPDATE articles SET titre = ?, contenu = ?, categorie = ? WHERE id = ?';
        const [result] = await db.query(query, [titre, contenu, categorie, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Article non trouvé." });
        res.json({ message: "Article mis à jour avec succès !" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de la mise à jour" });
    }
});

/**
 * @openapi
 * /api/articles/{id}:
 *   delete:
 *     summary: Supprimer un article par son ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID de l'article à supprimer
 *     responses:
 *       200:
 *         description: Article supprimé avec succès
 *       404:
 *         description: Article non trouvé
 *       500:
 *         description: Erreur serveur
 */
app.delete('/api/articles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM articles WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Article non trouvé." });
        res.json({ message: "Article supprimé avec succès !" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de la suppression de l'article" });
    }
});

// ==========================================
// 5. LANCEMENT DU SERVEUR
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Serveur démarré sur : http://localhost:${PORT}`);
    console.log(`📘 Documentation Swagger : http://localhost:${PORT}/api-docs\n`);
});