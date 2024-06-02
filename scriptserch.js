document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const directorCards = document.querySelectorAll('.director-card');

    searchInput.addEventListener('input', () => {
        const searchText = searchInput.value.toLowerCase();

        directorCards.forEach(card => {
            const directorName = card.querySelector('h2').textContent.toLowerCase();
            if (directorName.includes(searchText)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
});