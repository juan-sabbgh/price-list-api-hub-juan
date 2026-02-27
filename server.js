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

//URL para llamar al agente
const url = 'https://agents.dyna.ai/openapi/v1/conversation/dialog/';

//agent api parameters
const AGENT_TOKEN = process.env.AGENT_TOKEN;
const AGENT_KEY = process.env.AGENT_KEY;
const AS_ACCOUNT = process.env.AS_ACCOUNT;

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

// =====================================================
// Nueva API pública de Magno (sin autenticación)
// =====================================================
const MAGNO_PUBLIC_API_URL = "https://api.admovil.net/api/CRM/TiendaOnLine/BusquedaProducto";
const MAGNO_PUBLIC_ID_EMPG = process.env.MAGNO_PUBLIC_ID_EMPG;

const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_SHEETS_CREDENTIALS,
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
    spreadsheetId: SHEET_ID,
    range: "Hoja 1!A:G",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [valores],
    },
  });

  return true
}

async function agregarFilaLlantas(especificaciones) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const today = new Date();
  const formattedDate = today.toLocaleDateString();

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Llantas no encontradas!A:B",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[especificaciones, formattedDate]],
    },
  });

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
    spreadsheetId: "1d2q5Uu8mIzg7PGqa-UkK9on6kkWP-TDKnNQ9k8y6K38",
    range: "Hoja 1!A:G",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [valores],
    },
  });

  return true
}

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Global variable to store Excel data
let priceListData = [];

