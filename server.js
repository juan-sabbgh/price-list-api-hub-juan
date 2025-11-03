const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { google } = require("googleapis");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
SHEET_ID = process.env.SPREEDSHEET_ID

const GOOGLE_SHEETS_CREDENTIALS = {
  "type": "service_account",
  "project_id": process.env.GOOGLE_PROJECT_ID,
  "private_key_id": process.env.GOOGLE_PRIVATE_KEY_ID,
  "private_key": process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  "client_email": process.env.GOOGLE_CLIENT_EMAIL,
  "client_id": process.env.GOOGLE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.GOOGLE_CLIENT_X509_CERT_URL,
  "universe_domain": "googleapis.com"
}
const MAGNO_ID_EMP = process.env.MAGNO_ID_EMP
const MAGNO_ID_EMP_G = process.env.MAGNO_ID_EMP_G
const MAGNO_SEARCH_URL = process.env.MAGNO_SEARCH_URL
const MAGNO_SEARCH_URL_NEW = process.env.MAGNO_SEARCH_URL_NEW

const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_SHEETS_CREDENTIALS, // archivo de cuenta de servicio
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function leerHoja() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Hoja 1!A1:C5",
  });

  console.log("Datos:", res.data.values);
}

async function obtenerNumeroFilas() {
  try {
    const spreadsheetId = SHEET_ID
    const sheetName = 'Hoja 1'
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}`,
    });

    const filas = response.data.values || [];
    return filas.length;

  } catch (error) {
    console.error('Error al obtener número de filas:', error);
    throw error;
  }
}

async function agregarFila(valores) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,        // ID de la hoja
    range: "Hoja 1!A:G",        // Rango (en qué columnas insertar)
    valueInputOption: "USER_ENTERED", // Usa USER_ENTERED para que respete formatos de Google Sheets
    insertDataOption: "INSERT_ROWS",  // Inserta nuevas filas
    requestBody: {
      values: [valores], // 👈 recibe un array con los datos de la fila
    },
  });

  //console.log("Fila añadida:", res.data.updates);
  return true
}

async function agregarFilaLlantas(especificaciones) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const today = new Date();
  const formattedDate = today.toLocaleDateString();

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,        // ID de la hoja
    range: "Llantas no encontradas!A:B",        // Rango (en qué columnas insertar)
    valueInputOption: "USER_ENTERED", // Usa USER_ENTERED para que respete formatos de Google Sheets
    insertDataOption: "INSERT_ROWS",  // Inserta nuevas filas
    requestBody: {
      values: [[especificaciones, formattedDate]], // 👈 recibe un array con los datos de la fila
    },
  });

  //console.log("Fila añadida:", res.data.updates);
  return true
}

async function obtenerNumeroFilasDemo() {
  try {
    const spreadsheetId = "1d2q5Uu8mIzg7PGqa-UkK9on6kkWP-TDKnNQ9k8y6K38"
    const sheetName = 'Hoja 1'
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}`,
    });

    const filas = response.data.values || [];
    return filas.length;

  } catch (error) {
    console.error('Error al obtener número de filas:', error);
    throw error;
  }
}

async function agregarFilaDemo(valores) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: "1d2q5Uu8mIzg7PGqa-UkK9on6kkWP-TDKnNQ9k8y6K38",        // ID de la hoja
    range: "Hoja 1!A:G",        // Rango (en qué columnas insertar)
    valueInputOption: "USER_ENTERED", // Usa USER_ENTERED para que respete formatos de Google Sheets
    insertDataOption: "INSERT_ROWS",  // Inserta nuevas filas
    requestBody: {
      values: [valores], // 👈 recibe un array con los datos de la fila
    },
  });

  //console.log("Fila añadida:", res.data.updates);
  return true
}

//leerHoja();

//testing google api


// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Global variable to store Excel data
let priceListData = [];

