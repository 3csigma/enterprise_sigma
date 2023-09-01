const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const userController = require('../controllers/userController');
const { checkLogin, noLogueado, requireRole } = require('../lib/auth')
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })
const cron = require('node-cron');
const helpers = require('../lib/helpers')

// Dashboard Principal
router.get('/', requireRole)

// Perfil de Usuarios
router.post('/updateProfile', checkLogin, userController.update_user);
// router.post('/actualizarFotoPerfil', checkLogin, cargarFotoPerfil.single('foto'), userController.actualizarFotoPerfil);
router.post('/actualizarFotoPerfil', checkLogin, helpers.uploadFiles('foto_Actualizada', false, 'foto_profile', true, false, false), userController.actualizarFotoPerfil);

// Dashboard Principal Administrador
router.get('/registro-de-consultores', noLogueado, csrfProtection, dashboardController.registroConsultores)
router.post('/registro-de-consultores', noLogueado, helpers.uploadFiles('Consul_International_Group_', false, 'certificados_consultores', true, false, false), csrfProtection, dashboardController.addConsultores)

// Consultores Admin
router.get('/consultores', checkLogin, dashboardController.mostrarConsultores)
router.get('/consultores/:codigo', checkLogin, dashboardController.editarConsultor)
router.post('/actualizarConsultor', checkLogin, dashboardController.actualizarConsultor)
router.post('/bloquearConsultor', checkLogin, dashboardController.bloquearConsultor)

// Empresas Admin
router.get('/empresas', checkLogin, dashboardController.mostrarEmpresas)
router.get('/empresas/:codigo', checkLogin, dashboardController.editarEmpresa)
router.get('/empresas-asignadas/:codigo', checkLogin, dashboardController.editarEmpresa)
router.post('/actualizarEmpresa', checkLogin, dashboardController.actualizarEmpresa)
router.post('/bloquearEmpresa', checkLogin, dashboardController.bloquearEmpresa)
router.post('/conclusiones', checkLogin, dashboardController.conclusiones)

// PAGOS MANUALES (EXTERNOS)
router.post('/pagoManual-Diagnostico', checkLogin, dashboardController.pagoManualDiagnostico)
router.post('/pagoManual-Empresas', checkLogin, dashboardController.pagoManualEmpresas)

// Cuestionario Diagnóstico Empresa Establecida
router.get('/cuestionario-diagnostico/:codigo', checkLogin, dashboardController.cuestionario)
router.post('/cuestionario-diagnostico', checkLogin, dashboardController.enviarCuestionario)

// Cuestionario Diagnóstico Empresa Nueva
router.get('/diagnostico-proyecto/:codigo', checkLogin, dashboardController.dgNuevosProyectos)
router.post('/diagnostico-proyecto/', checkLogin, dashboardController.guardarRespuestas)

// SUBIR INFORMES DE TODAS LAS ETAPAS
router.post('/guardarInforme', checkLogin, dashboardController.subirInforme, dashboardController.guardarInforme)

/********************************************************************************
 * PLAN EMPRESARIAL
 */
// SUBIR ARCHIVOS PARA PLAN EMPRESARIAL
router.post('/guardar-archivos-empresarial', checkLogin, helpers.uploadFiles('Plan-Empresarial_', false, 'archivos_plan_empresarial', false, false, false), dashboardController.guardarArchivo_Empresarial)
// SUBIR ARCHIVOS PARA PLAN EMPRESARIAL
router.post('/website-empresarial', checkLogin, dashboardController.websiteEmpresarial)
// FINALIZAR ETAPA DE PLAN EMPRESARIAL
router.post('/finalizarEtapa', checkLogin, dashboardController.finalizarEtapa)

/********************************************************************************
 * RECURSOS COMPARTIDOS
*/
router.get('/recursos-compartidos', checkLogin, dashboardController.recursosCompartidos)
router.post('/add-grupos-compartidos', checkLogin, helpers.uploadFiles('Recurso_', 'archivos', 'grupo_recursos', true, false, false), dashboardController.addRecursos_Compartidos);

/********************************************************************************
 * MODULOS
*/
router.get('/ver-modulos', checkLogin, dashboardController.verModulos);
router.get('/crear-modulos', checkLogin, dashboardController.crearModulo);
router.post('/guardar-modulo', checkLogin, helpers.uploadFiles('leccion_', false, 'data_modulo', true, false, true), dashboardController.guardarModulo);
router.post('/eliminar-modulo', checkLogin, dashboardController.eliminarModulos);
router.get('/editar-modulos/:id', checkLogin, dashboardController.editarModulo);
router.post('/updateCategory', checkLogin, dashboardController.updateCategory);
router.get('/ver-modulos/:id', checkLogin, dashboardController.infoModulo);
router.get('/editar-modulo/:id', checkLogin, dashboardController.editarModulo);
router.post('/actualizar-modulo', checkLogin, dashboardController.actualizarModulo);
router.post('/actualizar-leccion', checkLogin, dashboardController.actualizarLeccion);
router.post('/agregar-leccion', checkLogin, dashboardController.agregarLeccionDB);
router.post('/eliminar-leccion', checkLogin, dashboardController.eliminarLeccion);
router.post('/consultar-lecciones', checkLogin, dashboardController.consultarLecciones);
router.post('/subir-archivos', checkLogin, helpers.uploadFiles('leccion_', false, 'data_modulo', true, false, true), dashboardController.subirArchivos);
router.post('/actualizar-estado-modulo', checkLogin, dashboardController.actualizar_estadoModulo);

/*******************************************************************************************************/

// Ejecución Diaria (12pm)
cron.schedule('0 12 * * 0-6',() => {
    helpers.habilitar_siguientePago()
});

// Ejecución Mensual
cron.schedule('0 1 1 * *',() => {
    helpers.historial_consultores_admin();
    helpers.historial_consultores_admin();
    helpers.historial_informes_admin();
    helpers.historial_empresas_consultor();
    helpers.historial_informes_consultor();
    helpers.habilitar_sgteDiagnostico();
});

router.post('/historial_empresas_admin', helpers.historial_empresas_admin)
router.post('/habilitardiagnostico', helpers.habilitar_sgteDiagnostico)

// Ejecución Semanal
cron.schedule('0 10 * * Mon',() => {
    helpers.consultar_tiempo_tareas();
});

router.get('/retrasadas', (req, res) => {
    helpers.consultar_tiempo_tareas()
    res.send("TODO OK -> END consultar_tiempo_tareas")
});

router.get('/consultarPagos', (req, res) => {
    helpers.habilitar_siguientePago()
    res.send("Consulta de pagos pendientes (ANÁLISIS Y EMPRESARIAL) finalizada.. -> Todo Ok")
});

module.exports = router;