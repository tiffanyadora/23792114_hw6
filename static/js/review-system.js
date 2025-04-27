// review-system.js - Handles product review submission, display, editing and deletion

class ReviewSystem {
    constructor() {
        this.reviewForm = document.getElementById('review-form');
        this.reviewsList = document.getElementById('reviews-list');
        this.productId = this.reviewForm ? this.reviewForm.dataset.productId : null;
        this.isEditing = false;
        this.currentReviewId = null;
        this.originalFormValues = null;

        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            if (this.reviewForm) {
                // Initialize form event listeners
                this.initFormEventListeners();
                
                // Initialize review list event listeners for edit/delete
                this.initReviewListEventListeners();
                
                // Initialize star rating system
                this.initializeRatingStars();
                
                // Add cancel button for edit mode
                this.setupCancelButton();
            }
            
            console.log('ReviewSystem initialized');
        });
    }

    initFormEventListeners() {
        // Handle review form submit
        this.reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submit triggered');
            
            if (this.isEditing) {
                this.submitEditReview();
            } else {
                this.submitNewReview();
            }
        });
    }

    initReviewListEventListeners() {
        // Handle edit and delete buttons on existing reviews
        if (this.reviewsList) {
            this.reviewsList.addEventListener('click', (e) => {
                // Edit button clicked
                if (e.target.classList.contains('edit-review-btn') || 
                    e.target.closest('.edit-review-btn')) {
                    const reviewElement = e.target.closest('.review');
                    const reviewId = reviewElement.dataset.reviewId;
                    this.startEditingReview(reviewId, reviewElement);
                }
                
                // Delete button clicked
                if (e.target.classList.contains('delete-review-btn') || 
                    e.target.closest('.delete-review-btn')) {
                    const reviewElement = e.target.closest('.review');
                    const reviewId = reviewElement.dataset.reviewId;
                    this.confirmDeleteReview(reviewId, reviewElement);
                }
            });
        }
    }

    setupCancelButton() {
        const submitBtn = this.reviewForm.querySelector('button[type="submit"]');
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary cancel-edit-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.display = 'none';
        cancelBtn.addEventListener('click', () => this.cancelEditing());
        submitBtn.parentNode.insertBefore(cancelBtn, submitBtn);
    }

    initializeRatingStars() {
        const ratingInputs = document.querySelectorAll('.rating-input input');
        const ratingLabels = document.querySelectorAll('.rating-input label');
        
        // Add hover effects to rating stars
        ratingLabels.forEach((label, index) => {
            label.addEventListener('mouseenter', () => {
                // Highlight current star and all stars before it
                for (let i = 0; i <= index; i++) {
                    ratingLabels[i].classList.add('hover');
                }
            });
            
            label.addEventListener('mouseleave', () => {
                // Remove hover effect when mouse leaves
                ratingLabels.forEach(label => label.classList.remove('hover'));
            });
        });
        
        // Add click handler to rating inputs
        ratingInputs.forEach((input, index) => {
            input.addEventListener('change', () => {
                // Reset all selected stars
                ratingLabels.forEach(label => label.classList.remove('selected'));
                
                // Highlight stars up to the selected one
                for (let i = 0; i <= index; i++) {
                    ratingLabels[4-i].classList.add('selected');
                }
            });
        });
    }

    submitNewReview() {
        const formData = new FormData(this.reviewForm);
        const username = formData.get('username').trim();
        const rating = formData.get('rating');
        const comment = formData.get('comment').trim();
        
        // Validate form data
        if (!username || !rating || !comment) {
            alert('Please fill out all fields');
            return;
        }
        
        // Prepare data for API
        const data = {
            product_id: this.productId,
            username: username,
            rating: rating,
            comment: comment
        };
        
        // Submit review to API
        fetch('/api/reviews/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Add the new review to the list
                this.addReviewToList(data.review);
                // Reset form
                this.reviewForm.reset();
                // Remove "no reviews" message if it exists
                const noReviews = this.reviewsList.querySelector('.no-reviews');
                if (noReviews) {
                    noReviews.remove();
                }
            } else {
                console.error('Error submitting review:', data.error);
                alert('Error submitting review: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while submitting your review.');
        });
    }
    
    startEditingReview(reviewId, reviewElement) {
        // Store review ID being edited
        this.currentReviewId = reviewId;
        this.isEditing = true;

        // Get review data from the review element
        const username = reviewElement.querySelector('.review-header h4').textContent;
        const rating = reviewElement.querySelectorAll('.rating .fa-star').length || 
                      reviewElement.querySelector('.rating').textContent.split('★').length - 1;
        const comment = reviewElement.querySelector('.review-content p').textContent;

        // Store original form values to revert back if canceled
        this.storeOriginalFormValues();

        // Update form with review data
        const usernameInput = document.getElementById('username');
        const commentInput = document.getElementById('review-text') || document.getElementById('comment');
        const ratingInputs = document.querySelectorAll('.rating-input input');

        usernameInput.value = username;
        commentInput.value = comment;
        
        // Set the correct rating star
        for (let i = 0; i < ratingInputs.length; i++) {
            if (ratingInputs[i].value == rating) {
                ratingInputs[i].checked = true;
                break;
            }
        }

        // Update form appearance for edit mode
        this.updateFormForEditMode(true);

        // Scroll to form
        this.reviewForm.scrollIntoView({ behavior: 'smooth' });
    }

    storeOriginalFormValues() {
        const usernameInput = document.getElementById('username');
        const commentInput = document.getElementById('review-text') || document.getElementById('comment');
        const ratingInput = document.querySelector('.rating-input input:checked');

        this.originalFormValues = {
            username: usernameInput.value,
            comment: commentInput.value,
            rating: ratingInput ? ratingInput.value : null
        };
    }

    updateFormForEditMode(isEditing) {
        const submitBtn = this.reviewForm.querySelector('button[type="submit"]');
        const cancelBtn = this.reviewForm.querySelector('.cancel-edit-btn');
        const formTitle = this.reviewForm.closest('.add-review').querySelector('h3');

        if (isEditing) {
            submitBtn.textContent = 'Update Review';
            cancelBtn.style.display = 'inline-block';
            if (formTitle) formTitle.textContent = 'Edit Your Review';
            
            // Disable username field when editing (as it's used for authorization)
            const usernameInput = document.getElementById('username');
            usernameInput.setAttribute('readonly', 'readonly');
        } else {
            submitBtn.textContent = 'Submit Review';
            cancelBtn.style.display = 'none';
            if (formTitle) formTitle.textContent = 'Write a Review';
            
            // Re-enable username field
            const usernameInput = document.getElementById('username');
            usernameInput.removeAttribute('readonly');
        }
    }

    cancelEditing() {
        // Reset form to original values
        if (this.originalFormValues) {
            const usernameInput = document.getElementById('username');
            const commentInput = document.getElementById('review-text') || document.getElementById('comment');
            const ratingInputs = document.querySelectorAll('.rating-input input');

            usernameInput.value = this.originalFormValues.username;
            commentInput.value = this.originalFormValues.comment;
            
            if (this.originalFormValues.rating) {
                for (let i = 0; i < ratingInputs.length; i++) {
                    ratingInputs[i].checked = ratingInputs[i].value === this.originalFormValues.rating;
                }
            } else {
                // Clear all ratings
                ratingInputs.forEach(input => input.checked = false);
            }
        }

        // Reset edit mode
        this.isEditing = false;
        this.currentReviewId = null;
        this.originalFormValues = null;
        this.updateFormForEditMode(false);
    }

    submitEditReview() {
        const username = document.getElementById('username').value.trim();
        const commentInput = document.getElementById('review-text') || document.getElementById('comment');
        const comment = commentInput.value.trim();
        const ratingInput = document.querySelector('.rating-input input:checked');
        const rating = ratingInput ? ratingInput.value : null;
        const reviewId = this.currentReviewId;

        // Validate form
        if (!username || !comment || !rating) {
            alert('Please fill out all fields');
            return;
        }

        // Prepare data for API
        const data = {
            username: username,
            comment: comment,
            rating: rating
        };

        // Send update to API
        fetch(`/api/reviews/${reviewId}/update/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the review in the UI
                this.updateReviewInUI(reviewId, data.review);
                // Reset form
                this.cancelEditing();
                // Reset form values
                this.reviewForm.reset();
            } else {
                console.error('Error updating review:', data.error);
                alert('Error updating review: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while updating the review.');
        });
    }

    updateReviewInUI(reviewId, reviewData) {
        const reviewElement = document.querySelector(`.review[data-review-id="${reviewId}"]`);
        if (reviewElement) {
            // Update the username
            const usernameElement = reviewElement.querySelector('.review-header h4');
            if (usernameElement) {
                usernameElement.textContent = reviewData.username;
            }

            // Update the rating stars
            const ratingElement = reviewElement.querySelector('.rating');
            if (ratingElement) {
                let starsHTML = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= reviewData.rating) {
                        starsHTML += '★';
                    } else {
                        starsHTML += '☆';
                    }
                }
                ratingElement.innerHTML = starsHTML;
            }

            // Update the review text
            const commentElement = reviewElement.querySelector('.review-content p');
            if (commentElement) {
                commentElement.textContent = reviewData.comment;
            }
        }
    }

    confirmDeleteReview(reviewId, reviewElement) {
        const username = reviewElement.querySelector('.review-header h4').textContent;
        
        if (confirm('Are you sure you want to delete this review?')) {
            this.deleteReview(reviewId, username);
        }
    }

    deleteReview(reviewId, username) {
        // Send delete request to API
        fetch(`/api/reviews/${reviewId}/delete/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove the review from the UI
                const reviewElement = document.querySelector(`.review[data-review-id="${reviewId}"]`);
                if (reviewElement) {
                    reviewElement.remove();
                    
                    // Check if there are no more reviews and add the "no reviews" message if needed
                    if (this.reviewsList.querySelectorAll('.review').length === 0) {
                        const noReviewsElement = document.createElement('div');
                        noReviewsElement.className = 'no-reviews';
                        noReviewsElement.innerHTML = '<p>This product hasn\'t been reviewed yet. Be the first to write a review!</p>';
                        this.reviewsList.appendChild(noReviewsElement);
                    }
                }
            } else {
                console.error('Error deleting review:', data.error);
                alert('Error deleting review: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while deleting the review.');
        });
    }
    
    addReviewToList(review) {
        // Create new review element
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review';
        reviewElement.dataset.reviewId = review.id;
        
        // Format date
        const date = new Date(review.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        // Generate stars HTML
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= review.rating) {
                starsHTML += '★';
            } else {
                starsHTML += '☆';
            }
        }
        
        // Set review HTML
        reviewElement.innerHTML = `
            <div class="review-header">
                <h4>${review.username}</h4>
                <div class="rating">${starsHTML}</div>
                <span class="review-date">${dateStr}</span>
                <div class="review-actions">
                    <button class="edit-review-btn" title="Edit review">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="delete-review-btn" title="Delete review">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="review-content">
                <p>${review.comment}</p>
            </div>
        `;
        
        // Add to the top of the reviews list
        this.reviewsList.insertBefore(reviewElement, this.reviewsList.firstChild);
    }
}

// Initialize the Review System
const reviewSystem = new ReviewSystem();