// Load Excel file
function loadExcelData() {
  try {
    // Use absolute path to ensure file can be found in Vercel environment
    const excelPath = path.join(__dirname, 'LISTA DE PRECIOS 25062025.xlsx');
    console.log('Attempting to load Excel file:', excelPath);

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON format
    priceListData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Successfully loaded ${priceListData.length} records`);
    console.log('Data sample:', priceListData.slice(0, 2));
    return true;
  } catch (error) {
    console.error('Failed to load Excel file:', error.message);
    console.error('Current working directory:', process.cwd());
    console.error('__dirname:', __dirname);

    // Try to list files in current directory
    try {
      const files = fs.readdirSync(process.cwd());
      console.error('Current directory files:', files.filter(f => f.includes('.xlsx')));
    } catch (fsError) {
      console.error('Cannot read directory:', fsError.message);
    }

    return false;
  }
}

// Load data on startup
//loadExcelData();

// Price formatting function - convert to integer
function formatPrice(price) {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return 0;
  return Math.round(numPrice); // Round to nearest integer
}

// Format product prices to integer
function formatProductPrices(product) {
  return {
    ...product,
    'Costo Uni Unitario': formatPrice(product['precioNeto']),
    'COSTO CON IVA': formatPrice(product['precioNeto']),
    'PRECIO FINAL': formatPrice(product['precioNeto'])
  };
}

// Tire specification parsing function
function parseTireSpecification(productName) {
  const name = String(productName || '').trim();

  // Tire specification parsing result
  const specs = {
    width: null,
    aspect_ratio: null,
    rim_diameter: null,
    type: null, // 'car' or 'truck'
    original: name
  };

  // Car tire format: 155 70 13 75T MIRAGE MR-166 AUTO
  // Format: width aspect_ratio diameter [other info]
  const carTirePattern = /^(\d{3})\s+(\d{2})\s+(\d{2})\s/;
  const carMatch = name.match(carTirePattern);

  if (carMatch) {
    specs.width = parseInt(carMatch[1]);
    specs.aspect_ratio = parseInt(carMatch[2]);
    specs.rim_diameter = parseInt(carMatch[3]);
    specs.type = 'car';
    return specs;
  }

  // New: Car tire format: 175 65 R15 84H SAFERICH FRC16
  // Format: width aspect_ratio R-diameter [other info]
  const carTireWithRPattern = /^(\d{3})\s+(\d{2})\s+R(\d{2})\s/;
  const carWithRMatch = name.match(carTireWithRPattern);

  if (carWithRMatch) {
    specs.width = parseInt(carWithRMatch[1]);
    specs.aspect_ratio = parseInt(carWithRMatch[2]);
    specs.rim_diameter = parseInt(carWithRMatch[3]);
    specs.type = 'car';
    return specs;
  }

  // Truck tire format: 1100 R22 T-2400 14/C
  // Format: width R-diameter [other info]
  const truckTirePattern = /^(\d{3,4})\s+R(\d{2})\s/;
  const truckMatch = name.match(truckTirePattern);

  if (truckMatch) {
    specs.width = parseInt(truckMatch[1]);
    specs.rim_diameter = parseInt(truckMatch[2]);
    specs.type = 'truck';
    return specs;
  }

  // Other possible tire formats
  // Format: 155/70R13, 155/70-13, 185/60 R15
  const standardPattern1 = /(\d{3})\/(\d{2})[-R](\d{2})/; // 155/70R13 or 155/70-13
  const standardMatch1 = name.match(standardPattern1);

  if (standardMatch1) {
    specs.width = parseInt(standardMatch1[1]);
    specs.aspect_ratio = parseInt(standardMatch1[2]);
    specs.rim_diameter = parseInt(standardMatch1[3]);
    specs.type = 'car';
    return specs;
  }

  // New: Format with space before R: 185/60 R15
  const standardPattern2 = /(\d{3})\/(\d{2})\s+R(\d{2})/; // 185/60 R15
  const standardMatch2 = name.match(standardPattern2);

  if (standardMatch2) {
    specs.width = parseInt(standardMatch2[1]);
    specs.aspect_ratio = parseInt(standardMatch2[2]);
    specs.rim_diameter = parseInt(standardMatch2[3]);
    specs.type = 'car';
    return specs;
  }

  // Additional: More flexible format matching
  const flexiblePattern = /(\d{3})\/(\d{2})\s*R?\s*(\d{2})/; // Very flexible matching
  const flexibleMatch = name.match(flexiblePattern);

  if (flexibleMatch) {
    specs.width = parseInt(flexibleMatch[1]);
    specs.aspect_ratio = parseInt(flexibleMatch[2]);
    specs.rim_diameter = parseInt(flexibleMatch[3]);
    specs.type = 'car';
    return specs;
  }

  return specs; // Unable to parse
}

// Root path
app.get('/', (req, res) => {
  res.json({
    message: 'API Hub - Price List Service',
    version: '2.0.0',
    description: 'API Integration Center - Price List Module',
    modules: {
      'price-list': {
        name: 'Price List API',
        endpoints: {
          '/api/price-list/health': 'GET - Health check',
          '/api/price-list/products': 'GET - Get all products',
          '/api/price-list/search': 'POST - Search products',
          '/api/price-list/tire-search': 'POST - Tire specification search',
          '/api/price-list/tire-search-es': 'POST - Tire specification search (Spanish)',
          '/api/price-list/tire-parse': 'POST - Tire specification parsing',
          '/api/price-list/product/:id': 'GET - Get product by ID',
          '/api/price-list/reload': 'POST - Reload Excel data'
        }
      }
    },
    usage: {
      input: 'query - Product ID or product name',
      output: 'producto - Complete product information'
    }
  });
});

// API module routing - Price list
app.get('/api/price-list', (req, res) => {
  res.json({
    module: 'Price List API',
    version: '2.0.0',
    endpoints: {
      '/api/price-list/health': 'GET - Health check',
      '/api/price-list/products': 'GET - Get all products',
      '/api/price-list/search': 'POST - Search products',
      '/api/price-list/tire-search': 'POST - Tire specification search',
      '/api/price-list/tire-search-es': 'POST - Tire specification search (Spanish)',
      '/api/price-list/tire-parse': 'POST - Tire specification parsing',
      '/api/price-list/product/:id': 'GET - Get product by ID',
      '/api/price-list/reload': 'POST - Reload Excel data'
    },
    dataFields: {
      'ID Producto': 'Product ID',
      'Producto': 'Product Name',
      'Costo Uni Unitario': 'Unit Cost',
      'Exit.': 'Stock',
      'COSTO CON IVA': 'Cost with Tax',
      'PRECIO FINAL': 'Final Price'
    }
  });
});

// Health check endpoint
app.get('/api/price-list/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dataLoaded: priceListData.length > 0,
    totalRecords: priceListData.length,
    module: 'price-list'
  });
});

// Get all products
app.get('/api/price-list/products', (req, res) => {
  // Format all product prices to integers
  const formattedData = priceListData.map(product => formatProductPrices(product));

  res.json({
    success: true,
    message: 'Successfully retrieved all products',
    module: 'price-list',
    data: formattedData,
    total: formattedData.length
  });
});

// Product search API - supports multi-parameter search
app.post('/api/price-list/search', (req, res) => {
  try {
    const {
      query,           // General search (product ID or name)
      productId,       // Exact product ID search
      productName,     // Product name search
      priceMin,        // Minimum price
      priceMax,        // Maximum price
      limit = 50       // Limit result count, default 50
    } = req.body;

    // At least one search condition is required
    if (!query && !productId && !productName && !priceMin && !priceMax) {
      return res.status(400).json({
        success: false,
        error: 'At least one search parameter is required',
        supportedParams: {
          query: 'General search (product ID or name)',
          productId: 'Exact product ID search',
          productName: 'Product name search',
          priceMin: 'Minimum price filter',
          priceMax: 'Maximum price filter',
          limit: 'Limit result count (default 50)'
        },
        examples: {
          basic: { query: "1100" },
          advanced: {
            productName: "tire",
            priceMin: 100,
            priceMax: 500,
            limit: 10
          },
          multiParam: {
            query: "CCCC",
            priceMin: 200
          }
        }
      });
    }

    let results = [...priceListData];

    // Apply search filters
    if (query) {
      const searchTerm = String(query).toLowerCase().trim();
      results = results.filter(item => {
        const idProducto = String(item['ID Producto'] || '').toLowerCase();
        const producto = String(item['Producto'] || '').toLowerCase();
        return idProducto.includes(searchTerm) || producto.includes(searchTerm);
      });
    }

    // Exact product ID search
    if (productId) {
      const searchId = String(productId).toLowerCase().trim();
      results = results.filter(item => {
        const idProducto = String(item['ID Producto'] || '').toLowerCase();
        return idProducto.includes(searchId);
      });
    }

    // Product name search
    if (productName) {
      const searchName = String(productName).toLowerCase().trim();
      results = results.filter(item => {
        const producto = String(item['Producto'] || '').toLowerCase();
        return producto.includes(searchName);
      });
    }

    // Price range filtering
    if (priceMin !== undefined || priceMax !== undefined) {
      results = results.filter(item => {
        const finalPrice = formatPrice(item['PRECIO FINAL']);
        let passesMin = true;
        let passesMax = true;

        if (priceMin !== undefined) {
          passesMin = finalPrice >= parseFloat(priceMin);
        }
        if (priceMax !== undefined) {
          passesMax = finalPrice <= parseFloat(priceMax);
        }

        return passesMin && passesMax;
      });
    }

    // Limit result count
    const limitNum = parseInt(limit) || 50;
    if (results.length > limitNum) {
      results = results.slice(0, limitNum);
    }

    // Sort: by price (optional)
    results.sort((a, b) => {
      const priceA = formatPrice(a['PRECIO FINAL']);
      const priceB = formatPrice(b['PRECIO FINAL']);
      return priceA - priceB;
    });

    // Format as unified Agent response format
    const searchQuery = query || productId || productName || `price ${priceMin || 0}-${priceMax || '∞'}`;

    // Raw data
    const rawData = {
      totalFound: results.length,
      searchQuery: searchQuery,
      results: results.slice(0, 10).map(item => {
        const formattedItem = formatProductPrices(item);
        return {
          id: formattedItem['ID Producto'],
          product: formattedItem['Producto'],
          unitCost: formattedItem['Costo Uni Unitario'],
          stock: formattedItem['Exit.'],
          costWithTax: formattedItem['COSTO CON IVA'],
          finalPrice: formattedItem['PRECIO FINAL']
        };
      }),
      searchParams: {
        query: query || null,
        productId: productId || null,
        productName: productName || null,
        priceRange: {
          min: priceMin || null,
          max: priceMax || null
        },
        limit: limitNum
      },
      isLimited: priceListData.length > limitNum && results.length === limitNum
    };

    // Markdown table format
    let markdownTable = "| Product ID | Product Name | Stock | Final Price |\n|:-----------|:-------------|:------|:------------|\n";
    if (results.length > 0) {
      // Keep consistent with raw.results, display up to 10 results
      results.slice(0, 10).forEach(item => {
        const formattedItem = formatProductPrices(item);
        markdownTable += `| ${formattedItem['ID Producto']} | ${formattedItem['Producto']} | ${formattedItem['Exit.']} | $${formattedItem['PRECIO FINAL']} |\n`;
      });
    } else {
      markdownTable += "| - | No matching products found | - | - |\n";
    }

    // Description information
    let description = `🔍 Product Search Results\n\n`;
    description += `📊 Search Statistics:\n`;
    description += `• Products found: ${results.length}\n`;
    description += `• Search query: ${searchQuery}\n\n`;

    if (results.length > 0) {
      const prices = results.map(item => formatPrice(item['PRECIO FINAL'])).sort((a, b) => a - b);
      description += `💰 Price range: $${prices[0]} - $${prices[prices.length - 1]}\n\n`;
      description += `🏆 All matching products:\n`;
      results.forEach((item, index) => {
        const formattedItem = formatProductPrices(item);
        description += `${index + 1}. ${formattedItem['Producto']} - $${formattedItem['PRECIO FINAL']}\n`;
      });
    } else {
      description += `❌ No matching products found\n`;
      description += `💡 Suggestions:\n`;
      description += `• Check search keyword spelling\n`;
      description += `• Try using more general keywords\n`;
      description += `• Use product ID for exact search`;
    }

    // 返回统一格式
    res.json({
      raw: rawData,
      markdown: markdownTable,
      type: "markdown",
      desc: description
    });

  } catch (error) {
    console.error('搜索错误:', error);
    res.status(500).json({
      success: false,
      error: '搜索过程中发生错误'
    });
  }
});

// 根据产品ID精确查询
app.get('/api/price-list/product/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: '产品ID不能为空'
      });
    }

    // 精确匹配产品ID
    const product = priceListData.find(item =>
      String(item['ID Producto'] || '').toLowerCase() === id.toLowerCase()
    );

    if (product) {
      // 格式化为统一的Agent响应格式
      const formattedProduct = formatProductPrices(product);
      const rawData = {
        id: formattedProduct['ID Producto'],
        product: formattedProduct['Producto'],
        unitCost: formattedProduct['Costo Uni Unitario'],
        stock: formattedProduct['Exit.'],
        costWithTax: formattedProduct['COSTO CON IVA'],
        finalPrice: formattedProduct['PRECIO FINAL'],
        searchedId: id
      };

      // Markdown table format
      const markdownTable = "| Field | Value |\n|:------|:------|\n" +
        `| Product ID | ${formattedProduct['ID Producto']} |\n` +
        `| Product Name | ${formattedProduct['Producto']} |\n` +
        `| Unit Cost | $${formattedProduct['Costo Uni Unitario']} |\n` +
        `| Stock | ${formattedProduct['Exit.']} |\n` +
        `| Cost with Tax | $${formattedProduct['COSTO CON IVA']} |\n` +
        `| Final Price | $${formattedProduct['PRECIO FINAL']} |`;

      // Description information
      const description = `🔍 Product Details Query Result\n\n` +
        `📦 Product Information:\n` +
        `• Product ID: ${formattedProduct['ID Producto']}\n` +
        `• Product Name: ${formattedProduct['Producto']}\n` +
        `• Stock Status: ${formattedProduct['Exit.']}\n` +
        `• Final Price: $${formattedProduct['PRECIO FINAL']}\n\n` +
        `💰 Price Details:\n` +
        `• Unit Cost: $${formattedProduct['Costo Uni Unitario']}\n` +
        `• Cost with Tax: $${formattedProduct['COSTO CON IVA']}\n` +
        `• Final Price: $${formattedProduct['PRECIO FINAL']}\n\n` +
        `✅ Product available for ordering or inquiry.`;

      res.json({
        raw: rawData,
        markdown: markdownTable,
        type: "markdown",
        desc: description
      });
    } else {
      // Product not found unified format
      const rawData = {
        searchedId: id,
        found: false,
        error: "Product not found"
      };

      const markdownTable = "| Field | Value |\n|:------|:------|\n" +
        `| Search ID | ${id} |\n` +
        `| Status | Not Found |`;

      const description = `❌ Product Query Failed\n\n` +
        `🔍 Searched Product ID: ${id}\n\n` +
        `💡 Suggestions:\n` +
        `• Check if the product ID is correct\n` +
        `• Use product search function to find similar products\n` +
        `• Contact customer service to confirm product information`;

      res.status(404).json({
        raw: rawData,
        markdown: markdownTable,
        type: "markdown",
        desc: description
      });
    }

  } catch (error) {
    console.error('Product query error:', error);
    res.status(500).json({
      success: false,
      error: 'Error occurred during product query'
    });
  }
});

// Reload Excel data
app.post('/api/price-list/reload', (req, res) => {
  const success = loadExcelData();
  res.json({
    success: success,
    message: success ? 'Data reloaded successfully' : 'Data loading failed',
    module: 'price-list',
    total: priceListData.length
  });
});

// Tire specification search API
app.post('/api/price-list/tire-search', (req, res) => {
  try {
    // Support two parameter formats for compatibility
    const {
      width,
      aspect_ratio,
      aspectRatio,
      rim_diameter,
      diameter,
      exact_match = false,
      limit = 10  // New: user can specify return count, default 10
    } = req.body;

    // Parameter mapping processing
    const finalAspectRatio = aspect_ratio || aspectRatio;
    const finalRimDiameter = rim_diameter || diameter;

    // Parameter validation
    if (!width) {
      return res.status(400).json({
        success: false,
        error: 'Tire width (width) is a required parameter',
        usage: {
          car: 'Car tire: { "width": 155, "aspect_ratio": 70, "rim_diameter": 13, "limit": 20 }',
          truck: 'Truck tire: { "width": 1100, "rim_diameter": 22, "limit": 20 }'
        },
        parameters: {
          width: 'Required - Tire width',
          aspect_ratio: 'Optional - Aspect ratio (car tire)',
          rim_diameter: 'Optional - Diameter',
          exact_match: 'Optional - Whether to exact match (default false)',
          limit: 'Optional - Result count (1-100, default 10)'
        },
        examples: {
          car_search: {
            width: 155,
            aspect_ratio: 70,
            rim_diameter: 13,
            limit: 20
          },
          truck_search: {
            width: 1100,
            rim_diameter: 22,
            limit: 50
          },
          show_all: {
            width: 185,
            aspect_ratio: 55,
            rim_diameter: 15,
            limit: 100
          }
        }
      });
    }

    // Determine search type
    const searchType = finalAspectRatio ? 'car' : 'truck';

    console.log(`🔍 Tire specification search: ${searchType} - width:${width}, aspect ratio:${finalAspectRatio || 'N/A'}, diameter:${finalRimDiameter || 'N/A'}`);

    // Parse tire specifications for all products
    const tireProducts = priceListData.map(product => {
      const specs = parseTireSpecification(product['Producto']);
      return {
        ...product,
        tire_specs: specs
      };
    }).filter(product => product.tire_specs.width !== null); // Only keep products with parseable specs

    console.log(`📊 Successfully parsed ${tireProducts.length} tire products`);

    // Search for matching tires
    const matchingTires = tireProducts.filter(product => {
      const specs = product.tire_specs;

      // Basic match: width must match
      if (specs.width != width) return false;

      if (searchType === 'car') {
        // Car tire: need to match width, aspect ratio, diameter
        // Auto-enable exact match when user provides complete specifications
        const shouldUseExactMatch = exact_match || (finalAspectRatio && finalRimDiameter);

        if (shouldUseExactMatch) {
          // Exact match with intelligent diameter matching (ignore R character)
          const aspectMatch = specs.aspect_ratio == finalAspectRatio;
          let rimMatch = false;
          if (finalRimDiameter) {
            const userDiameter = parseInt(String(finalRimDiameter).replace(/[rR]/g, ''));
            const productDiameter = parseInt(String(specs.rim_diameter).replace(/[rR]/g, ''));
            rimMatch = userDiameter === productDiameter;
          }
          return aspectMatch && rimMatch;
        } else {
          // Allow certain specification range matching (only when partial specs provided)
          const aspectMatch = !finalAspectRatio || Math.abs(specs.aspect_ratio - finalAspectRatio) <= 5;

          // Diameter match: intelligent matching, ignore R character
          // Whether user inputs 15 or R15, should match both 15 and R15
          let rimMatch = true;
          if (finalRimDiameter) {
            const userDiameter = parseInt(String(finalRimDiameter).replace(/[rR]/g, ''));
            const productDiameter = parseInt(String(specs.rim_diameter).replace(/[rR]/g, ''));
            rimMatch = userDiameter === productDiameter;
          }

          return aspectMatch && rimMatch;
        }
      } else {
        // Truck tire: only need to match width and diameter
        if (!finalRimDiameter) return true;

        // Diameter match: intelligent matching, ignore R character
        const userDiameter = parseInt(String(finalRimDiameter).replace(/[rR]/g, ''));
        const productDiameter = parseInt(String(specs.rim_diameter).replace(/[rR]/g, ''));
        return userDiameter === productDiameter;
      }
    });

    // Sort by price
    matchingTires.sort((a, b) => {
      const priceA = formatPrice(a['PRECIO FINAL']);
      const priceB = formatPrice(b['PRECIO FINAL']);
      return priceA - priceB;
    });

    // Format results as unified Agent response format
    const tireType = searchType === 'car' ? 'Car' : 'Truck';
    const searchSpec = searchType === 'car'
      ? `${width}/${finalAspectRatio}R${finalRimDiameter}`
      : `${width}R${finalRimDiameter}`;

    // Apply user-specified result count limit
    const resultLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100); // 1-100 range, default 10

    // Raw data
    const rawData = {
      searchType: searchType,
      searchSpec: searchSpec,
      totalFound: matchingTires.length,
      results: matchingTires.slice(0, resultLimit).map(tire => {
        const formattedTire = formatProductPrices(tire);
        return {
          id: formattedTire['ID Producto'],
          product: formattedTire['Producto'],
          stock: formattedTire['Exit.'],
          price: formattedTire['PRECIO FINAL'],
          specs: tire.tire_specs
        };
      }),
      searchParams: {
        width: width,
        aspectRatio: finalAspectRatio || null,
        diameter: finalRimDiameter || null,
        type: searchType,
        exactMatch: exact_match,
        limit: resultLimit
      },
      statistics: {
        totalTireProducts: tireProducts.length,
        carTires: tireProducts.filter(p => p.tire_specs.type === 'car').length,
        truckTires: tireProducts.filter(p => p.tire_specs.type === 'truck').length
      }
    };

    // Markdown table format
    let markdownTable = "| Product ID | Product Name | Stock | Price |\n|:-----------|:-------------|:------|:------|\n";
    if (matchingTires.length > 0) {
      // Use user-specified result count limit
      matchingTires.slice(0, resultLimit).forEach(tire => {
        const formattedTire = formatProductPrices(tire);
        markdownTable += `| ${formattedTire['ID Producto']} | ${formattedTire['Producto']} | ${formattedTire['Exit.']} | $${formattedTire['PRECIO FINAL']} |\n`;
      });
    } else {
      markdownTable += "| - | No matching tires found | - | - |\n";
    }

    // Description information
    let description = `🔍 Tire Search Results - ${tireType} Tire (${searchSpec})\n\n`;
    description += `📊 Search Statistics:\n`;
    description += `• Matching tires: ${matchingTires.length}\n`;
    description += `• Displayed count: ${Math.min(matchingTires.length, resultLimit)}\n`;
    description += `• Tire type: ${tireType}\n`;
    description += `• Search specification: ${searchSpec}\n\n`;

    if (matchingTires.length > 0) {
      const formattedFirstTire = formatProductPrices(matchingTires[0]);
      const formattedLastTire = formatProductPrices(matchingTires[matchingTires.length - 1]);
      description += `💰 Price range: $${formattedFirstTire['PRECIO FINAL']} - $${formattedLastTire['PRECIO FINAL']}\n\n`;
      description += `🏆 All matching tires:\n`;
      matchingTires.forEach((tire, index) => {
        const formattedTire = formatProductPrices(tire);
        description += `${index + 1}. ${formattedTire['Producto']} - $${formattedTire['PRECIO FINAL']}\n`;
      });
    } else {
      description += `❌ No matching ${tireType.toLowerCase()} tires found\n`;
      description += `💡 Suggestions:\n`;
      description += `• Check if tire specifications are correct\n`;
      description += `• Try other size specifications\n`;
      description += `• Contact customer service for more options`;
    }

    // 返回统一格式
    res.json({
      raw: rawData,
      markdown: markdownTable,
      type: "markdown",
      desc: description
    });

  } catch (error) {
    console.error('Tire search error:', error);
    res.status(500).json({
      success: false,
      error: 'Error occurred during tire search'
    });
  }
});

// Tire specification search API - Spanish version
app.post('/api/price-list/tire-search-es', async (req, res) => {
  try {
    // Support two parameter formats for compatibility
    const {
      width,
      aspect_ratio,
      aspectRatio,
      rim_diameter,
      diameter,
      exact_match = false,
      limit = 10  // New: user can specify return count, default 10
    } = req.body;
    const brand = ""
    // Parameter mapping processing
    let finalAspectRatio = aspect_ratio || aspectRatio;
    const finalRimDiameter = rim_diameter || diameter;

    // Se establece finalAspectRatio a 70 solo si se cumplen TODAS las condiciones
    if (
      (width == '205' || width == '255') &&
      finalRimDiameter == '18' &&
      finalAspectRatio == null // Esta condición verifica que aspectRatio sea null o undefined
    ) {
      finalAspectRatio = 70;
    }

    // Parameter validation
    if (!width) {
      return res.status(400).json({
        success: false,
        error: 'El ancho del neumático (width) es un parámetro requerido',
        usage: {
          car: 'Neumático de auto: { "width": 155, "aspect_ratio": 70, "rim_diameter": 13, "limit": 20 }',
          truck: 'Neumático de camión: { "width": 1100, "rim_diameter": 22, "limit": 20 }'
        },
        parameters: {
          width: 'Requerido - Ancho del neumático',
          aspect_ratio: 'Opcional - Relación de aspecto (neumático de auto)',
          rim_diameter: 'Opcional - Diámetro',
          exact_match: 'Opcional - Si hacer coincidencia exacta (predeterminado false)',
          limit: 'Opcional - Cantidad de resultados (1-100, predeterminado 10)'
        },
        examples: {
          car_search: {
            width: 155,
            aspect_ratio: 70,
            rim_diameter: 13,
            limit: 20
          },
          truck_search: {
            width: 1100,
            rim_diameter: 22,
            limit: 50
          },
          show_all: {
            width: 185,
            aspect_ratio: 55,
            rim_diameter: 15,
            limit: 100
          }
        }
      });
    }

    // Determine search type
    const searchType = finalAspectRatio ? 'car' : 'truck';

    console.log(`🔍 Tire specification search (ES): ${searchType} - width:${width}, aspect ratio:${finalAspectRatio || 'N/A'}, diameter:${finalRimDiameter || 'N/A'}`);

    // Parse tire specifications for all products
    // const tireProducts = priceListData.map(product => {
    //   const specs = parseTireSpecification(product['Producto']);
    //   return {
    //     ...product,
    //     tire_specs: specs
    //   };
    // }).filter(product => product.tire_specs.width !== null); // Only keep products with parseable specs

    // console.log(`📊 Successfully parsed ${tireProducts.length} tire products (ES)`);

    // Search for matching tires Juan
    const url = MAGNO_SEARCH_URL;

    const headers = {
      "accept": "*/*",
      "accept-language": "es,es-ES;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      "content-type": "application/json; text/plain",
      "origin": "https://grupomagno.admovil.net",
      "priority": "u=1, i",
      "referer": "https://grupomagno.admovil.net/",
      "sec-ch-ua": `"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"`,
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": `"Windows"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"
    };
    const textFind = `${width} ${finalAspectRatio ? finalAspectRatio : ""} ${finalRimDiameter.toString().replaceAll("R", "")} ${brand || ""}`
    const payload = {
      idEmpG: MAGNO_ID_EMP,
      idSuc: "1628",
      descontinuado: true,
      textoFind: textFind
    };
    console.log(
      textFind
    );


    //console.log("Datos enviados a la api de magno", payload)

    async function fetchData() {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        //console.log("Respuesta:", data);

        return data;
      } catch (error) {
        console.error("Ocurrió un error:", error);
        return []
      }
    }

    let matchingTires = await fetchData()

    // Construir prefijo de búsqueda (ejemplo: 205 55 14, 205 55 R14, 205/45R17, 205/45RF17)
    const regex = new RegExp(
      `${width}(?:(?:\\s+${finalAspectRatio})?\\s+(Z?R?${finalRimDiameter.replace("R", "")})|\\/${finalAspectRatio}\\s*Z?R(F?)\\s*${finalRimDiameter.replace("R", "")})`,
      "i"
    );

    // Filter only available tires
    matchingTires = matchingTires.filter(p =>
      p.existencia && p.existencia > 0 && regex.test(p.descripcion)
    );
    //console.log("Respuesta:", matchingTires);
    // Sort by price
    matchingTires.sort((a, b) => {
      const priceA = formatPrice(a['precioNeto']);
      const priceB = formatPrice(b['precioNeto']);
      return priceA - priceB;
    });

    // Format results as unified Agent response format
    const tireType = searchType === 'car' ? 'Auto' : 'Camión';
    const searchSpec = searchType === 'car'
      ? `${width}/${finalAspectRatio}R${finalRimDiameter}`
      : `${width}R${finalRimDiameter}`;

    // Apply user-specified result count limit
    const resultLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100); // 1-100 range, default 10

    // Raw data
    const rawData = {
      searchType: searchType,
      searchSpec: searchSpec,
      totalFound: matchingTires.length,
      results: matchingTires.slice(0, resultLimit).map(tire => {
        const formattedTire = formatProductPrices(tire);
        return {
          id: formattedTire['clave'],
          product: formattedTire['descripcion'],
          stock: formattedTire['existencia'],
          price: formattedTire['precioNeto'],
          specs: {
            width: width,
            aspect_ratio: finalAspectRatio,
            rim_diameter: finalRimDiameter,
            type: "car",
            original: formattedTire['descripcion']
          }
        };
      }),
      searchParams: {
        width: width,
        aspectRatio: finalAspectRatio || null,
        diameter: finalRimDiameter || null,
        type: searchType,
        exactMatch: exact_match,
        limit: resultLimit
      },
      statistics: {
        totalTireProducts: matchingTires.length,
        carTires: matchingTires.length,
        //truckTires: matchingTires.filter(p => p.tire_specs.type === 'truck').length
      }
    };
    //console.log(rawData)

    // Markdown table format (Spanish)
    let markdownTable = "| # | Nombre del Producto | Stock | Precio |\n|:------------|:--------------------|:------|:-------|\n";
    if (matchingTires.length > 0) {
      // Use user-specified result count limit
      matchingTires.slice(0, resultLimit).forEach((tire, index) => {
        const formattedTire = formatProductPrices(tire);
        markdownTable += `| ${index + 1} | ${formattedTire['descripcion']} | ${formattedTire['existencia']} | $${formattedTire['precioNeto']} |\n`;
      });
    } else {
      markdownTable += "| - | No se encontraron neumáticos | - | - |\n";
    }

    // Description information (Spanish) - Version C: Warm Service Style
    let description = ``;
    //let description = `🔍 Búsqueda completada para llantas - Medida: ${searchSpec}\n\n`;
    //description += `📋 Información de su búsqueda:\n`;
    //description += `• ✅ Neumáticos encontrados: ${matchingTires.length}\n`;
    //description += `• 👁️ Resultados mostrados: ${Math.min(matchingTires.length, resultLimit)}\n`;
    //description += `• 🚗 Tipo: ${tireType}\n`;
    //description += `• 📏 Especificación: ${searchSpec}\n\n`;

    if (matchingTires.length > 0) {
      const formattedFirstTire = formatProductPrices(matchingTires[0]);
      const formattedLastTire = formatProductPrices(matchingTires[matchingTires.length - 1]);
      //description += `💰 Rango de precios: $${formattedFirstTire['precioNeto'].toFixed(0)} - $${formattedLastTire['precioNeto'].toFixed(0)}\n\n`;
      description += `*Llantas ${searchSpec}:*\n`;
      matchingTires.forEach((tire, index) => {
        const formattedTire = formatProductPrices(tire);
        description += `${index + 1}. ${formattedTire['descripcion']} - *$${formattedTire['precioNeto'].toFixed(0)}* (Disponible: ${formattedTire['existencia']})\n\n`;
      });

      description += `🎁 *¡PROMOCIÓN ESPECIAL!*\n`;
      description += `Mencione el código de promoción *DYNA25* al visitarnos y llévese un termo o lonchera ¡GRATIS! en la compra de sus llantas.\n\n`;

      description += `✅ *Incluye*: Instalación profesional, válvula nueva, balanceo por computadora, inflado con nitrógeno, garantía de 12 meses rotación gratis a partir de 2 llantas\n`;

      //description += `\n📍 Le invitamos a visitarnos en nuestra sucursal:\n`;
      //description += `Calz de las Armas 591, Col Providencia, Azcapotzalco CDMX, CP 02440\n`;
      //description += `📞 Tel: 55 2637 3003\n`;
      //description += "https://maps.app.goo.gl/uuYei436nN8pHw34A?g_st=ic"
      //description += `\n🕐 Horarios: Lunes-Viernes 9:00-18:00 • Sábados 9:00-15:00\n`;
      description += `\n📦 *Importante:* Le recomendamos confirmar el stock antes de su visita, ya que nuestro inventario se mueve constantemente.\n`;
      //description += `\n🤝 Presentando esta cotización en sucursal, con gusto podemos ofrecerle un **descuento adicional**.\n`;
      description += `¿Le gustaría que le agende una cita para la instalación de sus llantas, o prefiere visitarnos directamente en el horario que le acomode?`;
    } else {
      await agregarFilaLlantas(textFind);
      description += `❌ Lamentamos informarle que no encontramos llantas ${textFind} en nuestro inventario actual\n\n`;
      description += `🌟 ¡Pero no se preocupe! Podemos gestionar un *pedido especial* para usted. Las llantas por pedido tardan aproximadamente 1 día hábil en llegar\n\n`;
      description += `📞 Para coordinar su pedido especial, contacte a nuestro equipo de servicio al cliente:\n`;
      description += `*55 2637 3003*`;
      //description += `💡 También puedo ayudarle con:\n`;
      //description += `• 🔍 Verificar juntos las especificaciones de la llanta\n`;
      //description += `• 🛞 Buscar con otras medidas alternativas`;
    }

    // Return unified format
    res.json({
      raw: rawData,
      markdown: markdownTable,
      type: "markdown",
      desc: description
    });

  } catch (error) {
    console.error('Tire search error (ES):', error);
    res.status(500).json({
      success: false,
      error: 'Ocurrió un error durante la búsqueda de neumáticos'
    });
  }
});





