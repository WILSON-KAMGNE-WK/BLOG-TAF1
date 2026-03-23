// ==========================================
// 1. CHARGEMENT DES MODULES (IMPORTS)
// ==========================================
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(express.json());

// ==========================================
// 2. VARIABLES DYNAMIQUES
// ==========================================
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ==========================================
// 3. CONNEXION À MYSQL (DYNAMIQUE)
// ==========================================
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blog_db',
    port: process.env.DB_PORT || 3306
}).promise();

db.getConnection()
    .then(() => console.log("✅ Connecté à MySQL"))
    .catch(err => console.error("❌ Erreur MySQL:", err));

// ==========================================
// 4. CONFIGURATION SWAGGER (DYNAMIQUE)
// ==========================================
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Blog API Wilson',
            version: '1.0.0',
            description: 'API Backend pour la gestion d’articles de blog'
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
// 6. ROUTES API
// ==========================================

// CREATE
app.post('/api/articles', async (req, res) => {
    const { titre, contenu, auteur, categorie, tags } = req.body;

    if (!titre || !auteur || !contenu) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Le titre, l'auteur et le contenu sont obligatoires."
        });
    }

    try {
        const query = `
            INSERT INTO articles (titre, contenu, auteur, categorie, tags)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [titre, contenu, auteur, categorie, tags]);

        res.status(201).json({
            message: "Article créé avec succès !",
            articleId: result.insertId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// READ ALL
app.get('/api/articles', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM articles ORDER BY date_creation DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur récupération articles" });
    }
});

// SEARCH TITLE
app.get('/api/articles/recherche/:motcle', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM articles WHERE titre LIKE ? ORDER BY date_creation DESC',
            [`%${req.params.motcle}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur recherche" });
    }
});

// SEARCH GLOBAL
app.get('/api/articles/recherche-global/:motcle', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM articles WHERE titre LIKE ? OR contenu LIKE ? ORDER BY date_creation DESC',
            [`%${req.params.motcle}%`, `%${req.params.motcle}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur recherche globale" });
    }
});

// FILTER CATEGORY
app.get('/api/articles/categorie/:nom', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM articles WHERE categorie = ? ORDER BY date_creation DESC',
            [req.params.nom]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur filtre catégorie" });
    }
});

// FILTER DATE
app.get('/api/articles/date/:annee/:mois/:jour', async (req, res) => {
    try {
        const { annee, mois, jour } = req.params;
        const date = `${annee}-${mois.padStart(2,'0')}-${jour.padStart(2,'0')}`;

        const [rows] = await db.query(
            'SELECT * FROM articles WHERE DATE(date_creation) = ? ORDER BY date_creation DESC',
            [date]
        );

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur filtre date" });
    }
});

// READ ONE
app.get('/api/articles/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Article non trouvé" });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Erreur récupération article" });
    }
});

// UPDATE
app.put('/api/articles/:id', async (req, res) => {
    const { titre, contenu, categorie } = req.body;

    try {
        const [result] = await db.query(
            'UPDATE articles SET titre=?, contenu=?, categorie=? WHERE id=?',
            [titre, contenu, categorie, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Article non trouvé" });
        }

        res.json({ message: "Article mis à jour !" });

    } catch (err) {
        res.status(500).json({ error: "Erreur mise à jour" });
    }
});

// DELETE
app.delete('/api/articles/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM articles WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Article non trouvé" });
        }

        res.json({ message: "Article supprimé !" });

    } catch (err) {
        res.status(500).json({ error: "Erreur suppression" });
    }
});

// ==========================================
// 7. LANCEMENT DU SERVEUR
// ==========================================
app.listen(PORT, () => {
    console.log(`\n🚀 Serveur démarré sur : ${BASE_URL}`);
    console.log(`📘 Swagger : ${BASE_URL}/api-docs\n`);
});