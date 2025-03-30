/**
 * Database configuration for Smart City Application
 * Manages connections to MongoDB and MySQL databases
 */
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');

// MongoDB connection
const connectMongoDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartcity', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.warn('Server will continue without MongoDB connection');
    return null;
  }
};

// MySQL connection pool
const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,     
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '6666',
  database: process.env.MYSQL_DATABASE || 'smartcity',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// Test MySQL connection
const testMySQLConnection = async () => {
  try {
    const connection = await mysqlPool.getConnection();
    console.log('MySQL Connected');
    connection.release();
    return true;
  } catch (error) {
    console.error(`Error connecting to MySQL: ${error.message}`);
    return false;
  }
};

// Connect to all databases
const connectDB = async () => {
  await connectMongoDB();
  await testMySQLConnection();
};

module.exports = {
  connectDB,
  mysqlPool,
  mongoose
};