/////New endpoint
app.post('/api/price-list/tire-search-es-new', async (req, res) => {
  try {
    // Support two parameter formats for compatibility
    const {
      parametros,
      limit = 10
    } = req.body;
    const brand = ""
    // Parameter mapping processing
    let finalAspectRatio = aspect_ratio || aspectRatio;
    const finalRimDiameter = rim_diameter || diameter;

    // Se establece finalAspectRatio a 70 solo si se cumplen TODAS las condiciones
    if (
      (width == '205' || width == '255') &&
      finalRimDiameter == '18' &&
      finalAspectRatio == null // Esta condición verifica que aspectRatio sea null o undefined
    ) {
      finalAspectRatio = 70;
    }

    // Parameter validation
    if (!width) {
      return res.status(400).json({
        success: false,
        error: 'El ancho del neumático (width) es un parámetro requerido',
        usage: {
          car: 'Neumático de auto: { "width": 155, "aspect_ratio": 70, "rim_diameter": 13, "limit": 20 }',
          truck: 'Neumático de camión: { "width": 1100, "rim_diameter": 22, "limit": 20 }'
        },
        parameters: {
          width: 'Requerido - Ancho del neumático',
          aspect_ratio: 'Opcional - Relación de aspecto (neumático de auto)',
          rim_diameter: 'Opcional - Diámetro',
          exact_match: 'Opcional - Si hacer coincidencia exacta (predeterminado false)',
          limit: 'Opcional - Cantidad de resultados (1-100, predeterminado 10)'
        },
        examples: {
          car_search: {
            width: 155,
            aspect_ratio: 70,
            rim_diameter: 13,
            limit: 20
          },
          truck_search: {
            width: 1100,
            rim_diameter: 22,
            limit: 50
          },
          show_all: {
            width: 185,
            aspect_ratio: 55,
            rim_diameter: 15,
            limit: 100
          }
        }
      });
    }

    // Determine search type
    const searchType = finalAspectRatio ? 'car' : 'truck';

    console.log(`🔍 Tire specification search (ES): ${searchType} - width:${width}, aspect ratio:${finalAspectRatio || 'N/A'}, diameter:${finalRimDiameter || 'N/A'}`);

    // Search for matching tires Juan
    const url = MAGNO_SEARCH_URL_NEW;

    const headers = {
      "accept": "*/*",
      "accept-language": "es,es-ES;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      "content-type": "application/json; text/plain",
      "origin": "https://grupomagno.admovil.net",
      "priority": "u=1, i",
      "referer": "https://grupomagno.admovil.net/",
      "sec-ch-ua": `"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"`,
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": `"Windows"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"
    };

    const textFind = `${width} ${finalAspectRatio ? finalAspectRatio : ""} ${finalRimDiameter.toString().replaceAll("R", "")} ${brand || ""}`
    const payload = {
      idEmpG: MAGNO_ID_EMP_G,
      idSuc: "1628",
      descontinuado: true,
      textoFind: textFind
    };
    console.log(
      textFind
    );


    //console.log("Datos enviados a la api de magno", payload)

    async function fetchData() {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        //console.log("Respuesta:", data);

        return data;
      } catch (error) {
        console.error("Ocurrió un error:", error);
        return []
      }
    }

    let matchingTires = await fetchData()

    // Construir prefijo de búsqueda (ejemplo: 205 55 14, 205 55 R14, 205/45R17, 205/45RF17)
    const regex = new RegExp(
      `${width}(?:(?:\\s+${finalAspectRatio})?\\s+(Z?R?${finalRimDiameter.replace("R", "")})|\\/${finalAspectRatio}\\s*Z?R(F?)\\s*${finalRimDiameter.replace("R", "")})`,
      "i"
    );

    // Filter only available tires
    matchingTires = matchingTires.filter(p =>
      p.existencia && p.existencia > 0 && regex.test(p.descripcion)
    );
    //console.log("Respuesta:", matchingTires);
    // Sort by price
    matchingTires.sort((a, b) => {
      const priceA = formatPrice(a['precioNeto']);
      const priceB = formatPrice(b['precioNeto']);
      return priceA - priceB;
    });

    // Format results as unified Agent response format
    const tireType = searchType === 'car' ? 'Auto' : 'Camión';
    const searchSpec = searchType === 'car'
      ? `${width}/${finalAspectRatio}R${finalRimDiameter}`
      : `${width}R${finalRimDiameter}`;

    // Apply user-specified result count limit
    const resultLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100); // 1-100 range, default 10

    // Raw data
    const rawData = {
      searchType: searchType,
      searchSpec: searchSpec,
      totalFound: matchingTires.length,
      results: matchingTires.slice(0, resultLimit).map(tire => {
        const formattedTire = formatProductPrices(tire);
        return {
          id: formattedTire['clave'],
          product: formattedTire['descripcion'],
          stock: formattedTire['existencia'],
          price: formattedTire['precioNeto'],
          specs: {
            width: width,
            aspect_ratio: finalAspectRatio,
            rim_diameter: finalRimDiameter,
            type: "car",
            original: formattedTire['descripcion']
          }
        };
      }),
      searchParams: {
        width: width,
        aspectRatio: finalAspectRatio || null,
        diameter: finalRimDiameter || null,
        type: searchType,
        exactMatch: exact_match,
        limit: resultLimit
      },
      statistics: {
        totalTireProducts: matchingTires.length,
        carTires: matchingTires.length,
        //truckTires: matchingTires.filter(p => p.tire_specs.type === 'truck').length
      }
    };
    //console.log(rawData)

    // Markdown table format (Spanish)
    let markdownTable = "| # | Nombre del Producto | Stock | Precio |\n|:------------|:--------------------|:------|:-------|\n";
    if (matchingTires.length > 0) {
      // Use user-specified result count limit
      matchingTires.slice(0, resultLimit).forEach((tire, index) => {
        const formattedTire = formatProductPrices(tire);
        markdownTable += `| ${index + 1} | ${formattedTire['descripcion']} | ${formattedTire['existencia']} | $${formattedTire['precioNeto']} |\n`;
      });
    } else {
      markdownTable += "| - | No se encontraron neumáticos | - | - |\n";
    }

    // Description information (Spanish) - Version C: Warm Service Style
    let description = ``;

    if (matchingTires.length > 0) {
      const formattedFirstTire = formatProductPrices(matchingTires[0]);
      const formattedLastTire = formatProductPrices(matchingTires[matchingTires.length - 1]);
      //description += `💰 Rango de precios: $${formattedFirstTire['precioNeto'].toFixed(0)} - $${formattedLastTire['precioNeto'].toFixed(0)}\n\n`;
      description += `*Llantas ${searchSpec}:*\n`;
      matchingTires.forEach((tire, index) => {
        const formattedTire = formatProductPrices(tire);
        description += `${index + 1}. ${formattedTire['descripcion']} - *$${formattedTire['precioNeto'].toFixed(0)}* (Disponible: ${formattedTire['existencia']})\n\n`;
      });

      description += `🎁 *¡PROMOCIÓN ESPECIAL!*\n`;
      description += `Mencione el código de promoción *DYNA25* al visitarnos y llévese un termo o lonchera ¡GRATIS! en la compra de sus llantas.\n\n`;

      description += `✅ *Incluye*: Instalación profesional, válvula nueva, balanceo por computadora, inflado con nitrógeno, garantía de 12 meses rotación gratis a partir de 2 llantas\n`;

      //description += `\n📍 Le invitamos a visitarnos en nuestra sucursal:\n`;
      //description += `Calz de las Armas 591, Col Providencia, Azcapotzalco CDMX, CP 02440\n`;
      //description += `📞 Tel: 55 2637 3003\n`;
      //description += "https://maps.app.goo.gl/uuYei436nN8pHw34A?g_st=ic"
      //description += `\n🕐 Horarios: Lunes-Viernes 9:00-18:00 • Sábados 9:00-15:00\n`;
      description += `\n📦 *Importante:* Le recomendamos confirmar el stock antes de su visita, ya que nuestro inventario se mueve constantemente.\n`;
      //description += `\n🤝 Presentando esta cotización en sucursal, con gusto podemos ofrecerle un **descuento adicional**.\n`;
      description += `¿Le gustaría que le agende una cita para la instalación de sus llantas, o prefiere visitarnos directamente en el horario que le acomode?`;
    } else {
      await agregarFilaLlantas(textFind);
      description += `❌ Lamentamos informarle que no encontramos llantas ${textFind} en nuestro inventario actual\n\n`;
      description += `🌟 ¡Pero no se preocupe! Podemos gestionar un *pedido especial* para usted. Las llantas por pedido tardan aproximadamente 1 día hábil en llegar\n\n`;
      description += `📞 Para coordinar su pedido especial, contacte a nuestro equipo de servicio al cliente:\n`;
      description += `*55 2637 3003*`;
    }

    // Return unified format
    res.json({
      raw: rawData,
      markdown: markdownTable,
      type: "markdown",
      desc: description
    });

  } catch (error) {
    console.error('Tire search error (ES):', error);
    res.status(500).json({
      success: false,
      error: 'Ocurrió un error durante la búsqueda de neumáticos'
    });
  }
});

