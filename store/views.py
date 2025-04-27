# store/views.py

import random
import os
import requests
import logging
import json
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.shortcuts import render, get_object_or_404, redirect
from django.http import Http404
from django.db import models
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from .models import Product, VisualContent, Category, Review, Cart, CartItem, Product, Order, OrderItem

# Setup logging
logger = logging.getLogger(__name__)

# OpenWeather API Key
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY')

def home(request):
    category_name = request.GET.get('category', None)
    
    # Get all categories with their associated images
    categories = {}
    for category in Category.objects.all():
        # Default images for categories
        default_images = {
            "Apparel": "t-shirt.jpg",
            "Accessories": "cap.jpg",
            "Gifts": "keychain.jpg"
        }
        categories[category.name] = default_images.get(category.name, "flag.jpg")

    # Query products from database
    if category_name:
        # ORM Query: Get products by category
        # Equivalent SQL Query:
        # SELECT * FROM store_product WHERE category_id IN 
        # (SELECT id FROM store_category WHERE name = %s)
        products = Product.objects.filter(category__name=category_name)
    else:
        # ORM Query: Get all products
        # Equivalent SQL Query:
        # SELECT * FROM store_product
        products = Product.objects.all()

    return render(request, 'index.html', {
        'categories': categories,
        'products': products,
        'selected_category': category_name
    })


def product_detail(request, product_id=None):
    # Use the request parameter if not explicitly provided
    if not product_id:
        product_id = request.GET.get('id')
    
    if not product_id:
        raise Http404("Product ID missing")
    
    # ORM Query: Get product by ID
    # Equivalent SQL Query:
    # SELECT * FROM store_product WHERE id = %s
    product = get_object_or_404(Product, id=product_id)
    
    # ORM Query: Get visuals for a product
    # Equivalent SQL Query:
    # SELECT * FROM store_visualcontent WHERE product_id = %s
    visuals = VisualContent.objects.filter(product=product)

    # ORM Query: Get all products except current
    # Equivalent SQL Query:
    # SELECT * FROM store_product WHERE id != %s
    # Get all products except the current product
    all_products = Product.objects.exclude(id=product_id)

    # Recommendation products features:
    suggested_products = []

    # 1. First try to find products with similar names
    if product.name:
        # Split the product name into words for matching
        name_words = product.name.lower().split()
        
        # Create a Q object for name matching
        name_q = Q()
        
        # Add each word from the name to our query
        for word in name_words:
            if len(word) > 3:  # Only match on words with more than 3 characters to avoid common words
                name_q |= Q(name__icontains=word)
        
        # Find products with similar names
        name_matches = all_products.filter(name_q)[:3]
        suggested_products.extend(name_matches)
    
    # Keep track of already suggested product IDs to avoid duplicates
    suggested_ids = [p.id for p in suggested_products]

    # 2. If we need more products, look for products in the same category
    if len(suggested_products) < 4:
        category_matches = all_products.filter(category=product.category).exclude(
            id__in=suggested_ids
        )[:4-len(suggested_products)]
        suggested_products.extend(category_matches)
        # Update our list of suggested IDs
        suggested_ids = [p.id for p in suggested_products]
        
    # 3. If we still need more, look for products with similar Pokemon
    if len(suggested_products) < 4 and product.pokemon:
        # Find products with the same Pokemon type
        pokemon_matches = all_products.filter(
            pokemon__icontains=product.pokemon
        ).exclude(
            id__in=suggested_ids
        )[:4-len(suggested_products)]
        
        suggested_products.extend(pokemon_matches)
        # Update our list of suggested IDs
        suggested_ids = [p.id for p in suggested_products]

    # If we still don't have 4 products, fill with random products
    if len(suggested_products) < 4:
        remaining_products = all_products.exclude(
            id__in=suggested_ids
        )
        
        # If we have remaining products, randomly select what we need
        if remaining_products.exists():
            # Convert queryset to list for random sampling
            remaining_list = list(remaining_products)
            # Calculate how many more products we need
            needed = 4 - len(suggested_products)
            # Randomly sample the needed number of products
            random_picks = random.sample(remaining_list, min(needed, len(remaining_list)))
            suggested_products.extend(random_picks)
    
    #  At most 4 suggested products
    suggested_products = suggested_products[:4]

    # Split features into a list
    product_features = product.get_features_list()

    # Get Pokemon data (server-side API call)
    pokemon_data = None
    if product.pokemon:
        try:
            pokemon_response = requests.get(f"https://pokeapi.co/api/v2/pokemon/{product.pokemon.lower()}")
            if pokemon_response.status_code == 200:
                pokemon_json = pokemon_response.json()
                pokemon_data = {
                    'name': pokemon_json.get('name', '').capitalize(),
                    'sprite': pokemon_json.get('sprites', {}).get('front_default', ''),
                    'types': [t.get('type', {}).get('name', '').capitalize() for t in pokemon_json.get('types', [])],
                }
        except Exception as e:
            logger.error(f"Error fetching Pokemon data: {str(e)}")

    # ORM Query: Get reviews for this product
    # Equivalent SQL Query:
    # SELECT * FROM store_review WHERE product_id = %s ORDER BY created_at DESC
    reviews = Review.objects.filter(product=product).order_by('-created_at')

    return render(request, 'store.html', {
        'product': product,
        'visuals': visuals,
        'suggested_products': suggested_products,
        'product_features': product_features,
        'pokemon_data': pokemon_data,
        'reviews': reviews,
    })


