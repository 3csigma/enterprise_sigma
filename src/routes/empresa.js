const express = require('express')
const router = express.Router()
const multer = require('multer');
const path = require('path');
const { checkLogin, validarIDFicha } = require('../lib/auth');
const empresaController = require('../controllers/empresaController');
// const signingViaEmail = require('../controllers/envelopeController');
const { uploadFiles } = require('../lib/helpers')

// Diagnóstico de Negocio
router.get('/diagnostico-de-negocio', checkLogin, empresaController.diagnostico)
router.get('/recursos', checkLogin, empresaController.recursos)

// Ficha de Cliente
router.get('/ficha-cliente/:id', checkLogin, empresaController.validarFichaCliente)
router.get('/ficha-cliente', checkLogin, validarIDFicha, empresaController.fichaCliente)
router.post('/addficha', checkLogin, empresaController.addFichaCliente)
router.post('/eliminarFicha', checkLogin, empresaController.eliminarFicha)

// Acuerdo de Confidencialidad
// router.post('/acuerdo-de-confidencialidad', checkLogin, signingViaEmail.createController)
router.post('/acuerdo-de-confidencialidad', checkLogin, empresaController.acuerdoCheck)

// Análisis de Negocio
router.get('/analisis-de-negocio', checkLogin, empresaController.analisis)
router.post('/guardar-archivos-analisis', checkLogin, uploadFiles('Análisis-de-negocio_', false, 'archivos_analisis_empresa', false), empresaController.guardarArchivos)

// Plan Empresarial
router.get('/plan-empresarial', checkLogin, empresaController.planEmpresarial)
router.post('/guardar-archivos-empresarial', checkLogin, uploadFiles('Plan-empresarial_', false, 'archivos_empresarial_empresa', false), empresaController.guardarArchivos)

// Plan Estratégico de Negocio
router.get('/plan-estrategico', checkLogin, empresaController.planEstrategico)
router.post('/guardar-archivos-estrategico', checkLogin, uploadFiles('Plan-estratégico_', false, 'archivos_estrategico_empresa', false), empresaController.guardarArchivos)

// Informes Autogenerados
router.get('/generar-informe/:tipo', checkLogin, empresaController.informeAutoGenerado)
router.post('/informe-estrategico', checkLogin, empresaController.informeEstrategico)

// Configurar el almacenamiento de Multer
const rutaDeAlmacen = multer.diskStorage({
  destination: function (req, file, callback) {
    const rutaGrupo = path.join(__dirname, '../public/recurso_empresa');
    callback(null, rutaGrupo);
  },
  filename: function (req, file, callback) {
    //const fechaActual = Math.floor(Date.now() / 1000);
    urlGrupo = "_" + file.originalname;
    console.log(urlGrupo);
    callback(null, urlGrupo);
  }
});

// Crear el middleware de Multer
const subirRecursoSuelto = multer({ storage: rutaDeAlmacen }).single('file');

// Recursos
// Ruta para enviar el archivo
router.post('/enviar-archivo', checkLogin, subirRecursoSuelto, empresaController.cargar_recurso);
router.post('/cargar-link', checkLogin, empresaController.cargar_link);
router.post('/eliminarRecurso', checkLogin, empresaController.eliminarRecurso)

// Configurar el almacenamiento de Multer
const rutaAlmacen = multer.diskStorage({
  destination: function (req, file, callback) {
    const rutaGrupo = path.join(__dirname, '../public/grupo_recursos');
    callback(null, rutaGrupo);
  },
  filename: function (req, file, callback) {
    //const fechaActual = Math.floor(Date.now() / 1000);
    urlGrupo = "Recurso_" + "_" + file.originalname;
    console.log(urlGrupo);
    callback(null, urlGrupo);
  }
});

// Crear el middleware de Multer
const subirRecurso = multer({ storage: rutaAlmacen });

router.post('/guardar-grupo', checkLogin, subirRecurso.array('archivos'), empresaController.guardar_grupo);
router.post('/eliminarcampo', checkLogin, empresaController.eliminarcampos)
router.post('/eliminarGrupo', checkLogin, empresaController.eliminarGrupo)

//Configurar el almacenamiento de Multer
const ruta = multer.diskStorage({
  destination: function (req, file, callback) {
    const rutaGrupo = path.join(__dirname, '../public/grupo_recursos');
    callback(null, rutaGrupo);
  },
  filename: function (req, file, callback) {
    const fechaActual = Math.floor(Date.now() / 1000);
    const recursoId = file.fieldname; // Obtener el nombre del campo que contiene el recurso.id
    const urlGrupo = `Recurso_${recursoId}_${fechaActual}_${file.originalname}`;
    console.log(urlGrupo);
    callback(null, urlGrupo);
  }
});

// Crear el middleware de Multer
const actualizarArchivo = multer({
  storage: ruta,
  fileFilter: function (req, file, callback) {
    const recursoId = file.fieldname; // Obtener el nombre del campo que contiene el recurso.id
    if (recursoId) {
      callback(null, true);
    } else {
      callback(new Error("Archivo no válido"));
    }
  },
});
router.post('/actualizarRecurso', checkLogin, actualizarArchivo.any(), empresaController.actualizarRecurso);

module.exports = router
