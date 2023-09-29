const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const db = require('./koneksi'); 
const PDFDocument = require('pdfkit');
const multer = require('multer');

// Pengaturan opsi untuk penggunaan static files
const options = {
    dotfiles: 'ignore',
    etag: false,
    extensions: ['htm', 'html'],
    index: false,
    maxAge: '1d',
    redirect: false,
    setHeaders: function (res, path, stat) {
        res.set('x-timestamp', Date.now());
    },
};

app.use(express.static('public', options));
app.use('public/img', express.static('public/img'));


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/img/'); // Lokasi penyimpanan gambar
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        cb(null, `${timestamp}-${file.originalname}`); // Nama gambar yang diunggah
    },
});

const upload = multer({ storage: storage });




// Middleware untuk mengambil data dari formulir
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Mengatur EJS sebagai mesin template
app.set('view engine', 'ejs');

//Rute Dashboard
app.get('/', (req, res) => {
    // Query database untuk mendapatkan daftar produk skincare
    db.query('SELECT * FROM produk', (err, results) => {
        if (err) {
            console.log('Terjadi kesalahan saat mengambil data produk skincare.');
            res.send('Terjadi kesalahan saat mengambil data produk skincare.');
        } else {
            // Render halaman home dengan data produk skincare
            console.log('Berhasil berada di halaman dashboard');
            res.render('home', { produkMasuk: results, title: 'SkincareV Dashboard' });
        }
    });
});

//Rute Register
app.get('/register', (req, res) => {
    console.log('Berhasil berada di halaman Register');
    res.render('register', { title: 'Register Page' });
});

