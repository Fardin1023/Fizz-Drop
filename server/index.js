import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import {
  initDbPool,
  getDbStatus,
  executeQuery,
  memoryStore,
} from './db.js';
import { initialTables, tableSchemas } from './seedData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'fizzdrop_secret_key_2026';

app.use(cors());
// Increased body limit to 10mb for image uploads / data URLs
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize MySQL pool asynchronously
initDbPool();

const server = app.listen(PORT, () => {
  console.log(`[FizzDrop API] Server running on port ${PORT}`);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});


// ============================================================================
// AUTH MIDDLEWARE & ROLE AUTHORIZATION

// ============================================================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Superadmin strictly required for DB tables, SQL console, and Outlets
function requireSuperadminRole(req, res, next) {
  const isSuper = req.user && (req.user.role_id === 4 || req.user.role_name?.toLowerCase() === 'superadmin');
  if (!isSuper) {
    return res.status(403).json({
      error: 'Restricted Access: Superadmin credentials required for outlet configuration and database console operations.',
    });
  }
  next();
}

// Supplier (or Superadmin) authorized for product catalog management
function requireSupplierOrSuperadmin(req, res, next) {
  const isAuthorized = req.user && (
    req.user.role_id === 3 || 
    req.user.role_id === 4 || 
    req.user.role_name?.toLowerCase() === 'supplier' || 
    req.user.role_name?.toLowerCase() === 'superadmin'
  );
  if (!isAuthorized) {
    return res.status(403).json({
      error: 'Restricted Access: Supplier or Superadmin privileges required for product catalog operations.',
    });
  }
  next();
}


// ============================================================================
// 1. AUTHENTICATION ROUTES

// ============================================================================

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    let userRow = null;
    const dbStatus = getDbStatus();

    if (dbStatus.connected) {
      const result = await executeQuery('SELECT u.*, r.role_name FROM Users u JOIN Roles r ON u.role_id = r.role_id WHERE u.email = ?', [email]);
      if (result.success && result.results.length > 0) {
        userRow = result.results[0];
      }
    }

    if (!userRow) {
      const found = memoryStore.Users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        const role = memoryStore.Roles.find((r) => r.role_id === found.role_id);
        userRow = { ...found, role_name: role ? role.role_name : 'Customer' };
      }
    }

    if (!userRow) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const isValid = password === 'Password123!' || password === 'admin' || password === 'supplier' || password === 'superadmin';
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password. (Default is Password123!)' });
    }

    const payload = {
      user_id: userRow.user_id,
      email: userRow.email,
      role_id: userRow.role_id,
      role_name: userRow.role_name,
      branch_id: userRow.branch_id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: payload,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});


// ============================================================================
// 2. DATABASE STATUS & DIRECT SQL QUERY CONSOLE (SUPERADMIN ONLY)

// ============================================================================

app.get('/api/db/status', (req, res) => {
  res.json(getDbStatus());
});

app.post('/api/db/config', authenticateToken, requireSuperadminRole, async (req, res) => {
  const { host, port, user, password, database } = req.body;
  const result = await initDbPool({
    host,
    port: parseInt(port || '3306', 10),
    user,
    password,
    database: database || 'fizzdrop_db',
  });
  res.json({ ...getDbStatus(), testResult: result });
});

