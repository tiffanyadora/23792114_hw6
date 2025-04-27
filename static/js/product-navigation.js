// product-navigation.js - Handles all navigation within the website's pages

// Store the current page content to avoid full reloads
let currentPageContent = '';
let isHomePage = true;

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded - setting up navigation');
  
  // Save the initial page content
  currentPageContent = document.body.innerHTML;
  
  // Determine if we're on the home page or product detail page
  isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html';
  console.log('Is home page:', isHomePage);
  
  // Add event listeners to product cards for dynamic navigation
  setupProductNavigation();
  console.log('Navigation setup complete');
  
  // Add event listener to logo for returning to home
  const logo = document.querySelector('.logo-container');
  if (logo) {
    logo.addEventListener('click', function(e) {
      e.preventDefault();
      if (!isHomePage) {
        navigateToHome();
      }
    });
  }
});

// Setup product navigation for all product cards
function setupProductNavigation() {
  // Get all product cards on the page
  const productCards = document.querySelectorAll('.product-card, .suggestion-card');
  console.log(`Found ${productCards.length} product cards to attach events to`);
  
  // Add click event to each product card
  productCards.forEach(card => {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Product card clicked:', this);
      
      // Get product ID from data attribute or href
      let productId = this.getAttribute('data-product-id');
      console.log('Data product ID:', productId);
      
      if (!productId) {
        // Try to extract from href
        const href = this.getAttribute('href');
        console.log('Href attribute:', href);
        
        if (href) {
          // Check for /products/123/ pattern
          const matches = href.match(/\/products\/(\d+)\//);
          console.log('URL pattern matches:', matches);
          
          if (matches && matches[1]) {
            productId = matches[1];
          } else {
            // Try query params
            const urlParams = new URLSearchParams(href.split('?')[1] || '');
            productId = urlParams.get('product_id') || urlParams.get('id');
          }
        }
      }
      
      console.log('Final product ID:', productId);
      
      if (productId) {
        navigateToProduct(productId);
      } else {
        console.error('Could not determine product ID from element:', this);
      }
    });
  });
}

// Navigate to product detail page
function navigateToProduct(productId) {
  console.log("Navigating to product:", productId);
  
  // Make sure productId is properly formatted
  productId = productId.toString().trim();
  
  // Use the correct URL format
  const url = `/products/${productId}/`;
  console.log("Fetching URL:", url);
  
  // Direct browser navigation
  window.location.href = url;
  
  // AJAX navigation (legacy):
  /*
  fetch(url)
    .then(response => {
      console.log("Fetch response:", response);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      console.log("Received HTML, updating page");
      document.body.innerHTML = html;
      history.pushState({productId: productId}, '', url);
      isHomePage = false;
      setupProductNavigation();
      
      // Re-initialize any other functionality
      if (typeof window.loadProductDetails === 'function') {
        setTimeout(() => window.loadProductDetails(productId), 50);
      }
    })
    .catch(error => {
      console.error('Error navigating to product:', error);
      // Fallback to traditional navigation
      window.location.href = url;
    });
  */
}

// Update product detail content without page reload
function updateProductDetail(productId) {
  // Get product data
  const product = getProductById(productId);
  if (!product) {
    console.error('Product not found:', productId);
    return;
  }
  
  // Format product for display
  const formattedProduct = formatProductForDisplay(product);
  
  // Update product details in the DOM
  document.querySelector('.product-details h1').textContent = formattedProduct.name;
  document.querySelector('.product-price').textContent = '$' + formattedProduct.price;
  document.querySelector('.product-rating span').textContent = formattedProduct.rating;
  document.querySelector('.product-description p').textContent = formattedProduct.description;
  
  // Update product image
  const imageElement = document.querySelector('.product-image img');
  if (imageElement) {
    imageElement.src = '/static/images/' + formattedProduct.get_image_name();
    imageElement.alt = formattedProduct.name;
  }
  
  // Update features list
  const featuresContainer = document.querySelector('.features-list');
  if (featuresContainer) {
    featuresContainer.innerHTML = '';
    const features = formattedProduct.feature.split(',');
    
    features.forEach(feature => {
      const featureItem = document.createElement('li');
      featureItem.className = 'd-flex align-center gap-2 mb-2';
      featureItem.innerHTML = `<i class="fa-solid fa-check"></i> ${feature.trim()}`;
      featuresContainer.appendChild(featureItem);
    });
  }
  
  // Update star ratings
  const ratingContainer = document.querySelector('.product-rating');
  if (ratingContainer) {
    // Remove existing stars
    ratingContainer.querySelectorAll('i').forEach(icon => icon.remove());
    
    // Add updated stars
    const starsHtml = generateStarRating(formattedProduct.rating);
    const span = ratingContainer.querySelector('span');
    ratingContainer.insertAdjacentHTML('afterbegin', starsHtml);
  }
  
  // Update breadcrumb
  const breadcrumbItem = document.querySelector('.breadcrumb li[aria-current="page"]');
  if (breadcrumbItem) {
    breadcrumbItem.textContent = formattedProduct.name;
  }
  
  // Show/hide size selector based on category
  const sizeSelector = document.querySelector('.size-selector');
  if (sizeSelector) {
    if (formattedProduct.category.toLowerCase() === 'apparel') {
      sizeSelector.style.display = 'block';
    } else {
      sizeSelector.style.display = 'none';
    }
  }
  
  // Update browser URL without reloading
  history.pushState({productId: productId}, '', '/products/?id=' + productId);
  
  // Update suggested products
  updateSuggestedProducts(productId);

  // After updating the content, reinitialize systems
  initializeCommentSystem();
  initializeLikeSystem();
}