def search(request):
    query = request.GET.get('query', '').strip()
    category = request.GET.get('category', None)
    min_price = request.GET.get('min_price', None)
    max_price = request.GET.get('max_price', None)
    min_rating = request.GET.get('min_rating', None)
    
    # Convert string parameters to appropriate types
    if min_price:
        try:
            min_price = float(min_price)
        except ValueError:
            min_price = None
            
    if max_price:
        try:
            max_price = float(max_price)
        except ValueError:
            max_price = None
            
    if min_rating:
        try:
            min_rating = float(min_rating)
        except ValueError:
            min_rating = None
    
    if not query and not category and not min_price and not max_price and not min_rating:
        return render(request, 'search.html', {
            'results': [],
            'query': None,
            'categories': Category.objects.all()
        })
    
    # Search products with filters
    results = Product.search(query, category, min_price, max_price, min_rating)
    
    # If no results, suggest similar products
    suggestions = []
    if query and not results.exists():
        suggestions = Product.suggest_similar(query)
    
    return render(request, 'search.html', {
        'results': results,
        'query': query,
        'suggestions': suggestions,
        'categories': Category.objects.all(),
        'category': category,
        'min_price': min_price,
        'max_price': max_price,
        'min_rating': min_rating
    })

@csrf_exempt
def add_product_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Get or create category
            category, _ = Category.objects.get_or_create(name=data.get('category'))
            
            # ORM Query: Create new product
            # Equivalent SQL Query:
            # INSERT INTO store_product (name, description, feature, rating, price, category_id, pokemon, location, created_at, updated_at)
            # VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            product = Product.objects.create(
                name=data.get('name'),
                description=data.get('description'),
                feature=data.get('features'),
                rating=float(data.get('rating', 0)),
                price=float(data.get('price', 0)),
                category=category,
                pokemon=data.get('pokemon', ''),
                location=data.get('location', '')
            )
            
            # Add visual content
            image_name = data.get('imageName', '').split('.')
            
            # ORM Query: Create new visual content
            # Equivalent SQL Query:
            # INSERT INTO store_visualcontent (name, description, short_name, file_type, css_class, product_id)
            # VALUES (%s, %s, %s, %s, %s, %s)
            VisualContent.objects.create(
                name=data.get('name'),
                description=data.get('description'),
                short_name=image_name[0],
                file_type=image_name[1] if len(image_name) > 1 else 'jpg',
                css_class='product-image',
                product=product
            )
            
            return JsonResponse({'success': True, 'product_id': product.id})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@csrf_exempt
def update_product_api(request, product_id):
    if request.method == 'PUT':
        try:
            product = get_object_or_404(Product, id=product_id)
            data = json.loads(request.body)
            
            # Update category if provided
            if 'category' in data:
                category, _ = Category.objects.get_or_create(name=data['category'])
                product.category = category
            
            # Update other fields if provided
            for field in ['name', 'description', 'feature', 'pokemon', 'location']:
                if field in data:
                    setattr(product, field, data[field])
            
            # Update numeric fields with validation
            if 'price' in data:
                product.price = float(data['price'])
            
            if 'rating' in data:
                product.rating = min(5.0, max(0.0, float(data['rating'])))
            
            # ORM Query: Save the updated product
            # Equivalent SQL Query:
            # UPDATE store_product SET name=%s, description=%s, ... WHERE id=%s
            product.save()
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@csrf_exempt
def delete_product_api(request, product_id):
    if request.method == 'DELETE':
        try:
            product = get_object_or_404(Product, id=product_id)
            
            # ORM Query: Delete product (cascades to visuals due to relationship)
            # Equivalent SQL Query:
            # DELETE FROM store_product WHERE id=%s
            product.delete()
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@csrf_exempt
def add_review_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            product_id = data.get('product_id')
            
            product = get_object_or_404(Product, id=product_id)
            
            # ORM Query: Create new review
            # Equivalent SQL Query:
            # INSERT INTO store_review (product_id, username, rating, comment, created_at)
            # VALUES (%s, %s, %s, %s, NOW())
            review = Review.objects.create(
                product=product,
                username=data.get('username'),
                rating=int(data.get('rating')),
                comment=data.get('comment')
            )
            
            # Update product rating
            # ORM Query: Calculate average rating
            # Equivalent SQL Query:
            # SELECT AVG(rating) FROM store_review WHERE product_id=%s
            avg_rating = Review.objects.filter(product=product).aggregate(models.Avg('rating'))['rating__avg']
            if avg_rating:
                product.rating = avg_rating
                product.save()
            
            return JsonResponse({'success': True, 'review': review.to_json()})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@csrf_exempt
