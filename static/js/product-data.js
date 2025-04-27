// Global variables to store product and visual content data (legacy using Papaparse & CSV)
let productsData = [];
let visualsData = [];

// Function to load CSV data
// Load CSV data from static/data
async function loadCSVData() {
  try {    
    const productResponse = await fetch('/static/data/product.csv');
    const productCSV = await productResponse.text();
    
    const visualResponse = await fetch('/static/data/visualcontent.csv');
    const visualCSV = await visualResponse.text();
    
    // Parse CSV with PapaParse
    Papa.parse(productCSV, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        productsData = results.data.filter(p => p.ID && !isNaN(p.ID));
        console.log('Products loaded:', productsData.length);
      }
    });

    Papa.parse(visualCSV, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        visualsData = results.data.filter(v => v.ID && !isNaN(v.ID));
        console.log('Visuals loaded:', visualsData.length);
      }
    });

    return true;
  } catch (error) {
    console.error('Error loading CSV data:', error);
    return false;
  }
}

// Get the next available product ID
function getNextProductId() {
  if (productsData.length === 0) {
    return 1; // If no products exist, start from 1
  }
  const ids = productsData.map(product => parseInt(product.ID)).filter(id => !isNaN(id));
  console.log('Product IDs:', ids); // Debugging line to check IDs
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

// Get the next available visual ID
function getNextVisualId() {
  if (visualsData.length === 0) {
    return 1; // If no visuals exist, start from 1
  }
  const ids = visualsData.map(visual => parseInt(visual.ID)).filter(id => !isNaN(id));
  console.log('Visual IDs:', ids); // Debugging line to check IDs
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

// Add a new product to the data
function addNewProduct(productData) {
  const newProductId = getNextProductId(); // Get new ID
  productData.ID = newProductId.toString(); // Assign the new ID

  productsData.push(productData); // Add to local products array
  
  const newVisualId = getNextVisualId();
  console.log('New Visual ID:', newVisualId); // Debugging line to check new visual ID
  const imageParts = productData.imageName ? productData.imageName.split('.') : ['default', 'jpg'];
  
  const newVisual = {
    'ID': newVisualId,
    'Name': productData.Name,
    'Description': productData.Description,
    'Short Name': imageParts[0],
    'File Type': imageParts[1] || 'jpg',
    'CSS Class': 'product-image',
    'Product ID': newProductId.toString()
  };

  visualsData.push(newVisual); // Add to local visuals array
  
  // Send data to server to update CSV files
  fetch('/api/products/add/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken() // Function to get Django CSRF token from cookies
    },
    body: JSON.stringify({
      product: productData,
      visual: newVisual
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Server response:', data);
  })
  .catch(error => {
    console.error('Error saving product to server:', error);
  });
  
  return productData;
}

// Helper function to get CSRF token
function getCsrfToken() {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue;
}

// Convert our data format to match the Django model format
function formatProductForDisplay(product) {
  return {
    product_id: product.ID,
    name: product.Name,
    description: product.Description,
    feature: product.Feature,
    rating: parseFloat(product.Average_Rating),
    price: parseFloat(product.Price),
    category: product.Category,
    get_image_name: function() {
      const visual = visualsData.find(v => v['Product ID'] === this.product_id);
      return visual ? `${visual['Short Name']}.${visual['File Type']}` : '';
    }
  };
}

// Initialize data on page load
document.addEventListener('DOMContentLoaded', function() {
  loadCSVData();
});
