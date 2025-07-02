const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 限流器
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP每15分钟最多100次请求
  message: '请求过于频繁，请稍后再试'
});
app.use(limiter);

// 全局变量存储Excel数据
let priceListData = [];

// 读取Excel文件
function loadExcelData() {
  try {
    // 使用绝对路径确保在Vercel环境中能找到文件
    const excelPath = path.join(__dirname, 'LISTA DE PRECIOS 25062025.xlsx');
    console.log('尝试加载Excel文件:', excelPath);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON格式
    priceListData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`成功加载 ${priceListData.length} 条数据`);
    console.log('数据样本:', priceListData.slice(0, 2));
    return true;
  } catch (error) {
    console.error('加载Excel文件失败:', error.message);
    console.error('当前工作目录:', process.cwd());
    console.error('__dirname:', __dirname);
    
    // 尝试列出当前目录的文件
    try {
      const files = fs.readdirSync(process.cwd());
      console.error('当前目录文件:', files.filter(f => f.includes('.xlsx')));
    } catch (fsError) {
      console.error('无法读取目录:', fsError.message);
    }
    
    return false;
  }
}

// 启动时加载数据
loadExcelData();

// 轮胎规格解析函数
function parseTireSpecification(productName) {
  const name = String(productName || '').trim();
  
  // 轮胎规格解析结果
  const specs = {
    width: null,
    aspect_ratio: null,
    rim_diameter: null,
    type: null, // 'car' 或 'truck'
    original: name
  };

  // 小型轿车轮胎格式: 155 70 13 75T MIRAGE MR-166 AUTO
  // 格式: 宽度 扁平比 直径 [其他信息]
  const carTirePattern = /^(\d{3})\s+(\d{2})\s+(\d{2})\s/;
  const carMatch = name.match(carTirePattern);
  
  if (carMatch) {
    specs.width = parseInt(carMatch[1]);
    specs.aspect_ratio = parseInt(carMatch[2]);
    specs.rim_diameter = parseInt(carMatch[3]);
    specs.type = 'car';
    return specs;
  }

  // 货车轮胎格式: 1100 R22 T-2400 14/C
  // 格式: 宽度 R直径 [其他信息]
  const truckTirePattern = /^(\d{3,4})\s+R(\d{2})\s/;
  const truckMatch = name.match(truckTirePattern);
  
  if (truckMatch) {
    specs.width = parseInt(truckMatch[1]);
    specs.rim_diameter = parseInt(truckMatch[2]);
    specs.type = 'truck';
    return specs;
  }

  // 其他可能的轮胎格式
  // 格式: 155/70R13 或 155/70-13
  const standardPattern = /(\d{3})\/(\d{2})[-R](\d{2})/;
  const standardMatch = name.match(standardPattern);
  
  if (standardMatch) {
    specs.width = parseInt(standardMatch[1]);
    specs.aspect_ratio = parseInt(standardMatch[2]);
    specs.rim_diameter = parseInt(standardMatch[3]);
    specs.type = 'car';
    return specs;
  }

  return specs; // 无法解析的情况
}

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: 'API Hub - 价格清单服务',
    version: '2.0.0',
    description: 'API集成中心 - 价格清单模块',
    modules: {
      'price-list': {
        name: '价格清单API',
        endpoints: {
          '/api/price-list/health': 'GET - 健康检查',
          '/api/price-list/products': 'GET - 获取所有产品',
          '/api/price-list/search': 'POST - 搜索产品',
          '/api/price-list/tire-search': 'POST - 轮胎规格搜索',
          '/api/price-list/tire-parse': 'POST - 轮胎规格解析',
          '/api/price-list/product/:id': 'GET - 根据产品ID获取产品信息',
          '/api/price-list/reload': 'POST - 重新加载Excel数据'
        }
      }
    },
    usage: {
      input: 'query - 产品ID或产品名称',
      output: 'producto - 产品的完整信息'
    }
  });
});

