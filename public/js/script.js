// public/js/script.js

document.addEventListener('DOMContentLoaded', () => {
    const bookDjBtn = document.getElementById('book-dj-btn');
    const bookingFormPopup = document.getElementById('booking-form-popup');
    const closePopupBtn = document.getElementById('close-popup');
    const followDjBtn = document.getElementById('follow-dj-btn');

    if (bookDjBtn && bookingFormPopup && closePopupBtn) {
        bookDjBtn.addEventListener('click', () => {
            bookingFormPopup.style.display = 'block';
        });

        closePopupBtn.addEventListener('click', () => {
            bookingFormPopup.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === bookingFormPopup) {
                bookingFormPopup.style.display = 'none';
            }
        });
    }

    if (followDjBtn) {
        followDjBtn.addEventListener('click', () => {
            const username = followDjBtn.getAttribute('data-username');
            fetch(`/follow_dj/${username}`, {
                method: 'POST'
            }).then(() => {
                location.reload();
            }).catch(err => console.error('Error following/unfollowing DJ:', err));
        });
    }
});