app.post('/api/price-list/tire-search-es-demo', async (req, res) => {
  try {
    // Support two parameter formats for compatibility
    const {
      width,
      aspect_ratio,
      aspectRatio,
      rim_diameter,
      diameter,
      exact_match = false,
      brand,
      limit = 10  // New: user can specify return count, default 10
    } = req.body;

    // Parameter mapping processing
    let finalAspectRatio = aspect_ratio || aspectRatio;
    const finalRimDiameter = rim_diameter || diameter;

    // Se establece finalAspectRatio a 70 solo si se cumplen TODAS las condiciones
    if (
      (width == '205' || width == '255') &&
      finalRimDiameter == '18' &&
      finalAspectRatio == null // Esta condición verifica que aspectRatio sea null o undefined
    ) {
      finalAspectRatio = 70;
    }

    // Parameter validation
    if (!width) {
      return res.status(400).json({
        success: false,
        error: 'El ancho del neumático (width) es un parámetro requerido',
        usage: {
          car: 'Neumático de auto: { "width": 155, "aspect_ratio": 70, "rim_diameter": 13, "limit": 20 }',
          truck: 'Neumático de camión: { "width": 1100, "rim_diameter": 22, "limit": 20 }'
        },
        parameters: {
          width: 'Requerido - Ancho del neumático',
          aspect_ratio: 'Opcional - Relación de aspecto (neumático de auto)',
          rim_diameter: 'Opcional - Diámetro',
          exact_match: 'Opcional - Si hacer coincidencia exacta (predeterminado false)',
          limit: 'Opcional - Cantidad de resultados (1-100, predeterminado 10)'
        },
        examples: {
          car_search: {
            width: 155,
            aspect_ratio: 70,
            rim_diameter: 13,
            limit: 20
          },
          truck_search: {
            width: 1100,
            rim_diameter: 22,
            limit: 50
          },
          show_all: {
            width: 185,
            aspect_ratio: 55,
            rim_diameter: 15,
            limit: 100
          }
        }
      });
    }

    // Determine search type
    const searchType = finalAspectRatio ? 'car' : 'truck';

    console.log(`🔍 Tire specification search (ES): ${searchType} - width:${width}, aspect ratio:${finalAspectRatio || 'N/A'}, diameter:${finalRimDiameter || 'N/A'}`);

    // Parse tire specifications for all products
    // const tireProducts = priceListData.map(product => {
    //   const specs = parseTireSpecification(product['Producto']);
    //   return {
    //     ...product,
    //     tire_specs: specs
    //   };
    // }).filter(product => product.tire_specs.width !== null); // Only keep products with parseable specs

    // console.log(`📊 Successfully parsed ${tireProducts.length} tire products (ES)`);

    // Search for matching tires Juan
    const url = MAGNO_SEARCH_URL;

    const headers = {
      "accept": "*/*",
      "accept-language": "es,es-ES;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      "content-type": "application/json; text/plain",
      "origin": "https://grupomagno.admovil.net",
      "priority": "u=1, i",
      "referer": "https://grupomagno.admovil.net/",
      "sec-ch-ua": `"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"`,
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": `"Windows"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0"
    };

    const payload = {
      idEmpG: MAGNO_ID_EMP,
      idSuc: "1628",
      descontinuado: true,
      textoFind: `${width} ${finalAspectRatio ? finalAspectRatio : ""} ${finalRimDiameter.toString().replaceAll("R", "")} ${brand || ""}`
    };
    console.log(
      `${width} ${finalAspectRatio ? finalAspectRatio : ""} ${finalRimDiameter.toString().replaceAll("R", "")} ${brand || ""}`
    );


    //console.log("Datos enviados a la api de magno", payload)

    async function fetchData() {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        //console.log("Respuesta:", data);

        return data;
      } catch (error) {
        console.error("Ocurrió un error:", error);
        return []
      }
    }

    let matchingTires = await fetchData()

    // Construir prefijo de búsqueda (ejemplo: 205 55 14 ó 205 55 R14)
    const regex = new RegExp(
      `^${width}(?:\\s+${finalAspectRatio})?\\s+(R?${finalRimDiameter.replace("R", "")})`,
      "i"
    );

    // Filter only available tires
    matchingTires = matchingTires.filter(p =>
      p.existencia && p.existencia > 0 && regex.test(p.descripcion)
    );
    //console.log("Respuesta:", matchingTires);
    // Sort by price
    matchingTires.sort((a, b) => {
      const priceA = formatPrice(a['precioNeto']);
      const priceB = formatPrice(b['precioNeto']);
      return priceA - priceB;
    });

    // Format results as unified Agent response format
    const tireType = searchType === 'car' ? 'Auto' : 'Camión';
    const searchSpec = searchType === 'car'
      ? `${width}/${finalAspectRatio}R${finalRimDiameter}`
      : `${width}R${finalRimDiameter}`;

    // Apply user-specified result count limit
    const resultLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100); // 1-100 range, default 10

    // Raw data
    const rawData = {
      searchType: searchType,
      searchSpec: searchSpec,
      totalFound: matchingTires.length,
      results: matchingTires.slice(0, resultLimit).map(tire => {
        const formattedTire = formatProductPrices(tire);
        return {
          id: formattedTire['clave'],
          product: formattedTire['descripcion'],
          stock: formattedTire['existencia'],
          price: formattedTire['precioNeto'],
          specs: {
            width: width,
            aspect_ratio: finalAspectRatio,
            rim_diameter: finalRimDiameter,
            type: "car",
            original: formattedTire['descripcion']
          }
        };
      }),
      searchParams: {
        width: width,
        aspectRatio: finalAspectRatio || null,
        diameter: finalRimDiameter || null,
        type: searchType,
        exactMatch: exact_match,
        limit: resultLimit
      },
      statistics: {
        totalTireProducts: matchingTires.length,
        carTires: matchingTires.length,
        //truckTires: matchingTires.filter(p => p.tire_specs.type === 'truck').length
      }
    };
    //console.log(rawData)

    // Markdown table format (Spanish)
    let markdownTable = "| # | Nombre del Producto | Stock | Precio |\n|:------------|:--------------------|:------|:-------|\n";
    if (matchingTires.length > 0) {
      // Use user-specified result count limit
      matchingTires.slice(0, resultLimit).forEach((tire, index) => {
        const formattedTire = formatProductPrices(tire);
        markdownTable += `| ${index + 1} | ${formattedTire['descripcion']} | ${formattedTire['existencia']} | $${formattedTire['precioNeto']} |\n`;
      });
    } else {
      markdownTable += "| - | No se encontraron neumáticos | - | - |\n";
    }

    // Description information (Spanish) - Version C: Warm Service Style
    let description = ``;
    //let description = `🔍 Búsqueda completada para llantas - Medida: ${searchSpec}\n\n`;
    //description += `📋 Información de su búsqueda:\n`;
    //description += `• ✅ Neumáticos encontrados: ${matchingTires.length}\n`;
    //description += `• 👁️ Resultados mostrados: ${Math.min(matchingTires.length, resultLimit)}\n`;
    //description += `• 🚗 Tipo: ${tireType}\n`;
    //description += `• 📏 Especificación: ${searchSpec}\n\n`;

    if (matchingTires.length > 0) {
      const formattedFirstTire = formatProductPrices(matchingTires[0]);
      const formattedLastTire = formatProductPrices(matchingTires[matchingTires.length - 1]);
      //description += `💰 Rango de precios: $${formattedFirstTire['precioNeto'].toFixed(0)} - $${formattedLastTire['precioNeto'].toFixed(0)}\n\n`;
      description += `*Llantas ${searchSpec}:*\n`;
      matchingTires.forEach((tire, index) => {
        const formattedTire = formatProductPrices(tire);
        description += `${index + 1}. ${formattedTire['descripcion']} - *$${formattedTire['precioNeto'].toFixed(0)}* (Disponible: ${formattedTire['existencia']})\n\n`;
      });

      description += `🎁 *¡PROMOCIÓN ESPECIAL!*\n`;
      description += `Mencione el código de promoción *DYNA25* al visitarnos y llévese un termo o lonchera ¡GRATIS! en la compra de sus llantas.\n\n`;

      description += `✅ *Incluye*: Instalación profesional, válvula nueva, balanceo por computadora, inflado con nitrógeno, garantía de 12 meses rotación gratis a partir de 2 llantas\n`;

      //description += `\n📍 Le invitamos a visitarnos en nuestra sucursal:\n`;
      //description += `Calz de las Armas 591, Col Providencia, Azcapotzalco CDMX, CP 02440\n`;
      //description += `📞 Tel: 55 2637 3003\n`;
      //description += "https://maps.app.goo.gl/uuYei436nN8pHw34A?g_st=ic"
      //description += `\n🕐 Horarios: Lunes-Viernes 9:00-18:00 • Sábados 9:00-15:00\n`;
      description += `\n📦 *Importante:* Le recomendamos confirmar el stock antes de su visita, ya que nuestro inventario se mueve constantemente.\n\n`;
      //description += `\n🤝 Presentando esta cotización en sucursal, con gusto podemos ofrecerle un **descuento adicional**.\n`;
      description += `¿Le gustaría que le agende una cita para la instalación de sus llantas, o prefiere visitarnos directamente en el horario que le acomode?`;
    } else {
      description += `❌ Lamentamos informarle que no encontramos llantas ${searchSpec} en nuestro inventario actual\n\n`;
      description += `🌟 ¡Pero no se preocupe! Podemos gestionar un *pedido especial* para usted. Las llantas por pedido tardan aproximadamente 1 día hábil en llegar\n\n`;
      description += `📞 Para coordinar su pedido especial, contacte a nuestro equipo de servicio al cliente:\n`;
      description += `*55 2637 3003*\n\n`;
      description += `💡 También puedo ayudarle con:\n`;
      description += `• 🔍 Verificar juntos las especificaciones de la llanta\n`;
      description += `• 🛞 Buscar con otras medidas alternativas`;
    }

    // Return unified format
    res.json({
      raw: rawData,
      markdown: markdownTable,
      type: "markdown",
      desc: description
    });

  } catch (error) {
    console.error('Tire search error (ES):', error);
    res.status(500).json({
      success: false,
      error: 'Ocurrió un error durante la búsqueda de neumáticos'
    });
  }
});