// Update suggested products section
function updateSuggestedProducts(currentProductId) {
  const suggestionsGrid = document.querySelector('.suggestions-grid');
  if (!suggestionsGrid) return;
  
  // Clear current suggestions
  suggestionsGrid.innerHTML = '';
  
  // Get all products except current one
  const otherProducts = productsData.filter(p => p.ID !== currentProductId);
  
  // Randomly select up to 4 products
  const suggested = [];
  const numSuggestions = Math.min(4, otherProducts.length);
  
  // Create a copy of the array to avoid modifying the original
  const productsCopy = [...otherProducts];
  
  for (let i = 0; i < numSuggestions; i++) {
      const randomIndex = Math.floor(Math.random() * productsCopy.length);
      suggested.push(productsCopy[randomIndex]);
      productsCopy.splice(randomIndex, 1);
  }
  
  // Add suggested products to the grid
  suggested.forEach(product => {
      const formattedProduct = formatProductForDisplay(product);
      const cardElement = document.createElement('a');
      
      cardElement.href = `/products/?id=${formattedProduct.product_id}`;
      cardElement.className = 'suggestion-card';
      cardElement.setAttribute('data-product-id', formattedProduct.product_id);
      
      cardElement.innerHTML = `
          <img src="/static/images/${formattedProduct.get_image_name()}" alt="${formattedProduct.name}">
          <h3 class="py-2 px-3 m-0">${formattedProduct.name}</h3>
          <p class="price pt-0 pb-3 pl-3 m-0">$${formattedProduct.price}</p>
      `;
      
      // Add click event for dynamic navigation with explicit product ID
      cardElement.addEventListener('click', function(e) {
          e.preventDefault();
          const pid = formattedProduct.product_id;
          navigateToProduct(pid);
      });
      
      suggestionsGrid.appendChild(cardElement);
  });
}

// Navigate back to home page
function navigateToHome() {
  fetch('/')
    .then(response => response.text())
    .then(html => {
      // Update page content
      document.body.innerHTML = html;
      
      // Update browser URL without reloading
      history.pushState({}, '', '/');
      
      // Update page state
      isHomePage = true;
      
      // Reinitialize event listeners
      setupProductNavigation();
      
      // Reinitialize admin tools
      const adminToolsBtn = document.getElementById('admin-tools');
      if (adminToolsBtn) {
        adminToolsBtn.addEventListener('click', function(e) {
          e.preventDefault();
          const modal = document.getElementById('product-submission-modal');
          modal.style.display = 'block';
        });
      }
    })
    .catch(error => {
      console.error('Error navigating to home:', error);
      // Fallback to traditional navigation if fetch fails
      window.location.href = '/';
    });
}

// Helper function to generate star rating HTML
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let starsHtml = '';
  
  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="fa-solid fa-star"></i>';
  }
  
  // Add half star if needed
  if (hasHalfStar) {
    starsHtml += '<i class="fa-solid fa-star-half-alt"></i>';
  }
  
  return starsHtml;
}

// Handle browser back/forward navigation
window.addEventListener('popstate', function(event) {
  if (event.state && event.state.productId) {
    // Navigate to product
    navigateToProduct(event.state.productId);
  } else {
    // Navigate to home
    navigateToHome();
  }
});

// Also ensure window popstate handles API data loading
window.addEventListener('popstate', function(event) {
  if (event.state && event.state.productId) {
      // Navigate to product and ensure API data loads
      navigateToProduct(event.state.productId);
  } else {
      // Navigate to home
      navigateToHome();
  }
});