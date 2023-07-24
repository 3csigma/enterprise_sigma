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
router.post('/actualizarFotoPerfil', checkLogin, helpers.uploadFiles('foto_Actualizada', false, 'foto_profile', true, false), userController.actualizarFotoPerfil);

// Dashboard Principal Administrador
router.get('/registro-de-consultores', noLogueado, csrfProtection, dashboardController.registroConsultores)
router.post('/registro-de-consultores', noLogueado, helpers.uploadFiles('Consul_International_Group_', false, 'certificados_consultores', true, false), csrfProtection, dashboardController.addConsultores)

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
router.post('/guardar-archivos-empresarial', checkLogin, helpers.uploadFiles('Plan-Empresarial_', false, 'archivos_plan_empresarial', false, false), dashboardController.guardarArchivo_Empresarial)
// SUBIR ARCHIVOS PARA PLAN EMPRESARIAL
router.post('/website-empresarial', checkLogin, dashboardController.websiteEmpresarial)
// FINALIZAR ETAPA DE PLAN EMPRESARIAL
router.post('/finalizarEtapa', checkLogin, dashboardController.finalizarEtapa)

/********************************************************************************
 * RECURSOS COMPARTIDOS
*/
router.get('/recursos-compartidos', checkLogin, dashboardController.recursosCompartidos)
router.post('/add-grupos-compartidos', checkLogin, helpers.uploadFiles('Recurso_', 'archivos', 'grupo_recursos', true, false), dashboardController.addRecursos_Compartidos);

/********************************************************************************
 * MODULOS
*/
router.get('/ver-modulos', checkLogin, dashboardController.verModulos);
router.get('/crear-modulos', checkLogin, dashboardController.crearModulos);
router.post('/add-modulos', checkLogin, helpers.uploadModulos('leccion_', ["video[]", "material[]"], 'lecciones'), dashboardController.addModulos);

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