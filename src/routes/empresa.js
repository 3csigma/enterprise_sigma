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
router.get('/ejemplo2', checkLogin, empresaController.ejemplo2)

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

// Recursos
router.post('/enviar-archivo', checkLogin, empresaController.enviar_archivo);
router.post('/cargar-link', checkLogin, empresaController.cargar_link);
router.post('/eliminarRecurso', checkLogin, empresaController.eliminarRecurso)
router.post('/guardar-grupo', checkLogin, empresaController.guardar_grupo);
router.post('/eliminarGrupo', checkLogin, empresaController.eliminarGrupo)
  


module.exports = router
