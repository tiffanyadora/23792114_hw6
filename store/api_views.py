# store/api_views.py

import os
import logging
import requests
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Product, VisualContent, Category, Review, Cart, CartItem, Product, Order, OrderItem

logger = logging.getLogger(__name__)
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY')

def api_products(request):
    """Fetch all products"""
    try:
        products = Product.get_all()
        return JsonResponse({
            'success': True,
            'products': [p.to_json() for p in products]
        })
    except Exception as e:
        logger.error(f"Failed to fetch products: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def api_product_detail(request, product_id):
    """Fetch product detail by ID"""
    try:
        # Use Django's get_object_or_404
        product = get_object_or_404(Product, id=product_id)
        
        # Get visual content using filter rather than a custom method
        visuals = VisualContent.objects.filter(product=product)
        
        # Prepare the response data
        response_data = {
            'success': True,
            'product': {
                'id': product.id,
                'name': product.name,
                'description': product.description,
                'price': float(product.price),
                'rating': float(product.rating),
                'category': product.category.name if product.category else None,
                'feature': product.feature,
                'pokemon': product.pokemon,
                'location': product.location,
            },
            'visuals': [{
                'id': v.id,
                'name': v.name,
                'description': v.description,
                'short_name': v.short_name,
                'file_type': v.file_type
            } for v in visuals]
        }
        
        # Fetch pokemon data if available
        if product.pokemon:
            try:
                pokemon_data = _fetch_pokemon(product.pokemon)
                if pokemon_data.get('success'):
                    response_data['pokemon'] = pokemon_data
            except Exception as e:
                logger.error(f"Failed to fetch Pokemon data: {e}")
                # Don't fail the whole request if Pokemon data fails
        
        # Fetch weather data if available
        if product.location:
            try:
                weather_data = _fetch_weather(product.location)
                if weather_data.get('success'):
                    response_data['weather'] = weather_data
            except Exception as e:
                logger.error(f"Failed to fetch Weather data: {e}")
                # Don't fail the whole request if Weather data fails
        
        return JsonResponse(response_data)
        
    except Exception as e:
        logger.error(f"Failed to fetch product {product_id}: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def api_pokemon_data(request, pokemon_name):
    """Fetch Pokemon data"""
    try:
        return JsonResponse(_fetch_pokemon(pokemon_name))
    except ValueError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Pokemon API error: {e}")
        return JsonResponse({'success': False, 'error': 'Pokemon data error'}, status=500)

def api_weather_data(request, city_name):
    """Fetch weather data"""
    try:
        return JsonResponse(_fetch_weather(city_name))
    except ValueError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return JsonResponse({'success': False, 'error': 'Weather data error'}, status=500)

# --- Helper functions ---

def _fetch_pokemon(name):
    """Helper to get Pokemon data"""
    url = f"https://pokeapi.co/api/v2/pokemon/{name.lower()}"
    resp = requests.get(url, timeout=5)
    
    if resp.status_code == 404:
        raise ValueError(f"Pokemon '{name}' not found")
    resp.raise_for_status()
    
    data = resp.json()
    return {
        'success': True,
        'name': data.get('name', '').capitalize(),
        'sprite': data.get('sprites', {}).get('front_default', ''),
        'types': [t['type']['name'].capitalize() for t in data.get('types', [])],
        'height': data.get('height', 0),
        'weight': data.get('weight', 0),
        'stats': {s['stat']['name']: s['base_stat'] for s in data.get('stats', [])}
    }

def _fetch_weather(city):
    """Helper to get weather data"""
    if not OPENWEATHER_API_KEY:
        raise EnvironmentError("OpenWeather API key not configured")

    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"
    resp = requests.get(url, timeout=5)

    if resp.status_code == 404:
        raise ValueError(f"City '{city}' not found")
    resp.raise_for_status()

    data = resp.json()
    temp_c = data['main']['temp']
    temp_f = temp_c * 9 / 5 + 32

    return {
        'success': True,
        'city': data.get('name', city),
        'temperature_celsius': temp_c,
        'temperature_fahrenheit': temp_f,
        'condition': data['weather'][0]['main'],
        'description': data['weather'][0]['description'],
        'icon': data['weather'][0]['icon'],
        'icon_url': f"https://openweathermap.org/img/wn/{data['weather'][0]['icon']}@2x.png",
        'humidity': data['main']['humidity'],
        'wind_speed': data['wind']['speed'],
        'timestamp': data['dt']
    }

def search_api(request):
    """API endpoint for searching products with filters"""
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
    
    # Search products with filters
    results = Product.search(query, category, min_price, max_price, min_rating)
    
    # If no results, suggest similar products
    suggestions = []
    if query and not results.exists():
        suggestions = Product.suggest_similar(query)
    
    # Format the response
    results_data = [product.to_json() for product in results]
    suggestions_data = [product.to_json() for product in suggestions]
    
    return JsonResponse({
        'results': results_data,
        'suggestions': suggestions_data,
        'query': query
    })