// Tire specification search API - Spanish version
app.post('/api/appointment/create', async (req, res) => {
  try {
    // Support two parameter formats for compatibility
    const {
      llanta,
      servicio,
      nombre,
      numero_contacto,
      fecha,
      hora
    } = req.body;

    // check if data is passed correctly
    console.log("llanta: ", llanta)
    console.log("nombre: ", nombre)
    console.log("numero_contacto: ", numero_contacto)
    console.log("fecha: ", fecha)
    console.log("hora: ", hora)

    //create appointment code
    //const appointment_code = Math.floor(100000 + Math.random() * 900000);
    const num_registros = await obtenerNumeroFilas();
    const appointment_code = `CRDYNA${num_registros}`
    //create new row in sheets
    const row_data = [
      appointment_code,
      nombre,
      numero_contacto ? numero_contacto : "",
      llanta ? llanta : "",
      servicio ? servicio : "",
      fecha ? fecha : "",
      hora ? hora : ""
    ]

    const response_add_row = await agregarFila(row_data)

    if (response_add_row) {
      const rawData = {
        "estado_reservacion": "Generada exitosamente",
        "codigo_reservacion": appointment_code,
        "datos_reserva": {
          "nombre": nombre,
          "servicio": servicio ? servicio : "",
          "llanta": llanta ? llanta : "",
          "fecha": fecha ? fecha : "",
          "hora": hora ? hora : ""
        }
      }

      let description = `📅 ¡Su reservación ha sido generada exitosamente!\n\n`;
      description += `🔑 Código de reservación: **${appointment_code}**\n\n`;
      description += `📋 Detalles de su reservación:\n`;
      description += `• 👤 Nombre: ${nombre}\n`;
      description += `• 🔧 Servicio: ${servicio ? servicio : "N/A"}\n`;
      description += `• 🛞 Llanta: ${llanta ? llanta : "N/A"}\n`;
      description += `• 📆 Fecha: ${fecha ? fecha : "N/A"}\n`;
      description += `• ⏰ Hora: ${hora ? hora : "N/A"}\n\n`;
      description += `🤝 Le esperamos en nuestra sucursal:\n`;
      description += `📍 Calz de las Armas 591, Col. Providencia, Azcapotzalco CDMX, CP 02440\n`;
      description += `📞 Tel: 55 2637 3003\n`;
      description += `🕐 Horarios: Lunes-Viernes 9:00-18:00 • Sábados 9:00-15:00\n\n`;

      const markdownTable = "| Se agendó la reservación con exito |\n"
      // Return unified format

      res.json({
        raw: rawData,
        markdown: markdownTable,
        type: "markdown",
        desc: description
      });
    }

    else {
      const rawData = {
        "estado_reservacion": "No se pudo generar",
        "codigo_reservacion": appointment_code,
        "datos_reserva": {
          "nombre": nombre,
          "servicio": servicio ? servicio : "",
          "llanta": llanta ? llanta : "",
          "fecha": fecha ? fecha : "",
          "hora": hora ? hora : ""
        }
      }

      let description = `⚠️ Lamentamos informarle que **no se pudo generar su reservación en este momento**.\n\n`;
      description += `🔑 Código de intento: **${appointment_code}**\n\n`;
      description += `📋 Detalles que intentó registrar:\n`;
      description += `• 👤 Nombre: ${nombre}\n`;
      description += `• 🔧 Servicio: ${servicio ? servicio : "N/A"}\n`;
      description += `• 🛞 Llanta: ${llanta ? llanta : "N/A"}\n`;
      description += `• 📆 Fecha: ${fecha ? fecha : "N/A"}\n`;
      description += `• ⏰ Hora: ${hora ? hora : "N/A"}\n\n`;
      description += `🙏 Por favor, intente nuevamente en unos minutos o comuníquese con nosotros para apoyo directo.\n\n`;
      description += `📍 Grupo Magno – Calz de las Armas 591, Col. Providencia, Azcapotzalco CDMX, CP 02440\n`;
      description += `📞 Tel: 55 2637 3003\n`;
      description += `🕐 Horarios: Lunes-Viernes 9:00-18:00 • Sábados 9:00-15:00`;

      const markdownTable = "| ❌ No se pudo agendar la reservación |\n";

      res.json({
        raw: rawData,
        markdown: markdownTable,
        type: "markdown",
        desc: description
      });
    }






  } catch (error) {
    console.error('Appointment creation error', error);
    res.status(500).json({
      success: false,
      error: 'Ocurrió un error al crear la reservacion'
    });
  }
});

