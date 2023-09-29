const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  //password: '',
  database: 'mysalesapp',
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error('Error koneksi ke basis data: ' + err.stack);
    return;
  }
  console.log('Terhubung ke basis data MySQL dengan ID ' + db.threadId);
});

module.exports = db;