// Load Excel file
function loadExcelData() {
  try {
    const excelPath = path.join(__dirname, 'LISTA DE PRECIOS 25062025.xlsx');
    console.log('Attempting to load Excel file:', excelPath);

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    priceListData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Successfully loaded ${priceListData.length} records`);
    console.log('Data sample:', priceListData.slice(0, 2));
    return true;
  } catch (error) {
    console.error('Failed to load Excel file:', error.message);
    console.error('Current working directory:', process.cwd());
    console.error('__dirname:', __dirname);

    try {
      const files = fs.readdirSync(process.cwd());
      console.error('Current directory files:', files.filter(f => f.includes('.xlsx')));
    } catch (fsError) {
      console.error('Cannot read directory:', fsError.message);
    }

    return false;
  }
}

// Price formatting function - convert to integer
function formatPrice(price) {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return 0;
  return Math.round(numPrice);
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

function formatProductPricesNew(product) {
  return {
    ...product,
    'Costo Uni Unitario': formatPrice(product['precio']),
    'COSTO CON IVA': formatPrice(product['precio']),
    'PRECIO FINAL': formatPrice(product['precio'])
  };
}

// Tire specification parsing function
function parseTireSpecification(productName) {
  const name = String(productName || '').trim();

  const specs = {
    width: null,
    aspect_ratio: null,
    rim_diameter: null,
    type: null,
    original: name
  };

  const carTirePattern = /^(\d{3})\s+(\d{2})\s+(\d{2})\s/;
  const carMatch = name.match(carTirePattern);

  if (carMatch) {
    specs.width = parseInt(carMatch[1]);
    specs.aspect_ratio = parseInt(carMatch[2]);
    specs.rim_diameter = parseInt(carMatch[3]);
    specs.type = 'car';
    return specs;
  }

  const carTireWithRPattern = /^(\d{3})\s+(\d{2})\s+R(\d{2})\s/;
  const carWithRMatch = name.match(carTireWithRPattern);

  if (carWithRMatch) {
    specs.width = parseInt(carWithRMatch[1]);
    specs.aspect_ratio = parseInt(carWithRMatch[2]);
    specs.rim_diameter = parseInt(carWithRMatch[3]);
    specs.type = 'car';
    return specs;
  }

  const truckTirePattern = /^(\d{3,4})\s+R(\d{2})\s/;
  const truckMatch = name.match(truckTirePattern);

  if (truckMatch) {
    specs.width = parseInt(truckMatch[1]);
    specs.rim_diameter = parseInt(truckMatch[2]);
    specs.type = 'truck';
    return specs;
  }

  const standardPattern1 = /(\d{3})\/(\d{2})[-R](\d{2})/;
  const standardMatch1 = name.match(standardPattern1);

  if (standardMatch1) {
    specs.width = parseInt(standardMatch1[1]);
    specs.aspect_ratio = parseInt(standardMatch1[2]);
    specs.rim_diameter = parseInt(standardMatch1[3]);
    specs.type = 'car';
    return specs;
  }

  const standardPattern2 = /(\d{3})\/(\d{2})\s+R(\d{2})/;
  const standardMatch2 = name.match(standardPattern2);

  if (standardMatch2) {
    specs.width = parseInt(standardMatch2[1]);
    specs.aspect_ratio = parseInt(standardMatch2[2]);
    specs.rim_diameter = parseInt(standardMatch2[3]);
    specs.type = 'car';
    return specs;
  }

  const flexiblePattern = /(\d{3})\/(\d{2})\s*R?\s*(\d{2})/;
  const flexibleMatch = name.match(flexiblePattern);

  if (flexibleMatch) {
    specs.width = parseInt(flexibleMatch[1]);
    specs.aspect_ratio = parseInt(flexibleMatch[2]);
    specs.rim_diameter = parseInt(flexibleMatch[3]);
    specs.type = 'car';
    return specs;
  }

  return specs;
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
  const formattedData = priceListData.map(product => formatProductPrices(product));

  res.json({
    success: true,
    message: 'Successfully retrieved all products',
    module: 'price-list',
    data: formattedData,
    total: formattedData.length
  });
});

// Product search API
app.post('/api/price-list/search', (req, res) => {
  try {
    const {
      query,
      productId,
      productName,
      priceMin,
      priceMax,
      limit = 50
    } = req.body;

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
        }
      });
    }

    let results = [...priceListData];

    if (query) {
      const searchTerm = String(query).toLowerCase().trim();
      results = results.filter(item => {
        const idProducto = String(item['ID Producto'] || '').toLowerCase();
        const producto = String(item['Producto'] || '').toLowerCase();
        return idProducto.includes(searchTerm) || producto.includes(searchTerm);
      });
    }

    if (productId) {
      const searchId = String(productId).toLowerCase().trim();
      results = results.filter(item => {
        const idProducto = String(item['ID Producto'] || '').toLowerCase();
        return idProducto.includes(searchId);
      });
    }

    if (productName) {
      const searchName = String(productName).toLowerCase().trim();
      results = results.filter(item => {
        const producto = String(item['Producto'] || '').toLowerCase();
        return producto.includes(searchName);
      });
    }

    if (priceMin !== undefined || priceMax !== undefined) {
      results = results.filter(item => {
        const finalPrice = formatPrice(item['PRECIO FINAL']);
        let passesMin = true;
        let passesMax = true;
        if (priceMin !== undefined) passesMin = finalPrice >= parseFloat(priceMin);
        if (priceMax !== undefined) passesMax = finalPrice <= parseFloat(priceMax);
        return passesMin && passesMax;
      });
    }

    const limitNum = parseInt(limit) || 50;
    if (results.length > limitNum) results = results.slice(0, limitNum);

    results.sort((a, b) => formatPrice(a['PRECIO FINAL']) - formatPrice(b['PRECIO FINAL']));

    const searchQuery = query || productId || productName || `price ${priceMin || 0}-${priceMax || '∞'}`;

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
        priceRange: { min: priceMin || null, max: priceMax || null },
        limit: limitNum
      },
      isLimited: priceListData.length > limitNum && results.length === limitNum
    };

    let markdownTable = "| Product ID | Product Name | Stock | Final Price |\n|:-----------|:-------------|:------|:------------|\n";
    if (results.length > 0) {
      results.slice(0, 10).forEach(item => {
        const formattedItem = formatProductPrices(item);
        markdownTable += `| ${formattedItem['ID Producto']} | ${formattedItem['Producto']} | ${formattedItem['Exit.']} | $${formattedItem['PRECIO FINAL']} |\n`;
      });
    } else {
      markdownTable += "| - | No matching products found | - | - |\n";
    }

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

    res.json({ raw: rawData, markdown: markdownTable, type: "markdown", desc: description });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Error during search' });
  }
});

// Product by ID
app.get('/api/price-list/product/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Product ID required' });

    const product = priceListData.find(item =>
      String(item['ID Producto'] || '').toLowerCase() === id.toLowerCase()
    );

    if (product) {
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

      const markdownTable = "| Field | Value |\n|:------|:------|\n" +
        `| Product ID | ${formattedProduct['ID Producto']} |\n` +
        `| Product Name | ${formattedProduct['Producto']} |\n` +
        `| Unit Cost | $${formattedProduct['Costo Uni Unitario']} |\n` +
        `| Stock | ${formattedProduct['Exit.']} |\n` +
        `| Cost with Tax | $${formattedProduct['COSTO CON IVA']} |\n` +
        `| Final Price | $${formattedProduct['PRECIO FINAL']} |`;

      const description = `🔍 Product Details\n\n` +
        `📦 Product: ${formattedProduct['Producto']}\n` +
        `💰 Final Price: $${formattedProduct['PRECIO FINAL']}\n` +
        `📊 Stock: ${formattedProduct['Exit.']}\n` +
        `✅ Product available for ordering.`;

      res.json({ raw: rawData, markdown: markdownTable, type: "markdown", desc: description });
    } else {
      res.status(404).json({
        raw: { searchedId: id, found: false },
        markdown: `| Search ID | ${id} | Status | Not Found |`,
        type: "markdown",
        desc: `❌ Product ID ${id} not found.`
      });
    }
  } catch (error) {
    console.error('Product query error:', error);
    res.status(500).json({ success: false, error: 'Error during product query' });
  }
});

// Reload Excel data
app.post('/api/price-list/reload', (req, res) => {
  const success = loadExcelData();
  res.json({ success, message: success ? 'Data reloaded' : 'Data loading failed', module: 'price-list', total: priceListData.length });
});

// Tire specification search API
app.post('/api/price-list/tire-search', (req, res) => {
  try {
    const {
      width, aspect_ratio, aspectRatio, rim_diameter, diameter,
      exact_match = false, limit = 10
    } = req.body;

    const finalAspectRatio = aspect_ratio || aspectRatio;
    const finalRimDiameter = rim_diameter || diameter;

    if (!width) {
      return res.status(400).json({
        success: false,
        error: 'Tire width (width) is a required parameter',
        usage: {
          car: '{ "width": 155, "aspect_ratio": 70, "rim_diameter": 13 }',
          truck: '{ "width": 1100, "rim_diameter": 22 }'
        }
      });
    }

    const searchType = finalAspectRatio ? 'car' : 'truck';
    const tireProducts = priceListData.map(product => ({
      ...product,
      tire_specs: parseTireSpecification(product['Producto'])
    })).filter(product => product.tire_specs.width !== null);

    const matchingTires = tireProducts.filter(product => {
      const specs = product.tire_specs;
      if (specs.width != width) return false;

      if (searchType === 'car') {
        const shouldUseExactMatch = exact_match || (finalAspectRatio && finalRimDiameter);
        if (shouldUseExactMatch) {
          const aspectMatch = specs.aspect_ratio == finalAspectRatio;
          let rimMatch = false;
          if (finalRimDiameter) {
            rimMatch = parseInt(String(finalRimDiameter).replace(/[rR]/g, '')) === parseInt(String(specs.rim_diameter).replace(/[rR]/g, ''));
          }
          return aspectMatch && rimMatch;
        } else {
          const aspectMatch = !finalAspectRatio || Math.abs(specs.aspect_ratio - finalAspectRatio) <= 5;
          let rimMatch = true;
          if (finalRimDiameter) {
            rimMatch = parseInt(String(finalRimDiameter).replace(/[rR]/g, '')) === parseInt(String(specs.rim_diameter).replace(/[rR]/g, ''));
          }
          return aspectMatch && rimMatch;
        }
      } else {
        if (!finalRimDiameter) return true;
        return parseInt(String(finalRimDiameter).replace(/[rR]/g, '')) === parseInt(String(specs.rim_diameter).replace(/[rR]/g, ''));
      }
    });

    matchingTires.sort((a, b) => formatPrice(a['PRECIO FINAL']) - formatPrice(b['PRECIO FINAL']));

    const searchSpec = searchType === 'car' ? `${width}/${finalAspectRatio}R${finalRimDiameter}` : `${width}R${finalRimDiameter}`;
    const resultLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const rawData = {
      searchType, searchSpec,
      totalFound: matchingTires.length,
      results: matchingTires.slice(0, resultLimit).map(tire => {
        const f = formatProductPrices(tire);
        return { id: f['ID Producto'], product: f['Producto'], stock: f['Exit.'], price: f['PRECIO FINAL'], specs: tire.tire_specs };
      }),
      searchParams: { width, aspectRatio: finalAspectRatio || null, diameter: finalRimDiameter || null, type: searchType, exactMatch: exact_match, limit: resultLimit }
    };

    let markdownTable = "| Product ID | Product Name | Stock | Price |\n|:-----------|:-------------|:------|:------|\n";
    if (matchingTires.length > 0) {
      matchingTires.slice(0, resultLimit).forEach(tire => {
        const f = formatProductPrices(tire);
        markdownTable += `| ${f['ID Producto']} | ${f['Producto']} | ${f['Exit.']} | $${f['PRECIO FINAL']} |\n`;
      });
    } else {
      markdownTable += "| - | No matching tires found | - | - |\n";
    }

    let description = `🔍 Tire Search - ${searchSpec}\n\n`;
    if (matchingTires.length > 0) {
      description += `Found ${matchingTires.length} tires:\n`;
      matchingTires.slice(0, resultLimit).forEach((tire, i) => {
        const f = formatProductPrices(tire);
        description += `${i + 1}. ${f['Producto']} - $${f['PRECIO FINAL']}\n`;
      });
    } else {
      description += `❌ No matching tires found\n`;
    }

    res.json({ raw: rawData, markdown: markdownTable, type: "markdown", desc: description });

  } catch (error) {
    console.error('Tire search error:', error);
    res.status(500).json({ success: false, error: 'Error during tire search' });
  }
});

// =====================================================
// Función para buscar en la API pública de Magno
// (Sin autenticación requerida)
// =====================================================
async function fetchMagnoPublic(busqueda) {
  const payload = {
    idEmpG: MAGNO_PUBLIC_ID_EMPG,
    busqueda: busqueda
  };

  console.log(`🔍 Magno API pública - busqueda: "${busqueda}"`);

  const response = await fetch(MAGNO_PUBLIC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'No response body');
    console.error(`❌ Magno API pública error: ${response.status}`, errorText);
    throw new Error(`Magno API error ${response.status}: ${errorText}`);
  }

  try {
    return await response.json();
  } catch (parseError) {
    console.error("❌ Error parseando respuesta de Magno:", parseError);
    throw new Error("La respuesta de Magno no es JSON válido");
  }
}

// Tire specification search API - Spanish version
app.post('/api/price-list/tire-search-es', async (req, res) => {
  try {
    const {
      width, aspect_ratio, aspectRatio, rim_diameter, diameter,
      exact_match = false, limit = 10
    } = req.body;
    const brand = ""

    let finalAspectRatio = aspect_ratio || aspectRatio;
    const finalRimDiameter = rim_diameter || diameter;

    if (
      (width == '205' || width == '255') &&
      finalRimDiameter == '18' &&
      finalAspectRatio == null
    ) {
      finalAspectRatio = 70;
    }

    if (!width) {
      return res.status(400).json({
        success: false,
        error: 'El ancho del neumático (width) es un parámetro requerido'
      });
    }

    const searchType = finalAspectRatio ? 'car' : 'truck';

    console.log(`🔍 Tire search (ES): ${searchType} - W:${width}, AR:${finalAspectRatio || 'N/A'}, D:${finalRimDiameter || 'N/A'}`);

    const textFind = `${width} ${finalAspectRatio ? finalAspectRatio : ""} ${finalRimDiameter.toString().replaceAll("R", "")} ${brand || ""}`.trim();

    // =====================================================
    // Usar la nueva API pública (sin auth)
    // =====================================================
    let matchingTires = await fetchMagnoPublic(textFind);

    const regex = new RegExp(
      `${width}(?:(?:\\s+${finalAspectRatio})?\\s+(Z?R?${finalRimDiameter.replace("R", "")})|\\/${finalAspectRatio}\\s*Z?R(F?)\\s*${finalRimDiameter.replace("R", "")})`,
      "i"
    );

    matchingTires = matchingTires.filter(p =>
      p.existencia && p.existencia > 0 && regex.test(p.descripcion)
    );

    matchingTires.sort((a, b) => formatPrice(a['precioNeto']) - formatPrice(b['precioNeto']));

    const searchSpec = searchType === 'car'
      ? `${width}/${finalAspectRatio}R${finalRimDiameter}`
      : `${width}R${finalRimDiameter}`;

    const resultLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const rawData = {
      searchType, searchSpec,
      totalFound: matchingTires.length,
      results: matchingTires.slice(0, resultLimit).map(tire => {
        const f = formatProductPrices(tire);
        return {
          id: f['clave'], product: f['descripcion'], stock: f['existencia'], price: f['precioNeto'],
          specs: { width, aspect_ratio: finalAspectRatio, rim_diameter: finalRimDiameter, type: "car", original: f['descripcion'] }
        };
      }),
      searchParams: { width, aspectRatio: finalAspectRatio || null, diameter: finalRimDiameter || null, type: searchType, exactMatch: exact_match, limit: resultLimit },
      statistics: { totalTireProducts: matchingTires.length, carTires: matchingTires.length }
    };

    let markdownTable = "| # | Nombre del Producto | Stock | Precio |\n|:------------|:--------------------|:------|:-------|\n";
    if (matchingTires.length > 0) {
      matchingTires.slice(0, resultLimit).forEach((tire, index) => {
        const f = formatProductPrices(tire);
        markdownTable += `| ${index + 1} | ${f['descripcion']} | ${f['existencia']} | $${f['precioNeto']} |\n`;
      });
    } else {
      markdownTable += "| - | No se encontraron neumáticos | - | - |\n";
    }

    let description = ``;

    if (matchingTires.length > 0) {
      description += `*Llantas ${searchSpec}:*\n`;
      matchingTires.forEach((tire, index) => {
        const f = formatProductPrices(tire);
        description += `${index + 1}. ${f['descripcion']} - *$${f['precioNeto'].toFixed(0)}* (Disponible: ${f['existencia']})\n\n`;
      });

      description += `🎁 *¡PROMOCIÓN ESPECIAL!*\n`;
      description += `Mencione el código de promoción *DYNA25* al visitarnos y llévese un termo o lonchera ¡GRATIS! en la compra de sus llantas.\n\n`;
      description += `✅ *Incluye*: Instalación profesional, válvula nueva, balanceo por computadora, inflado con nitrógeno, garantía de 12 meses rotación gratis a partir de 2 llantas\n`;
      description += `\n📦 *Importante:* Le recomendamos confirmar el stock antes de su visita, ya que nuestro inventario se mueve constantemente.\n`;
      description += `¿Le gustaría que le agende una cita para la instalación de sus llantas, o prefiere visitarnos directamente en el horario que le acomode?`;
    } else {
      await agregarFilaLlantas(textFind);
      description += `❌ Lamentamos informarle que no encontramos llantas ${textFind} en nuestro inventario actual\n\n`;
      description += `🌟 ¡Pero no se preocupe! Podemos gestionar un *pedido especial* para usted. Las llantas por pedido tardan aproximadamente 1 día hábil en llegar\n\n`;
      description += `📞 Para coordinar su pedido especial, contacte a nuestro equipo de servicio al cliente:\n`;
      description += `*55 2637 3003*`;
    }

    res.json({ raw: rawData, markdown: markdownTable, type: "markdown", desc: description });

  } catch (error) {
    console.error('Tire search error (ES):', error);
    res.status(500).json({ success: false, error: 'Ocurrió un error durante la búsqueda de neumáticos' });
  }
});


async function getChatSummary(user_question) {
  try {
    const prompt = `Parametros "${user_question}"`;
    const requestData = { username: AS_ACCOUNT, question: prompt };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cybertron-robot-key': AGENT_KEY,
        'cybertron-robot-token': AGENT_TOKEN
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.answer;

  } catch (error) {
    console.error('Error getting chat summary:', error);
    throw error;
  }
}


// =====================================================
// Endpoint tire-search-es-new (usa API pública)
// =====================================================
app.post('/api/price-list/tire-search-es-new', async (req, res) => {
  try {
    const { parametros, limit = 10 } = req.body;
    const brand = "";

    console.log(`Parámetros raw = ${parametros}`);

    const parametrosJsonString = await getChatSummary(parametros);

    let jsonToParse = parametrosJsonString;
    const jsonMatch = parametrosJsonString.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) jsonToParse = jsonMatch[1];

    const cleanedJsonString = jsonToParse.replace(/[^\S \t\r\n]/g, ' ').trim();
    console.log(`Parámetros parseados = ${cleanedJsonString}`);

    let tireQueries = [];
    try {
      tireQueries = JSON.parse(cleanedJsonString);
      if (!Array.isArray(tireQueries)) throw new Error("La respuesta del LLM no fue un arreglo JSON.");
    } catch (e) {
      console.error("Error parseando la respuesta de getChatSummary:", e);
      console.error("JSON (limpio) que falló:", cleanedJsonString);
      return res.status(500).json({ success: false, error: 'Error al procesar las medidas de las llantas.' });
    }

    let allRawResults = [];
    let combinedMarkdownTable = "| # | Nombre del Producto | Stock | Precio |\n|:------------|:--------------------|:------|:-------|\n";
    let combinedDescription = "";
    let combinedSearchParams = [];
    let totalFound = 0;
    const resultLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    let tireSpecs = [];

    for (const tireQuery of tireQueries) {
      const { width, aspect_ratio, rim_diameter } = tireQuery;

      let finalAspectRatio = aspect_ratio ? aspect_ratio : "";
      const finalRimDiameter = rim_diameter ? rim_diameter : "";

      if (
        (width == '205' || width == '255') &&
        finalRimDiameter == '18' &&
        (finalAspectRatio == null || finalAspectRatio === undefined)
      ) {
        finalAspectRatio = '70';
      }

      const searchType = finalAspectRatio ? 'car' : 'truck';
      const searchSpec = searchType === 'car'
        ? `${width}/${finalAspectRatio}R${finalRimDiameter}`
        : `${width}R${finalRimDiameter}`;

      console.log(`🔍 Buscando llanta ${searchSpec} (W:${width}, AR:${finalAspectRatio || 'N/A'}, D:${finalRimDiameter || 'N/A'})...`);
      tireSpecs.push(searchSpec);

      const textFind = `${width} ${finalAspectRatio ? finalAspectRatio : ""} ${finalRimDiameter ? finalRimDiameter.toString().replaceAll("R", "") : ""} ${brand || ""}`.trim();

      // =====================================================
      // Usar la API pública (sin auth)
      // =====================================================
      let matchingTires = [];
      try {
        matchingTires = await fetchMagnoPublic(textFind);
      } catch (err) {
        console.error(`❌ Error buscando ${searchSpec}:`, err.message);
        matchingTires = [];
      }

      const cleanRim = finalRimDiameter.toString().replace("R", "");
      const arPart = finalAspectRatio ? `[\\/\\s]*${finalAspectRatio}` : "";
      const regex = new RegExp(`${width}${arPart}[\\/\\s]*Z?R?F?${cleanRim}`, "i");

      matchingTires = matchingTires.filter(p =>
        p.existencia && p.existencia > 0 && regex.test(p.descripcion) && formatPrice(p['precioNeto']) > 0
      );

      matchingTires.sort((a, b) => formatPrice(a['precioNeto']) - formatPrice(b['precioNeto']));

      totalFound += matchingTires.length;
      combinedSearchParams.push({
        width, aspectRatio: finalAspectRatio || null,
        diameter: finalRimDiameter || null, type: searchType, limit: resultLimit
      });

      const formattedResults = matchingTires.slice(0, resultLimit).map(tire => {
        const f = formatProductPricesNew(tire);
        return {
          id: f['clave'], product: f['descripcion'], stock: f['existencia'], price: f['precioNeto'],
          specs: { width, aspect_ratio: finalAspectRatio, rim_diameter: finalRimDiameter, type: searchType, original: f['descripcion'] }
        };
      });
      allRawResults.push(...formattedResults);

      if (matchingTires.length > 0) {
        combinedMarkdownTable += `| **Llantas ${searchSpec}** | | | |\n`;
        matchingTires.slice(0, resultLimit).forEach((tire, index) => {
          const f = formatProductPricesNew(tire);
          combinedMarkdownTable += `| ${index + 1} | ${f['descripcion']} | ${parseInt(f['existencia'])} | $${f['precioNeto']} |\n`;
        });
      } else {
        combinedMarkdownTable += `| - | No se encontraron llantas ${searchSpec} | - | - |\n`;
      }

      if (matchingTires.length > 0) {
        combinedDescription += `*Llantas ${searchSpec}:*\n`;
        matchingTires.slice(0, resultLimit).forEach((tire, index) => {
          const f = formatProductPricesNew(tire);
          combinedDescription += `${index + 1}. ${f['descripcion']} - *$${f['precioNeto'].toFixed(0)}* (Disponible: ${parseInt(f['existencia'])})\n\n`;
        });
      } else {
        await agregarFilaLlantas(textFind);
        combinedDescription += `❌ No encontramos llantas ${searchSpec} (param: ${textFind}).\n\n`;
      }
    }

    const rawData = {
      searchType: "multiple",
      searchParams: combinedSearchParams,
      totalFound,
      results: allRawResults,
      statistics: {
        totalTireProducts: totalFound,
        carTires: allRawResults.filter(p => p.specs.type === 'car').length,
        truckTires: allRawResults.filter(p => p.specs.type === 'truck').length
      }
    };

    let finalDescription = combinedDescription;
    if (totalFound > 0) {
      finalDescription += `🎁 Mencione el código *DYNA25* al visitarnos y llévese un termo o lonchera ¡GRATIS! en la compra de sus llantas.\n\n`;
      finalDescription += `✅ *Incluye*: Instalación profesional, válvula nueva, balanceo por computadora, inflado con nitrógeno, garantía de 12 meses y rotación gratis a partir de 2 llantas\n`;
      finalDescription += `\n📦 *Importante:* Le recomendamos confirmar el stock antes de su visita, ya que nuestro inventario se mueve constantemente.\n`;
      finalDescription += `¿Le gustaría que le agende una cita para la instalación de sus llantas, o prefiere visitarnos directamente en el horario que le acomode?`;
    } else {
      const mensaje = encodeURIComponent(`¡Hola! Me gustaria ordenar unas llantas ${tireSpecs.toString()} sobre pedido`);
      const enlaceLargoWhatsApp = `https://wa.me/${"+525553188770"}?text=${mensaje}`;
      finalDescription += `🌟 ¡Pero no se preocupe! Podemos gestionar un *pedido especial* para usted. Las llantas sobre pedido tardan aproximadamente 1 día hábil en llegar\n\n`;
      finalDescription += `📞 Para coordinar su pedido especial, contacte a nuestro equipo de servicio al cliente por medio del siguiente link, ellos le brindaran una cotización de las llantas sobre pedido:\n`;
      finalDescription += `${enlaceLargoWhatsApp} \n`;
      finalDescription += `O si lo prefiere, puede marcar al siguiente número:\n`;
      finalDescription += `*55 2637 3003*`;
    }

    res.json({ raw: rawData, markdown: combinedMarkdownTable, type: "markdown", desc: finalDescription });

  } catch (error) {
    console.error('Tire search error (ES) - Handler principal:', error);
    res.status(500).json({ success: false, error: 'Ocurrió un error durante la búsqueda de neumáticos' });
  }
});

