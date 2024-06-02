const apiUrl = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (loggedInUser) {
        showAccountSection(loggedInUser);
    }
});

document.getElementById('loginButton').addEventListener('click', async function() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ login: username, password: password })
    });

    const data = await response.json();

    if (response.status === 200) {
        localStorage.setItem('loggedInUser', username);
        localStorage.setItem('token', data.token);
        showAccountSection(username);
        clearMessages();
    } else {
        document.getElementById('messageContainer').textContent = data.error || 'Неправильний логін або пароль';
    }
});

document.getElementById('registerButton').addEventListener('click', async function() {
    const newUsername = document.getElementById('newUsername').value;
    const newPassword = document.getElementById('newPassword').value;
    const name = document.getElementById('name').value;

    const response = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, login: newUsername, password: newPassword })
    });

    const data = await response.json();

    if (response.status === 201) {
        document.getElementById('registerMessageContainer').textContent = 'Реєстрація успішна. Тепер ви можете увійти.';
        document.getElementById('register-form').reset();
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('welcome-text').style.display = 'block';
        document.getElementById('register-prompt').style.display = 'block';
        clearMessages();
    } else {
        document.getElementById('registerMessageContainer').textContent = data.error || 'Помилка реєстрації';
    }
});

document.getElementById('logoutButton').addEventListener('click', function() {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('token');
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('account-section').style.display = 'none';
    document.getElementById('welcome-text').style.display = 'block';
    document.getElementById('register-prompt').style.display = 'block';
    clearMessages();
});

document.getElementById('showRegisterForm').addEventListener('click', function() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('welcome-text').style.display = 'none';
    document.getElementById('register-prompt').style.display = 'none';
    clearMessages();
});

function showAccountSection(username) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('welcome-text').style.display = 'none';
    document.getElementById('register-prompt').style.display = 'none';
    document.getElementById('account-section').style.display = 'block';
    document.getElementById('unique-element').textContent = `Ви зараз в акаунті, ${username}`;
    clearMessages();
}

function clearMessages() {
    document.getElementById('messageContainer').textContent = '';
    document.getElementById('registerMessageContainer').textContent = '';
}
