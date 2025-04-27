# WildcatWear
### By: Tiffany Adora (23792114)

WildcatWear is an e-commerce website selling University of Arizona merchandise, built with Django for the backend and HTML/CSS/JavaScript on the frontend. The focus of this assignment is to migrate all the files from previously CSV to a **PostgreSQL** database. All the legacy features are replaced.

This is a continuation of the WildcatWear-website project.

## Getting Started

### Prerequisites
- Python 3.8+
- PostgreSQL
- OpenWeather API key (for weather functionality)

### How to Set up

1. Clone the repository
   ```bash
   git clone [repository-url]
   cd wildcatwear
   ```

2. Set up a virtual environment
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate
   
   # Linux/Mac
   python -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

4. Configure the database
   - Create a `.env` file in the project root with the following variables:
     ```
     DB_NAME=wildcatwear_db
     DB_USER=your_username
     DB_PASSWORD=your_password
     DB_HOST=localhost
     DB_PORT=5432
     OPENWEATHER_API_KEY=your_api_key_here
     ```

5. Create the PostgreSQL database
   ```bash
   # Login to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE wildcatwear_db;
   ```

   Notes : If you're getting  "connection timeout expired" error when trying to connect to your PostGreSQL server

   You can:
   - Go to Windows Run (windows + R)
   - Type in "services.msc"
   - Find the Postgresql service, right click and manually start it

   Then open pgAdmin to start the database server

6. Apply migrations
   ```bash
   python manage.py migrate
   ```

7. Migrate data from CSV to PostgreSQL
   ```bash
   python data_migration.py
   ```
8. **Resets the primary key counters** for the tables in the store app
   ```bash
   python manage.py sqlsequencereset store | python manage.py dbshell
   ```

9. Collect static files
   ```bash
   python manage.py collectstatic
   ```
   When prompted, type "Yes" to copy all static files.

10. Run the server
      ```bash
      python manage.py runserver
      ```

11. Access the site at: http://127.0.0.1:8000/

## Testing CRUD Operations

### Products
- **Create** -> Click "Add Product" in the navbar (left), add new products, then click "Submit."
   - Try adding "Wilbur T-Shirt" with image name "T-Shirt-2.jpg"
   - Try adding "Red & White UA Cap" with image name "cap.jpg"

- **Read** -> Browse products on the homepage and product detail pages, and see that all information and descriptions are loaded.
- **Update** -> Click any product card, go to the product detail page, click "Edit Product," make changes, and click "Submit."
- **Delete** -> Click any product card, go to the product detail page, click "Delete Product," and click "Ok" for confirmation.

### Shopping Cart
- **Add** -> Click "Add to Cart" button on product pages to add items.
- **View** -> Click the Shopping Cart icon in the navbar (right) to open the cart dropdown and view all added items.
- **Update** -> Adjust quantities (+/-) in the cart dropdown modal.
- **Delete** -> Remove items from the cart by clicking the "x" beside each item.
- **Checkout** -> Click the "Checkout" button in the modal, fill in your details, and click "Complete Purchase" to create an order and clear the cart.

### Product Reviews
- **Create** -> Add new reviews on product detail pages in the "Write a Review" section.
- **Read** -> View existing or newly added reviews below the section.
- **Update** -> Edit your reviews by clicking the pencil icon beside each review, edit data, then "Update Review."
- **Delete** -> Remove reviews by clicking the trash icon beside each review and clicking "Ok" for confirmation.

### Also try
- Search product in the navbar and sort by 3 fields (Name, Price, Rating) ascending or descending.
- Visit different product pages to check if related product suggestions appear
-- Recommendations are based on product name/category (e.g., Cap will recommend other Caps)


## Current Project Structure

```bash
wildcatwear/
|
├── static/                     # Static Files
|   ├── data/                     # CSV data files      
|   |   ├── product.csv           # Product information (Name, Desc, Price, etc.)
|   |   ├── visualcontent.csv     # Visual content information (ID, Name, File type,etc)
|   ├── css/        
|   |   ├── store.css               # Product page styles
|   |   ├── style.css               # Site-wide style
|   |   ├── utility-styles.css      # Utility classes
|   ├── js/                         # JavaScript files
│   │   ├── admin-tools.js          # Admin tools functionality
│   │   ├── api-service.js          # JavaScript for API interactions
│   │   ├── cart-manager.js         # Cart functionality
│   │   ├── product-data.js         # CSV parsing and data handling (legacy)
│   │   ├── product-api.js          # Product CRUD features
│   │   ├── product-navigation.js   # Navigation to product page
│   │   ├── review-system.js        # User Review system
│   │   ├── search.js               # Live search functionality
│   │   ├── sorting.js              # Product sorting
│   │   ├── comment-system.js       # Product comments (legacy)
│   │   └── like-system.js          # Product likes/favorites
|   ├── images/                     # Images assets
|
├── store/                      # Main application
|   ├── migrations/             # Django migrations

|   ├── templates/              # HTML templates
|   |   ├── index.html          # Home page template
|   |   ├── search.html         # Search results template
|   |   ├── store.html          # Product details template
|   |   ├── admin-tools.html    # Admin tools template
|   |
|   ├── templatetags/           # Custom template tags
|   |   ├── custom_filters.py   # Custom filters for template
|   |
|   ├── api_views.py            # API endpoint implementations
|   ├── models.py               # Data Model
|   ├── views.py                # page view handlers
|   ├── urls.py                 # App URL Routing
|   ├── tests.py                # Test script
|
├── wildcatwear/                # Project configuration
|   ├── settings.py             # Django settings  
|   ├── urls.py                 # Project URL Routing
|   ├── wsgi.py, asgi.py        # WSGI & ASGI config
|
├── data_migration.py           # Data Migration script
├── manage.py                   # Django management script
├── db.sqlite3                  # SQLite database (not used)
```