// Demo tire search
app.post('/api/price-list/tire-search-es-demo', async (req, res) => {
  try {
    const {
      width, aspect_ratio, aspectRatio, rim_diameter, diameter,
      exact_match = false, brand, limit = 10
    } = req.body;

    let finalAspectRatio = aspect_ratio || aspectRatio;
    const finalRimDiameter = rim_diameter || diameter;

    if (
      (width == '205' || width == '255') &&
      finalRimDiameter == '18' &&
      finalAspectRatio == null
    ) {
      finalAspectRatio = 70;
    }

    if (!width) {
      return res.status(400).json({ success: false, error: 'El ancho del neumático (width) es un parámetro requerido' });
    }

    const searchType = finalAspectRatio ? 'car' : 'truck';
    const textFind = `${width} ${finalAspectRatio ? finalAspectRatio : ""} ${finalRimDiameter.toString().replaceAll("R", "")} ${brand || ""}`.trim();

    console.log(`🔍 Demo search: ${textFind}`);

    // =====================================================
    // Usar la API pública (sin auth)
    // =====================================================
    let matchingTires = await fetchMagnoPublic(textFind);

    const regex = new RegExp(
      `${width}(?:(?:\\s+${finalAspectRatio || ""})?\\s+(Z?R?${finalRimDiameter.replace("R", "")})|\\/${finalAspectRatio || ""}\\s*Z?R(F?)\\s*${finalRimDiameter.replace("R", "")})`,
      "i"
    );

    matchingTires = matchingTires.filter(p =>
      p.existencia && p.existencia > 0 && regex.test(p.descripcion)
    );

    matchingTires.sort((a, b) => formatPrice(a['precioNeto']) - formatPrice(b['precioNeto']));

    const searchSpec = searchType === 'car'
      ? `${width}/${finalAspectRatio}R${finalRimDiameter}`
      : `${width}R${finalRimDiameter}`;

    const resultLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const rawData = {
      searchType, searchSpec,
      totalFound: matchingTires.length,
      results: matchingTires.slice(0, resultLimit).map(tire => {
        const f = formatProductPrices(tire);
        return {
          id: f['clave'], product: f['descripcion'], stock: f['existencia'], price: f['precioNeto'],
          specs: { width, aspect_ratio: finalAspectRatio, rim_diameter: finalRimDiameter, type: "car", original: f['descripcion'] }
        };
      }),
      searchParams: { width, aspectRatio: finalAspectRatio || null, diameter: finalRimDiameter || null, type: searchType, exactMatch: exact_match, limit: resultLimit },
      statistics: { totalTireProducts: matchingTires.length, carTires: matchingTires.length }
    };

    let markdownTable = "| # | Nombre del Producto | Stock | Precio |\n|:------------|:--------------------|:------|:-------|\n";
    if (matchingTires.length > 0) {
      matchingTires.slice(0, resultLimit).forEach((tire, index) => {
        const f = formatProductPrices(tire);
        markdownTable += `| ${index + 1} | ${f['descripcion']} | ${f['existencia']} | $${f['precioNeto']} |\n`;
      });
    } else {
      markdownTable += "| - | No se encontraron neumáticos | - | - |\n";
    }

    let description = ``;

    if (matchingTires.length > 0) {
      description += `*Llantas ${searchSpec}:*\n`;
      matchingTires.forEach((tire, index) => {
        const f = formatProductPrices(tire);
        description += `${index + 1}. ${f['descripcion']} - *$${f['precioNeto'].toFixed(0)}* (Disponible: ${f['existencia']})\n\n`;
      });

      description += `🎁 *¡PROMOCIÓN ESPECIAL!*\n`;
      description += `Mencione el código de promoción *DYNA25* al visitarnos y llévese un termo o lonchera ¡GRATIS! en la compra de sus llantas.\n\n`;
      description += `✅ *Incluye*: Instalación profesional, válvula nueva, balanceo por computadora, inflado con nitrógeno, garantía de 12 meses rotación gratis a partir de 2 llantas\n`;
      description += `\n📦 *Importante:* Le recomendamos confirmar el stock antes de su visita, ya que nuestro inventario se mueve constantemente.\n\n`;
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

    res.json({ raw: rawData, markdown: markdownTable, type: "markdown", desc: description });

  } catch (error) {
    console.error('Tire search error (ES demo):', error);
    res.status(500).json({ success: false, error: 'Ocurrió un error durante la búsqueda de neumáticos' });
  }
});

// Appointment creation
app.post('/api/appointment/create', async (req, res) => {
  try {
    const { llanta, servicio, nombre, numero_contacto, fecha, hora } = req.body;

    console.log("Appointment:", { llanta, nombre, numero_contacto, fecha, hora });

    const num_registros = await obtenerNumeroFilas();
    const appointment_code = `CRDYNA${num_registros}`;

    const row_data = [
      appointment_code, nombre, numero_contacto || "",
      llanta || "", servicio || "", fecha || "", hora || ""
    ];

    const response_add_row = await agregarFila(row_data);

    if (response_add_row) {
      const rawData = {
        estado_reservacion: "Generada exitosamente",
        codigo_reservacion: appointment_code,
        datos_reserva: { nombre, servicio: servicio || "", llanta: llanta || "", fecha: fecha || "", hora: hora || "" }
      };

      let description = `📅 ¡Su reservación ha sido generada exitosamente!\n\n`;
      description += `🔑 Código de reservación: **${appointment_code}**\n\n`;
      description += `📋 Detalles de su reservación:\n`;
      description += `• 👤 Nombre: ${nombre}\n`;
      description += `• 🔧 Servicio: ${servicio || "N/A"}\n`;
      description += `• 🛞 Llanta: ${llanta || "N/A"}\n`;
      description += `• 📆 Fecha: ${fecha || "N/A"}\n`;
      description += `• ⏰ Hora: ${hora || "N/A"}\n\n`;
      description += `🤝 Le esperamos en nuestra sucursal:\n`;
      description += `📍 Calz de las Armas 591, Col. Providencia, Azcapotzalco CDMX, CP 02440\n`;
      description += `📞 Tel: 55 2637 3003\n`;
      description += `🕐 Horarios: Lunes-Viernes 9:00-18:00 • Sábados 9:00-15:00\n\n`;

      res.json({ raw: rawData, markdown: "| Se agendó la reservación con exito |\n", type: "markdown", desc: description });
    } else {
      let description = `⚠️ Lamentamos informarle que **no se pudo generar su reservación en este momento**.\n\n`;
      description += `🙏 Por favor, intente nuevamente en unos minutos o comuníquese con nosotros.\n`;
      description += `📞 Tel: 55 2637 3003`;

      res.json({
        raw: { estado_reservacion: "No se pudo generar", codigo_reservacion: appointment_code },
        markdown: "| ❌ No se pudo agendar la reservación |\n",
        type: "markdown", desc: description
      });
    }
  } catch (error) {
    console.error('Appointment creation error', error);
    res.status(500).json({ success: false, error: 'Ocurrió un error al crear la reservacion' });
  }
});

// Appointment creation - Demo
app.post('/api/appointment/create-demo', async (req, res) => {
  try {
    const { llanta, servicio, nombre, numero_contacto, fecha, hora } = req.body;

    console.log("Demo Appointment:", { llanta, nombre, numero_contacto, fecha, hora });

    const num_registros = await obtenerNumeroFilasDemo();
    const appointment_code = `CRDYNA${num_registros}`;

    const row_data = [
      appointment_code, nombre, numero_contacto || "",
      llanta || "", servicio || "", fecha || "", hora || ""
    ];

    const response_add_row = await agregarFilaDemo(row_data);

    if (response_add_row) {
      const rawData = {
        estado_reservacion: "Generada exitosamente",
        codigo_reservacion: appointment_code,
        datos_reserva: { nombre, servicio: servicio || "", llanta: llanta || "", fecha: fecha || "", hora: hora || "" }
      };

      let description = `📅 ¡Su reservación ha sido generada exitosamente!\n\n`;
      description += `🔑 Código de reservación: **${appointment_code}**\n\n`;
      description += `📋 Detalles de su reservación:\n`;
      description += `• 👤 Nombre: ${nombre}\n`;
      description += `• 🔧 Servicio: ${servicio || "N/A"}\n`;
      description += `• 🛞 Llanta: ${llanta || "N/A"}\n`;
      description += `• 📆 Fecha: ${fecha || "N/A"}\n`;
      description += `• ⏰ Hora: ${hora || "N/A"}\n\n`;
      description += `🤝 Le esperamos en nuestra sucursal:\n`;
      description += `📍 Calz de las Armas 591, Col. Providencia, Azcapotzalco CDMX, CP 02440\n`;
      description += `📞 Tel: 55 2637 3003\n`;
      description += `🕐 Horarios: Lunes-Viernes 9:00-18:00 • Sábados 9:00-15:00\n\n`;

      res.json({ raw: rawData, markdown: "| Se agendó la reservación con exito |\n", type: "markdown", desc: description });
    } else {
      let description = `⚠️ No se pudo generar su reservación.\n`;
      description += `📞 Tel: 55 2637 3003`;

      res.json({
        raw: { estado_reservacion: "No se pudo generar" },
        markdown: "| ❌ No se pudo agendar la reservación |\n",
        type: "markdown", desc: description
      });
    }
  } catch (error) {
    console.error('Appointment creation error (demo)', error);
    res.status(500).json({ success: false, error: 'Ocurrió un error al crear la reservacion' });
  }
});

// Tire specification parsing test endpoint
app.post('/api/price-list/tire-parse', (req, res) => {
  try {
    const { product_name } = req.body;
    if (!product_name) return res.status(400).json({ success: false, error: 'product_name required' });

    const specs = parseTireSpecification(product_name);
    res.json({ success: true, input: product_name, parsed_specs: specs, is_parseable: specs.width !== null });
  } catch (error) {
    console.error('Tire parsing error:', error);
    res.status(500).json({ success: false, error: 'Error during parsing' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Backward compatible route redirects
app.get('/api/health', (req, res) => res.redirect('/api/price-list/health'));
app.get('/api/products', (req, res) => res.redirect('/api/price-list/products'));
app.post('/api/product/search', (req, res) => { req.url = '/api/price-list/search'; app.handle(req, res); });
app.get('/api/product/id/:id', (req, res) => { res.redirect(`/api/price-list/product/${req.params.id}`); });
app.post('/api/reload', (req, res) => { req.url = '/api/price-list/reload'; app.handle(req, res); });

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