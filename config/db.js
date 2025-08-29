// db-connection.mjs or db-connection.js (with "type": "module" in package.json)

import mysql from 'mysql2';

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'your_mysql_password',
  database: 'your_database_name'
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL');
});

export default connection;