// Tire specification search API - Spanish version
app.post('/api/appointment/create-demo', async (req, res) => {
  try {
    // Support two parameter formats for compatibility
    const {
      llanta,
      servicio,
      nombre,
      numero_contacto,
      fecha,
      hora
    } = req.body;

    // check if data is passed correctly
    console.log("llanta: ", llanta)
    console.log("nombre: ", nombre)
    console.log("numero_contacto: ", numero_contacto)
    console.log("fecha: ", fecha)
    console.log("hora: ", hora)

    //create appointment code
    //const appointment_code = Math.floor(100000 + Math.random() * 900000);
    const num_registros = await obtenerNumeroFilasDemo();
    const appointment_code = `CRDYNA${num_registros}`
    //create new row in sheets
    const row_data = [
      appointment_code,
      nombre,
      numero_contacto ? numero_contacto : "",
      llanta ? llanta : "",
      servicio ? servicio : "",
      fecha ? fecha : "",
      hora ? hora : ""
    ]

    const response_add_row = await agregarFilaDemo(row_data)

    if (response_add_row) {
      const rawData = {
        "estado_reservacion": "Generada exitosamente",
        "codigo_reservacion": appointment_code,
        "datos_reserva": {
          "nombre": nombre,
          "servicio": servicio ? servicio : "",
          "llanta": llanta ? llanta : "",
          "fecha": fecha ? fecha : "",
          "hora": hora ? hora : ""
        }
      }

      let description = `📅 ¡Su reservación ha sido generada exitosamente!\n\n`;
      description += `🔑 Código de reservación: **${appointment_code}**\n\n`;
      description += `📋 Detalles de su reservación:\n`;
      description += `• 👤 Nombre: ${nombre}\n`;
      description += `• 🔧 Servicio: ${servicio ? servicio : "N/A"}\n`;
      description += `• 🛞 Llanta: ${llanta ? llanta : "N/A"}\n`;
      description += `• 📆 Fecha: ${fecha ? fecha : "N/A"}\n`;
      description += `• ⏰ Hora: ${hora ? hora : "N/A"}\n\n`;
      description += `🤝 Le esperamos en nuestra sucursal:\n`;
      description += `📍 Calz de las Armas 591, Col. Providencia, Azcapotzalco CDMX, CP 02440\n`;
      description += `📞 Tel: 55 2637 3003\n`;
      description += `🕐 Horarios: Lunes-Viernes 9:00-18:00 • Sábados 9:00-15:00\n\n`;

      const markdownTable = "| Se agendó la reservación con exito |\n"
      // Return unified format

      res.json({
        raw: rawData,
        markdown: markdownTable,
        type: "markdown",
        desc: description
      });
    }

    else {
      const rawData = {
        "estado_reservacion": "No se pudo generar",
        "codigo_reservacion": appointment_code,
        "datos_reserva": {
          "nombre": nombre,
          "servicio": servicio ? servicio : "",
          "llanta": llanta ? llanta : "",
          "fecha": fecha ? fecha : "",
          "hora": hora ? hora : ""
        }
      }

      let description = `⚠️ Lamentamos informarle que **no se pudo generar su reservación en este momento**.\n\n`;
      description += `🔑 Código de intento: **${appointment_code}**\n\n`;
      description += `📋 Detalles que intentó registrar:\n`;
      description += `• 👤 Nombre: ${nombre}\n`;
      description += `• 🔧 Servicio: ${servicio ? servicio : "N/A"}\n`;
      description += `• 🛞 Llanta: ${llanta ? llanta : "N/A"}\n`;
      description += `• 📆 Fecha: ${fecha ? fecha : "N/A"}\n`;
      description += `• ⏰ Hora: ${hora ? hora : "N/A"}\n\n`;
      description += `🙏 Por favor, intente nuevamente en unos minutos o comuníquese con nosotros para apoyo directo.\n\n`;
      description += `📍 Grupo Magno – Calz de las Armas 591, Col. Providencia, Azcapotzalco CDMX, CP 02440\n`;
      description += `📞 Tel: 55 2637 3003\n`;
      description += `🕐 Horarios: Lunes-Viernes 9:00-18:00 • Sábados 9:00-15:00`;

      const markdownTable = "| ❌ No se pudo agendar la reservación |\n";

      res.json({
        raw: rawData,
        markdown: markdownTable,
        type: "markdown",
        desc: description
      });
    }






  } catch (error) {
    console.error('Appointment creation error', error);
    res.status(500).json({
      success: false,
      error: 'Ocurrió un error al crear la reservacion'
    });
  }
});



