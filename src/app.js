require("dotenv").config();
const express = require('express');
const session = require('express-session')
const { engine } = require('express-handlebars');
const bodyParser = require('body-parser')
const morgan = require('morgan'); // Registra las solicitudes + otra información & la muestra por consola
const passport = require('passport')
const path = require('path');
const flash = require('connect-flash')
const cookieParser = require('cookie-parser');
const MemoryStore = require('memorystore')(session);

// Inicializaciones
const app = express();
require('./lib/passport')

// Configuraciones
app.set('port', process.env.PORT);

app.set('views', __dirname + '/views');
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  helpers: require('./lib/handlebars')
}));
app.set('view engine', 'hbs');

// app.set('trust proxy', 1) // Proxy de confianza

/******* Middlewares *******/
app.use(morgan('dev'))
// parse application/x-www-form-urlencoded
// Carpeta de archivos publicos
app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({ extended: true }))
// parse application/json
app.use(bodyParser.json())
app.use(cookieParser())
app.use(session({
  secret: 'secretNegocio_3CSigma',
  name: '3C-launcher-session',
  cookie: { maxAge: 20000 },
  saveUninitialized: true,
  resave: true,
  cookie: { secure: false },
  store: new MemoryStore({
    checkPeriod: 86400000 // eliminar las entradas caducadas cada 24 horas
  })
}))
app.use(flash())
app.use(passport.initialize());
app.use(passport.session()); // Inicio de sesiones persistentes
// app.use(csrf()) //Protección contra los ataques csrf
// app.use(csrf({ cookie: { key: 'XSRF-TOKEN' } }));

// No almacenar caché
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  next();
});

/******** Variables Globales ********/
app.use((req, res, next) => {
  const f = new Date();
  res.locals.actualYear = f.getFullYear();; // Año Actual
  res.locals.success = req.flash('success');
  res.locals.message = req.flash('message');
  res.locals.registro = req.flash('registro');
  res.locals.error = req.flash('error');
  res.locals.user = req.user; //Variable local para Empresas
  res.locals.session = req.session;
  global.urlPropuestaNegocio = '';
  global.urlProfile = ''
  if(!req.session.initialised) {
    req.session.initialised = true;
    req.session.empresa = false;
    req.session.consultor = false;
    req.session.admin = false;
    req.session.etapa2 = false;
  }
  next();
})

// Rutas
app.use(require('./routes'));
app.use(require('./routes/empresa'));
app.use(require('./routes/consultor'));
app.use(require('./routes/authentication'));
app.use(require('./routes/pagos'));

// RUTAS PARA ERROR 404 Y 502
app.get('*', (req, res) => {
  res.status(404)
  res.render('pages/404', {dominio: process.env.MY_DOMAIN});
});

app.listen(app.get('port'), () => {
  console.log('\nCORRIENDO DESDE http://localhost:'+app.get('port'));
});