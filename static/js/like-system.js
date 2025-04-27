// like-system.js (using localstorage)
document.addEventListener('DOMContentLoaded', function() {
    initializeLikeSystem();
});

function getProductIdFromElement() {
    // Try to get from data attribute first (most reliable)
    const productDetails = document.querySelector('.product-details');
    if (productDetails && productDetails.dataset.productId) {
        return productDetails.dataset.productId;
    }
    
    // Fall back to URL if needed
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || window.location.pathname.split('/').filter(Boolean).pop();
}

function toggleLike(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const productId = getProductIdFromElement();
    
    if (!productId) {
        console.error('Could not determine product ID');
        return;
    }
    
    if (isProductLiked(productId)) {
        // Unlike
        unlikeProduct(productId);
        button.innerHTML = '<i class="fa-regular fa-heart"></i>';
        button.classList.remove('liked');
    } else {
        // Like
        likeProduct(productId);
        button.innerHTML = '<i class="fa-solid fa-heart"></i>';
        button.classList.add('liked');
    }
}

function likeProduct(productId) {
    const likedProducts = getLikedProducts();
    likedProducts.push(productId);
    localStorage.setItem('likedProducts', JSON.stringify(likedProducts));
}

function unlikeProduct(productId) {
    let likedProducts = getLikedProducts();
    likedProducts = likedProducts.filter(id => id !== productId);
    localStorage.setItem('likedProducts', JSON.stringify(likedProducts));
}

function isProductLiked(productId) {
    const likedProducts = getLikedProducts();
    return likedProducts.includes(productId);
}

function getLikedProducts() {
    const likedProducts = localStorage.getItem('likedProducts');
    return likedProducts ? JSON.parse(likedProducts) : [];
}

function initializeLikeSystem() {
    // Initialize like buttons
    const likeButtons = document.querySelectorAll('.favorite-btn');
    
    likeButtons.forEach(button => {
        const productId = getProductIdFromElement();
        
        if (!productId) {
            console.error('Could not determine product ID');
            return;
        }
        
        // Show the button
        button.classList.remove('d-none');
        
        // Check if product is already liked
        if (isProductLiked(productId)) {
            button.innerHTML = '<i class="fa-solid fa-heart"></i>';
            button.classList.add('liked');
        } else {
            button.innerHTML = '<i class="fa-regular fa-heart"></i>';
            button.classList.remove('liked');
        }
        
        // Remove existing event listeners (important!)
        button.removeEventListener('click', toggleLike);
        
        // Add click event
        button.addEventListener('click', toggleLike);
    });
}