// Tire specification parsing test endpoint
app.post('/api/price-list/tire-parse', (req, res) => {
  try {
    const { product_name } = req.body;

    if (!product_name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide product name (product_name) for parsing'
      });
    }

    const specs = parseTireSpecification(product_name);

    res.json({
      success: true,
      message: 'Tire specification parsing completed',
      input: product_name,
      parsed_specs: specs,
      is_parseable: specs.width !== null
    });

  } catch (error) {
    console.error('Tire parsing error:', error);
    res.status(500).json({
      success: false,
      error: 'Error occurred during tire specification parsing'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Backward compatible route redirects
app.get('/api/health', (req, res) => res.redirect('/api/price-list/health'));
app.get('/api/products', (req, res) => res.redirect('/api/price-list/products'));
app.post('/api/product/search', (req, res) => {
  // Forward request to new endpoint
  req.url = '/api/price-list/search';
  app.handle(req, res);
});
app.get('/api/product/id/:id', (req, res) => {
  res.redirect(`/api/price-list/product/${req.params.id}`);
});
app.post('/api/reload', (req, res) => {
  req.url = '/api/price-list/reload';
  app.handle(req, res);
});

// 404 handling
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint does not exist',
    availableEndpoints: {
      'price-list': [
        'GET /api/price-list/health',
        'GET /api/price-list/products',
        'POST /api/price-list/search',
        'GET /api/price-list/product/:id',
        'POST /api/price-list/reload'
      ]
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view API documentation`);
});

module.exports = app; 