app.get('/api/db/tables', authenticateToken, requireSuperadminRole, async (req, res) => {
  try {
    const dbStatus = getDbStatus();
    const tablesList = [];

    for (const tableName of initialTables) {
      let count = 0;
      if (dbStatus.connected) {
        const countRes = await executeQuery(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
        if (countRes.success && countRes.results[0]) {
          count = countRes.results[0].cnt;
        }
      } else {
        count = memoryStore[tableName] ? memoryStore[tableName].length : 0;
      }

      tablesList.push({
        name: tableName,
        rowCount: count,
        columns: tableSchemas[tableName] || [],
      });
    }

    res.json({ tables: tablesList, status: dbStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/tables/:tableName', authenticateToken, requireSuperadminRole, async (req, res) => {
  const { tableName } = req.params;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '25', 10);
  const offset = (page - 1) * limit;

  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connected) {
      const countRes = await executeQuery(`SELECT COUNT(*) as total FROM \`${tableName}\``);
      const total = countRes.results[0]?.total || 0;
      const dataRes = await executeQuery(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [limit, offset]);

      return res.json({
        tableName,
        rows: dataRes.results,
        fields: dataRes.fields,
        total,
        page,
        limit,
        columns: tableSchemas[tableName] || [],
      });
    }

    // Memory fallback
    const allRows = memoryStore[tableName] || [];
    const paged = allRows.slice(offset, offset + limit);
    const fields = paged.length > 0 ? Object.keys(paged[0]).map((k) => ({ name: k })) : [];

    res.json({
      tableName,
      rows: paged,
      fields,
      total: allRows.length,
      page,
      limit,
      columns: tableSchemas[tableName] || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/query', authenticateToken, requireSuperadminRole, async (req, res) => {
  const { sql } = req.body;
  if (!sql || !sql.trim()) {
    return res.status(400).json({ error: 'SQL statement cannot be empty' });
  }

  const result = await executeQuery(sql);
  res.json(result);
});


// ============================================================================
// 3. OUTLETS MANAGEMENT APIS (SUPERADMIN ONLY FOR MUTATIONS)

// ============================================================================

app.get('/api/outlets', async (req, res) => {
  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connected) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS \`Outlets\` (
          \`outlet_id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`outlet_name\` VARCHAR(100) NOT NULL,
          \`location_address\` VARCHAR(255) NOT NULL,
          \`contact_phone\` VARCHAR(50) NULL,
          \`status\` VARCHAR(20) NOT NULL DEFAULT 'Active',
          \`created_by\` INT NULL,
          \`created_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_by\` INT NULL,
          \`updated_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      const result = await executeQuery('SELECT * FROM Outlets ORDER BY outlet_id DESC');
      if (result.success) {
        return res.json(result.results);
      }
    }

    res.json(memoryStore.Outlets || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/outlets', authenticateToken, requireSuperadminRole, async (req, res) => {
  const { outlet_name, location_address, contact_phone, status } = req.body;

  if (!outlet_name || !location_address) {
    return res.status(400).json({ error: 'Outlet name and location address are required.' });
  }

  const userId = req.user.user_id;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connected) {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS \`Outlets\` (
          \`outlet_id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`outlet_name\` VARCHAR(100) NOT NULL,
          \`location_address\` VARCHAR(255) NOT NULL,
          \`contact_phone\` VARCHAR(50) NULL,
          \`status\` VARCHAR(20) NOT NULL DEFAULT 'Active',
          \`created_by\` INT NULL,
          \`created_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_by\` INT NULL,
          \`updated_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      const insertSql = `
        INSERT INTO Outlets (outlet_name, location_address, contact_phone, status, created_by, created_date, updated_by, updated_date)
        VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW())
      `;
      const outRes = await executeQuery(insertSql, [
        outlet_name,
        location_address,
        contact_phone || '',
        status || 'Active',
        userId,
        userId,
      ]);

      if (!outRes.success) {
        return res.status(400).json({ error: outRes.error });
      }

      const newId = outRes.results.insertId;

      await executeQuery(
        `INSERT INTO Branches (branch_id, branch_name, location_address, created_by, created_date, updated_by, updated_date)
         VALUES (?, ?, ?, ?, NOW(), ?, NOW())
         ON DUPLICATE KEY UPDATE branch_name = VALUES(branch_name), location_address = VALUES(location_address), updated_date = NOW()`,
        [newId, outlet_name, location_address, userId, userId]
      );

      return res.status(201).json({
        message: 'Outlet created successfully in database',
        outletId: newId,
        outlet: {
          outlet_id: newId,
          outlet_name,
          location_address,
          contact_phone,
          status: status || 'Active',
        },
      });
    }

    const newId = memoryStore.Outlets.length > 0
      ? Math.max(...memoryStore.Outlets.map((o) => o.outlet_id)) + 1
      : 1;

    const newOutlet = {
      outlet_id: newId,
      branch_id: newId,
      outlet_name,
      branch_name: outlet_name,
      location_address,
      contact_phone: contact_phone || '',
      status: status || 'Active',
      created_by: userId,
      created_date: now,
      updated_by: userId,
      updated_date: now,
    };

    memoryStore.Outlets.unshift(newOutlet);
    memoryStore.Branches.unshift({
      branch_id: newId,
      branch_name: outlet_name,
      location_address,
      created_by: userId,
      created_date: now,
      updated_by: userId,
      updated_date: now,
    });

    res.status(201).json({
      message: 'Outlet created successfully in database',
      outletId: newId,
      outlet: newOutlet,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/outlets/:id', authenticateToken, requireSuperadminRole, async (req, res) => {
  const outletId = parseInt(req.params.id, 10);
  const { outlet_name, location_address, contact_phone, status } = req.body;
  const userId = req.user.user_id;

  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connected) {
      const updateSql = `
        UPDATE Outlets 
        SET outlet_name = ?, location_address = ?, contact_phone = ?, status = ?, updated_by = ?, updated_date = NOW()
        WHERE outlet_id = ?
      `;
      const resDb = await executeQuery(updateSql, [
        outlet_name,
        location_address,
        contact_phone,
        status,
        userId,
        outletId,
      ]);
      await executeQuery(
        'UPDATE Branches SET branch_name = ?, location_address = ?, updated_by = ?, updated_date = NOW() WHERE branch_id = ?',
        [outlet_name, location_address, userId, outletId]
      );
      return res.json({ message: 'Outlet updated successfully', affectedRows: resDb.rowCount });
    }

    const idx = memoryStore.Outlets.findIndex((o) => o.outlet_id === outletId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    memoryStore.Outlets[idx] = {
      ...memoryStore.Outlets[idx],
      outlet_name: outlet_name || memoryStore.Outlets[idx].outlet_name,
      location_address: location_address || memoryStore.Outlets[idx].location_address,
      contact_phone: contact_phone !== undefined ? contact_phone : memoryStore.Outlets[idx].contact_phone,
      status: status || memoryStore.Outlets[idx].status,
      updated_by: userId,
      updated_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    res.json({ message: 'Outlet updated successfully', outlet: memoryStore.Outlets[idx] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/outlets/:id', authenticateToken, requireSuperadminRole, async (req, res) => {
  const outletId = parseInt(req.params.id, 10);

  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connected) {
      await executeQuery('DELETE FROM Outlets WHERE outlet_id = ?', [outletId]);
      await executeQuery('DELETE FROM Branches WHERE branch_id = ?', [outletId]);
      return res.json({ message: 'Outlet deleted successfully' });
    }

    memoryStore.Outlets = memoryStore.Outlets.filter((o) => o.outlet_id !== outletId);
    memoryStore.Branches = memoryStore.Branches.filter((b) => b.branch_id !== outletId);
    res.json({ message: 'Outlet deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================================
// 4. MASTER PRODUCT CRUD APIS (SUPPLIER ADMIN & SUPERADMIN)

// ============================================================================

app.get('/api/products', async (req, res) => {
  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connected) {
      const q = `
        SELECT 
          p.product_id, p.brand, p.flavor_variant, p.packaging, p.size_volume, 
          p.sku, p.base_price, p.category, p.image_url, p.created_date, p.updated_date,
          COALESCE(SUM(si.stock_quantity), 0) AS total_stock
        FROM Products p
        LEFT JOIN Shop_Inventory si ON p.product_id = si.product_id
        GROUP BY p.product_id
        ORDER BY p.product_id DESC
      `;
      const result = await executeQuery(q);
      if (result.success) {
        return res.json(result.results);
      }
    }

    const products = memoryStore.Products.map((p) => {
      const inv = memoryStore.Shop_Inventory.filter((si) => si.product_id === p.product_id);
      const totalStock = inv.reduce((sum, item) => sum + item.stock_quantity, 0);
      return {
        ...p,
        total_stock: totalStock,
      };
    });

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/new-arrivals', async (req, res) => {
  const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;

  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connected) {
      let q = `
        SELECT 
          p.product_id AS id, 
          CONCAT(p.brand, ' ', p.flavor_variant) AS name, 
          p.brand, 
          p.category, 
          p.size_volume AS volume, 
          p.base_price AS price,
          p.image_url AS imageUrl,
          COALESCE(si.stock_quantity, 0) AS stockQuantity
        FROM Products p
        LEFT JOIN Shop_Inventory si ON p.product_id = si.product_id ${branchId ? 'AND si.branch_id = ?' : ''}
        ORDER BY p.product_id DESC
        LIMIT 8
      `;
      const result = await executeQuery(q, branchId ? [branchId] : []);
      if (result.success) {
        return res.json(result.results);
      }
    }

    const items = memoryStore.Products.slice(-8).map((p) => {
      const inv = memoryStore.Shop_Inventory.find(
        (si) => si.product_id === p.product_id && (!branchId || si.branch_id === branchId)
      );
      return {
        id: p.product_id,
        name: `${p.brand} ${p.flavor_variant}`,
        brand: p.brand,
        category: p.category,
        volume: p.size_volume,
        price: p.base_price,
        imageUrl: p.image_url,
        stockQuantity: inv ? inv.stock_quantity : 0,
        isNew: true,
      };
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product (Protected: Supplier & Superadmin)
app.post('/api/products', authenticateToken, requireSupplierOrSuperadmin, async (req, res) => {
  const {
    brand,
    flavor_variant,
    packaging,
    size_volume,
    sku,
    base_price,
    category,
    image_url,
    initialStockByBranch,
  } = req.body;

  if (!brand || !flavor_variant || !sku || !base_price) {
    return res.status(400).json({
      error: 'Brand, flavor variant, SKU, and base price are required fields.',
    });
  }

  const userId = req.user.user_id;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const dbStatus = getDbStatus();

    if (dbStatus.connected) {
      const insertSql = `
        INSERT INTO Products 
          (brand, flavor_variant, packaging, size_volume, sku, base_price, category, image_url, created_by, created_date, updated_by, updated_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
      `;
      const prodRes = await executeQuery(insertSql, [
        brand,
        flavor_variant,
        packaging || 'Bottle',
        size_volume || '500ml',
        sku,
        parseFloat(base_price),
        category || 'Beverage',
        image_url || null,
        userId,
        userId,
      ]);

      if (!prodRes.success) {
        return res.status(400).json({ error: prodRes.error });
      }

      const newProductId = prodRes.results.insertId;

      if (initialStockByBranch && typeof initialStockByBranch === 'object') {
        for (const [branchId, stock] of Object.entries(initialStockByBranch)) {
          const bId = parseInt(branchId, 10);
          const qty = parseInt(stock, 10) || 0;
          await executeQuery(
            `INSERT INTO Shop_Inventory (branch_id, product_id, stock_quantity, created_by, created_date, updated_by, updated_date)
             VALUES (?, ?, ?, ?, NOW(), ?, NOW())
             ON DUPLICATE KEY UPDATE stock_quantity = VALUES(stock_quantity), updated_date = NOW()`,
            [bId, newProductId, qty, userId, userId]
          );
        }
      }

      return res.status(201).json({
        message: 'Product created successfully in database',
        productId: newProductId,
      });
    }

    const newId = memoryStore.Products.length > 0
      ? Math.max(...memoryStore.Products.map((p) => p.product_id)) + 1
      : 1;

    if (memoryStore.Products.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
      return res.status(400).json({ error: `Duplicate SKU: Product with SKU '${sku}' already exists.` });
    }

    const newProduct = {
      product_id: newId,
      brand,
      flavor_variant,
      packaging: packaging || 'Bottle',
      size_volume: size_volume || '500ml',
      sku,
      base_price: parseFloat(base_price),
      category: category || 'Beverage',
      image_url: image_url || null,
      created_by: userId,
      created_date: now,
      updated_by: userId,
      updated_date: now,
    };

    memoryStore.Products.unshift(newProduct);

    if (initialStockByBranch) {
      for (const [branchId, stock] of Object.entries(initialStockByBranch)) {
        memoryStore.Shop_Inventory.push({
          branch_id: parseInt(branchId, 10),
          product_id: newId,
          stock_quantity: parseInt(stock, 10) || 0,
          created_by: userId,
          created_date: now,
          updated_by: userId,
          updated_date: now,
        });
      }
    }

    res.status(201).json({
      message: 'Product created successfully',
      productId: newId,
      product: newProduct,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
app.put('/api/products/:id', authenticateToken, requireSupplierOrSuperadmin, async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const { brand, flavor_variant, packaging, size_volume, sku, base_price, category, image_url } = req.body;
  const userId = req.user.user_id;

  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connected) {
      const updateSql = `
        UPDATE Products 
        SET brand = ?, flavor_variant = ?, packaging = ?, size_volume = ?, sku = ?, base_price = ?, category = ?, image_url = ?, updated_by = ?, updated_date = NOW()
        WHERE product_id = ?
      `;
      const result = await executeQuery(updateSql, [
        brand,
        flavor_variant,
        packaging,
        size_volume,
        sku,
        parseFloat(base_price),
        category,
        image_url || null,
        userId,
        productId,
      ]);
      return res.json({ message: 'Product updated successfully', affectedRows: result.rowCount });
    }

    const idx = memoryStore.Products.findIndex((p) => p.product_id === productId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    memoryStore.Products[idx] = {
      ...memoryStore.Products[idx],
      brand: brand || memoryStore.Products[idx].brand,
      flavor_variant: flavor_variant || memoryStore.Products[idx].flavor_variant,
      packaging: packaging || memoryStore.Products[idx].packaging,
      size_volume: size_volume || memoryStore.Products[idx].size_volume,
      sku: sku || memoryStore.Products[idx].sku,
      base_price: base_price !== undefined ? parseFloat(base_price) : memoryStore.Products[idx].base_price,
      category: category || memoryStore.Products[idx].category,
      image_url: image_url !== undefined ? image_url : memoryStore.Products[idx].image_url,
      updated_by: userId,
      updated_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    res.json({ message: 'Product updated successfully', product: memoryStore.Products[idx] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
app.delete('/api/products/:id', authenticateToken, requireSupplierOrSuperadmin, async (req, res) => {
  const productId = parseInt(req.params.id, 10);

  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connected) {
      const deleteSql = 'DELETE FROM Products WHERE product_id = ?';
      const result = await executeQuery(deleteSql, [productId]);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.json({ message: 'Product deleted from database' });
    }

    const idx = memoryStore.Products.findIndex((p) => p.product_id === productId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    memoryStore.Products.splice(idx, 1);
    memoryStore.Shop_Inventory = memoryStore.Shop_Inventory.filter((si) => si.product_id !== productId);

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================================
// 5. ADMIN LOGISTICS & DASHBOARD STATS

// ============================================================================

app.get('/api/admin/stats', async (req, res) => {
  try {
    const dbStatus = getDbStatus();

    let totalProducts = 0;
    let lowStockCount = 0;
    let pendingRestocks = 0;
    let totalOutlets = 0;

    if (dbStatus.connected) {
      const pRes = await executeQuery('SELECT COUNT(*) as cnt FROM Products');
      totalProducts = pRes.results[0]?.cnt || 0;

      const lsRes = await executeQuery('SELECT COUNT(*) as cnt FROM Shop_Inventory WHERE stock_quantity < 20');
      lowStockCount = lsRes.results[0]?.cnt || 0;

      const rRes = await executeQuery("SELECT COUNT(*) as cnt FROM Restock_Requests WHERE request_status = 'Pending'");
      pendingRestocks = rRes.results[0]?.cnt || 0;

      const oRes = await executeQuery('SELECT COUNT(*) as cnt FROM Outlets');
      totalOutlets = oRes.results[0]?.cnt || 0;
    } else {
      totalProducts = memoryStore.Products.length;
      lowStockCount = memoryStore.Shop_Inventory.filter((si) => si.stock_quantity < 20).length;
      pendingRestocks = memoryStore.Restock_Requests.filter((r) => r.request_status === 'Pending').length;
      totalOutlets = memoryStore.Outlets.length;
    }

    res.json({
      totalProducts,
      lowStockCount,
      pendingRestocks,
      totalBranches: totalOutlets,
      totalOutlets,
      dbStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/branches', async (req, res) => {
  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connected) {
      const result = await executeQuery('SELECT outlet_id AS branch_id, outlet_name AS branch_name, location_address FROM Outlets');
      if (result.success && result.results.length > 0) {
        return res.json(result.results);
      }
      const bRes = await executeQuery('SELECT branch_id, branch_name, location_address FROM Branches');
      if (bRes.success) {
        return res.json(bRes.results);
      }
    }

    const list = (memoryStore.Outlets.length > 0 ? memoryStore.Outlets : memoryStore.Branches).map((o) => ({
      branch_id: o.outlet_id || o.branch_id,
      branch_name: o.outlet_name || o.branch_name,
      location_address: o.location_address,
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
