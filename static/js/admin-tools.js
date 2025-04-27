// admin-tools.js - Implements admin tools functionality for product management

document.addEventListener('DOMContentLoaded', function() {
    // Setup Edit Product button handler
    const editProductBtn = document.getElementById('edit-product-btn');
    if (editProductBtn) {
        editProductBtn.addEventListener('click', function() {
            const productId = document.querySelector('.product-details').dataset.productId;
            if (!productId) {
                console.error('Product ID not found');
                return;
            }
            
            // Show the product form modal for editing
            openProductModal(true, productId);
        });
    }
    
    // Setup Delete Product button handler
    const deleteProductBtn = document.getElementById('delete-product-btn');
    if (deleteProductBtn) {
        deleteProductBtn.addEventListener('click', async function() {
            const productId = this.dataset.productId;
            if (!productId) {
                console.error('Product ID not found');
                return;
            }
            
            if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
                try {
                    const result = await ProductAPI.deleteProduct(productId);
                    
                    if (result.success) {
                        showNotification('Product deleted successfully!');
                        // Redirect to home page after deletion
                        window.location.href = '/';
                    } else {
                        showNotification(`Error: ${result.error || 'Failed to delete product'}`, 'error');
                    }
                } catch (error) {
                    showNotification('An error occurred during deletion', 'error');
                    console.error('Delete error:', error);
                }
            }
        });
    }
    
    // Admin tools button to open the modal for adding new products
    const adminToolsBtn = document.getElementById('admin-tools');
    if (adminToolsBtn) {
        adminToolsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openProductModal(false);
        });
    }
    
    // Close modal functionality
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            closeProductModal();
        });
    }
    
    // Cancel button in the form
    const cancelBtn = document.querySelector('.cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            closeProductModal();
        });
    }
    
    // Product form submission
    const productForm = document.getElementById('product-submission-form');
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const isEdit = this.dataset.editMode === 'true';
            const productId = this.dataset.productId;
            
            // Collect form data
            const formData = {
                name: this.elements.name.value,
                description: this.elements.description.value,
                features: this.elements.features.value,
                price: parseFloat(this.elements.price.value),
                rating: parseFloat(this.elements.rating.value || 0),
                category: this.elements.category.value,
                pokemon: this.elements.pokemon?.value || '',
                location: this.elements.location?.value || '',
                imageName: this.elements.imageName?.value || 'default.jpg'
            };
            
            try {
                let result;
                
                if (isEdit) {
                    result = await ProductAPI.updateProduct(productId, formData);
                    if (result.success) {
                        showNotification('Product updated successfully!');
                        // Reload the page to see the updated product
                        window.location.reload();
                    }
                } else {
                    result = await ProductAPI.addProduct(formData);
                    if (result.success) {
                        showNotification('Product added successfully!');
                        // Redirect to the new product page
                        window.location.href = `/products/${result.product_id}/`;
                    }
                }
                
                if (!result.success) {
                    showNotification(`Error: ${result.error || 'Operation failed'}`, 'error');
                }
            } catch (error) {
                showNotification('An error occurred', 'error');
                console.error('Form submission error:', error);
            }
        });
    }
    
    // Function to open product modal
    async function openProductModal(isEdit = false, productId = null) {
        const modal = document.getElementById('product-submission-modal');
        const form = document.getElementById('product-submission-form');
        
        if (!modal || !form) return;
        
        // Clear previous data
        form.reset();
        
        // Set form mode
        form.dataset.editMode = isEdit.toString();
        if (productId) {
            form.dataset.productId = productId;
        } else {
            delete form.dataset.productId;
        }
        
        // Update modal title
        const modalTitle = modal.querySelector('h2');
        if (modalTitle) {
            modalTitle.textContent = isEdit ? 'Edit Product' : 'Add New Product';
        }
        
        // Fetch product data if in edit mode
        if (isEdit && productId) {
            try {
                // Get the product details from the page
                const nameElement = document.querySelector('.product-info h1');
                const priceElement = document.querySelector('.product-price');
                const descriptionElement = document.querySelector('.product-description p');
                const ratingElement = document.querySelector('.product-rating span');
                const categoryElement = document.querySelector('.breadcrumb ol li:nth-child(2) a');
                
                // Get features list
                const featuresList = Array.from(document.querySelectorAll('.features-list li')).map(li => {
                    return li.innerText.replace(/\s*✓\s*/, '').trim();
                }).join(', ');
                
                // Populate form fields with existing data
                if (nameElement) form.elements.name.value = nameElement.textContent.trim();
                if (priceElement) form.elements.price.value = parseFloat(priceElement.textContent.replace('$', ''));
                if (descriptionElement) form.elements.description.value = descriptionElement.textContent.trim();
                if (ratingElement) form.elements.rating.value = parseFloat(ratingElement.textContent.trim());
                if (categoryElement) {
                    const categoryName = categoryElement.textContent.trim();
                    const categoryOption = Array.from(form.elements.category.options).find(option => option.value === categoryName);
                    if (categoryOption) categoryOption.selected = true;
                }
                
                form.elements.features.value = featuresList;
            
            } catch (error) {
                console.error('Error populating form:', error);
                showNotification('Error loading product data', 'error');
            }
        }
        
        // Show the modal
        modal.style.display = 'block';
    }
    
    // Function to close product modal
    function closeProductModal() {
        const modal = document.getElementById('product-submission-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // Notification function
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Add show class after a brief delay for transition effect
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('product-submission-modal');
        if (modal && event.target === modal) {
            closeProductModal();
        }
    });
});