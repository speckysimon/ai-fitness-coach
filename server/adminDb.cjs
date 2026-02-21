/**
 * Admin Database Connection (better-sqlite3)
 * Centralized connection for admin database (fitness-coach-admin.db)
 * Mirrors the pattern from server/db.js but for admin operations
 */

const Database = require('better-sqlite3');
const path = require('path');

// Admin database path (configurable via environment variable)
const dbPath = process.env.ADMIN_DATABASE_PATH || path.join(__dirname, 'fitness-coach-admin.db');

console.log(`📂 Admin Database path: ${dbPath}`);

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys and use DELETE mode for reliable persistence
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = DELETE');
db.pragma('synchronous = FULL');

console.log('✅ Admin database connection established (better-sqlite3, DELETE mode)');

/**
 * Get the database instance
 * Use this for direct access to better-sqlite3 methods
 */
function getDb() {
  return db;
}

/**
 * Execute a query that returns a single row
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Object|undefined} Single row or undefined
 */
function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

/**
 * Execute a query that returns multiple rows
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Array} Array of rows
 */
function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE)
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Object} Result with lastInsertRowid and changes
 */
function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

/**
 * Execute multiple statements in a transaction
 * @param {Function} fn - Function containing database operations
 * @returns {Function} Transaction function
 */
function transaction(fn) {
  return db.transaction(fn);
}

/**
 * Execute raw SQL (for migrations, schema changes)
 * @param {string} sql - SQL statements
 */
function exec(sql) {
  return db.exec(sql);
}

/**
 * Prepare a statement for reuse
 * @param {string} sql - SQL query
 * @returns {Statement} Prepared statement
 */
function prepare(sql) {
  return db.prepare(sql);
}

/**
 * Close the database connection
 * Should only be called on application shutdown
 */
function close() {
  db.close();
  console.log('🔒 Admin database connection closed');
}

// Export the database instance and helper functions
module.exports = {
  db,           // Direct access to better-sqlite3 instance
  getDb,        // Getter function
  get,          // Single row query
  all,          // Multiple rows query
  run,          // Modify data
  transaction,  // Transaction wrapper
  exec,         // Execute raw SQL
  prepare,      // Prepare statement
  close         // Close connection
};
