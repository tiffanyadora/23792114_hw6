// comment-system.js (legacy using localstorage)
function initializeCommentSystem() {
    const commentForm = document.getElementById('review-form');
    const commentsList = document.getElementById('reviews-list');
    
    // Get product ID consistently
    const getProductId = () => {
        // Try to get from data attribute first (most reliable)
        const productDetails = document.querySelector('.product-details');
        if (productDetails && productDetails.dataset.productId) {
            return productDetails.dataset.productId;
        }
        
        // Fall back to URL if needed
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id') || window.location.pathname.split('/').filter(Boolean).pop();
    };
    
    const productId = getProductId();
    
    if (!productId) {
        console.error('Could not determine product ID');
        return;
    }

    // Load existing comments for this product
    const loadComments = () => {
        const allComments = JSON.parse(localStorage.getItem('productComments') || '{}');
        const productComments = allComments[productId] || [];

        commentsList.innerHTML = productComments.map(comment => `
            <div class="comment mb-3 p-3 border">
                <div class="comment-header d-flex justify-between">
                    <h4 class="username">${comment.username}</h4>
                    <div class="rating">
                        ${[...Array(parseInt(comment.rating))].map(() => 
                            '<i class="fa-solid fa-star text-warning"></i>'
                        ).join('')}
                    </div>
                </div>
                <p class="comment-text mt-2">${comment.text}</p>
                <small class="text-muted">${new Date(comment.timestamp).toLocaleString()}</small>
            </div>
        `).join('');
    };

    // Remove existing event listeners first
    if (commentForm) {
        const newCommentForm = commentForm.cloneNode(true);
        commentForm.parentNode.replaceChild(newCommentForm, commentForm);
        
        // Submit comment
        newCommentForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const rating = document.getElementById('rating').value;
            const commentText = document.getElementById('comment-text').value;

            const newComment = {
                username,
                rating,
                text: commentText,
                timestamp: new Date().toISOString()
            };

            // Load existing comments
            const allComments = JSON.parse(localStorage.getItem('productComments') || '{}');
            
            // Add new comment to product-specific comments
            if (!allComments[productId]) {
                allComments[productId] = [];
            }
            allComments[productId].push(newComment);

            // Save back to localStorage
            localStorage.setItem('productComments', JSON.stringify(allComments));

            // Reset form
            newCommentForm.reset();

            // Reload comments
            loadComments();
        });
    }

    // Initial load of comments
    loadComments();
}

// Replace DOMContentLoaded event with this
document.addEventListener('DOMContentLoaded', () => {
    initializeCommentSystem();
});