app.post('/register', (req, res) => {
    try {
        const { username, password } = req.body;

        // Simpan data pengguna ke database (misalnya, tabel 'admin')
        const sql = 'INSERT INTO admin (username, password) VALUES (?, ?)';
        db.query(sql, [username, password], (err, results) => {
            if (err) {
                // Handle error, misalnya jika username sudah digunakan
                console.log('Gagal Registrasi');
                console.error(err);
                res.status(500).send('Gagal mendaftar. Username mungkin sudah digunakan.');
            } else {
                // Pendaftaran berhasil
                console.log('Berhasil Registrasi');
                res.redirect('/'); // Redirect ke halaman login
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Terjadi kesalahan saat mendaftar.');
    }
});

//Rute Login
app.get('/login', (req, res) => {
    console.log('Berada di Halaman Login');
    res.render('login', { title: 'Login Page' });
});

// Rute untuk memproses permintaan login
app.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        // Periksa data login di tabel admin
        const sql = 'SELECT * FROM admin WHERE username = ? AND password = ?';
        db.query(sql, [username, password], (err, results) => {
            if (err) {
                // Handle error
                console.error(err);
                console.log("Terjadi Kesalahan Saat Login")
                res.status(500).send('Terjadi kesalahan saat login.');
            } else {
                if (results.length === 1) {
                    // Login berhasil, data sesuai


                    res.redirect('/'); // Redirect ke halaman dashboard atau halaman yang sesuai
                } else {
                    // Login gagal, data tidak sesuai
                    console.log("Username Password Salah")
                    res.status(401).send('Username atau password salah.');
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Terjadi kesalahan saat login.');
    }
});



// Rute untuk menampilkan halaman tambah produk
app.get('/tambah-produk', (req, res) => {
    console.log('Berada di Halaman Tambah Produk');
    res.render('tambah-produk', { title: 'Tambah Produk' });
});
app.post('/tambah-produk', upload.single('gambar'), (req, res) => {
    const namaProduk = req.body.namaProduk;
    const hargaProduk = parseFloat(req.body.hargaProduk); // Ubah ke tipe data angka
    const deskripsiProduk = req.body.deskripsiProduk;
    const stokProduk = parseInt(req.body.stokProduk); // Ubah ke tipe data angka
    const gambarProduk = req.file ? req.file.filename : null; // Cek jika ada gambar diunggah

    if (namaProduk && !isNaN(hargaProduk) && deskripsiProduk && !isNaN(stokProduk) && gambarProduk) {
        // Data lengkap dan sesuai, simpan ke database
        db.query('INSERT INTO produk (nama, harga, deskripsi, stok, gambar) VALUES (?, ?, ?, ?, ?)', [namaProduk, hargaProduk, deskripsiProduk, stokProduk, gambarProduk], (err, results) => {
            if (err) {
                // Handle error, misalnya dengan menampilkan pesan error
                console.log('Terjadi kesalahan saat menyimpan produk.');
                res.send('Terjadi kesalahan saat menyimpan produk.');
            } else {
                // Produk berhasil disimpan, redirect atau beri pesan sukses
                console.log('Berhasil Menambahkan Data Produk');
                res.redirect('/daftar-produk');
            }
        });
    } else {
        // Data tidak lengkap atau sesuai, beri pesan error atau tampilkan kembali formulir
        console.log('Data produk tidak lengkap atau tidak sesuai. Silakan isi semua field dengan benar.');
        res.send('Data produk tidak lengkap atau tidak sesuai. Silakan isi semua field dengan benar.');
    }
});


// Rute untuk menampilkan daftar produk
app.get('/daftar-produk', (req, res) => {
    // Query database untuk mengambil data produk dan stok
    db.query('SELECT * FROM produk', (err, produk) => {
      if (err) {
        console.error(err);
        // Handle error, misalnya dengan menampilkan pesan error
        res.send('Terjadi kesalahan saat mengambil data produk.');
      } else {
        // Render halaman "daftar-produk" dan kirim data produk ke dalam template
        res.render('daftar-produk', { produk: produk , title: 'Daftar Produk Skincare'});
      }
    }); 
  });

//Rute Update Produk
app.get('/update-produk/:id', (req, res) => {
    const produkId = req.params.id;

    // Mengambil data produk berdasarkan ID dari database
    db.query('SELECT * FROM produk WHERE id = ?', [produkId], (err, results) => {
        if (err) {
            console.error(err);
            res.send('Terjadi kesalahan saat mengambil data produk.');
        } else {
            const produk = results[0]; // Mengambil produk pertama dari hasil query
            res.render('update-produk', { produk: produk , title: 'Update Produk Skincare'});
        }
    });
});
app.post('/update-produk/:id', (req, res) => {
    const produkId = req.params.id;
    const namaProduk = req.body.namaProduk;
    const hargaProduk = req.body.hargaProduk;
    const deskripsiProduk = req.body.deskripsiProduk;

    // Lakukan update data produk dalam database berdasarkan ID
    db.query('UPDATE produk SET nama = ?, harga = ?, deskripsi = ? WHERE id = ?',
        [namaProduk, hargaProduk, deskripsiProduk, produkId], (err, results) => {
            if (err) {
                console.error(err);
                res.send('Terjadi kesalahan saat menyimpan perubahan produk.');
            } else {
                // Redirect ke halaman daftar produk atau beri pesan sukses
                console.log('Berhasil Update Produk');
                res.redirect('/daftar-produk');
            }
        });
});

// Rute untuk Delete 
app.get('/hapus-produk/:id', (req, res) => {
    const productId = req.params.id;

    // Lakukan query ke database untuk menghapus produk berdasarkan productId
    db.query('DELETE FROM produk WHERE id = ?', [productId], (err, results) => {
        if (err) {
            // Handle error
            console.error(err);
            res.send('Gagal menghapus produk.');
        } else {
            // Redirect ke halaman daftar produk setelah berhasil menghapus
            console.log('Produk berhasil terhapus');
            res.redirect('/daftar-produk');
        }
    });
});

  



// Rute untuk menampilkan halaman Barang Masuk

// Rute untuk menampilkan halaman Barang Masuk
app.get('/barang-masuk', (req, res) => {
    // Ambil daftar produk dari database
    db.query('SELECT * FROM produk', (err, produk) => {
        if (err) {
            // Handle error
            console.error(err);
            res.status(500).send('Terjadi kesalahan saat mengambil data produk.');
        } else {
            res.render('barang-masuk', { produk, title: 'Barang Masuk Produk Skincare' }); // Render halaman dengan daftar produk
        }
    });
});

// Rute untuk menangani pengiriman formulir Barang Masuk
app.post('/barang-masuk', (req, res) => {
    const { namaBarangMasuk, jumlahMasuk, tanggalMasuk, keteranganMasuk } = req.body;

    // Query untuk menambahkan barang masuk ke dalam database
    const sqlInsertQuery = `
        INSERT INTO barang_masuk (nama_barang, jumlah_masuk, tanggal, keterangan)
        VALUES (?, ?, ?, ?)
    `;

    // Query untuk mengupdate stok produk di tabel produk
    const sqlUpdateQuery = `
        UPDATE produk
        SET stok = stok + ?
        WHERE nama = ?
    `;

    // Lakukan query untuk menambahkan barang masuk
    db.query(sqlInsertQuery, [namaBarangMasuk, jumlahMasuk, tanggalMasuk, keteranganMasuk], (err, result) => {
        if (err) {
            console.error(err);
            res.send('Terjadi kesalahan saat menambahkan barang masuk.');
            return;
        }

        // Setelah berhasil menambahkan barang masuk, update stok produk
        db.query(sqlUpdateQuery, [jumlahMasuk, namaBarangMasuk], (err, result) => {
            if (err) {
                console.error(err);
                res.send('Terjadi kesalahan saat mengupdate stok produk.');
                return;
            }
            console.log('Penambahan barang masuk');
            res.redirect('/riwayat-barang-masuk');
        });
    });
});

// Menampilkan halaman form transaksi penjualan
app.get('/transaksi-penjualan', (req, res) => {
    // Di sini Anda dapat mengambil daftar produk dari database jika diperlukan
    // Kemudian render halaman form transaksi penjualan dengan daftar produk
    db.query('SELECT * FROM produk', (err, results) => {
        if (err) {
            // Handle error, misalnya dengan menampilkan pesan error
            console.error(err);
            res.send('Terjadi kesalahan saat mengambil daftar produk.');
        } else {
            // Render halaman form transaksi penjualan dengan daftar 
            console.log('Berada di Halaman Transaksi.');
            res.render('transaksi-penjualan', { produk: results, title: 'Transaksi Produk Skincare',  });
        }
    });
});
// Menangani permintaan submit form transaksi penjualan
app.post('/transaksi-penjualan', (req, res) => {
    const { produk_id, jumlahTerjual, harga, tanggalPenjualan} = req.body;

    // Query untuk mengurangi stok produk berdasarkan nama produk
    const sqlUpdateQuery = `
        UPDATE produk
        SET stok = stok - ?
        WHERE nama = ?
    `;

    // Lakukan query untuk mengurangi stok produk
    db.query(sqlUpdateQuery, [jumlahTerjual, produk_id], (err, result) => {
        if (err) {
            console.error(err);
            res.send('Terjadi kesalahan saat mengupdate stok produk.');
            return;
        }

        // Setelah berhasil mengupdate stok produk, catat transaksi penjualan ke dalam database
        const transaksiData = {
            produk_id: produk_id,
            jumlah_terjual: jumlahTerjual,
            harga: harga,
            tanggal_penjualan: tanggalPenjualan,
        };

        

        db.query('INSERT INTO transaksi_penjualan SET ?', transaksiData, (err, results) => {
            if (err) {
                console.error(err);
                res.send('Terjadi kesalahan saat mencatat transaksi penjualan.');
                return;
            }
            console.log('Transaksi Berhasil.');
            res.redirect('/riwayat-transaksi');
        });
    });
});
// Rute untuk halaman riwayat transaksi
app.get('/riwayat-transaksi', (req, res) => {

        // Query database untuk mendapatkan riwayat transaksi penjualan
        db.query('SELECT * FROM transaksi_penjualan', (err2, resultsPenjualan) => {
            if (err2) {
                console.error(err2);
                res.send('Terjadi kesalahan saat mengambil data riwayat transaksi.');
                return;
            }

            // Hitung total harga untuk transaksi penjualan
            let totalHargaPenjualan = 0;
            resultsPenjualan.forEach((penjualan) => {
                totalHargaPenjualan += penjualan.harga;
            });

            // Render halaman riwayat transaksi dengan data yang sudah diambil
            res.render('riwayat-transaksi', { 
                riwayatTransaksiPenjualan: resultsPenjualan,
                totalHargaPenjualan: totalHargaPenjualan,
                title: 'History Pages'
            });
        });
    });


// Rute untuk halaman riwayat transaksi
app.get('/riwayat-barang-masuk', (req, res) => {
    // Query database untuk mendapatkan riwayat transaksi barang masuk
    db.query('SELECT * FROM barang_masuk', (err1, resultsBarangMasuk) => {
        if (err1) {
            console.error(err1);
            res.send('Terjadi kesalahan saat mengambil data riwayat transaksi.');
            return;
        }

            // Render halaman riwayat transaksi dengan data yang sudah diambil
            res.render('riwayat-barang-masuk', { 
                riwayatBarangMasuk: resultsBarangMasuk, 
                title: 'History Pages'
            });
        });
    });



// Rute untuk menampilkan halaman detail produk berdasarkan ID

app.get('/detail-produk/:id', (req, res) => {
    const produkId = req.params.id;

    // Query database untuk mendapatkan produk berdasarkan ID
    db.query('SELECT * FROM produk WHERE id = ?', [produkId], (err, results) => {
        if (err) {
            console.error(err);
            res.send('Terjadi kesalahan saat mengambil data produk.');
        } else {
            if (results.length > 0) {
                // Jika produk ditemukan, kirimkan data produk ke halaman detail-produk
                const produk = results[0];
                res.render('detail-produk', { produk, title: 'Detail Produk' });
            } else {
                // Jika produk tidak ditemukan, berikan respons sesuai
                res.send('Produk tidak ditemukan.');
            }
        }
    });
});


// Rute untuk menghasilkan dan mengirimkan PDF
app.get('/cetak-pdf', (req, res) => {
    // Query database untuk mendapatkan data transaksi
    db.query('SELECT * FROM transaksi_penjualan', (err, results) => {
      if (err) {
        console.error(err);
        res.send('Terjadi kesalahan saat mengambil data transaksi.');
        return;
      }
  
      const riwayatTransaksiPenjualan = results;
  
      // Buat objek PDF menggunakan pdfkit
      const pdfDoc = new PDFDocument();
  
      // Header PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="riwayat_transaksi.pdf"');
  
      // Kode untuk mengisi PDF dengan konten
      pdfDoc.pipe(res);
      pdfDoc.fontSize(12).text('Riwayat Transaksi Penjualan', { align: 'center' });
  
      // Isi daftar dalam PDF menggunakan tanda bullet
      riwayatTransaksiPenjualan.forEach((penjualan) => {
        pdfDoc
          .text(`Tanggal: ${new Date(penjualan.tanggal_penjualan).toLocaleDateString()}`)
          .text(`Nama Barang: ${penjualan.produk_id}`)
          .text(`Jumlah Terjual: ${penjualan.jumlah_terjual}`)
          .text(`Harga Satuan: Rp ${penjualan.harga.toLocaleString('id-ID')}`)
          .text(`Total Harga: Rp ${(penjualan.jumlah_terjual * penjualan.harga).toLocaleString('id-ID')}`)
          .moveDown();
      });
  
      // Hitung total pendapatan
      const totalPendapatan = riwayatTransaksiPenjualan.reduce((total, penjualan) => {
        return total + (penjualan.jumlah_terjual * penjualan.harga);
      }, 0);
  
      // Tambahkan total pendapatan ke dalam PDF
      pdfDoc.text(`Total Pendapatan Saat Ini: Rp ${totalPendapatan.toLocaleString('id-ID')}`, { align: 'right' });
  
      // Akhiri dokumen PDF
      pdfDoc.end();
    });
  });
  
  // Rute untuk menangani kesalahan 404
app.use('/', (req, res) => {
    res.status(404).send('404 Not Found');
  });
  
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});