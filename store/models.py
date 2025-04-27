from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Q
from django.conf import settings

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Categories"
        
class Product(models.Model):
    """
    Product model for storing product information
    """
    name = models.CharField(max_length=255)
    description = models.TextField()
    feature = models.TextField(blank=True, null=True)
    rating = models.FloatField(
        default=0.0, 
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    pokemon = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
        
    def to_json(self):
        """Convert product to JSON serializable dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'feature': self.feature,
            'rating': float(self.rating),
            'price': float(self.price),
            'category': self.category.name,
            'pokemon': self.pokemon,
            'location': self.location,
            'image': self.get_primary_image_name()
        }
        
    def get_primary_image_name(self):
        """Get the primary image filename for this product"""
        visual = self.visuals.first()
        if visual:
            return f"{visual.short_name}.{visual.file_type}"
        return "default.jpg"
    
    def get_features_list(self):
        """Split the feature string into a list of features"""
        if not self.feature:
            return []
        return [f.strip() for f in self.feature.split(',')]
    
    @classmethod
    def search(cls, query=None, category=None, min_price=None, max_price=None, min_rating=None):
        """
        Search products with filters
        """
        products = cls.objects.all()
        
        # Filter by query (search in name and description)
        if query:
            products = products.filter(
                Q(name__icontains=query) | 
                Q(description__icontains=query)
            )
        
        # Apply other filters
        if category:
            products = products.filter(category__name=category)
        
        if min_price is not None:
            products = products.filter(price__gte=min_price)
        
        if max_price is not None:
            products = products.filter(price__lte=max_price)
        
        if min_rating is not None:
            products = products.filter(rating__gte=min_rating)
        
        return products
        
    @classmethod
    def suggest_similar(cls, query):
        """
        Find similar products based on name similarity when no exact matches found
        Returns products with partial word matches sorted by relevance
        """
        if not query:
            return cls.objects.none()
        
        # Break query into words for better matching
        query_words = query.lower().split()
        
        # Build a complex query to find products with similar names
        name_q = Q()
        
        # Match each word in the query
        for word in query_words:
            if len(word) > 2:  # Only match on words with more than 2 characters
                name_q |= Q(name__icontains=word)
        
        # Find products with similar names
        similar_products = cls.objects.filter(name_q)
        
        # If no matches found by name words, try fuzzy matching using trigrams
        if not similar_products.exists() and len(query) > 3:
            # Find products where at least part of the name matches
            for i in range(len(query) - 2):
                trigram = query[i:i+3].lower()
                if len(trigram) == 3:
                    similar_products |= cls.objects.filter(name__icontains=trigram)
        
        # Sort by relevance - products whose names start with the query should appear first
        result_list = list(similar_products)
        result_list.sort(key=lambda p: (not p.name.lower().startswith(query.lower()), p.name))
        
        # Return top suggestions (limit to avoid overwhelming the user)
        return result_list[:8]

class VisualContent(models.Model):
    """
    VisualContent model for storing product images and other visual content
    """
    name = models.CharField(max_length=255)
    description = models.TextField()
    short_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)
    css_class = models.CharField(max_length=50, default='product-image')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='visuals')
    
    def __str__(self):
        return f"{self.name} ({self.product.name})"
        
    def get_html(self, css_override=None):
        """Return an HTML <img> tag for the visual content"""
        css_class = css_override if css_override else self.css_class
        return f'<img class="{css_class}" alt="{self.description}" src="/static/images/{self.short_name}.{self.file_type}">'
    
    def to_json(self):
        """Convert visual content to JSON serializable dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'short_name': self.short_name,
            'file_type': self.file_type,
            'css_class': self.css_class,
            'product_id': self.product.id,
            'img_url': f"/static/images/{self.short_name}.{self.file_type}"
        }

class Review(models.Model):
    """
    Review model for product reviews
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    username = models.CharField(max_length=100)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Review for {self.product.name} by {self.username}"
    
    def to_json(self):
        """Convert review to JSON serializable format"""
        return {
            'id': self.id,
            'product_id': self.product.id,
            'username': self.username,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat(),
            'product_rating': self.product.rating
    }

class Cart(models.Model):
    """
    Cart model for storing user shopping carts
    """
    # Will be linked to User model in future
    session_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Cart {self.id} - {self.session_id}"
    
    @property
    def total_price(self):
        """Calculate total price of items in cart"""
        return sum(item.subtotal for item in self.items.all())

class CartItem(models.Model):
    """
    CartItem model for storing items in a cart
    """
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    size = models.CharField(max_length=10, blank=True, null=True)  # For apparel
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.quantity}x {self.product.name} in Cart {self.cart.id}"
    
    @property
    def subtotal(self):
        """Calculate subtotal for this cart item"""
        return self.product.price * self.quantity

class Order(models.Model):
    """
    Order model for completed purchases
    """
    ORDER_STATUS = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled')
    )
    
    # Will be linked to User model in future
    session_id = models.CharField(max_length=255)
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    shipping_address = models.TextField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=ORDER_STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Order {self.id} - {self.full_name}"

class OrderItem(models.Model):
    """
    OrderItem model for items in an order
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product_name = models.CharField(max_length=255)  # Store name in case product is deleted
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at time of purchase
    quantity = models.PositiveIntegerField(default=1)
    size = models.CharField(max_length=10, blank=True, null=True)
    
    def __str__(self):
        return f"{self.quantity}x {self.product_name} in Order {self.order.id}"
    
    @property
    def subtotal(self):
        """Calculate subtotal for this order item"""
        return self.price * self.quantity