const dotenv = require('dotenv');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const possibleEnvPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), '.env')
];
let envResult = { parsed: null };
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    envResult = dotenv.config({ path: envPath, override: true });
    if (envResult.error) {
      console.error('Failed to load .env from', envPath, envResult.error);
    } else {
      console.log('Loaded .env from', envPath);
    }
    break;
  }
}
if (!envResult.parsed) {
  envResult = dotenv.config({ override: true });
  if (envResult.error && envResult.error.code !== 'ENOENT') {
    console.error('Failed to load .env:', envResult.error);
  }
}

const app = express();
const routes = require('./src/routes');

console.log('Loaded .env:', {
  parsed: envResult.parsed,
  GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL
});

const uri = process.env.MONGODB_URI ||
  'mongodb://tranduykhanh:khanhvy080603@ac-dzkoiut-shard-00-02.tbhpylt.mongodb.net:27017/QuanLyCuaHangQuanAo?ssl=true&authSource=admin';

mongoose.connect(uri)
  .then(() => console.log('Đã kết nối thành công tới MongoDB.'))
  .catch((err) => console.error('Lỗi kết nối MongoDB:', err));

app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_NAME = process.env.SESSION_NAME || 'iNews';
const SESSION_SECRET = process.env.SESSION_SECRET || 'MeoMeoMeoMeoMeoMeo';

app.use(session({
  name: SESSION_NAME,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000 // Hết hạn sau 30 ngày
  }
}));

app.use((req, res, next) => {
  res.locals.session = req.session;

  const err = req.session.error;
  const msg = req.session.success;

  delete req.session.error;
  delete req.session.success;

  res.locals.message = '';
  if (err) res.locals.message = '<span class="text-danger">' + err + '</span>';
  if (msg) res.locals.message = '<span class="text-success">' + msg + '</span>';

  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

app.use('/', routes);

app.use((req, res) => {
  res.status(404).render('error', {
    status: 404,
    message: 'Không tìm thấy trang'
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running at https://doan-trangwebquanlycuahangquanao.onrender.com`);
});