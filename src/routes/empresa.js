const express = require('express')
const router = express.Router()
const empresaController = require('../controllers/empresaController');
const { checkLogin, validarIDFicha } = require('../lib/auth');
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
router.post('/acuerdo-de-confidencialidad', checkLogin, empresaController.acuerdoCheck)

// Análisis de Negocio
router.get('/analisis-de-negocio', checkLogin, empresaController.analisis)
router.post('/guardar-archivos-analisis', checkLogin, uploadFiles('Análisis-de-negocio_', false, 'archivos_analisis_empresa', false, false), empresaController.guardarArchivos)

// Plan Empresarial
router.get('/plan-empresarial', checkLogin, empresaController.planEmpresarial)
router.post('/guardar-archivos-empresarial', checkLogin, uploadFiles('Plan-empresarial_', false, 'archivos_empresarial_empresa', false, false), empresaController.guardarArchivos)

// Plan Estratégico de Negocio
router.get('/plan-estrategico', checkLogin, empresaController.planEstrategico)
router.post('/guardar-archivos-estrategico', checkLogin, uploadFiles('Plan-estratégico_', false, 'archivos_estrategico_empresa', false, false), empresaController.guardarArchivos)

// Informes Autogenerados
router.get('/generar-informe/:tipo', checkLogin, empresaController.informeAutoGenerado)
router.post('/informe-estrategico', checkLogin, empresaController.informeEstrategico)

/***************************************************************************************************** */
/* 
  * Recursos
*/
// Material
router.post('/enviar-archivo', checkLogin, uploadFiles('Recurso_', false, 'recurso_empresa', true, false), empresaController.cargar_recurso);
router.post('/cargar-link', checkLogin, empresaController.cargar_link);
router.post('/editar-categoria', checkLogin, empresaController.editarCategoria);
router.post('/eliminarRecurso', checkLogin, empresaController.eliminarRecurso)

router.post('/guardar-grupo', checkLogin, uploadFiles('Recurso_', 'archivos', 'grupo_recursos', true, false), empresaController.guardar_grupo);
router.post('/eliminarCampo', checkLogin, empresaController.eliminarCampo)
router.post('/eliminarGrupo', checkLogin, empresaController.eliminarGrupo)

router.post('/actualizarRecurso', checkLogin, uploadFiles('Recurso_', false, 'grupo_recursos', true, true), empresaController.actualizarRecurso);
router.post('/copiar-recurso', checkLogin, empresaController.copiarRecurso);

// MODULOS (CURSOS - LECCIONES)
router.get('/mis-modulos', checkLogin, empresaController.modulos);
router.get('/mis-modulos/:id', checkLogin, empresaController.verModulo);
router.post('/leccion-completada', checkLogin, empresaController.leccionCompletada);

module.exports = router
