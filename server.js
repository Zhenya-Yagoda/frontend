const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'frontend',
    password: '1234567890',
    port: 5432,
});

const SECRET_KEY = 'ff6b8a6a35cbbf6e4db730a5a4b4d2a7139b8f8f5d4e7f8c9a3a8f8d7e4a6b7';

// Функція для виконання SQL-запитів
async function runQuery(query, params) {
    try {
        const result = await pool.query(query, params);
        console.log('Query executed successfully:', query);
        return result;
    } catch (err) {
        console.error('Error executing query:', query, err);
    }
}

// Ініціалізація бази даних
async function initializeDatabase() {
    // Створення таблиць, якщо вони не існують
    await runQuery(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            login VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL,
            role VARCHAR(50) DEFAULT 'user'
        )
    `);

    await runQuery(`
        CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id),
            film_id INT,
            text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await runQuery(`
        CREATE TABLE IF NOT EXISTS ratings (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id),
            film_id INT,
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, film_id)
        )
    `);

    await runQuery(`
        CREATE TABLE IF NOT EXISTS films (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL
        )
    `);

    await runQuery(`
        CREATE TABLE IF NOT EXISTS news (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            date TIMESTAMP NOT NULL
        )
    `);

    // Перевірка та додавання адміністратора, якщо він не існує
    const adminExists = await runQuery('SELECT 1 FROM users WHERE login = $1', ['admin']);
    if (adminExists.rowCount === 0) {
        await runQuery(`
            INSERT INTO users (name, login, password, role) VALUES 
            ('Євгенія', 'admin', '$2b$12$0VS0gccLwJuCj0IDLc.lMOY3NKOPcRSw/hqWGiqjQEVUqnYeY0ZsC', 'admin')
        `);
    }

    // Перевірка та додавання фільмів, якщо вони не існують
    const films = [
        'Оппенгеймер', 'Хрещений батько', 'Список Шиндлера', 'Темний лицар', 
        'Втеча з Шоушенка', 'Володар перснів', '12 розгніваних чоловіків', 
        'Кримінальне чтиво', 'Бійцівський клуб', 'Форрест Ґамп', 'Початок'
    ];
    for (const title of films) {
        const filmExists = await runQuery('SELECT 1 FROM films WHERE title = $1', [title]);
        if (filmExists.rowCount === 0) {
            await runQuery('INSERT INTO films (title) VALUES ($1)', [title]);
        }
    }
}

// Викликаємо функцію ініціалізації бази даних при старті сервера
initializeDatabase();

// Серверна логіка (маршрути та обробники)
app.post('/register', async (req, res) => {
    const { name, login, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const result = await pool.query(
            'INSERT INTO users (name, login, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, login, hashedPassword, role || 'user']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Користувач з таким логіном вже існує' });
    }
});

app.post('/login', async (req, res) => {
    const { login, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE login = $1', [login]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ userId: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Неправильний логін або пароль' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Щось пішло не так' });
    }
});

app.post('/comments', async (req, res) => {
    const { filmId, text } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);

    try {
        const result = await pool.query(
            'INSERT INTO comments (user_id, film_id, text) VALUES ($1, $2, $3) RETURNING *',
            [decoded.userId, filmId, text]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Щось пішло не так' });
    }
});

app.get('/comments', async (req, res) => {
    const { film_id } = req.query;

    if (!film_id) {
        return res.status(400).json({ error: 'film_id is missing' });
    }

    try {
        const result = await pool.query(
            'SELECT c.id, c.text, c.created_at, u.name AS user FROM comments c JOIN users u ON c.user_id = u.id WHERE c.film_id = $1',
            [film_id]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.post('/ratings', async (req, res) => {
    const { filmId, rating } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);

    try {
        const result = await pool.query(
            'INSERT INTO ratings (user_id, film_id, rating) VALUES ($1, $2, $3) ON CONFLICT (user_id, film_id) DO UPDATE SET rating = EXCLUDED.rating RETURNING *',
            [decoded.userId, filmId, rating]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Щось пішло не так' });
    }
});

app.get('/ratings/average', async (req, res) => {
    const { film_id } = req.query;

    if (!film_id) {
        return res.status(400).json({ error: 'film_id is missing' });
    }

    try {
        const result = await pool.query(
            'SELECT AVG(rating) AS average_rating FROM ratings WHERE film_id = $1',
            [film_id]
        );
        const averageRating = result.rows[0].average_rating || 0;
        res.status(200).json({ average_rating: averageRating });
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Очищення даних (тільки для адміністратора)
app.post('/clear', async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);

    if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        await pool.query('DELETE FROM comments WHERE film_id = $1', [req.body.filmId]);
        await pool.query('DELETE FROM ratings WHERE film_id = $1', [req.body.filmId]);
        res.status(200).json({ message: 'Data cleared' });
    } catch (err) {
        res.status(500).json({ error: 'Щось пішло не так' });
    }
});

// Додавання новини (тільки для адміністратора)
app.post('/news', async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);

    if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { title, content } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO news (title, content, date) VALUES ($1, $2, $3) RETURNING *',
            [title, content, new Date().toISOString()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Отримання всіх новин
app.get('/news', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM news ORDER BY date DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Очищення новин (тільки для адміністратора)
app.post('/clear-news', async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);

    if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        await pool.query('DELETE FROM news');
        res.status(200).json({ message: 'Data cleared' });
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