// API模块路由 - 价格清单
app.get('/api/price-list', (req, res) => {
  res.json({
    module: '价格清单API',
    version: '2.0.0',
    endpoints: {
      '/api/price-list/health': 'GET - 健康检查',
      '/api/price-list/products': 'GET - 获取所有产品',
      '/api/price-list/search': 'POST - 搜索产品',
      '/api/price-list/tire-search': 'POST - 轮胎规格搜索',
      '/api/price-list/tire-parse': 'POST - 轮胎规格解析',
      '/api/price-list/product/:id': 'GET - 根据产品ID获取产品信息',
      '/api/price-list/reload': 'POST - 重新加载Excel数据'
    },
    dataFields: {
      'ID Producto': '产品ID',
      'Producto': '产品名称',
      'Costo Uni Unitario': '单位成本',
      'Exit.': '库存',
      'COSTO CON IVA': '含税成本',
      'PRECIO FINAL': '最终价格'
    }
  });
});

// 健康检查端点
app.get('/api/price-list/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dataLoaded: priceListData.length > 0,
    totalRecords: priceListData.length,
    module: 'price-list'
  });
});

// 获取所有产品
app.get('/api/price-list/products', (req, res) => {
  res.json({
    success: true,
    message: '获取所有产品成功',
    module: 'price-list',
    data: priceListData,
    total: priceListData.length
  });
});

