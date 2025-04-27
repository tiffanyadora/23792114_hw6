# store/urls.py
from django.urls import path
from .views import (
    home, product_detail, search, add_product_form,
    add_product_api, update_product_api, delete_product_api, 
    add_review_api, update_review_api, delete_review_api,
    get_cart, add_to_cart, update_cart_item, remove_from_cart, checkout
)
from .api_views import (
    api_products, api_product_detail, api_pokemon_data, api_weather_data,
)

urlpatterns = [
    path('', home, name='home'),
    path('products/<int:product_id>/', product_detail, name='product_detail'),
    path('products/', product_detail, name='product_detail_legacy'), # This is legacy   
    path('search/', search, name='search'),
    path('products/form/', add_product_form, name='add_product_form'),
    
    # CRUD API endpoints - Products & Reviews
    path('api/products/add/', add_product_api, name='add_product_api'),
    path('api/products/<int:product_id>/update/', update_product_api, name='update_product_api'),
    path('api/products/<int:product_id>/delete/', delete_product_api, name='delete_product_api'),
    path('api/reviews/add/', add_review_api, name='add_review_api'),
    path('api/reviews/<int:review_id>/update/', update_review_api, name='update_review_api'),
    path('api/reviews/<int:review_id>/delete/', delete_review_api, name='delete_review_api'),
    
    # Product details API endpoints
    path('api/products/', api_products, name='api_products'),
    path('api/products/<str:product_id>/', api_product_detail, name='api_product_detail'),
    path('api/pokemon/<str:pokemon_name>/', api_pokemon_data, name='api_pokemon_data'),
    path('api/weather/<str:city_name>/', api_weather_data, name='api_weather_data'),

    # CRUD API endpoints - Cart
    path('api/cart/', get_cart, name='get_cart'),
    path('api/cart/add/', add_to_cart, name='add_to_cart'),
    path('api/cart/update/<int:item_id>/', update_cart_item, name='update_cart_item'),
    path('api/cart/remove/<int:item_id>/', remove_from_cart, name='remove_from_cart'),
    path('api/checkout/', checkout, name='checkout'),
]