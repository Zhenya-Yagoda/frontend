const apiUrl = 'http://localhost:3000';
const filmId = 1;  // Ідентифікатор фільму тижня

// Перевірка стану входу при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
const loggedInUser = localStorage.getItem('loggedInUser');
const commentFormContainer = document.getElementById('comment-form-container');
const loginPrompt = document.getElementById('login-prompt');
const ratingSection = document.querySelector('.rating-section');
const clearDataButton = document.getElementById('clear-data');

if (loggedInUser) {
    commentFormContainer.style.display = 'block';
    loginPrompt.style.display = 'none';
    ratingSection.style.display = 'block';

    // Показуємо кнопку "Очистити" лише для адміну
    const token = localStorage.getItem('token');
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role === 'admin') {
    clearDataButton.style.display = 'block';
    } else {
    clearDataButton.style.display = 'none';
    }
} else {
    commentFormContainer.style.display = 'none';
    loginPrompt.style.display = 'block';
    ratingSection.style.display = 'none';
    clearDataButton.style.display = 'none';
}

loadComments();
updateAverageRating();
});

// Завантаження коментарів з сервера
async function loadComments() {
try {
    const response = await fetch(`${apiUrl}/comments?film_id=${filmId}`);
    if (!response.ok) {
    console.error('Failed to load comments:', response.status, response.statusText);
    return;
    }
    const comments = await response.json();
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = '';

    if (comments.length === 0) {
    commentsList.innerHTML = '<p>No comments yet</p>';
    } else {
    comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.classList.add('comment');
        commentElement.innerHTML = `
        <p><strong>${comment.user}</strong></p>
        <p>${comment.text}</p>
        <hr>
        `;
        commentsList.appendChild(commentElement);
    });
    }
} catch (error) {
    console.error('Error loading comments:', error);
}
}

// Обробка форми додавання коментаря
document.getElementById('submit-comment').addEventListener('click', async function (e) {
e.preventDefault();
const commentText = document.getElementById('comment-text').value;
const token = localStorage.getItem('token');

if (!commentText || !token) {
    console.error('Comment text or token is missing');
    return;
}

const response = await fetch(`${apiUrl}/comments`, {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ filmId: filmId, text: commentText })
});

if (response.ok) {
    document.getElementById('comment-text').value = '';
    loadComments();
} else {
    const errorData = await response.json();
    console.error('Failed to submit comment:', errorData.error);
}
});

// Обробка рейтингу
document.getElementById('submit-rating').addEventListener('click', async function () {
const rating = parseInt(document.getElementById('rating').value);
const token = localStorage.getItem('token');

const response = await fetch(`${apiUrl}/ratings`, {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ filmId: filmId, rating: rating })
});

if (response.ok) {
    updateAverageRating();
    hideRatingForm();
} else {
    console.error('Failed to submit rating');
}
});

// Оновлення середнього рейтингу
async function updateAverageRating() {
try {
    const response = await fetch(`${apiUrl}/ratings/average?film_id=${filmId}`);
    if (!response.ok) {
    console.error('Failed to load average rating');
    return;
    }
    const data = await response.json();
    const average = data.average_rating ? Number(data.average_rating).toFixed(2) : '0.00';

    document.getElementById('average-rating').textContent = `Рейтинг: ${average}`;
} catch (error) {
    console.error('Error loading average rating:', error);
}
}

function hideRatingForm() {
document.querySelector('.rating-section').style.display = 'none';
}

// Додавання події для кнопки очищення даних
document.getElementById('clear-data').addEventListener('click', async function () {
console.log('Очистити дані натиснуто');
const token = localStorage.getItem('token');
console.log('Token:', token); 
const response = await fetch(`${apiUrl}/clear`, {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ filmId: filmId })  
});

if (response.ok) {
    console.log('Дані очищені');
    loadComments();
    updateAverageRating();
} else {
    console.error('Failed to clear data');
}
});