// 产品搜索API - 支持多参数搜索
app.post('/api/price-list/search', (req, res) => {
  try {
    const { 
      query,           // 通用搜索（产品ID或名称）
      productId,       // 精确产品ID搜索
      productName,     // 产品名称搜索
      priceMin,        // 最低价格
      priceMax,        // 最高价格
      limit = 50       // 限制结果数量，默认50
    } = req.body;
    
    // 至少需要一个搜索条件
    if (!query && !productId && !productName && !priceMin && !priceMax) {
      return res.status(400).json({
        success: false,
        error: '至少需要一个搜索参数',
        supportedParams: {
          query: '通用搜索（产品ID或名称）',
          productId: '精确产品ID搜索',
          productName: '产品名称搜索',
          priceMin: '最低价格筛选',
          priceMax: '最高价格筛选',
          limit: '限制结果数量（默认50）'
        },
        examples: {
          basic: { query: "1100" },
          advanced: { 
            productName: "产品",
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

    // 应用搜索过滤器
    if (query) {
      const searchTerm = String(query).toLowerCase().trim();
      results = results.filter(item => {
        const idProducto = String(item['ID Producto'] || '').toLowerCase();
        const producto = String(item['Producto'] || '').toLowerCase();
        return idProducto.includes(searchTerm) || producto.includes(searchTerm);
      });
    }

    // 精确产品ID搜索
    if (productId) {
      const searchId = String(productId).toLowerCase().trim();
      results = results.filter(item => {
        const idProducto = String(item['ID Producto'] || '').toLowerCase();
        return idProducto.includes(searchId);
      });
    }

    // 产品名称搜索
    if (productName) {
      const searchName = String(productName).toLowerCase().trim();
      results = results.filter(item => {
        const producto = String(item['Producto'] || '').toLowerCase();
        return producto.includes(searchName);
      });
    }

    // 价格范围筛选
    if (priceMin !== undefined || priceMax !== undefined) {
      results = results.filter(item => {
        const finalPrice = parseFloat(item['PRECIO FINAL']) || 0;
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

    // 限制结果数量
    const limitNum = parseInt(limit) || 50;
    if (results.length > limitNum) {
      results = results.slice(0, limitNum);
    }

    // 排序：按价格排序（可选）
    results.sort((a, b) => {
      const priceA = parseFloat(a['PRECIO FINAL']) || 0;
      const priceB = parseFloat(b['PRECIO FINAL']) || 0;
      return priceA - priceB;
    });

    // 格式化为统一的Agent响应格式
    const searchQuery = query || productId || productName || `价格${priceMin || 0}-${priceMax || '∞'}`;
    
    // 原始数据
    const rawData = {
      totalFound: results.length,
      searchQuery: searchQuery,
      results: results.slice(0, 10).map(item => ({
        id: item['ID Producto'],
        product: item['Producto'],
        unitCost: item['Costo Uni Unitario'],
        stock: item['Exit.'],
        costWithTax: item['COSTO CON IVA'],
        finalPrice: item['PRECIO FINAL']
      })),
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

    // Markdown表格格式
    let markdownTable = "| 产品ID | 产品名称 | 库存 | 最终价格 |\n|:-------|:---------|:-----|:--------|\n";
    if (results.length > 0) {
      results.slice(0, 5).forEach(item => {
        markdownTable += `| ${item['ID Producto']} | ${item['Producto']} | ${item['Exit.']} | $${item['PRECIO FINAL']} |\n`;
      });
    } else {
      markdownTable += "| - | 未找到匹配产品 | - | - |\n";
    }

    // 描述信息
    let description = `🔍 产品搜索结果\n\n`;
    description += `📊 搜索统计:\n`;
    description += `• 找到产品: ${results.length} 个\n`;
    description += `• 搜索关键词: ${searchQuery}\n\n`;
    
    if (results.length > 0) {
      const prices = results.map(item => parseFloat(item['PRECIO FINAL']) || 0).sort((a, b) => a - b);
      description += `💰 价格范围: $${prices[0]} - $${prices[prices.length-1]}\n\n`;
      description += `🏆 推荐产品:\n`;
      results.slice(0, 3).forEach((item, index) => {
        description += `${index + 1}. ${item['Producto']} - $${item['PRECIO FINAL']}\n`;
      });
      
      if (results.length > 3) {
        description += `\n... 还有 ${results.length - 3} 个其他产品`;
      }
    } else {
      description += `❌ 未找到匹配的产品\n`;
      description += `💡 建议:\n`;
      description += `• 检查搜索关键词拼写\n`;
      description += `• 尝试使用更通用的关键词\n`;
      description += `• 使用产品ID进行精确搜索`;
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
      const rawData = {
        id: product['ID Producto'],
        product: product['Producto'],
        unitCost: product['Costo Uni Unitario'],
        stock: product['Exit.'],
        costWithTax: product['COSTO CON IVA'],
        finalPrice: product['PRECIO FINAL'],
        searchedId: id
      };

      // Markdown表格格式
      const markdownTable = "| 字段 | 值 |\n|:-----|:---|\n" +
        `| 产品ID | ${product['ID Producto']} |\n` +
        `| 产品名称 | ${product['Producto']} |\n` +
        `| 单位成本 | $${product['Costo Uni Unitario']} |\n` +
        `| 库存 | ${product['Exit.']} |\n` +
        `| 含税成本 | $${product['COSTO CON IVA']} |\n` +
        `| 最终价格 | $${product['PRECIO FINAL']} |`;

      // 描述信息
      const description = `🔍 产品详情查询结果\n\n` +
        `📦 产品信息:\n` +
        `• 产品ID: ${product['ID Producto']}\n` +
        `• 产品名称: ${product['Producto']}\n` +
        `• 库存状态: ${product['Exit.']}\n` +
        `• 最终价格: $${product['PRECIO FINAL']}\n\n` +
        `💰 价格明细:\n` +
        `• 单位成本: $${product['Costo Uni Unitario']}\n` +
        `• 含税成本: $${product['COSTO CON IVA']}\n` +
        `• 最终售价: $${product['PRECIO FINAL']}\n\n` +
        `✅ 产品可用，可以进行订购或询价。`;

      res.json({
        raw: rawData,
        markdown: markdownTable,
        type: "markdown",
        desc: description
      });
    } else {
      // 未找到产品的统一格式
      const rawData = {
        searchedId: id,
        found: false,
        error: "Product not found"
      };

      const markdownTable = "| 字段 | 值 |\n|:-----|:---|\n" +
        `| 搜索ID | ${id} |\n` +
        `| 状态 | 未找到 |`;

      const description = `❌ 产品查询失败\n\n` +
        `🔍 搜索的产品ID: ${id}\n\n` +
        `💡 建议:\n` +
        `• 检查产品ID是否正确\n` +
        `• 使用产品搜索功能查找相似产品\n` +
        `• 联系客服确认产品信息`;

      res.status(404).json({
        raw: rawData,
        markdown: markdownTable,
        type: "markdown",
        desc: description
      });
    }

  } catch (error) {
    console.error('产品查询错误:', error);
    res.status(500).json({
      success: false,
      error: '产品查询过程中发生错误'
    });
  }
});

// 重新加载Excel数据
app.post('/api/price-list/reload', (req, res) => {
  const success = loadExcelData();
  res.json({
    success: success,
    message: success ? '数据重新加载成功' : '数据加载失败',
    module: 'price-list',
    total: priceListData.length
  });
});

// 轮胎规格搜索API
app.post('/api/price-list/tire-search', (req, res) => {
  try {
    // 支持两种参数格式以保持兼容性
    const { 
      width, 
      aspect_ratio, 
      aspectRatio, 
      rim_diameter, 
      diameter, 
      exact_match = false 
    } = req.body;
    
    // 参数映射处理
    const finalAspectRatio = aspect_ratio || aspectRatio;
    const finalRimDiameter = rim_diameter || diameter;
    
    // 参数验证
    if (!width) {
      return res.status(400).json({
        success: false,
        error: '轮胎宽度(width)是必需参数',
        usage: {
          car: '小型轿车: { "width": 155, "aspect_ratio": 70, "rim_diameter": 13 }',
          truck: '货车: { "width": 1100, "rim_diameter": 22 }'
        },
        examples: {
          car_search: {
            width: 155,
            aspect_ratio: 70,
            rim_diameter: 13
          },
          truck_search: {
            width: 1100,
            rim_diameter: 22
          }
        }
      });
    }

    // 确定搜索类型
    const searchType = finalAspectRatio ? 'car' : 'truck';
    
    console.log(`🔍 轮胎规格搜索: ${searchType} - 宽度:${width}, 扁平比:${finalAspectRatio || 'N/A'}, 直径:${finalRimDiameter || 'N/A'}`);

    // 解析所有产品的轮胎规格
    const tireProducts = priceListData.map(product => {
      const specs = parseTireSpecification(product['Producto']);
      return {
        ...product,
        tire_specs: specs
      };
    }).filter(product => product.tire_specs.width !== null); // 只保留能解析出规格的产品

    console.log(`📊 成功解析 ${tireProducts.length} 个轮胎产品`);

    // 搜索匹配的轮胎
    const matchingTires = tireProducts.filter(product => {
      const specs = product.tire_specs;
      
      // 基础匹配：宽度必须匹配
      if (specs.width != width) return false;
      
      if (searchType === 'car') {
        // 小型轿车：需要匹配宽度、扁平比、直径
        if (exact_match) {
          return specs.aspect_ratio == finalAspectRatio && specs.rim_diameter == finalRimDiameter;
        } else {
          // 允许一定的规格范围匹配
          const aspectMatch = !finalAspectRatio || Math.abs(specs.aspect_ratio - finalAspectRatio) <= 5;
          const rimMatch = !finalRimDiameter || specs.rim_diameter == finalRimDiameter;
          return aspectMatch && rimMatch;
        }
      } else {
        // 货车：只需要匹配宽度和直径
        return !finalRimDiameter || specs.rim_diameter == finalRimDiameter;
      }
    });

    // 按价格排序
    matchingTires.sort((a, b) => {
      const priceA = parseFloat(a['PRECIO FINAL']) || 0;
      const priceB = parseFloat(b['PRECIO FINAL']) || 0;
      return priceA - priceB;
    });

    // 格式化结果为统一的Agent响应格式
    const tireType = searchType === 'car' ? '小型轿车' : '货车';
    const searchSpec = searchType === 'car' 
      ? `${width}/${finalAspectRatio}R${finalRimDiameter}`
      : `${width}R${finalRimDiameter}`;
    
    // 原始数据
    const rawData = {
      searchType: searchType,
      searchSpec: searchSpec,
      totalFound: matchingTires.length,
      results: matchingTires.slice(0, 10).map(tire => ({
        id: tire['ID Producto'],
        product: tire['Producto'],
        stock: tire['Exit.'],
        price: tire['PRECIO FINAL'],
        specs: tire.tire_specs
      })),
      searchParams: {
        width: width,
        aspectRatio: finalAspectRatio || null,
        diameter: finalRimDiameter || null,
        type: searchType,
        exactMatch: exact_match
      },
      statistics: {
        totalTireProducts: tireProducts.length,
        carTires: tireProducts.filter(p => p.tire_specs.type === 'car').length,
        truckTires: tireProducts.filter(p => p.tire_specs.type === 'truck').length
      }
    };

    // Markdown表格格式
    let markdownTable = "| 产品ID | 产品名称 | 库存 | 价格 |\n|:-------|:---------|:-----|:-----|\n";
    if (matchingTires.length > 0) {
      matchingTires.slice(0, 5).forEach(tire => {
        markdownTable += `| ${tire['ID Producto']} | ${tire['Producto']} | ${tire['Exit.']} | $${tire['PRECIO FINAL']} |\n`;
      });
    } else {
      markdownTable += "| - | 未找到匹配轮胎 | - | - |\n";
    }

    // 描述信息
    let description = `🔍 轮胎搜索结果 - ${tireType}轮胎 (${searchSpec})\n\n`;
    description += `📊 搜索统计:\n`;
    description += `• 匹配轮胎: ${matchingTires.length} 个\n`;
    description += `• 轮胎类型: ${tireType}\n`;
    description += `• 搜索规格: ${searchSpec}\n\n`;
    
    if (matchingTires.length > 0) {
      description += `💰 价格范围: $${matchingTires[0]['PRECIO FINAL']} - $${matchingTires[matchingTires.length-1]['PRECIO FINAL']}\n\n`;
      description += `🏆 推荐轮胎:\n`;
      matchingTires.slice(0, 3).forEach((tire, index) => {
        description += `${index + 1}. ${tire['Producto']} - $${tire['PRECIO FINAL']}\n`;
      });
      
      if (matchingTires.length > 3) {
        description += `\n... 还有 ${matchingTires.length - 3} 个其他选项`;
      }
    } else {
      description += `❌ 未找到匹配的${tireType}轮胎\n`;
      description += `💡 建议:\n`;
      description += `• 检查轮胎规格是否正确\n`;
      description += `• 尝试其他尺寸规格\n`;
      description += `• 联系客服获取更多选项`;
    }

    // 返回统一格式
    res.json({
      raw: rawData,
      markdown: markdownTable,
      type: "markdown",
      desc: description
    });

  } catch (error) {
    console.error('轮胎搜索错误:', error);
    res.status(500).json({
      success: false,
      error: '轮胎搜索过程中发生错误'
    });
  }
});

// 轮胎规格解析测试端点
app.post('/api/price-list/tire-parse', (req, res) => {
  try {
    const { product_name } = req.body;
    
    if (!product_name) {
      return res.status(400).json({
        success: false,
        error: '请提供产品名称(product_name)进行解析'
      });
    }

    const specs = parseTireSpecification(product_name);
    
    res.json({
      success: true,
      message: '轮胎规格解析完成',
      input: product_name,
      parsed_specs: specs,
      is_parseable: specs.width !== null
    });

  } catch (error) {
    console.error('轮胎解析错误:', error);
    res.status(500).json({
      success: false,
      error: '轮胎规格解析过程中发生错误'
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 向后兼容的路由重定向
app.get('/api/health', (req, res) => res.redirect('/api/price-list/health'));
app.get('/api/products', (req, res) => res.redirect('/api/price-list/products'));
app.post('/api/product/search', (req, res) => {
  // 转发请求到新的端点
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

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '端点不存在',
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 查看API文档`);
});

module.exports = app; 