def update_review_api(request, review_id):
    if request.method != 'PUT':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        review = get_object_or_404(Review, id=review_id)
        
        # Simple authentication check - match username
        if review.username != data.get('username'):
            return JsonResponse({'success': False, 'error': 'Username does not match'}, status=403)
        
        # Update review fields
        if 'rating' in data:
            review.rating = int(data.get('rating'))
        
        if 'comment' in data:
            review.comment = data.get('comment')
        
        # Save the updated review
        review.save()
        
        # Update product rating
        product = review.product
        avg_rating = Review.objects.filter(product=product).aggregate(models.Avg('rating'))['rating__avg']
        if avg_rating:
            product.rating = avg_rating
            product.save()
        
        return JsonResponse({'success': True, 'review': review.to_json()})
    
    except Exception as e:
        logger.error(f"Error updating review: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
def delete_review_api(request, review_id):
    if request.method != 'DELETE':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        review = get_object_or_404(Review, id=review_id)
        
        # Simple authentication check from request body
        data = json.loads(request.body)
        if review.username != data.get('username'):
            return JsonResponse({'success': False, 'error': 'Username does not match'}, status=403)
        
        # Get product before deleting review for rating update
        product = review.product
        
        # Delete the review
        review.delete()
        
        # Update product rating
        avg_rating = Review.objects.filter(product=product).aggregate(models.Avg('rating'))['rating__avg']
        if avg_rating:
            product.rating = avg_rating
        else:
            # If no reviews left, set rating to 0
            product.rating = 0
        product.save()
        
        return JsonResponse({'success': True})
    
    except Exception as e:
        logger.error(f"Error deleting review: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

def _get_cart(session_id):
    """
    Get or create a cart for the given session ID
    
    # ORM Query:
    cart, created = Cart.objects.get_or_create(session_id=session_id)
    
    # Equivalent SQL:
    # SELECT * FROM store_cart WHERE session_id = %s LIMIT 1;
    # If not found:
    # INSERT INTO store_cart (session_id, created_at, updated_at) VALUES (%s, NOW(), NOW());
    """
    cart, created = Cart.objects.get_or_create(session_id=session_id)
    if created:
        logger.info(f"Created new cart for session {session_id}")
    return cart

@csrf_exempt
def get_cart(request):
    """Get the current cart items for a session"""
    session_id = request.session.session_key
    if not session_id:
        request.session.create()
        session_id = request.session.session_key
    
    cart = _get_cart(session_id)
    
    # ORM Query: Get all cart items with product details
    # Equivalent SQL Query:
    # SELECT ci.*, p.name, p.price 
    # FROM store_cartitem ci
    # JOIN store_product p ON ci.product_id = p.id
    # WHERE ci.cart_id = %s;
    cart_items = []
    for item in cart.items.all():
        product = item.product
        cart_items.append({
            'id': item.id,
            'product_id': product.id,
            'name': product.name,
            'price': float(product.price),
            'quantity': item.quantity,
            'size': item.size,
            'subtotal': float(item.subtotal),
            'image': product.get_primary_image_name()
        })
    
    return JsonResponse({
        'cart_id': cart.id,
        'total': float(cart.total_price),
        'items': cart_items
    })

@csrf_exempt
def add_to_cart(request):
    """Add an item to the cart"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        quantity = int(data.get('quantity', 1))
        size = data.get('size')
        
        # Validate product exists
        product = get_object_or_404(Product, id=product_id)
        
        # Get or create cart
        session_id = request.session.session_key
        if not session_id:
            request.session.create()
            session_id = request.session.session_key
        
        cart = _get_cart(session_id)
        
        # ORM Query: Get cart item if exists in cart
        # Equivalent SQL Query:
        # SELECT * FROM store_cartitem 
        # WHERE cart_id = %s AND product_id = %s AND (size = %s OR (size IS NULL AND %s IS NULL));
        existing_item = cart.items.filter(
            product=product,
            size=size
        ).first()
        
        if existing_item:
            # ORM Query: Update cart item quantity
            # Equivalent SQL Query:
            # UPDATE store_cartitem SET quantity = quantity + %s WHERE id = %s;
            existing_item.quantity += quantity
            existing_item.save()
            logger.info(f"Updated cart item quantity: {existing_item.id}")
            item = existing_item
        else:
            # ORM Query: Create new cart item
            # Equivalent SQL Query:
            # INSERT INTO store_cartitem (cart_id, product_id, quantity, size, created_at) 
            # VALUES (%s, %s, %s, %s, NOW());
            item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=quantity,
                size=size
            )
            logger.info(f"Added new item to cart: {item.id}")
        
        return JsonResponse({
            'success': True,
            'item_id': item.id,
            'cart_total': float(cart.total_price)
        })
    
    except Exception as e:
        logger.error(f"Error adding to cart: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
def update_cart_item(request, item_id):
    """Update cart item quantity"""
    if request.method != 'PUT':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        quantity = int(data.get('quantity', 1))
        
        # ORM Query: Get cart item
        # Equivalent SQL Query:
        # SELECT * FROM store_cartitem WHERE id = %s;
        item = get_object_or_404(CartItem, id=item_id)
        
        # Verify session owns this cart item
        session_id = request.session.session_key
        if item.cart.session_id != session_id:
            return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
        
        if quantity <= 0:
            # Delete item if quantity is 0 or less
            # ORM Query: Delete cart item
            # Equivalent SQL Query:
            # DELETE FROM store_cartitem WHERE id = %s;
            item.delete()
            logger.info(f"Deleted cart item: {item_id}")
        else:
            # ORM Query: Update cart item quantity
            # Equivalent SQL Query:
            # UPDATE store_cartitem SET quantity = %s WHERE id = %s;
            item.quantity = quantity
            item.save()
            logger.info(f"Updated cart item quantity: {item_id}")
        
        cart = item.cart
        return JsonResponse({
            'success': True,
            'cart_total': float(cart.total_price)
        })
    
    except Exception as e:
        logger.error(f"Error updating cart item: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
def remove_from_cart(request, item_id):
    """Remove an item from the cart"""
    if request.method != 'DELETE':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        # ORM Query: Get cart item
        # Equivalent SQL Query:
        # SELECT * FROM store_cartitem WHERE id = %s;
        item = get_object_or_404(CartItem, id=item_id)
        
        # Verify session owns this cart item
        session_id = request.session.session_key
        if item.cart.session_id != session_id:
            return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
        
        cart = item.cart
        
        # ORM Query: Delete cart item
        # Equivalent SQL Query:
        # DELETE FROM store_cartitem WHERE id = %s;
        item.delete()
        logger.info(f"Removed item from cart: {item_id}")
        
        return JsonResponse({
            'success': True,
            'cart_total': float(cart.total_price)
        })
    
    except Exception as e:
        logger.error(f"Error removing from cart: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
def checkout(request):
    """Process checkout and create an order"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        session_id = request.session.session_key
        
        # Get the cart
        cart = _get_cart(session_id)
        
        # Verify cart has items
        if not cart.items.exists():
            return JsonResponse({'success': False, 'error': 'Cart is empty'}, status=400)
        
        # Create order
        # ORM Query: Create order
        # Equivalent SQL Query:
        # INSERT INTO store_order (session_id, full_name, email, shipping_address, total_amount, status, created_at, updated_at) 
        # VALUES (%s, %s, %s, %s, %s, 'pending', NOW(), NOW());
        order = Order.objects.create(
            session_id=session_id,
            full_name=data.get('full_name'),
            email=data.get('email'),
            shipping_address=data.get('shipping_address'),
            total_amount=cart.total_price,
            status='pending'
        )
        
        # Create order items for each cart item
        # ORM Query: Get all cart items
        # Equivalent SQL Query:
        # SELECT * FROM store_cartitem WHERE cart_id = %s;
        for cart_item in cart.items.all():
            # ORM Query: Create order item
            # Equivalent SQL Query:
            # INSERT INTO store_orderitem (order_id, product_name, product_id, price, quantity, size) 
            # VALUES (%s, %s, %s, %s, %s, %s);
            OrderItem.objects.create(
                order=order,
                product_name=cart_item.product.name,
                product=cart_item.product,
                price=cart_item.product.price,
                quantity=cart_item.quantity,
                size=cart_item.size
            )
        
        # Clear the cart
        # ORM Query: Delete all cart items
        # Equivalent SQL Query:
        # DELETE FROM store_cartitem WHERE cart_id = %s;
        cart.items.all().delete()
        logger.info(f"Created order {order.id} and cleared cart")
        
        return JsonResponse({
            'success': True,
            'order_id': order.id
        })
    
    except Exception as e:
        logger.error(f"Error processing checkout: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


def add_product_form(request):
    """Renders only the product form HTML for modal display"""
    # Get all categories for the form dropdown
    categories = Category.objects.all()
    return render(request, 'product_form.html', {
        'categories': categories,
        'is_edit': False
    })