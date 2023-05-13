const dashboardController = exports;
const pool = require('../database')
const passport = require('passport')
const multer = require('multer');
const path = require('path');
const { consultarInformes, consultarDatos, tareasGenerales, consultarTareasEmpresarial, insertarDatos, eliminarDatos, consultarTareasConsultores } = require('../lib/helpers')
const { sendEmail, consultorAsignadoHTML, consultorAprobadoHTML, informesHTML, etapaFinalizadaHTML, consultor_AsignadoEtapa, archivosPlanEmpresarialHTML } = require('../lib/mail.config');
const stripe = require('stripe')(process.env.CLIENT_SECRET_STRIPE);
const { getResponseChatGPT, checkGPT3Connectivity } = require('../lib/openai');

let aprobarConsultor = false;

// Dashboard Administrativo
dashboardController.admin = async (req, res) => {
    const consultores = await pool.query('SELECT * FROM consultores WHERE id_consultores != 1 ORDER BY id_consultores DESC LIMIT 2')
    const empresas = await pool.query('SELECT * FROM empresas ORDER BY id_empresas DESC LIMIT 2')

    /** Acceso directo para Consultores pendientes por aprobar */
    aprobarConsultor = false;
    const pendientes = await pool.query('SELECT id_usuarios, codigo, estadoAdm FROM users WHERE rol = "Consultor" AND estadoAdm = 0 ORDER BY id_usuarios ASC;')
    pendientes.length > 0 ? aprobarConsultor = pendientes[0].codigo : aprobarConsultor = aprobarConsultor;

    const consultorAsignado = await consultarDatos('consultores')
    const ficha = await consultarDatos('ficha_cliente')

    empresas.forEach(e => {
        consultorAsignado.forEach(c => {
            if (e.consultor == c.id_consultores) {
                e.nombre_consultor = c.nombres + " " + c.apellidos;
            }
        })

        // e.ficha = false;
        ficha.forEach(f => {
            if (f.id_empresa == e.id_empresas) {
                e.ficha = true;
            }
        });
    });

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE CONSULTORES REGISTRADOS MENSUALMENTE <<====
    let historialConsultores = await pool.query("SELECT * FROM (SELECT * FROM historial_consultores_admin ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;");
    let datosJson_historialC_adm
    if (historialConsultores.length > 0) {
        datosJson_historialC_adm = JSON.stringify(historialConsultores);
        console.log("\n");
        console.log("IMPIMIENDO datosJson_historialC_adm ====>>>", datosJson_historialC_adm);
    }
    // FIN DE LA FUNCIÓN <<====

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE EMPRESAS REGISTRADOS MENSUALMENTE <<====
    let historialEmpresas = await pool.query("SELECT * FROM (SELECT * FROM historial_empresas_admin ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;");
    let datosJson_historialE_adm
    if (historialEmpresas.length > 0) {
        datosJson_historialE_adm = JSON.stringify(historialEmpresas);
        console.log("\n");
        console.log("IMPIMIENDO datosJson_historialE_adm ====>>>", datosJson_historialE_adm);
    }
    // FIN DE LA FUNCIÓN <<====

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE INFORMES REGISTRADOS MENSUALMENTE <<====
    let historialInformes = await pool.query("SELECT * FROM (SELECT * FROM historial_informes_admin ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;");
    let datosJson_historialI_adm
    if (historialInformes.length > 0) {
        datosJson_historialI_adm = JSON.stringify(historialInformes);
        console.log("\n");
        console.log("IMPIMIENDO datosJson_historialI_adm ====>>>", datosJson_historialI_adm);
    }
    // FIN DE LA FUNCIÓN <<====

    /**
     * TAREAS ADMINISTRADOR
     */
    let consultor = await consultarDatos('consultores')
    consultor = consultor.find(x => x.codigo == req.user.codigo)
    const fechaActual = new Date().toLocaleDateString('fr-CA');
    const tareas = await consultarTareasConsultores(consultor.id_consultores, fechaActual)

    res.render('admin/panelAdmin', { 
        adminDash: true, itemActivo: 1, consultores, empresas, aprobarConsultor, graficas1: true, 
        datosJson_historialC_adm, datosJson_historialE_adm, datosJson_historialI_adm, 
        ide_consultor: consultor.id_consultores, fechaActual, tareas, datosUsuario: JSON.stringify(req.user)
    });

}

// CONSULTORES
dashboardController.registroConsultores = (req, res) => {
    res.render('auth/registroConsultor', { wizarx: true, csrfToken: req.csrfToken() })
}

dashboardController.addConsultores = (req, res, next) => {
    passport.authenticate('local.registroConsultores', {
        successRedirect: '/registro-de-consultores',
        failureRedirect: '/registro-de-consultores',
        failureFlash: true
    })(req, res, next)
}

dashboardController.mostrarConsultores = async (req, res) => {
    let consultores = await pool.query('SELECT c.*, u.codigo, u.foto, u.estadoAdm FROM consultores c JOIN users u ON c.codigo = u.codigo AND rol = "Consultor" AND c.id_consultores != 1;')
    
    consultores.forEach(async c => {
        const num = await pool.query('SELECT COUNT(distinct empresa) AS numEmpresas FROM consultores_asignados WHERE consultor = ?', [c.id_consultores])
        c.num_empresas = num[0].numEmpresas
    });
    
    /** Acceso directo para Consultores pendientes por aprobar */
    aprobarConsultor = false;
    const pendientes = await pool.query('SELECT id_usuarios, codigo, estadoAdm FROM users WHERE rol = "Consultor" AND estadoAdm = 0 ORDER BY id_usuarios ASC;')
    pendientes.length > 0 ? aprobarConsultor = pendientes[0].codigo : aprobarConsultor = aprobarConsultor;
    
    res.render('admin/mostrarConsultores', { adminDash: true, itemActivo: 2, consultores, aprobarConsultor })
}

dashboardController.editarConsultor = async (req, res) => {
    const codigo = req.params.codigo
    let consultor = await pool.query('SELECT c.*, u.codigo, u.estadoAdm, u.rol FROM consultores c LEFT OUTER JOIN users u ON c.codigo = ? AND c.codigo = u.codigo AND u.rol = "Consultor";', [codigo])
    consultor = consultor[0];
    if (consultor.certificado) {
        consultor.txtCertificado = consultor.certificado.split('/')[2]
    }
    res.render('admin/editarConsultor', { adminDash: true, itemActivo: 2, consultor, formEdit: true, aprobarConsultor })
}

dashboardController.actualizarConsultor = async (req, res) => {
    let respuesta = false;
    const { codigo, estado, nivel } = req.body;
    const estadoNivel = {nivel}
    const nuevoEstado = { estadoAdm: estado } // Estado Consultor Aprobado, Pendiente, Bloqueado
    const c1 = await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Consultor"', [nuevoEstado, codigo])
    const c2 = await pool.query('UPDATE consultores SET ? WHERE codigo = ?', [estadoNivel, codigo])
    // Capturando el Consultor Aprobado
    let consultor = await consultarDatos('users')
    consultor = consultor.find(x => x.codigo == codigo && x.rol == 'Consultor')

    if (c1.changedRows > 0) {
        // Enviando Email - Consultor Aprobado
        if (consultor.estadoAdm == 1) {
            const nombre = consultor.nombres + " " + consultor.apellidos;
            const clave = consultor.codigo.slice(5, 13);

            // Obtener la plantilla de Email
            const template = consultorAprobadoHTML(nombre, clave);
            // Enviar Email
            const resultEmail = await sendEmail(consultor.email, 'Has sido aprobado como consultor en 3C Sigma', template)

            if (resultEmail == false) {
                console.log("\n*_*_*_*_*_* Ocurrio un error inesperado al enviar el email de Consultor Asignado *_*_*_*_*_* \n");
            } else {
                console.log(`\n>>>> Email de Consultor Aprobado - ENVIADO a => ${consultor.email} <<<<<\n`)
                respuesta = true;
            }
        }
    }

    if (c2.affectedRows > 0) respuesta = true;

    res.send(respuesta)
}

dashboardController.bloquearConsultor = async (req, res) => {
    const { id } = req.body
    let respu = false;
    const actualizar = { estadoAdm: 2 }
    const consultor = await pool.query('SELECT id_consultores, codigo FROM consultores WHERE id_consultores = ? LIMIT 1', [id])
    if (consultor.length > 0) {
        const c = await pool.query('SELECT * FROM users WHERE codigo = ? AND rol = "Consultor"', [consultor[0].codigo])
        if (c.length > 0 && c[0].estadoAdm == 2) {
            res.send(respu)
        } else {
            await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Consultor"', [actualizar, consultor[0].codigo], (err, result) => {
                if (err) throw err;
                if (result.affectedRows > 0) { respu = true }
                res.send(respu)
            })
        }
    }
}

// EMPRESAS
dashboardController.mostrarEmpresas = async (req, res) => {
    let empresas = await pool.query('SELECT e.*, u.codigo, u.estadoEmail, u.estadoAdm, f.telefono, f.id_empresa, p.*, a.id_empresa, a.estadoAcuerdo FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = e.id_empresas LEFT OUTER JOIN pagos p ON p.id_empresa = e.id_empresas LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = e.id_empresas INNER JOIN users u ON u.codigo = e.codigo AND rol = "Empresa"')

    const dg_nueva = await consultarDatos('dg_empresa_nueva')
    const dg_establecida = await consultarDatos('dg_empresa_establecida')
    const dg_analisis = await consultarDatos('analisis_empresa')
    const consultor = await consultarDatos('consultores')
    const informe = await consultarDatos('informes')
    const propuestas = await consultarDatos('propuestas')

    empresas.forEach(e => {
        e.pagoEtapa1 = false;
        e.etapa = 'Email sin confirmar';
        e.estadoEmail == 1 ? e.etapa = 'Email confirmado' : e.etapa = e.etapa;
        // e.diagnostico_negocio == 1 ? e.etapa = 'Diagnóstico pagado' : e.etapa = e.etapa;
        // Pago de la Etapa 1 - Diagnóstico de Negocio
        if (e.diagnostico_negocio) {
            const p1 = JSON.parse(e.diagnostico_negocio)
            if (p1.estado == 1) {
                e.etapa = 'Diagnóstico pagado';
                e.pagoEtapa1 = true;
            } else {
                e.etapa = e.etapa
            }
        }
        e.estadoAcuerdo == 2 ? e.etapa = 'Acuerdo firmado' : e.etapa = e.etapa;
        e.telefono ? e.etapa = 'Ficha cliente' : e.etapa = e.etapa;
        if (dg_nueva.length > 0) {
            const _diag = dg_nueva.find(i => i.id_empresa == e.id_empresas)
            if (_diag) { _diag.consecutivo ? e.etapa = 'Cuestionario empresa nueva' : e.etapa = e.etapa; }
        }

        if (dg_establecida.length > 0) {
            const _diag = dg_establecida.find(i => i.id_empresa == e.id_empresas)
            if (_diag) { _diag.consecutivo ? e.etapa = 'Cuestionario empresa establecida' : e.etapa = e.etapa; }
        }

        let informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe diagnóstico')
        if (informe_empresa) {
            e.etapa = 'Informe diagnóstico';
        }

        /** PROPUESTA DE ANÁLISIS DE NEGOCIO - PDF */
        const propuesta = propuestas.find(i => i.empresa == e.id_empresas)
        if (propuesta) { e.etapa = 'Propuesta de análisis enviada' }

        // Pago de la Etapa 2 - Análisis de negocio
        if (e.analisis_negocio) {
            let p2 = JSON.parse(e.analisis_negocio)
            p2.estado == 1 ? e.etapa = 'Análisis pagado' : e.etapa = e.etapa;
            p2 = JSON.parse(e.analisis_negocio1)
            p2.estado == 2 ? e.etapa = '60% Análisis pagado' : e.etapa = e.etapa;
            p2 = JSON.parse(e.analisis_negocio2)
            p2.estado == 2 ? e.etapa = '80% Análisis pagado' : e.etapa = e.etapa;
            p2 = JSON.parse(e.analisis_negocio3)
            p2.estado == 2 ? e.etapa = 'Análisis pagado' : e.etapa = e.etapa;
        }

        if (dg_analisis.length > 0) {
            const dim = dg_analisis.find(i => i.id_empresa == e.id_empresas)
            if (dim) { 
                if (dim.producto) e.etapa = 'Cuestionario producto'
                if (dim.administracion) e.etapa = 'Cuestionario administración'
                if (dim.operacion) e.etapa = 'Cuestionario operación'
                if (dim.marketing) e.etapa = 'Cuestionario marketing'
            }
        }

        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de dimensión producto')
        if (informe_empresa) { e.etapa = 'Informe producto'; }
        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de dimensión administración')
        if (informe_empresa) { e.etapa = 'Informe administración'; }
        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de dimensión operaciones')
        if (informe_empresa) { e.etapa = 'Informe operación'; }
        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de dimensión marketing')
        if (informe_empresa) { e.etapa = 'Informe marketing'; }
        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de análisis')
        if (informe_empresa) { e.etapa = 'Informe análisis'; }
        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de plan estratégico')
        if (informe_empresa) { e.etapa = 'Informe plan estratégico'; }

        const consultor_empresa = consultor.find(item => item.id_consultores == e.consultor)
        if (consultor_empresa) {
            e.nombre_consultor = consultor_empresa.nombres + " " + consultor_empresa.apellidos;
            e.codigo_consultor = consultor_empresa.codigo
        }

    });

    res.render('admin/mostrarEmpresas', { adminDash: true, itemActivo: 3, empresas, aprobarConsultor })
}

dashboardController.editarEmpresa = async (req, res) => {
    const codigo = req.params.codigo, datos = {};
    const fechaActual = new Date().toLocaleDateString('fr-CA');
    let userEmpresa = await consultarDatos('users')
    userEmpresa = userEmpresa.find(x => x.codigo == codigo && x.rol == 'Empresa')
    // Empresa tabla Usuarios
    let datosEmpresa = await consultarDatos('empresas')
    datosEmpresa = datosEmpresa.find(x => x.codigo == codigo)
    const idEmpresa = datosEmpresa.id_empresas;
    // Empresa tabla Ficha Cliente
    let empresa = await consultarDatos('ficha_cliente')
    empresa = empresa.find(x => x.id_empresa == idEmpresa)
    const pago_diagnostico = {
        color : 'badge-warning',
        texto : 'Pendiente',
        btn : false,
        fecha : 'N/A',
        activarBtn : false,
        sede: false
    }

    // Capturando Consultores Activos
    const consultores = await pool.query('SELECT c.*, u.codigo, u.estadoAdm, u.rol FROM consultores c INNER JOIN users u ON u.estadoAdm = 1 AND c.codigo = u.codigo AND u.rol != "Empresa"')

    datos.nombre_completo = datosEmpresa.nombres + " " + datosEmpresa.apellidos;
    datos.nombre_empresa = datosEmpresa.nombre_empresa;
    datos.email = datosEmpresa.email;
    datos.estadoAdm = userEmpresa.estadoAdm;
    datos.code = codigo;
    datos.idEmpresa = idEmpresa
    datos.foto = userEmpresa.foto
    datos.idConsultor = 1
    datos.consultor_diagnostico = false;

    // PAGOS DE LA EMPRESA
    let pagos = await consultarDatos('pagos')
    let pay = pagos.find(i => i.id_empresa == idEmpresa)
    if (!pay) {
        const estado = JSON.stringify({estado:0})
        const nuevoPago = { 
            id_empresa: idEmpresa,
            diagnostico_negocio: estado,
            analisis_negocio: estado,
            analisis_negocio1: JSON.stringify({estado:1}),
            analisis_negocio2: estado,
            analisis_negocio3: estado,
            estrategico: estado,
            empresarial0: estado,
            empresarial1: JSON.stringify({estado:1}),
            empresarial2: estado,
            empresarial3: estado,
        }
        await insertarDatos('pagos', nuevoPago)
    }

    // INFO DE LA EMPRESA HASTA LA FICHA CLIENTE
    let pagoDg_Realizado = false;
    if (datosEmpresa) {
        datosEmpresa.estadoEmail == 1 ? datos.etapa = 'Email confirmado' : datos.etapa = datos.etapa;
        // datosEmpresa.consultor != null ? datos.etapa = 'Consultor asignado' : datos.etapa = datos.etapa;
        
        let consulDg = await consultarDatos('consultores_asignados')
        let infoConsul = await consultarDatos('consultores')
        if (consulDg.length > 0) {
            // Buscando el Consultor asignado en la Etapa Diagnóstico para la empresa actual
            consulDg = consulDg.find(x => x.empresa == datos.idEmpresa && x.orden == 1)
            if (consulDg) {
                datos.consultor_diagnostico = true;
                infoConsul = infoConsul.find(x => x.id_consultores == consulDg.consultor)
                pago_diagnostico.btn = 'color: white;'
                datos.idConsultor = infoConsul.id_consultores;
                if (infoConsul.nivel == '1') {
                    pago_diagnostico.valor = process.env.PRECIO_NIVEL1
                } else if (infoConsul.nivel == '2') {
                    pago_diagnostico.valor = process.env.PRECIO_NIVEL2;
                } else if (infoConsul.nivel == '3') {
                    pago_diagnostico.valor = process.env.PRECIO_NIVEL3;
                } else if (infoConsul.nivel == '4') {
                    if (consulDg.sede == 1) {
                        pago_diagnostico.valor = process.env.PRECIO_NIVEL4_SEDE1;
                        pago_diagnostico.sede = process.env.SEDE1;
                    } else if (consulDg.sede == 2) {
                        pago_diagnostico.valor = process.env.PRECIO_NIVEL4_SEDE2;
                        pago_diagnostico.sede = process.env.SEDE2;
                    } else if (consulDg.sede == 3) {
                        pago_diagnostico.valor = process.env.PRECIO_NIVEL4_SEDE3;
                        pago_diagnostico.sede = process.env.SEDE3;
                    }
                }
            }
        }

        // PAGOS DE LA EMPRESA
        pagos = await consultarDatos('pagos')
        pay = pagos.find(i => i.id_empresa == idEmpresa)
        // Validando Diagnóstico de negocio ha sido pagado
        if (pay) {
            const pagoDiagnostico = JSON.parse(pay.diagnostico_negocio)    
            if (pagoDiagnostico.estado == 1) {
                datos.etapa = 'Diagnóstico pagado'
                pago_diagnostico.color = 'badge-success'
                pago_diagnostico.texto = 'Pagado'
                pago_diagnostico.valor = pagoDiagnostico.precio;
                pago_diagnostico.fecha = pagoDiagnostico.fecha
                pagoDg_Realizado = true // Pago de Diagnóstico realizado
            }
        }

        let acuerdo = await consultarDatos('acuerdo_confidencial')
        acuerdo = acuerdo.find(x => x.id_empresa == idEmpresa)
        if (acuerdo) acuerdo.estadoAcuerdo == 2 ? datos.etapa = 'Acuerdo firmado' : datos.etapa = datos.etapa;

        if (empresa) {
            empresa.telefono != null ? datos.etapa = 'Ficha Cliente' : datos.etapa = datos.etapa;

            const fNac = new Date(empresa.fecha_nacimiento)
            empresa.fecha_nacimiento = fNac.toLocaleDateString("en-US")

            if (empresa.redes_sociales) {
                datos.redesOK = false;
                datos.redes = JSON.parse(empresa.redes_sociales)
                datos.redes.twitter != '' ? datos.redes.twitter = datos.redes.twitter : datos.redes.twitter = false
                datos.redes.facebook != '' ? datos.redes.facebook = datos.redes.facebook : datos.redes.facebook = false
                datos.redes.instagram != '' ? datos.redes.instagram = datos.redes.instagram : datos.redes.instagram = false
                datos.redes.otra != '' ? datos.redes.otra = datos.redes.otra : datos.redes.otra = false

                if (datos.redes.twitter || datos.redes.facebook || datos.redes.instagram || datos.redes.otra) {
                    datos.redesOK = true;
                }
            }
            datos.objetivos = JSON.parse(empresa.objetivos)
            datos.fortalezas = JSON.parse(empresa.fortalezas)
            datos.problemas = JSON.parse(empresa.problemas)
        }
    }

    // CAPTURANDO CONSULTORES ASIGNADOS A LA EMPRESA
    let divConsultores = 'none';
    let consultores_asignados = await consultarDatos('consultores_asignados', 'ORDER BY orden ASC')
    consultores_asignados = consultores_asignados.filter(x => x.empresa == idEmpresa)
    if (consultores_asignados.length > 0) {
        divConsultores = 'contents';
        consultores_asignados.forEach(c => {
            const consultor = consultores.find(x => x.id_consultores == c.consultor);
            c.idConsultor = c.consultor;
            c.consultor = consultor.nombres + " " + consultor.apellidos;
            c.idFila = c.etapa.replace(/[$ ]/g, '_');
        })
    }

    /************************************************************************************************************* */
    // Tabla de Diagnóstico - Empresas Nuevas & Establecidas
    const frmDiag = {}
    let diagnostico = await consultarDatos('dg_empresa_establecida')
    diagnostico = diagnostico.find(x => x.id_empresa == idEmpresa)
    let dgNuevasEmpresas = await consultarDatos('dg_empresa_nueva')
    dgNuevasEmpresas = dgNuevasEmpresas.find(x => x.id_empresa == idEmpresa)
    
    if (!diagnostico && !dgNuevasEmpresas) {
        frmDiag.color = 'badge-danger'
        frmDiag.texto = 'Pendiente'
        frmDiag.fechaLocal = true;
        frmDiag.tablasVacias = true;
    } else {        
        frmDiag.color = 'badge-success'
        frmDiag.estilo = 'linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%); color: #FFFF'
        frmDiag.texto = 'Completado'
        frmDiag.estado = true;

        if (diagnostico) {
            datos.etapa = 'Cuestionario empresa establecida'
            frmDiag.fecha = diagnostico.fecha;
            frmDiag.tabla1 = true;
            frmDiag.tabla2 = false;
        } else {
            datos.etapa = 'Cuestionario empresa nueva'
            frmDiag.fecha = dgNuevasEmpresas.fecha;
            frmDiag.tabla1 = false;
            frmDiag.tabla2 = true;
            datos.nueva = true;
        }
    }

    // Respuestas del Cuestionario Diagnóstico Empresa Establecida
    const resDiag = {}
    datos.cuestionarios = false;
    if (frmDiag.tabla1) {
        datos.cuestionarios = true;
        const r = diagnostico
        resDiag.producto = JSON.parse(r.productos_servicios)
        resDiag.administracion = JSON.parse(r.administracion)
        resDiag.talento = JSON.parse(r.talento_humano)
        resDiag.finanzas = JSON.parse(r.finanzas)
        resDiag.servicio = JSON.parse(r.servicio_alcliente)
        resDiag.operaciones = JSON.parse(r.operaciones)
        resDiag.ambiente = JSON.parse(r.ambiente_laboral)
        resDiag.innovacion = JSON.parse(r.innovacion)
        resDiag.marketing = JSON.parse(r.marketing)
        resDiag.ventas = JSON.parse(r.ventas)
        resDiag.fortalezas = JSON.parse(r.fortalezas)
        resDiag.oportunidades = JSON.parse(r.oportunidades_mejoras)
        resDiag.metas = JSON.parse(r.metas_corto_plazo)
    }
    // Respuestas del Cuestionario Diagnóstico Empresa Nueva
    if (frmDiag.tabla2) {
        console.log("Info para Diagnóstico empresa nueva")
        datos.cuestionarios = true;
        const r = dgNuevasEmpresas
        resDiag.rubro = r.rubro
        resDiag.exp_rubro = JSON.parse(r.exp_rubro)
        resDiag.mentalidad = JSON.parse(r.mentalidad_empresarial)
        resDiag.viabilidad = JSON.parse(r.viabilidad)
        resDiag.producto = JSON.parse(r.productos_servicios)
        resDiag.administracion = JSON.parse(r.administracion)
        resDiag.talento = JSON.parse(r.talento_humano)
        resDiag.finanzas = JSON.parse(r.finanzas)
        resDiag.servicio = JSON.parse(r.servicio_cliente)
        resDiag.operaciones = JSON.parse(r.operaciones)
        resDiag.ambiente = JSON.parse(r.ambiente_laboral)
        resDiag.innovacion = JSON.parse(r.innovacion)
        resDiag.marketing = JSON.parse(r.marketing)
        resDiag.ventas = JSON.parse(r.ventas)
        resDiag.metas = JSON.parse(r.metas)
    }

    /***************** Tabla de Informes ******************* */
    const frmInfo = {}
    const info = {
        prod: { ver: 'none' },
        adm: { ver: 'none' },
        op: { ver: 'none' },
        marketing: { ver: 'none' },
        analisis: { ver: 'none' },
        plan: { ver: 'none' }
    }
    let tablaInformes = await consultarDatos('informes', 'ORDER BY id_informes DESC')
    tablaInformes = tablaInformes.find(x => x.id_empresa == idEmpresa)
    if (tablaInformes) {
        frmInfo.fecha = tablaInformes.fecha;
        frmInfo.ver1 = 'block';
        frmInfo.url = tablaInformes.url;
    } else {
        frmInfo.ver1 = 'none';
        frmInfo.url = false;
    }

    /** **************************************************************** */
    // Informe de diagnóstico
    const informeDiag = await consultarInformes(idEmpresa, "Informe diagnóstico")
    // Informe de dimensión producto
    const informeProd = await consultarInformes(idEmpresa, "Informe de dimensión producto")
    // Informe de dimensión administración
    const informeAdmin = await consultarInformes(idEmpresa, "Informe de dimensión administración")
    // Informe de dimensión operaciones
    const informeOperaciones = await consultarInformes(idEmpresa, "Informe de dimensión operaciones")
    // Informe de dimensión marketing
    const informeMarketing = await consultarInformes(idEmpresa, "Informe de dimensión marketing")
    // Informe de análisis
    const informeAnalisis = await consultarInformes(idEmpresa, "Informe de análisis")
    // Informe de Plan estratégico
    const informePlan = await consultarInformes(idEmpresa, "Informe de plan estratégico")

    if (informeDiag) {
        frmInfo.fecha = informeDiag.fecha;
        frmInfo.ver1 = 'block';
        frmInfo.url = informeDiag.url;
        datos.etapa = 'Informe general de diagnóstico de negocio'
    }

    /************************************************************************************* */

    /** PROPUESTA DE ANÁLISIS DE NEGOCIO - PDF */
    const propuestas = await consultarDatos('propuestas')
    const propuesta = {}
    propuesta.analisis = propuestas.find(i => i.empresa == idEmpresa && i.tipo_propuesta == 'Análisis de negocio')
    let pagos_analisis = {};
    if (propuesta.analisis) {
        datos.etapa = 'Propuesta de análisis enviada'

        /** PAGOS DE ANÁLISIS DE NEGOCIO (ÚNICO o DIVIDIDO) */
        pagos_analisis.unico = JSON.parse(pay.analisis_negocio)
        pagos_analisis.uno = JSON.parse(pay.analisis_negocio1)
        pagos_analisis.dos = JSON.parse(pay.analisis_negocio2)
        pagos_analisis.tres = JSON.parse(pay.analisis_negocio3)

        pagos_analisis.unico.color = pagos_analisis.uno.color = pagos_analisis.dos.color = pagos_analisis.tres.color = 'warning';
        pagos_analisis.unico.txt = pagos_analisis.uno.txt = pagos_analisis.dos.txt = pagos_analisis.tres.txt = 'Pendiente';
        pagos_analisis.unico.btn = pagos_analisis.uno.btn = true;
        pagos_analisis.dos.btn = pagos_analisis.tres.btn = false;

        pagos_analisis.unico.precio = parseFloat(propuesta.analisis.precio_total*0.9)
        pagos_analisis.uno.precio = propuesta.analisis.precio_per1
        pagos_analisis.dos.precio = propuesta.analisis.precio_per2
        pagos_analisis.tres.precio = propuesta.analisis.precio_per3

        if (pagos_analisis.unico.estado == 1) {
            propuesta.analisis.precio_total = propuesta.analisis.precio_total;
            datos.etapa = 'Análisis de negocio pago único'
            pagos_analisis.unico.color = 'success'
            pagos_analisis.unico.txt = 'Pagado 100%'
            propuesta.analisis.pago = true;
            pagos_analisis.unico.btn = false;
        }
        if (pagos_analisis.uno.estado == 2) {
            datos.etapa = 'Análisis de negocio - Pagado 60%'
            pagos_analisis.uno.color = 'success'
            pagos_analisis.uno.txt = 'Pagado 60%'
            propuesta.analisis.pago = true;
            pagos_analisis.uno.btn = false;
            pagos_analisis.dos.btn = true;
        }
        if (pagos_analisis.dos.estado == 2) {
            datos.etapa = 'Análisis de negocio - Pagado 80%'
            pagos_analisis.dos.color = 'success'
            pagos_analisis.dos.txt = 'Pagado 80%'
            pagos_analisis.dos.btn = false;
            pagos_analisis.tres.btn = true;
        }
        if (pagos_analisis.tres.estado == 2) {
            datos.etapa = 'Análisis de negocio - Pagado 100%'
            pagos_analisis.tres.color = 'success'
            pagos_analisis.tres.txt = 'Pagado 100%'
            pagos_analisis.tres.btn = false;
        }
    }

    if (informeProd) {
        info.prod.fecha = informeProd.fecha;
        info.prod.ver = 'block';
        info.prod.url = informeProd.url;
        datos.etapa = 'Informe análisis dimensión producto'
    }

    if (informeAdmin) {
        info.adm.fecha = informeAdmin.fecha;
        info.adm.ver = 'block';
        info.adm.url = informeAdmin.url;
        datos.etapa = 'Informe análisis dimensión administración'
    }

    if (informeOperaciones) {
        info.op.fecha = informeOperaciones.fecha;
        info.op.ver = 'block';
        info.op.url = informeOperaciones.url;
        datos.etapa = 'Informe análisis dimensión operaciones'
    }

    if (informeMarketing) {
        info.marketing.fecha = informeMarketing.fecha;
        info.marketing.ver = 'block';
        info.marketing.url = informeMarketing.url;
        datos.etapa = 'Informe análisis dimensión marketing'
    }

    if (informeAnalisis) {
        info.analisis.fecha = informeAnalisis.fecha;
        info.analisis.ver = 'block';
        info.analisis.url = informeAnalisis.url;
        datos.etapa = 'Informe general de análisis de negocio'
    }

    if (informePlan) {
        // info.plan.ok = true;
        info.plan.fecha = informePlan.fecha;
        info.plan.ver = 'block';
        info.plan.url = informePlan.url;
        datos.etapa = 'Informe de plan estratégico de negocio'
    }

    /************** DATOS PARA LAS GRÁFICAS AREAS VITALES & POR DIMENSIONES & PERCEPCIÓN ESTADÍSTICA ****************/
    /**
     * PC => Percepción Cliente
     * PE => Percepción Estadística
    */
    let jsonIndicadores = {}, nuevosProyectos = 0, rendimiento = {};
    let areasVitales = await consultarDatos('indicadores_areasvitales', 'ORDER BY id_ ASC')
    areasVitales = areasVitales.find(x => x.id_empresa == idEmpresa)
    let areasVitales2 = await consultarDatos('indicadores_areasvitales', 'ORDER BY id_ DESC')
    areasVitales2 = areasVitales2.find(x => x.id_empresa == idEmpresa)
    if (areasVitales) {
        rendimiento.ok = true;
        jsonIndicadores.areasVitales1 = areasVitales;
        jsonIndicadores.areasVitales2 = areasVitales2;
        if (areasVitales.rendimiento_op >= 1) {
            rendimiento.op = areasVitales.rendimiento_op
        } else {
            rendimiento.op = false;
        }
    }

    // Empresas Nuevas
    let resulCateg = await consultarDatos('resultado_categorias')
    resulCateg = resulCateg.find(x => x.id_empresa == idEmpresa)
    if (resulCateg) {
        rendimiento.ok = true;
        jsonIndicadores.dimensiones1 = resulCateg
        nuevosProyectos = 1;
        // Rendimiento del Proyecto
        rendimiento.num = resulCateg.rendimiento
        if (rendimiento.num < 50) {
            rendimiento.txt = "Mejorable"
            rendimiento.color = "badge-danger"
        } else if (rendimiento.num > 51 && rendimiento.num < 74) {
            rendimiento.txt = "Satisfactorio"
            rendimiento.color = "badge-warning"
        } else {
            rendimiento.txt = "Óptimo"
            rendimiento.color = "badge-success"
        }
    }

    /*************************************************************************************** */
    // Empresas Establecidas
    let xDimensiones = await consultarDatos('indicadores_dimensiones', 'ORDER BY id ASC')
    xDimensiones = xDimensiones.find(x => x.id_empresa == idEmpresa)
    let xDimensiones2 = await consultarDatos('indicadores_dimensiones', 'ORDER BY id DESC')
    xDimensiones2 = xDimensiones2.find(x => x.id_empresa == idEmpresa)
    if (xDimensiones) {
        jsonIndicadores.ok = true;
        jsonIndicadores.dimensiones1 = xDimensiones
        jsonIndicadores.dimensiones2 = xDimensiones2
        nuevosProyectos = 0;
    }

    // Percepción Estadística
    let pe_areasVitales1 = await consultarDatos('percepcion_estadistica_areas', 'ORDER BY id ASC')
    pe_areasVitales1 = pe_areasVitales1.find(x => x.empresa == idEmpresa)
    // let pe_dimensiones2 = await consultarDatos('percepcion_estadistica_dimensiones', 'ORDER BY id DESC')
    // pe_dimensiones2 = pe_dimensiones2.find(x => x.EMPRESA == idEmpresa)
    if (pe_areasVitales1) {
        rendimiento.pe1 = true;
        jsonIndicadores.pe_Areas1 = pe_areasVitales1
        nuevosProyectos = 0;
    }
    let pe_dimensiones1 = await consultarDatos('percepcion_estadistica_dimensiones', 'ORDER BY id ASC')
    pe_dimensiones1 = pe_dimensiones1.find(x => x.empresa == idEmpresa)
    // let pe_dimensiones2 = await consultarDatos('percepcion_estadistica_dimensiones', 'ORDER BY id DESC')
    // pe_dimensiones2 = pe_dimensiones2.find(x => x.EMPRESA == idEmpresa)
    if (pe_dimensiones1) {
        rendimiento.pe2 = true;
        jsonIndicadores.pe_Dimensiones1 = pe_dimensiones1
        // jsonIndicadores.pe2 = pe_dimensiones2
        nuevosProyectos = 0;
    }

    /************************************************************************************* */
    /** ANÁLISIS DE NEGOCIO POR DIMENSIONES - RESPUESTAS DE CUESTIONARIOS */
    let dimProducto = false, dimAdmin = false, dimOperacion = false, dimMarketing = false;
    const analisis_empresa = await consultarDatos('analisis_empresa')
    const analisisDimensiones = analisis_empresa.find(x => x.id_empresa == idEmpresa)
    if (analisisDimensiones) {
        const dimension = analisisDimensiones
        if (dimension.producto) {
            const prod = JSON.parse(dimension.producto)
            dimProducto = {
                fecha: prod.fecha,
                publico_objetivo: prod.publico_objetivo,
                beneficios: prod.beneficios,
                tipo_producto: prod.tipo_producto,
                nivel_precio: prod.nivel_precio,
                mas_vendidos: prod.mas_vendidos,
                razon_venta: prod.razon_venta,
                integracion_gama: prod.integracion_gama,
                calidad: prod.calidad,
                aceptacion: prod.aceptacion,
            }
        }
        if (dimension.administracion) {
            const admin = JSON.parse(dimension.administracion)
            dimAdmin = {
                fecha: admin.fecha,
                v: admin.vision,
                mision: admin.mision,
                valores: admin.valores,
                f: admin.foda,
                estructura_organizativa: admin.estructura_organizativa,
                tipo_sistema: admin.tipo_sistema,
                sistema_facturacion: admin.sistema_facturacion,
                av_th: admin.av_talento_humano,
                av_fz: admin.av_finanzas,
            }
        }
        if (dimension.operacion) {
            const op = JSON.parse(dimension.operacion)
            dimOperacion = {
                fecha: op.fecha,
                info_productos: op.info_productos,
                satisfaccion: op.satisfaccion,
                encuesta_clientes: op.encuesta_clientes,
                informacion_deClientes: op.informacion_deClientes,
                utilidad_libro_quejas: op.utilidad_libro_quejas,
                beneficio_libro_quejas: op.beneficio_libro_quejas,
                estrategia__libro_quejas: op.estrategia__libro_quejas,
                fidelizacion_clientes: op.fidelizacion_clientes,
                av_op: op.av_operaciones,
                av_ambiente: op.av_ambiente_laboral,
                av_innovacion: op.av_innovacion,
            }
        }
        if (dimension.marketing) {
            const mark = JSON.parse(dimension.marketing)
            dimMarketing = {
                fecha: mark.fecha,
                objetivo_principal: mark.objetivo_principal,
                cliente: mark.cliente,
                posicionamiento: mark.posicionamiento,
                beneficios: mark.beneficios,
                mensaje: mark.mensaje,
                oferta1: mark.oferta1,
                oferta2: mark.oferta2,
                seguimiento: mark.seguimiento,
                presupuesto: mark.presupuesto,
                atraccion: mark.atraccion,
                fidelizacion: mark.fidelizacion,
                sitioWeb: mark.sitioWeb,
                identidadC: mark.identidadC,
                eslogan: mark.eslogan,
                estrategias: mark.estrategias
            }
        }
    }
    let divInformes = false; 
    const filaInforme = { producto: false, administracion: false, operaciones: false, marketing: false }
    if (dimProducto || dimAdmin || dimOperacion || dimMarketing) { 
        divInformes = true;
        if (dimProducto) filaInforme.producto = true;
        if (dimAdmin) filaInforme.administracion = true;
        if (dimOperacion) filaInforme.operaciones = true;
        if (dimMarketing) filaInforme.marketing = true;
        if (dimProducto && dimAdmin && dimOperacion && dimMarketing) filaInforme.completo = true; 
    }

    /**************************************************************************************** */
    /* => Plan Empresarial ***************************************************************** */
    // PROPUESTA
    // propuesta.empresarial = propuestas.find(i => i.empresa == idEmpresa && i.tipo_propuesta == 'Plan empresarial')
    // let pagos_empresarial = {}, tareasEmpresarial = null;
    // const empresarial = {                     
    //     negocio: { ver: 'none' },
    //     marketing: { ver: 'none' },
    //     branding: { ver: 'none' },
    //     renders: { ver: 'none' },
    //     website: { ver: 'none' },
    //     otro: { ver: 'none' },
    //     otro2: { ver: 'none' },
    //     otro3: { ver: 'none' }
    // }
    // if (propuesta.empresarial) {
    //     datos.etapa = 'Propuesta de Plan Empresarial enviada'
    //     propuesta.empresarial.finalizada = false;
    //     if (datosEmpresa.etapa_empresarial == 1) { propuesta.empresarial.finalizada = true; }

    //     /** PAGOS DE PLAN EMPRESARIAL (ÚNICO o DIVIDIDO*/
    //     pagos_empresarial.unico = JSON.parse(pay.empresarial0)
    //     pagos_empresarial.uno = JSON.parse(pay.empresarial1)
    //     pagos_empresarial.dos = JSON.parse(pay.empresarial2)
    //     pagos_empresarial.tres = JSON.parse(pay.empresarial3)

    //     pagos_empresarial.unico.color = pagos_empresarial.uno.color = pagos_empresarial.dos.color = pagos_empresarial.tres.color = 'warning';
    //     pagos_empresarial.unico.txt = pagos_empresarial.uno.txt = pagos_empresarial.dos.txt = pagos_empresarial.tres.txt = 'Pendiente';
    //     pagos_empresarial.unico.btn = pagos_empresarial.uno.btn = true;
    //     pagos_empresarial.dos.btn = pagos_empresarial.tres.btn = false;
    //     pagos_empresarial.uno.precio = propuesta.empresarial.precio_per1
    //     pagos_empresarial.dos.precio = propuesta.empresarial.precio_per2
    //     pagos_empresarial.tres.precio = propuesta.empresarial.precio_per3

    //     pagos_empresarial.unico.precio = parseFloat(propuesta.empresarial.precio_total*0.9);

    //     if (pagos_empresarial.unico.estado == 1) {
    //         datos.etapa = 'Plan Empresarial pago único'
    //         pagos_empresarial.unico.color = 'success'
    //         pagos_empresarial.unico.txt = 'Pagado 100%'
    //         propuesta.empresarial.pago = true;
    //         pagos_empresarial.unico.btn = false;
    //         precioPagado = pagos_empresarial.unico.precio;
    //     }
    //     if (pagos_empresarial.uno.estado == 2) {
    //         datos.etapa = 'Plan Empresarial - Pagado 60%'
    //         pagos_empresarial.uno.color = 'success'
    //         pagos_empresarial.uno.txt = 'Pagado 60%'
    //         propuesta.empresarial.pago = true;
    //         pagos_empresarial.uno.btn = false;
    //         pagos_empresarial.dos.btn = true;
    //     }
    //     if (pagos_empresarial.dos.estado == 2) {
    //         datos.etapa = 'Plan Empresarial - Pagado 80%'
    //         pagos_empresarial.dos.color = 'success'
    //         pagos_empresarial.dos.txt = 'Pagado 80%'
    //         pagos_empresarial.dos.btn = false;
    //         pagos_empresarial.tres.btn = true;
    //     }
    //     if (pagos_empresarial.tres.estado == 2) {
    //         datos.etapa = 'Plan Empresarial - Pagado 100%'
    //         pagos_empresarial.tres.color = 'success'
    //         pagos_empresarial.tres.txt = 'Pagado 100%'
    //         pagos_empresarial.tres.btn = false;
    //     }

    //     const archivosEmpresarial = await consultarDatos("archivos_plan_empresarial", `WHERE empresa = ${idEmpresa}`)
    //     // PLAN DE NEGOCIO
    //     let archivo = archivosEmpresarial.find(x => x.tipo == "Plan de negocio")
    //     if (archivo) {
    //         empresarial.negocio.fecha = archivo.fecha;
    //         empresarial.negocio.ver = 'block';
    //         empresarial.negocio.url = archivo.url;
    //         datos.etapa = 'Archivo de Plan de negocio - Plan Empresarial'
    //     }
    //     // PLAN DE MARKETING
    //     archivo = archivosEmpresarial.find(x => x.tipo == "Plan de marketing")
    //     if (archivo) {
    //         empresarial.marketing.fecha = archivo.fecha;
    //         empresarial.marketing.ver = 'block';
    //         empresarial.marketing.url = archivo.url;
    //         datos.etapa = 'Archivo de Plan de marketing - Plan Empresarial'
    //     }
    //     // BRANDING
    //     archivo = archivosEmpresarial.find(x => x.tipo == "Branding")
    //     if (archivo) {
    //         empresarial.branding.fecha = archivo.fecha;
    //         empresarial.branding.ver = 'block';
    //         empresarial.branding.url = archivo.url;
    //         datos.etapa = 'Archivo de Branding - Plan Empresarial'
    //     }
    //     // RENDERS
    //     archivo = archivosEmpresarial.find(x => x.tipo == "Renders")
    //     if (archivo) {
    //         empresarial.renders.fecha = archivo.fecha;
    //         empresarial.renders.ver = 'block';
    //         empresarial.renders.url = archivo.url;
    //         datos.etapa = 'Archivo de Renders - Plan Empresarial'
    //     }
    //     // WEBSITE
    //     archivo = archivosEmpresarial.find(x => x.tipo == "Website")
    //     if (archivo) {
    //         empresarial.website.fecha = archivo.fecha;
    //         empresarial.website.ver = 'block';
    //         empresarial.website.url = archivo.url;
    //         datos.etapa = 'Link de website - Plan Empresarial'
    //     }
    //     // OTRO
    //     archivo = archivosEmpresarial.find(x => x.tipo == "Otro")
    //     if (archivo) {
    //         empresarial.otro.fecha = archivo.fecha;
    //         empresarial.otro.ver = 'block';
    //         empresarial.otro.url = archivo.url;
    //         empresarial.otro.nombre = archivo.nombre;
    //         datos.etapa = 'Archivos - Plan Empresarial'
    //     }
    //     // OTRO 2
    //     archivo = archivosEmpresarial.find(x => x.tipo == "Otro2")
    //     if (archivo) {
    //         empresarial.otro2.fecha = archivo.fecha;
    //         empresarial.otro2.ver = 'block';
    //         empresarial.otro2.url = archivo.url;
    //         empresarial.otro2.nombre = archivo.nombre;
    //         datos.etapa = 'Archivos - Plan Empresarial'
    //     }
    //     // OTRO 3
    //     archivo = archivosEmpresarial.find(x => x.tipo == "Otro3")
    //     if (archivo) {
    //         empresarial.otro3.fecha = archivo.fecha;
    //         empresarial.otro3.ver = 'block';
    //         empresarial.otro3.url = archivo.url;
    //         empresarial.otro3.nombre = archivo.nombre;
    //         datos.etapa = 'Archivos - Plan Empresarial'
    //     }

    //     // PROCESO PARA LAS TAREAS (PLAN EMPRESARIAL)
    //     tareasEmpresarial = await consultarTareasEmpresarial(idEmpresa, fechaActual)
    //     console.log("\nTAREAS EMPRESARIAL >> ", tareasEmpresarial)
    // }

    /************************************************************************************* */
    // => PLAN ESTRATÉGICO DE NEGOCIO *****************************************************/
    // PROPUESTA
    propuesta.estrategico = propuestas.find(i => i.empresa == idEmpresa && i.tipo_propuesta == 'Plan estratégico')
    let pagoEstrategico = {};
    if (propuesta.estrategico) {
        datos.etapa = 'Propuesta de plan estratégico enviada'

        // PAGO DE PLAN ESTRATÉGICO
        pagoEstrategico = JSON.parse(pay.estrategico)
        pagoEstrategico.color = 'warning';
        pagoEstrategico.txt = 'Pendiente';
        pagoEstrategico.btn = false;
        pagoEstrategico.precio = propuesta.estrategico.precio_total

        /** VALIDANDO ESTADO DE LA SUBSCRIPCIÓN - POR SI RENUEVA O NO LA SUB */
        let id_sub = null;
        let subscription = null;
        if (pagoEstrategico.subscription) {
            id_sub = pagoEstrategico.subscription;
            subscription = await stripe.subscriptions.retrieve(id_sub);
            if (subscription.cancel_at != null) {
                pagoEstrategico.fechaCancelacion = new Date(subscription.cancel_at*1000).toLocaleDateString('en-US');
            } else {
                pagoEstrategico.fechaCancelacion = false;
            }
            console.log("\n>>> DATA SUBSCRIPTION DESDE ADMIN ===> ", subscription)
            console.log('\n*******************\n');
            if (subscription.status == 'active' && !subscription.cancel_at_period_end && subscription.cancel_at != null) {
                datos.etapa = 'Pago por subscripción de plan estratégico iniciado'
                pagoEstrategico.color = 'success'
                pagoEstrategico.txt = 'Activa'
                pagoEstrategico.btn = true;
                propuesta.estrategico.pago = true;
                propuesta.pagada = true;
            } else if (subscription.status == 'active' && subscription.cancel_at_period_end && subscription.cancel_at != null) {
                datos.etapa = 'Subscripción de plan estratégico pendiente por cancelar'
                pagoEstrategico.txt = 'Pendiente por cancelar';
                pagoEstrategico.color = 'secondary';
                pagoEstrategico.btn = false;
                propuesta.estrategico.pago = true;
                propuesta.pagada = true;
            } else if (subscription.status == 'active' && !subscription.cancel_at_period_end && subscription.cancel_at == null) {
                datos.etapa = 'Subscripción de plan estratégico pendiente por renovar'
                pagoEstrategico.txt = 'Pendiente por renovar';
                pagoEstrategico.color = 'info'
                pagoEstrategico.btn = true;
                propuesta.estrategico.pago = true;
                propuesta.pagada = true;
            } else {
                datos.etapa = 'Subscripción de plan estratégico cancelada'
                pagoEstrategico.color = 'danger'
                pagoEstrategico.txt = 'Cancelada'
                pagoEstrategico.btn = false;
                propuesta.estrategico.pago = true;
            }
        }

    }

    // PROCESO PARA LAS TAREAS DE LA EMPRESA (PLAN ESTRATÉGICO)
    const dimObj = await tareasGenerales(idEmpresa, fechaActual)
    const tareas = dimObj.tareas;
    let jsonDim = false;
    if (tareas.todas.length > 0) {
        const listo = dimObj.listo
        // jsonDim => Array para la gráfica de Plan Estratégico
        jsonDim = JSON.stringify([
            { ok: Math.round(listo[0]), pendiente: Math.round(100 - listo[0]) },
            { ok: Math.round(listo[1]), pendiente: Math.round(100 - listo[1]) },
            { ok: Math.round(listo[2]), pendiente: Math.round(100 - listo[2]) },
            { ok: Math.round(listo[3]), pendiente: Math.round(100 - listo[3]) }
        ])
    }

    let datosTabla = await consultarDatos('rendimiento_empresa')
    datosTabla = datosTabla.filter(x => x.empresa == idEmpresa)
    let jsonRendimiento = false;
    if (datosTabla.length > 0) jsonRendimiento = JSON.stringify(datosTabla);

    /*************************************************************************************************** */
    // Objeto para Botones de las tarjetas con base a la etapa del consultor
    let rolAdmin = false, consultorDash = false, itemActivo = 3, adminDash = true;
    const botonesEtapas = { uno:false, dos:false, plan1:false, plan2:false }
    
    // VALIDAR EL ROL DEL USUARIO
    if (req.user.rol == 'Admin') {
        rolAdmin = true;
        botonesEtapas.uno = true;
        botonesEtapas.dos = true;
        botonesEtapas.plan1 = true;
        botonesEtapas.plan2 = true;
    } else {
        consultorDash = true;
        itemActivo = 2;
        adminDash = false;
        aprobarConsultor = false;

        let cLogin = await consultarDatos('consultores'); // Consulta a la tabla de consultores
        cLogin = cLogin.find(i => i.codigo == req.user.codigo) // Buscando el código del consultor logueado
        // Filtro para saber a que etapas de la empresa está asignado el consultor
        const etapasAsignadas = consultores_asignados.filter(x => x.idConsultor == cLogin.id_consultores)
        console.group("\n* Soy un consultor - ETAPAS ASIGNADAS")
        console.log(etapasAsignadas)
        console.log(botonesEtapas)
        console.groupEnd()
        if (etapasAsignadas.length > 0) {
            etapasAsignadas.forEach(x => {
                console.log("X Etapa -> ", x.etapa)
                x.orden == 1 ? botonesEtapas.uno = true : false;
                x.orden == 2 ? botonesEtapas.dos = true : false;
                x.orden == 3 ? botonesEtapas.plan1 = true : false;
                x.orden == 4 ? botonesEtapas.plan2 = true : false;
            })
        }

        console.log("BOTONES ETAPAS - RESULTADO >> ", botonesEtapas)
    }

    let tab_tareaAsignada
    if (botonesEtapas.uno) tab_tareaAsignada = "color: #85bb65;"
    if(botonesEtapas.dos) tab_tareaAsignada = "color: #85bb65;"
    if(botonesEtapas.plan1) tab_tareaAsignada = "color: #85bb65;"
    if(botonesEtapas.plan2) tab_tareaAsignada = "color: #85bb65;"

    // VALIDANDO CUALES TAREAS ESTÁN COMPLETADAS (EN GENERAL)
    // TAREAS PLAN EMPRESARIAL
    // if (tareasEmpresarial) {
    //     tareasEmpresarial.forEach(x => {
    //         botonesEtapas.plan1 ? x.taskBtns = true : x.taskBtns = false;
    //     })
    // }

    // TAREAS PLAN ESTRATÉGICO
    if (tareas) {
        tareas.todas.forEach(x => {
            botonesEtapas.plan2 ? x.taskBtns = true : x.taskBtns = false;
        })
    }

    let tblConclusiones = await consultarDatos('conclusiones');
    tblConclusiones = tblConclusiones.filter(x => x.id_empresa == idEmpresa)
    let objconclusion = {}
    
    if (tblConclusiones) {
        const e1 = tblConclusiones.find(i => i.etapa == 1)
        if (e1) {objconclusion.e1 = e1.conclusion}

        const e2 = tblConclusiones.find(i => i.etapa == 2)
        if (e2) {objconclusion.e2 = e2.conclusion}

        const e3 = tblConclusiones.find(i => i.etapa == 3)
        if (e3) {objconclusion.e3 = e3.conclusion}

        const e4 = tblConclusiones.find(i => i.etapa == 4)
        if (e4) {objconclusion.e4 = e4.conclusion}

    }

    /******************************************************************************
     * SOLICITUD DE ARCHIVOS PARA LAS ETAPAS 2, 3 Y 4 
    */
    let archivos_solicitados = {};
    archivos_solicitados.analisis = await consultarDatos('archivos_analisis')
    archivos_solicitados.analisis = archivos_solicitados.analisis.filter(x => x.empresa == idEmpresa);
    archivos_solicitados.analisis.forEach(x => {
        x.color = 'warning'; x.estado = 'Pendiente';
        if (x.link) { x.color = 'success'; x.estado = 'Cargado' }
    })
    archivos_solicitados.empresarial = await consultarDatos('archivos_empresarial')
    archivos_solicitados.empresarial = archivos_solicitados.empresarial.filter(x => x.empresa == idEmpresa);
    archivos_solicitados.empresarial.forEach(x => {
        x.color = 'warning'; x.estado = 'Pendiente';
        if (x.link) { x.color = 'success'; x.estado = 'Cargado' }
    })
    archivos_solicitados.estrategico = await consultarDatos('archivos_estrategico')
    archivos_solicitados.estrategico = archivos_solicitados.estrategico.filter(x => x.empresa == idEmpresa);
    archivos_solicitados.estrategico.forEach(x => {
        x.color = 'warning'; x.estado = 'Pendiente';
        if (x.link) { x.color = 'success'; x.estado = 'Cargado' }
    })
    /******************************************************************************/

    res.render('admin/editarEmpresa', {
        adminDash, consultorDash, itemActivo, empresa, formEdit: true, datos, consultores,
        aprobarConsultor, frmDiag, frmInfo, consultores_asignados, divConsultores,
        jsonIndicadores: JSON.stringify(jsonIndicadores), resDiag, nuevosProyectos, rendimiento,
        graficas2: true, propuesta, pagos_analisis, divInformes, filaInforme,
        pagoEstrategico, info, dimProducto, dimAdmin, dimOperacion, dimMarketing,
        tareas, jsonDim, jsonRendimiento, fechaActual, pagoDg_Realizado,
        rolAdmin, botonesEtapas, objconclusion, datosUsuario: JSON.stringify(req.user), tab_tareaAsignada,
        archivos_solicitados
    })

}

dashboardController.conclusiones = async (req, res) => {
    const {id_empresa, etapa, conclusion} = req.body
    let row = await consultarDatos('conclusiones');

    row = row.find(x => x.id_empresa == id_empresa && x.etapa == etapa)
    console.log(" ROW ==>" ,  row);
    if (row) {
        const obj = {conclusion}
        await pool.query('UPDATE conclusiones SET ? WHERE id_empresa = ? AND etapa = ?', [obj, id_empresa, etapa])
    } else {
        const objConclusion = {id_empresa, etapa, conclusion}
        await insertarDatos('conclusiones', objConclusion)
    }
    res.send(true)
}

dashboardController.actualizarEmpresa = async (req, res) => {
    const { idEmpresa, codigo, estadoAdm, mapa } = req.body;
    const mapaConsultores = new Map(Object.entries(mapa)) 
    console.log("mapaConsultores > ", mapaConsultores)

    const linkBase = 'https://3csigma.com/app_public_files/emails_consultor/'
    // Consultar Datos de la empresa
    let empresa = await consultarDatos('empresas')
    
    empresa = empresa.find(x => x.codigo == codigo)
    console.log("Empresa Actual --> ", empresa)

    // Consultores Asignados
    const asignados = await consultarDatos('consultores_asignados', `WHERE empresa = "${idEmpresa}"`)
    for (const [key, value] of mapaConsultores) {
        const filtro = asignados.find(x => x.etapa == key)
        // console.log("\n FILTRO ---> ", filtro)
        let orden = 1;
        let link_Imagen = '';
        let mensaje = 'Recibirás instrucciones sobre como continuar en tu plataforma 3C sigma o a través de tu correo'
        if (key == 'Diagnóstico') {
            link_Imagen = linkBase+'Consultor-asignado_Diagnostico.jpg';
            mensaje = 'Ahora puedes realizar el pago del Diagnóstico de Negocio'
        }
        if (key == 'Análisis') {
            orden = 2;
            link_Imagen = linkBase+'Consultor-asignado_analisis.jpg';
        }
        if (key == 'Plan Empresarial') {
            orden = 3;
            link_Imagen = linkBase+'Consultor-asignado_Plan_Empresarial.jpg';
        }
        if (key == 'Plan Estratégico') {
            orden = 4;
            link_Imagen = linkBase+'Consultor-asignado_Plan_Estrategico.jpg';
        }
        if (filtro) {
            const dato = {consultor: value.id}
            if (value.sede) { dato.sede = value.sede }
            await pool.query('UPDATE consultores_asignados SET ? WHERE empresa = ? AND etapa = ?', [dato, idEmpresa, key])
        } else {
            const datos = {consultor: value.id, empresa: idEmpresa, etapa: key, orden}
            if (value.sede) { datos.sede = value.sede }
            await insertarDatos('consultores_asignados', datos)
            
            /** INFO PARA ENVÍO DE EMAIL A LA EMPRESA - NOTIFICANDO CONSULTOR ASIGNADO */
            console.log("Enviando email de consultor Asignado - Etapa: " + key)
            const asunto = "Tu Consultor ha sido asignado para la etapa de " + key;
            const plantilla = consultorAsignadoHTML(empresa.nombre_empresa, link_Imagen, mensaje);
            const resultEmail = await sendEmail(empresa.email, asunto, plantilla)
            if (resultEmail == false) {
                console.log("\nOcurrio un error inesperado al enviar el email consultor asignado")
            } else {
                console.log("\n<<<<< Se envío emails de consultor(es) asignados a la empresa - Email: " + empresa.email + " >>>>>\n")
            }

            /** INFO PARA ENVÍO DE EMAIL A LA EMPRESA - NOTIFICANDO CONSULTOR ASIGNADO */
            let consultor = await consultarDatos('consultores')
            consultor = consultor.find(x => x.id_consultores == value.id)
            console.log("\nEnviando email para el consultor de que fue Asignado a una empresa en la Etapa: " + key)
            const subject = "Has sido asignado a una empresa para la etapa de " + key;
            const template = consultor_AsignadoEtapa(consultor.nombres, empresa.nombre_empresa, key);
            const resultConsultor = await sendEmail(consultor.email, subject, template)
            if (resultConsultor == false) {
                console.log("\nOcurrio un error inesperado al enviar el email *Haz sido asignado a una empresa*")
            } else {
                console.log("\n<<<<< Se envío email para el consultor de que ha sido asignado a una empresa - Email Consultor: " + consultor.email + " >>>>>\n")
            }
        }
    }

    // Cambiando estado de la cuenta de la empresa (Activa o Bloqueada)
    const estado = { estadoAdm }
    await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Empresa"', [estado, codigo], (err, result) => {
        if (err) { res.send(false); throw err; }
        res.send(true)
    })

}

dashboardController.bloquearEmpresa = async (req, res) => {
    const { id } = req.body
    let respu = false;
    const actualizar = { estadoAdm: 0 }
    const empresa = await pool.query('SELECT id_empresas, codigo FROM empresas WHERE id_empresas = ? LIMIT 1', [id])
    if (empresa.length > 0) {
        const e = await pool.query('SELECT * FROM users WHERE codigo = ?  AND rol = "Empresa"', [empresa[0].codigo])
        if (e.length > 0 && e[0].estadoAdm == 0) {
            res.send(respu)
        } else {
            await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Empresa"', [actualizar, empresa[0].codigo], (err, result) => {
                if (err) throw err;
                if (result.affectedRows > 0) { respu = true }
                res.send(respu)
            })
        }
    }
}

/** PAGOS MANUALES ETAPA 1 y 2 */
dashboardController.pagoManualDiagnostico = async (req, res) => {
    const { id, precio } = req.body
    const pagos = await consultarDatos('pagos')
    let pago_empresa = pagos.find(i => i.id_empresa == id);
    const fecha = new Date().toLocaleDateString("en-US")
    const data = { estado: 1, fecha, precio }
    const actualizarPago = { diagnostico_negocio: JSON.stringify(data) }
    await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarPago, id], (err, result) => {
        if (err) throw err;
        res.send(result)
    })
}

dashboardController.pagoManualEmpresas = async (req, res) => {
    const { num, id, etapa, precio } = req.body
    const fecha = new Date().toLocaleDateString("en-US")
    let actualizarPago = false;
    const data = { estado: 2, fecha }
    
    if (etapa == 2) {
        if (num == 0) {
            actualizarPago = { 
                analisis_negocio: JSON.stringify({ estado: 1, fecha, precio }),
                analisis_negocio1: JSON.stringify({ estado: 0 })
            }
        } else if (num == 1) { 
            actualizarPago = { analisis_negocio1: JSON.stringify(data) }
        } else if (num == 2) {
            actualizarPago = { analisis_negocio2: JSON.stringify(data) }
        } else {
            actualizarPago = { analisis_negocio3: JSON.stringify(data) }
        }
    } else if (etapa == 3) {
        actualizarPago = { 
            estrategico: JSON.stringify({ estado: 1, fecha }),
        }
    } else {
        if (num == 0) {
            actualizarPago = { 
                empresarial0: JSON.stringify({ estado: 1, fecha }),
                empresarial1: JSON.stringify({ estado: 0 })
            }
        } else if (num == 1) { 
            actualizarPago = { empresarial1: JSON.stringify(data) }
        } else if (num == 2) {
            actualizarPago = { empresarial2: JSON.stringify(data) }
        } else {
            actualizarPago = { empresarial3: JSON.stringify(data) }
        }
    }

    await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarPago, id], (err, result) => {
        if (err) throw err;
        if (result.affectedRows > 0) res.send(true)
        else res.send(false)
    })
}

// CUESTIONARIO DIAGNÓSTICO DE NEGOCIO EXCEL (EMPRESA ESTABLECIDA)
dashboardController.cuestionario = async (req, res) => {
    const { codigo } = req.params;
    let linkCerrar = '/diagnostico-de-negocio'
    if (req.user.rol != 'Empresa') {
        linkCerrar = `/empresas/${codigo}#diagnostico_`
    }
    res.render('consultor/cuestionario', { wizarx: true, user_dash: false, adminDash: false, codigo, rolUser: req.user.rol, linkCerrar })
}
dashboardController.enviarCuestionario = async (req, res) => {
    const { codigoEmpresa, zhActualAdm, rolUser } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })
    let infoEmp = await consultarDatos('empresas')
    infoEmp = infoEmp.find(x => x.codigo == codigoEmpresa)
    // Capturar ID Empresa
    const id_empresa = infoEmp.id_empresas;

    // Productos o Servicios
    const { rubro, e_ofrece, producto_ofrece, servicio_ofrece, problema_resolver, diferencia_otros, nivel_precio, investigacion_precios, conexion_tematica, perciben_coherencia, calidad_producto, presentacion_producto, calificacion_global_producto } = req.body
    let empresa_ofrece = { e_ofrece }
    producto_ofrece != '' ? empresa_ofrece.producto_ofrece = producto_ofrece : empresa_ofrece.servicio_ofrece = servicio_ofrece;
    empresa_ofrece = JSON.stringify(empresa_ofrece)
    let productos_servicios = JSON.stringify({
        problema_resolver, diferencia_otros, nivel_precio, investigacion_precios, conexion_tematica, perciben_coherencia, calidad_producto, presentacion_producto, calificacion_global_producto
    })

    // Administración
    const { planeacion_estrategica, analisis_foda, estructura_organizativa, sistema_administrativo_contable, software_empresarial, calificacion_administracion } = req.body
    let administracion = JSON.stringify({
        planeacion_estrategica, analisis_foda, estructura_organizativa, sistema_administrativo_contable, software_empresarial, calificacion_administracion
    })

    // Talento Humano
    const { principales_funciones_personal, plan_capacitacion, cuadro_habilidades, medicion_personal, plan_remuneracion, proceso_reclutamiento, calificacion_personal_laboral } = req.body
    let talento_humano = JSON.stringify({
        principales_funciones_personal, plan_capacitacion, cuadro_habilidades, medicion_personal, plan_remuneracion, proceso_reclutamiento, calificacion_personal_laboral
    })

    // RENDIMIENTO EMPRESA
    let { total_ventas, total_compras, total_gastos } = req.body
    // Finanzas
    const { proyeccion_ventas, estructura_costos, cuentas_pagar_cobrar, costos_fijos_variables, analisis_finanzas_anual, punto_equilibrio, utilidad_neta, empresa_rentable, proyeccion_flujo_efectivo, mejorar_rentabilidad, calificacion_finanzas } = req.body
    let finanzas = JSON.stringify({
        proyeccion_ventas, estructura_costos, cuentas_pagar_cobrar, costos_fijos_variables, analisis_finanzas_anual, utilidad_neta, empresa_rentable, punto_equilibrio, proyeccion_flujo_efectivo, mejorar_rentabilidad, calificacion_finanzas
    })

    // Servicio al Cliente
    const { clientes_info_productos, satisfaccion_clientes_productos, necesidades_clientes_productos, mecanismo_quejas_reclamos, estrategias_fidelidad_clientes, calificacion_servicio_alcliente } = req.body
    let servicio_alcliente = JSON.stringify({
        clientes_info_productos, satisfaccion_clientes_productos, necesidades_clientes_productos, mecanismo_quejas_reclamos, estrategias_fidelidad_clientes, calificacion_servicio_alcliente
    })

    // Operaciones
    const { instalaciones_adecuadas, permisos_requeridos, plan_detrabajo_diario, documentos_actividades, manuales_operaciones, calificacion_operaciones_procesos } = req.body
    let operaciones = JSON.stringify({
        instalaciones_adecuadas, permisos_requeridos, plan_detrabajo_diario, documentos_actividades, manuales_operaciones, calificacion_operaciones_procesos
    })

    // Ambiente Laboral
    const { ambiente_positivo, medicion_ambiente_laboral, satisfaccion_empleados, comunicacion_efectiva, comunicar_buen_trabajo, calificacion_ambiente } = req.body
    let ambiente_laboral = JSON.stringify({
        ambiente_positivo, medicion_ambiente_laboral, satisfaccion_empleados, comunicacion_efectiva, comunicar_buen_trabajo, calificacion_ambiente
    })

    // Innovación
    const { aportan_ideas, incrementar_ventas, procesos_innovadores, modelo_innovador, empresa_innovadora, calificacion_innovacion } = req.body
    let innovacion = JSON.stringify({
        aportan_ideas, incrementar_ventas, procesos_innovadores, modelo_innovador, empresa_innovadora, calificacion_innovacion
    })

    // Marketing
    const { estudio_mercado, segmento_mercado, posicionamiento_mercado, estrategias_marketing, plan_marketing, landing_page, redes_sociales, manual_identidad, tiene_eslogan, brochure_empresa, calificacion_marketing } = req.body
    let marketing = JSON.stringify({
        estudio_mercado, segmento_mercado, posicionamiento_mercado, estrategias_marketing, plan_marketing, landing_page, redes_sociales, manual_identidad, tiene_eslogan, brochure_empresa, calificacion_marketing
    })

    // Ventas
    const { facilidad_ventas, calificacion_ventas_meses, objetivo_ventas, estrategia_ventas, canales_ventas, calificacion_ventas } = req.body
    let ventas = JSON.stringify({
        facilidad_ventas, calificacion_ventas_meses, objetivo_ventas, estrategia_ventas, canales_ventas, calificacion_ventas
    })

    // Fortalezas
    const { f1, f2, f3, f4, f5 } = req.body
    let fortalezas = JSON.stringify({ f1, f2, f3, f4, f5 })

    // Oportunidades de Mejora
    const { o1, o2, o3, o4, o5 } = req.body
    let oportunidades_mejoras = JSON.stringify({ o1, o2, o3, o4, o5 })

    // Metas a corto plazo
    const { m1, m2, m3, m4, m5 } = req.body
    let metas_corto_plazo = JSON.stringify({ m1, m2, m3, m4, m5 })

    // Creando Objetos para guardar en la base de datos
    const nuevoDiagnostico = { id_empresa, fecha, rubro, empresa_ofrece, productos_servicios, administracion, talento_humano, finanzas, servicio_alcliente, operaciones, ambiente_laboral, innovacion, marketing, ventas, fortalezas, oportunidades_mejoras, metas_corto_plazo }

    /************************************************************************************************************
     * CÁLCULANDO LA PERCEPCIÓN ESTADÍSTICA
    */
    let pe_producto = 0, pe_administracion = 0, pe_operaciones = 0, pe_marketing = 0;
    // PRODUCTO
    let objPE1 = {si:0, excelente:0, buena:0}
    let data_pe = { problema_resolver, diferencia_otros, nivel_precio, investigacion_precios, conexion_tematica, perciben_coherencia, calidad_producto, presentacion_producto };
    for (let key in data_pe) {
        if (data_pe[key] === 'Si') {
            objPE1.si = objPE1.si+1;
        }
        if (data_pe[key] === 'Excelente') {
            objPE1.excelente = objPE1.excelente+1
        }
        if (data_pe[key] === 'Buena') {
            objPE1.buena = objPE1.buena+1
        }
    }
    objPE1.excelente = objPE1.excelente*2;

    // SUMATORIA para PE PRODUCTO
    for (let key in objPE1) {
        pe_producto += objPE1[key];
    }
    // console.log(`\nPRODUCTO PE => ${pe_producto}`);

    /**
     * ADMINISTRACIÓN
    */
    let objPE2 = {temp1:0, temp2:0, temp3:0, temp4:0}
    data_pe = { planeacion_estrategica, analisis_foda, estructura_organizativa, sistema_administrativo_contable, software_empresarial };
    for (let key in data_pe) {
        if (data_pe[key] === 'Si') {
            objPE2.temp1 = objPE2.temp1+1
        }
    }
    objPE2.temp1 = objPE2.temp1*2;
    // TALENTO HUMANO
    data_pe = { principales_funciones_personal, plan_capacitacion, cuadro_habilidades, medicion_personal }
    for (let key in data_pe) {
        if (data_pe[key] === 'Si') {
            objPE2.temp2 = objPE2.temp2+1
        }
    }
    objPE2.temp2 = objPE2.temp2*2
    // FINANZAS
    data_pe = { plan_remuneracion, proceso_reclutamiento }
    for (let key in data_pe) {
        if (data_pe[key] === 'Si') {
            objPE2.temp3 = objPE2.temp3+1
        }
    }

    // SUMATORIA para PE ADMINISTRACIÓN
    for (let key in objPE2) {
        pe_administracion += objPE2[key];
    }
    pe_administracion = (pe_administracion/3).toFixed(2)
    // console.log(`ADMINISTRACIÓN PE => ${pe_administracion}`);

    /**
     * OPERACIONES
    */
    let objPE3 = {temp1:0, temp2:0, temp3:0, temp4:0}
    // SERVICIO AL CLIENTE
    data_pe = { clientes_info_productos, satisfaccion_clientes_productos, necesidades_clientes_productos, mecanismo_quejas_reclamos, estrategias_fidelidad_clientes };
    for (let key in data_pe) {
        if (data_pe[key] === 'Si') {
            objPE3.temp1 = objPE3.temp1+1
        }
    }
    objPE3.temp1 = objPE3.temp1*2;
    // OPERACIONES
    data_pe = { instalaciones_adecuadas, permisos_requeridos, plan_detrabajo_diario, documentos_actividades, manuales_operaciones }
    for (let key in data_pe) {
        if (data_pe[key] === 'Si') {
            objPE3.temp2 = objPE3.temp2+1
        }
    }
    objPE3.temp2 = objPE3.temp2*2;
    // AMBIENTE LABOLRAL
    data_pe = { ambiente_positivo, medicion_ambiente_laboral, satisfaccion_empleados, comunicacion_efectiva, comunicar_buen_trabajo }
    for (let key in data_pe) {
        if (data_pe[key] === 'Si') {
            objPE3.temp3 = objPE3.temp3+1
        }
    }
    objPE3.temp3 = objPE3.temp3*2;
    // INNOVACIÓN
    data_pe = { aportan_ideas, incrementar_ventas, procesos_innovadores, modelo_innovador, empresa_innovadora }
    for (let key in data_pe) {
        if (data_pe[key] === 'Si') {
            objPE3.temp4 = objPE3.temp4+1
        }
    }
    objPE3.temp4 = objPE3.temp4*2;

    // SUMATORIA para PE OPERACIONES
    for (let key in objPE3) {
        pe_operaciones += objPE3[key];
    }
    pe_operaciones = (pe_operaciones/4).toFixed(2)
    // console.log(`OPERACIONES PE => ${pe_operaciones}`);

    /**
     * MARKETING 
    */
   let objPE4 = {temp1:0, temp2:0}
    data_pe = { estudio_mercado, segmento_mercado, posicionamiento_mercado, estrategias_marketing, plan_marketing, landing_page, redes_sociales, manual_identidad, tiene_eslogan, brochure_empresa }
    for (let key in data_pe) {
        if (data_pe[key] === 'Si') {
            objPE4.temp1 = objPE4.temp1+1
        }
    }
    // VENTAS
    data_pe = { facilidad_ventas, calificacion_ventas_meses, objetivo_ventas, estrategia_ventas, canales_ventas }
    for (let key in data_pe) {
        if (data_pe[key] === 'Si') {
            objPE4.temp2 = objPE4.temp2+1
        }
    }
    objPE4.temp2 = objPE4.temp2*2

    // SUMATORIA para PE MARKETING
    for (let key in objPE4) {
        pe_marketing += objPE4[key];
    }
    pe_marketing = (pe_marketing/2).toFixed(2)
    // console.log(`MARKETING PE => ${pe_marketing} \n`);

    /************************************************************************************************* */

    // Guardando en la Base de datos
    const cuestionario = await insertarDatos('dg_empresa_establecida', nuevoDiagnostico)
    if (cuestionario.affectedRows > 0) {
        /************************************************************************************************* */
        // RENDIMIENTO DE LA EMPRESA
        total_ventas = total_ventas.replace(/[$ ]/g, '');
        total_ventas = total_ventas.replace(/[,]/g, '.');
        total_compras = total_compras.replace(/[$ ]/g, '');
        total_compras = total_compras.replace(/[,]/g, '.');
        total_gastos = total_gastos.replace(/[$ ]/g, '');
        total_gastos = total_gastos.replace(/[,]/g, '.');

        total_ventas = parseFloat(total_ventas);
        total_compras = parseFloat(total_compras);
        total_gastos = parseFloat(total_gastos);

        const utilidad = total_ventas - total_compras - total_gastos // Utilidad = Ingresos - Costos Totales

        const nuevoRendimiento = {
            empresa: id_empresa, total_ventas, total_compras, total_gastos, utilidad, fecha: new Date().toLocaleDateString("en-US")
        }

        let rendimientos = await consultarDatos('rendimiento_empresa')
        rendimientos = rendimientos.filter(x => x.empresa == id_empresa)

        if (rendimientos.length >= 1) {
            let r = rendimientos;
            const ventas1 = parseFloat(r[0].total_ventas)
            const utilidad1 = parseFloat(r[0].utilidad)
            nuevoRendimiento.porcentaje_ventas = ((total_ventas - ventas1)/ventas1)*100
            nuevoRendimiento.porcentaje_utilidad = ((utilidad - utilidad1)/utilidad1)*100
            if (rendimientos.length == 2) {
                const ventas2 = parseFloat(r[1].total_ventas)
                const utilidad2 = parseFloat(r[1].utilidad)
                nuevoRendimiento.porcentaje_ventas = ((total_ventas - ventas2)/ventas2)*100
                nuevoRendimiento.porcentaje_utilidad = ((utilidad - utilidad2)/utilidad2)*100
            }
            nuevoRendimiento.porcentaje_ventas = (nuevoRendimiento.porcentaje_ventas).toFixed(2)
            nuevoRendimiento.porcentaje_utilidad = (nuevoRendimiento.porcentaje_utilidad).toFixed(2)
        }
        
        const rendimiento = await insertarDatos('rendimiento_empresa', nuevoRendimiento)
        
        /************************************************************************************************* */
        const areasVitales = {
            id_empresa,
            producto: calificacion_global_producto,
            administracion: calificacion_administracion,
            talento_humano: calificacion_personal_laboral,
            finanzas: calificacion_finanzas,
            servicio_cliente: calificacion_servicio_alcliente,
            operaciones: calificacion_operaciones_procesos,
            ambiente_laboral: calificacion_ambiente,
            innovacion: calificacion_innovacion,
            marketing: calificacion_marketing,
            ventas: calificacion_ventas,
            rendimiento_op: parseInt(calificacion_global_producto) + parseInt(calificacion_administracion) + parseInt(calificacion_personal_laboral) + parseInt(calificacion_finanzas) + parseInt(calificacion_servicio_alcliente) + parseInt(calificacion_operaciones_procesos) + parseInt(calificacion_ambiente) + parseInt(calificacion_innovacion) + parseInt(calificacion_marketing) + parseInt(calificacion_ventas)
        }
    
        const areasDimensiones = {
            id_empresa,
            producto: parseInt(calificacion_global_producto),
            administracion: (parseInt(calificacion_administracion) + parseInt(calificacion_personal_laboral) + parseInt(calificacion_finanzas)) / 3,
            operaciones: (parseInt(calificacion_servicio_alcliente) + parseInt(calificacion_operaciones_procesos) + parseInt(calificacion_ambiente) + parseInt(calificacion_innovacion)) / 4,
            marketing: (parseInt(calificacion_marketing) + parseInt(calificacion_ventas)) / 2
        }
        
        const datos_pe_areas = { 
            empresa: id_empresa, 
            producto: pe_producto,
            administracion: objPE2.temp1,
            talento_humano: objPE2.temp2,
            finanzas: objPE2.temp3,
            servicio_cliente: objPE3.temp1,
            operaciones: objPE3.temp2,
            ambiente_laboral: objPE3.temp3,
            innovacion: objPE3.temp4,
            marketing: objPE4.temp1,
            ventas: objPE4.temp2,
        }
        const datos_pe_dimensiones = { 
            empresa: id_empresa, 
            producto: pe_producto,
            administracion: pe_administracion,
            operaciones: pe_operaciones,
            marketing: pe_marketing
        }

        const aVitales = await insertarDatos('indicadores_areasvitales', areasVitales)
        const aDimensiones = await insertarDatos('indicadores_dimensiones', areasDimensiones)
        const pe_areas = await insertarDatos('percepcion_estadistica_areas', datos_pe_areas)
        const pe_dimensiones = await insertarDatos('percepcion_estadistica_dimensiones', datos_pe_dimensiones)
        if ((aVitales.affectedRows > 0) && (aDimensiones.affectedRows > 0) && (rendimiento.affectedRows > 0) && (pe_areas.affectedRows > 0) && (pe_dimensiones.affectedRows > 0) ) {
            console.log("\nINSERCIÓN COMPLETA DE LOS INDICADORES DE LA EMPRESA\n")
            /**
             * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS 
            */
            const obj_respuestas = {
                'Producto': {
                    '¿En que nicho, rubro, sector o área está tu negocio?': rubro,
                    '¿Qué ofrece tu empresa?': empresa_ofrece,
                    '¿Sabe qué problema específico resuelve su producto/servicio a sus clientes potenciales?': problema_resolver,
                    '¿Sabe en qué se diferencia su producto/servicio de otros similares en el mercado?': diferencia_otros,
                    '¿Sabe cuál es el nivel del precio de su producto/servicio con otros similares en el mercado?': nivel_precio,
                    '¿Ha realizado una investigación de precios para determinar si su producto/servicio es competitivo?': investigacion_precios,
                    '¿Hay alguna conexión temática o conceptual entre los diferentes productos/servicios que ofrece su empresa?': conexion_tematica,
                    '¿Cree que sus clientes perciben una coherencia entre los productos/servicios de su empresa?': perciben_coherencia,
                    'La calidad de su producto es:': calidad_producto,
                    'La presentación de su producto es:': presentacion_producto,
                    'En una escala del 1 al 10 ¿Cómo calificaría de forma global a sus productos/servicios con respecto al mercado? Siendo uno el nivel más bajo, y diez el más alto.': calificacion_global_producto,
                },
                'Administración': {
                    '¿Cuenta con una planeación estratégica para la empresa?': planeacion_estrategica,
                    '¿Ha realizado un análisis FODA de su empresa?': analisis_foda,
                    '¿Tiene definida la estructura organizativa?': estructura_organizativa,
                    '¿Dispone de un sistema administrativo y/o contable?': sistema_administrativo_contable,
                    '¿Dispone de software empresarial que le ayude a mejorar la eficiencia y rentabilidad de su empresa?': software_empresarial,
                    'Del 1 al 10 ¿Cómo calificaría la gestión de Administración de su empresa? Siendo uno el nivel más bajo y diez el más alto': calificacion_administracion,
                    '¿Tiene definidas las principales funciones del personal según su puesto de trabajo?': principales_funciones_personal,
                    '¿Cuenta con un plan de capacitación para sus colaboradores?': plan_capacitacion,
                    '¿Tienen algún cuadro de habilidades requeridas para sus colaboradores?': cuadro_habilidades,
                    '¿Realiza alguna medición de desempeño del personal?': medicion_personal,
                    '¿Dispone de un plan de remuneración para sus colaboradores?': plan_remuneracion,
                    '¿Dispone de algún proceso para el reclutamiento y selección?': proceso_reclutamiento,
                    'En una escala del 1 al 10 ¿Cómo calificaría al personal que labora para la empresa? Siendo uno el nivel más bajo y diez el más alto.': calificacion_personal_laboral,
                    '¿Dispone de una proyección de ventas?': proyeccion_ventas,
                    '¿Tienen una estructura de Costos implementada?': estructura_costos,
                    '¿Se tienen establecidas claramente las cuentas por pagar y cobrar del Negocio?': cuentas_pagar_cobrar,
                    '¿Conoce cuáles son los costos fijos y variables de su empresa?': costos_fijos_variables,
                    '¿Ha realizado un análisis y evaluación básica de las finanzas de los últimos 12 meses?': analisis_finanzas_anual,
                    '¿Conoce cuál es su punto de equilibrio?': punto_equilibrio,
                    '¿Conoce cuál es su utilidad neta?': utilidad_neta,
                    '¿La empresa ya ha conseguido ser rentable?': empresa_rentable,
                    '¿Ha realizado alguna proyección del flujo de efectivo para el próximo año?': proyeccion_flujo_efectivo,
                    '¿Cree usted que la manera en que se está administrando las finanzas en su empresa, pueda contribuir mantener o mejorar la rentabilidad en el tiempo?': mejorar_rentabilidad,
                    '¿Cómo calificaría la gestión de Finanzas de la empresa? Siendo uno el nivel más bajo y diez el más alto': calificacion_finanzas,
                },
                'Operaciones': {
                    '¿Pueden sus clientes tener información rápida y efectiva de sus Productos?': clientes_info_productos,
                    '¿Mide la Satisfacción de sus clientes con respecto a sus productos?': satisfaccion_clientes_productos,
                    '¿Conoce las necesidades de potenciales clientes con respecto a sus productos?': necesidades_clientes_productos,
                    '¿Dispone de algún mecanismo para quejas y reclamaciones?': mecanismo_quejas_reclamos,
                    '¿Maneja estrategias para mantener la fidelidad de sus clientes?': estrategias_fidelidad_clientes,
                    'En una escala del 1 al 10 ¿Cómo calificaría la gestión de Servicio al Cliente de la empresa? Siendo uno el nivel más bajo y diez el más alto.': calificacion_servicio_alcliente,
                    '¿Cuenta con las instalaciones adecuadas para realizar sus operaciones?': instalaciones_adecuadas,
                    '¿Cuenta con todos los permisos requeridos por su localidad para realizar sus operaciones?': permisos_requeridos,
                    '¿Tiene un plan de trabajo diario, semanal o mensual para las operaciones de su empresa?': plan_detrabajo_diario,
                    '¿Tiene documentadas todas las actividades que se desarrollan en la empresa?': documentos_actividades,
                    '¿Cuenta con manuales de operaciones que describan los procedimientos y actividades dentro de la empresa?': manuales_operaciones,
                    '¿Cómo calificaría las operaciones y procesos de su empresa en una escala del 1 al 10? Siendo uno el nivel más bajo y diez el más alto.': calificacion_operaciones_procesos,
                    '¿Considera positivo el ambiente laboral dentro de su empresa?': ambiente_positivo,
                    '¿Realiza alguna medición del ambiente laboral de la empresa?': medicion_ambiente_laboral,
                    '¿Conoce el grado de satisfacción de sus empleados?': satisfaccion_empleados,
                    '¿La comunicación dentro de su empresa es efectiva?': comunicacion_efectiva,
                    '¿Le comunica a su personal que ha estado o está realizando un buen trabajo?': comunicar_buen_trabajo,
                    'Del 1 al 10 ¿Cómo podría calificar el ambiente laboral de la empresa? Siendo uno el nivel más bajo y diez el más alto.': calificacion_ambiente,
                    '¿Sus trabajadores aportan ideas para la mejora dentro de la empresa?': aportan_ideas,
                    '¿Considera que a través de la innovación de sus productos/servicios puede incrementar sus ventas?': incrementar_ventas,
                    '¿Considera que los procesos operativos relacionados con sus productos/servicios son Innovadores?': procesos_innovadores,
                    '¿Calificaría su modelo de negocio como Innovador?': modelo_innovador,
                    '¿Calificaría la gestión de su empresa como Innovadora?': empresa_innovadora,
                    'Del 1 al 10 ¿Cómo se calificaría la gestión de Innovación de los productos y/o servicios de la empresa? Siendo uno el nivel más bajo y diez el más alto.': calificacion_innovacion,
                },
                'Marketing': {
                    '¿Ha realizado estudios de mercado sobre las características y precios de sus productos/servicios?': estudio_mercado,
                    '¿Conoce el segmento al que se dirigen sus productos/servicios?': segmento_mercado,
                    '¿Sus productos/servicios están posicionados dentro de su mercado?': posicionamiento_mercado,
                    '¿Cuenta con estrategias de Marketing para impulsar sus productos/servicios en su mercado?': estrategias_marketing,
                    '¿Cuenta con un Plan de Marketing?': plan_marketing,
                    '¿Cuenta con página web para promover los productos/servicios de su empresa?': landing_page,
                    '¿Utiliza redes sociales para promover los productos/servicios de su empresa?': redes_sociales,
                    '¿Cuenta con un Manual de Identidad Corporativa?': manual_identidad,
                    '¿Su negocio cuenta con un eslogan que los identifique con facilidad?': tiene_eslogan,
                    '¿Cuenta con un Brochure de presentación de su empresa?': brochure_empresa,
                    '¿Cómo calificaría la gestión de Marketing de la empresa? Siendo uno el nivel más bajo y diez el más alto.': calificacion_marketing,
                    '¿Cree que los productos/servicios de la empresa se venden con facilidad?': facilidad_ventas,
                    '¿Cómo calificaría las ventas de los productos/servicios de la empresa en los últimos 6 meses?': calificacion_ventas_meses,
                    '¿Su empresa tiene definido objetivos de ventas claros?': objetivo_ventas, '¿Cuenta con estrategias de ventas para los productos/servicios de su empresa?': estrategia_ventas,
                    '¿Tiene definido sus canales de venta para comercializar sus productos/servicios?': canales_ventas,
                    '¿Cómo calificaría la gestión de ventas de los productos/servicios de la empresa? Siendo uno el nivel más bajo y diez el más alto': calificacion_ventas,
                },
                'Fortalezas': { f1, f2, f3, f4, f5 },
                'Oportunidades de mejoras': { o1, o2, o3, o4, o5 },
                'Metas a corto plazo': { m1, m2, m3, m4, m5 }
            }

            const prompt = (JSON.stringify(obj_respuestas)+" Con base en las respuestas anteriores genera un informe de diagnóstico separado por dimensiones que incluya las oportunidades de mejora, sugerencias, actividades a realizar.")
            console.log(`\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n`);
            let resultAI = await getResponseChatGPT(prompt)
            const resp = resultAI.content.replaceAll('\n', '<br>');
            const informeAI = { empresa: id_empresa, tipo: 'Diagnóstico', informe: resp, fecha: new Date().toLocaleDateString("en-US") }
            const insertResult = await insertarDatos('informes_ia', informeAI)
            if (insertResult.affectedRows > 0) {
                rolUser == 'Empresa' ? res.redirect('/diagnostico-de-negocio')
                : res.redirect('/empresas/' + codigoEmpresa + '#diagnostico_')
            }
        }
    }

}

// CUESTIONARIO DIAGNÓSTICO (EMPRESAS NUEVAS)
dashboardController.dgNuevosProyectos = async (req, res) => {
    const { codigo } = req.params;
    let linkCerrar = '/diagnostico-de-negocio'
    if (req.user.rol != 'Empresa') {
        linkCerrar = `/empresas/${codigo}#diagnostico_`
    }
    res.render('consultor/nuevos_proyectos', { wizarx: true, user_dash: false, adminDash: false, codigo, rolUser: req.user.rol, linkCerrar })
}
dashboardController.guardarRespuestas = async (req, res) => {
    const { codigoEmpresa, zhActualAdm, rolUser } = req.body;
    // Capturar Fecha de guardado con base a su Zona Horaria
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })
    // Consultando info de la empresa
    const infoEmp = await pool.query('SELECT * FROM empresas WHERE codigo = ? LIMIT 1', [codigoEmpresa])
    // Capturar ID Empresa
    const id_empresa = infoEmp[0].id_empresas;

    // EXPERIENCIA EN EL RUBRO
    const { rubro, e_ofrece, producto_ofrece, servicio_ofrece, exp_previa, foda, unidades_rubro, actividades, vision } = req.body
    let empresa_ofrece = { e_ofrece }
    producto_ofrece != '' ? empresa_ofrece.producto_ofrece = producto_ofrece : empresa_ofrece.servicio_ofrece = servicio_ofrece;
    empresa_ofrece = JSON.stringify(empresa_ofrece)
    let exp_rubro = JSON.stringify({ exp_previa, foda, unidades_rubro, actividades, vision })

    // MENTALIDAD EMPRESARIAL
    const { proposito_alineado, objetivos_claros, valores, foda_personal, tiempo_completo } = req.body
    let mentalidad_empresarial = JSON.stringify({ proposito_alineado, objetivos_claros, valores, foda_personal, tiempo_completo })

    // VIABILIDAD DEL NEGOCIO
    const { socios, fondo_financiero, ubicacion_fisica, estudio_mercado, recursos_claves, posibles_proveedores } = req.body
    let viabilidad = JSON.stringify({ socios, fondo_financiero, ubicacion_fisica, estudio_mercado, recursos_claves, posibles_proveedores })

    // PRODUCTOS O SERVICIOS
    const { problema_resolver, producto_principal, precio_venta, factor_diferenciador, modelo_negocio } = req.body
    let productos_servicios = JSON.stringify({ problema_resolver, producto_principal, precio_venta, factor_diferenciador, modelo_negocio })

    // ADMINISTRACIÓN
    const { planeacion_estrategica, sistema_inventario, estructura_organizacional } = req.body
    let administracion = JSON.stringify({ planeacion_estrategica, sistema_inventario, estructura_organizacional })

    // TALENTO HUMANO
    const { funciones_principales, formacion_inicial, tiempo_colaboradores, experiencia_liderando, importancia_equipo } = req.body
    let talento_humano = JSON.stringify({ funciones_principales, formacion_inicial, tiempo_colaboradores, experiencia_liderando, importancia_equipo })

    // FINANZAS
    const { estructura_costos, gastos_fijos_variables, control_financiero, punto_equilibrio, recuperar_inversion } = req.body
    let finanzas = JSON.stringify({ estructura_costos, gastos_fijos_variables, control_financiero, punto_equilibrio, recuperar_inversion })

    // SERVICIO AL CLIENTE
    const { canales_atencion, estrategia_fidelizar, exp_brindar, medir_satisfaccion, calidad_producto } = req.body
    let servicio_cliente = JSON.stringify({ canales_atencion, estrategia_fidelizar, exp_brindar, medir_satisfaccion, calidad_producto })

    // OPERACIONES
    const { permisos, planificar_actividades, conocer_procesos, canales_comercial, proceso_devoluciones } = req.body
    let operaciones = JSON.stringify({ permisos, planificar_actividades, conocer_procesos, canales_comercial, proceso_devoluciones })

    // AMBIENTE LABORAL
    const { crecimiento, comunicacion_efectiva, resaltar_habilidades, capacitar_crecimiento, buen_ambiente } = req.body
    let ambiente_laboral = JSON.stringify({ crecimiento, comunicacion_efectiva, resaltar_habilidades, capacitar_crecimiento, buen_ambiente })

    // INNOVACION
    const { modelo_innovador, importancia_innovacion, gestion_datos } = req.body
    let innovacion = JSON.stringify({ modelo_innovador, importancia_innovacion, gestion_datos })

    // MARKETING
    const { estrategia_marketing, dominio_web, segmento_cliente, tiene_logo, mercado_inicial } = req.body
    let marketing = JSON.stringify({ estrategia_marketing, dominio_web, segmento_cliente, tiene_logo, mercado_inicial })

    // VENTAS
    const { captacion_clientes, medios_pago, proyeccion } = req.body
    let ventas = JSON.stringify({ captacion_clientes, medios_pago, proyeccion })

    // METAS A CORTO PLAZO
    const { m1, m2, m3, m4, m5 } = req.body
    let metas = JSON.stringify({ m1, m2, m3, m4, m5 })

    const nuevoDiagnostico = { id_empresa, fecha, empresa_ofrece, rubro, exp_rubro, mentalidad_empresarial, viabilidad, productos_servicios, administracion, talento_humano, finanzas, servicio_cliente, operaciones, ambiente_laboral, innovacion, marketing, ventas, metas }

    /* ========================== Calculos del Diagnóstico ========================== */
    // Categorías
    const categorias = [
        { nom: 'Experiencia en el Rubro', peso: 25, cant: 5 },
        { nom: 'Mentalidad Empresarial', peso: 25, cant: 5 },
        { nom: 'Viabilidad del Negocio', peso: 25, cant: 6 },
        { nom: 'Estructura del Negocio', peso: 25, cant: 44 }
    ]
    categorias.forEach(c => {
        c.valor = parseFloat(c.peso / c.cant)
    });

    // Estructura del Negocio
    const eNegocio = [
        { nom: 'Producto', peso: 2.5, cant: 5 },
        { nom: 'Administración', peso: 2.5, cant: 3 },
        { nom: 'Talento Humano', peso: 2.5, cant: 5 },
        { nom: 'Finanzas', peso: 2.5, cant: 5 },
        { nom: 'Serivicio al Cliente', peso: 2.5, cant: 5 },
        { nom: 'Operaciones', peso: 2.5, cant: 5 },
        { nom: 'Ambiente Laboral', peso: 2.5, cant: 5 },
        { nom: 'Innovación', peso: 2.5, cant: 3 },
        { nom: 'Marketing', peso: 2.5, cant: 5 },
        { nom: 'Ventas', peso: 2.5, cant: 3 },
    ]
    eNegocio.forEach(e => {
        e.valor = parseFloat(e.peso / e.cant)
        //e.valor = e.valor.toFixed(9)
    });

    // Resultado de Áreas Vitales
    let cant0 = JSON.parse(productos_servicios)
    cant0 = Object.values(cant0).filter(n => n == 'Si').length
    let cant1 = JSON.parse(administracion)
    cant1 = Object.values(cant1).filter(n => n == 'Si').length
    let cant2 = JSON.parse(talento_humano)
    cant2 = Object.values(cant2).filter(n => n == 'Si').length
    let cant3 = JSON.parse(finanzas)
    cant3 = Object.values(cant3).filter(n => n == 'Si').length
    let cant4 = JSON.parse(servicio_cliente)
    cant4 = Object.values(cant4).filter(n => n == 'Si').length
    let cant5 = JSON.parse(operaciones)
    cant5 = Object.values(cant5).filter(n => n == 'Si').length
    let cant6 = JSON.parse(ambiente_laboral)
    cant6 = Object.values(cant6).filter(n => n == 'Si').length
    let cant7 = JSON.parse(innovacion)
    cant7 = Object.values(cant7).filter(n => n == 'Si').length
    let cant8 = JSON.parse(marketing)
    cant8 = Object.values(cant8).filter(n => n == 'Si').length
    let cant9 = JSON.parse(ventas)
    cant9 = Object.values(cant9).filter(n => n == 'Si').length

    // Grupo de Áreas Vitales

    const areasVitales = {
        id_empresa,
        producto: Math.round(cant0 * eNegocio[0].valor),
        administracion: Math.round(cant1 * eNegocio[1].valor),
        talento_humano: Math.round(cant2 * eNegocio[2].valor),
        finanzas: Math.round(cant3 * eNegocio[3].valor),
        servicio_cliente: Math.round(cant4 * eNegocio[4].valor),
        operaciones: Math.round(cant5 * eNegocio[5].valor),
        ambiente_laboral: Math.round(cant6 * eNegocio[6].valor),
        innovacion: Math.round(cant7 * eNegocio[7].valor),
        marketing: Math.round(cant8 * eNegocio[8].valor),
        ventas: Math.round(cant9 * eNegocio[9].valor),
    }

    console.log("\n<<<<< ÁREAS VITALES >>>>> ", areasVitales)

    // Resultado de Categorías
    let c1 = JSON.parse(exp_rubro)
    c1 = Object.values(c1).filter(n => n == 'Si').length
    let c2 = JSON.parse(mentalidad_empresarial)
    c2 = Object.values(c2).filter(n => n == 'Si').length
    let c3 = JSON.parse(viabilidad)
    c3 = Object.values(c3).filter(n => n == 'Si').length
    let c4 = parseInt(cant0 + cant1 + cant2 + cant3 + cant4 + cant5 + cant6 + cant7 + cant8 + cant9)

    let valoracion = [
        Math.round(c1 * categorias[0].valor),
        Math.round(c2 * categorias[1].valor),
        Math.round(c3 * categorias[2].valor),
        Math.round(c4 * categorias[3].valor)
    ]

    // Sumar Valoración de las Categorías
    const suma = (acumulador, actual) => acumulador + actual;
    const rendimiento = valoracion.reduce(suma)
    console.log("RENDIMIENTO CATEGORIAS >>> ", rendimiento)

    const resulCategorias = {
        id_empresa,
        experiencia_rubro: valoracion[0],
        mentalidad: valoracion[1],
        viabilidad_: valoracion[2],
        estructura: valoracion[3],
        rendimiento: rendimiento
    }

    // Guardando en la Base de datos
    const cuestionario = await insertarDatos('dg_empresa_nueva', nuevoDiagnostico)
    if (cuestionario.affectedRows > 0) {

        const aVitales = await insertarDatos('indicadores_areasvitales', areasVitales)
        const resultado_categorias = await insertarDatos('resultado_categorias', resulCategorias)
        if ((aVitales.affectedRows > 0) && (resultado_categorias.affectedRows > 0)) {
            console.log("\nINSERCIÓN COMPLETA DE LOS INDICADORES DE LA EMPRESA\n")
            /**
             * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS 
            */
            const obj_respuestas = {
                '¿Tienes experiencia previa en el rubro?': exp_previa,
                '¿Has realizado un análisis FODA al negocio que deseas desarrollar?': foda,
                '¿Has pensando las diferentes unidades de negocio que se podrían implementar en este rubro?': unidades_rubro,
                '¿Conoces las actividades claves que se requieren en tu negocio?': actividades,
                '¿Conoces tu visión con este proyecto?': vision,
                '¿Tu propósito personal está alineado al propósito del negocio?': proposito_alineado,
                '¿Tienes claro los objetivos a nivel personal y empresarial?': objetivos_claros,
                '¿Tienes definido tus valores?': valores,
                '¿Te has realizado un FODA personal para que identifiques las herramientas necesarias a implementar en tu negocio?': foda_personal,
                '¿Dedicarías el 100% de tu tiempo a este negocio?': tiempo_completo,
                '¿Cuentas con algún socio para desarrollar tu negocio?': socios,
                '¿Dispones de algún fondo financiero personal?': fondo_financiero,
                '¿El negocio requiere ubicación física?': ubicacion_fisica, 
                '¿Has realizado algún estudio de mercado con respecto a tu producto o tu servicio?': estudio_mercado,
                '¿Conoces los recursos claves para el funcionamiento de tu negocio?': recursos_claves,
                '¿Tienes identificado los posibles proveedores del negocio?': posibles_proveedores,
                'Producto': {
                    '¿Tienes identificado el problema que resolverá tu producto o servicio?': problema_resolver,
                    '¿Sabes cuál es será el producto principal del negocio?': producto_principal,
                    '¿Tienes definido el precio de venta de tu producto o servicio?': precio_venta,
                    '¿Conoces cuál es el factor diferenciador del producto o servicio?': factor_diferenciador,
                    '¿Tienes definido el modelo de negocio?': modelo_negocio,
                },
                'Administración': {
                    '¿Tienes una planeación estratégica de tu negocio?': planeacion_estrategica,
                    '¿Se requiere de algún sistema de inventario para tu negocio?': sistema_inventario,
                    '¿Tienes definido una estructura organizacional para el negocio?': estructura_organizacional,
                    '¿Tienes definidas las funciones principales, la de tus socios y colaboradores en caso de tenerlas?': funciones_principales,
                    '¿Cuentas con algún programa de formación inicial para operar tu negocio?': formacion_inicial,
                    '¿Tienes definido en cuánto tiempo vas a necesitar colaboradores?': tiempo_colaboradores,
                    '¿Tienes experiencia liderando equipos de trabajo?': experiencia_liderando,
                    '¿Consideras importante la creación de un equipo de trabajo para el desarrollo y sostenibilidad de la empresa en el tiempo?': importancia_equipo,
                    '¿Has realizado alguna estructura de costos para tu producto o servicio?': estructura_costos,
                    '¿Sabes cuáles serán los gastos fijos y variables de tu negocio?': gastos_fijos_variables,
                    '¿Tienes definidas las herramientas a utilizar para tu control administrativo y financiero?': control_financiero,
                    '¿Conoce cuál es su punto de equilibrio?': punto_equilibrio,
                    '¿Conoces cuál será tu inversión inicial y en cuánto tiempo la recuperarás?': recuperar_inversion,
                },
                'Operaciones': {
                    '¿Has pensado cuáles serán tus principales canales de atención al cliente?': canales_atencion,
                    '¿Tienes definida una estrategia para fidelizar a tus futuros clientes?': estrategia_fidelizar,
                    '¿Conoces qué experiencias quieres darles a tus clientes?': exp_brindar,
                    '¿Has considerado tener alguna herramienta para la medición de la satisfacción del cliente?': medir_satisfaccion,
                    '¿Crees que un buen servicio se basa solo en la calidad de tu producto?': calidad_producto,
                    '¿Conoces los permisos que necesitas para comenzar a operar el negocio?': permisos,
                    '¿Tienes idea de cómo planificar las actividades de tu negocio?': planificar_actividades,
                    '¿Conoces al 100% los procesos de este negocio?': conocer_procesos,
                    '¿Has definido cuáles son los canales de comercialización de tus productos?': canales_comercial,
                    '¿Has considerado cómo sería el proceso de devoluciones y reclamaciones en tu negocio?': proceso_devoluciones,
                    '¿Consideras que tu ambiente actual contribuye a tu crecimiento?': crecimiento,
                    '¿Crees que tu comunicación es efectiva?': comunicacion_efectiva,
                    '¿Se te hace sencillo resaltar las habilidades de las personas?': resaltar_habilidades,
                    '¿Estarías dispuesto a capacitarte en crecimiento personal para el desarrollo de tu negocio?': capacitar_crecimiento,
                    '¿Crees que tienes las herramientas necesarias para crear un buen ambiente laboral?': buen_ambiente,
                    '¿Crees que tienes un modelo de negocio innovador?': modelo_innovador,
                    '¿Sabes la importancia de utilizar metodologías de innovación a la hora de crear nuevos productos?': importancia_innovacion,
                    '¿Conoces el proceso para la gestión correcta de los datos de los clientes?': gestion_datos,
                },
                'Marketing': {
                    '¿Cuentas con una estrategia de Marketing definida?': estrategia_marketing,
                    '¿Tienes un dominio de sitio web reservado?': dominio_web,
                    '¿Sabes a qué segmento de cliente te quieres dirigir?': segmento_cliente,
                    '¿Cuentas con un logo y branding de tu negocio?': tiene_logo,
                    '¿Has identificado qué mercado quieres abarcar inicialmente?': mercado_inicial,
                    '¿Conoces cuáles son tus canales de captación de tus clientes potenciales?': captacion_clientes,
                    '¿Tienes definido los medios de pago disponibles para tus clientes?': medios_pago,
                    '¿Tienes alguna proyección de ventas?': proyeccion,
                },
                'Metas': metas
            }

            const prompt = (JSON.stringify(obj_respuestas)+" Con base en las respuestas anteriores genera un informe de diagnóstico separado por dimensiones que incluya las oportunidades de mejora, sugerencias, actividades a realizar.")
            console.log(`\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n`);
            let resultAI = await getResponseChatGPT(prompt)
            const resp = resultAI.content.replaceAll('\n', '<br>');
            const informeAI = { empresa: id_empresa, tipo: 'Diagnóstico', informe: resp, fecha: new Date().toLocaleDateString("en-US") }
            const insertResult = await insertarDatos('informes_ia', informeAI)
            if (insertResult.affectedRows > 0) {
                rolUser == 'Empresa' ? res.redirect('/diagnostico-de-negocio')
                : res.redirect('/empresas/' + codigoEmpresa + '#diagnostico_')
            }
        }
    }
}

/** ====================================== SUBIR INFORMES EMPRESAS ============================================= */
let urlInforme = "";
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const rutaInforme = path.join(__dirname, '../public/informes_empresas')
        cb(null, rutaInforme);
    },

    filename: function (req, file, cb) {
        // const fechaActual = Math.floor(Date.now() / 1000)
        urlInforme = "Informe-3C-Sigma-Empresa-" + file.originalname;
        console.log(urlInforme)
        cb(null, urlInforme)
    }

});
const subirInforme = multer({ storage })
dashboardController.subirInforme = subirInforme.single('file')
dashboardController.guardarInforme = async (req, res) => {
    const r = { ok: false }
    const { codigoEmpresa, consultor, nombreInforme, zonaHoraria } = req.body
    console.log(req.body)
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.codigo == codigoEmpresa)

    const fecha = new Date()
    const nuevoInforme = {
        id_empresa: e.id_empresas,
        consultor,
        nombre: nombreInforme,
        url: '../informes_empresas/' + urlInforme,
        fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
        mes: fecha.getMonth() + 1,
        year: fecha.getFullYear()
    }

    const actualizar = {
        url: '../informes_empresas/' + urlInforme,
        fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
        mes: fecha.getMonth() + 1,
        year: fecha.getFullYear()
    }

    // Validando si ya tiene un informe montado
    const tieneInforme = await consultarDatos('informes', `WHERE id_empresa = "${e.id_empresas}" AND nombre = "${nombreInforme}"`)
    let informe = null;

    if (tieneInforme.length > 0) {
        informe = await pool.query('UPDATE informes SET ? WHERE id_empresa = ? AND nombre = ?', [actualizar, e.id_empresas, nombreInforme])
    } else {
        informe = await insertarDatos('informes', nuevoInforme)
    }

    if (informe.affectedRows > 0) {
        const nombreEmpresa_ = e.nombre_empresa;
        const email = e.email
        let tipoInforme = nombreInforme.toLowerCase();
        let asunto = 'Se ha cargado un nuevo ' + tipoInforme
        let template = informesHTML(nombreEmpresa_, tipoInforme);
        const texto = "Tu consultor ha cargado el informe general."
        
        if (nombreInforme == 'Informe diagnóstico') {
            asunto = 'Diagnóstico de negocio finalizado'
            const etapa = 'Diagnóstico de negocio';
            const link = 'diagnostico-de-negocio';
            template = etapaFinalizadaHTML(nombreEmpresa_, etapa, texto, link);
        }
        if (nombreInforme == 'Informe de análisis') {
            asunto = 'Análisis de negocio finalizado'
            const etapa = 'Análisis de negocio';
            const link = 'analisis-de-negocio';
            template = etapaFinalizadaHTML(nombreEmpresa_, etapa, texto, link);
        }
        if (nombreInforme == 'Informe de plan estratégico') {
            asunto = 'Plan estratégico de negocio finalizado'
            const etapa = 'Plan estratégico de negocio';
            const link = 'plan-estrategico';
            template = etapaFinalizadaHTML(nombreEmpresa_, etapa, texto, link);
        }
        
        // Enviar Email
        const resultEmail = await sendEmail(email, asunto, template)

        if (resultEmail == false) {
            console.log("\n<<<<< Ocurrio un error inesperado al enviar el email de informe subido >>>> \n")
        } else {
            console.log("\n<<<<< Se ha notificado la subida de un informe al email de la empresa >>>>>\n")
        }

        r.ok = true;
        r.fecha = nuevoInforme.fecha;
        r.url = nuevoInforme.url
    }

    res.send(r)
}

dashboardController.guardarArchivo_Empresarial = async (req, res) => {
    const r = { ok: false }
    const { codigoEmpresa, tipo, nombreArchivo, zonaHoraria } = req.body
    console.log("\nDATA FILE >>>");
    console.log(req.file);

    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.codigo == codigoEmpresa)
    const fecha = new Date()
    let nombre = '', urlFile = '../archivos_plan_empresarial/' + req.file.filename;
    tipo == 'Otro' || tipo == 'Otro2' || tipo == 'Otro3' ? nombre = nombreArchivo : nombre = req.file.originalname;
    const nuevoArchivo = {
        empresa: e.id_empresas,
        tipo,
        nombre,
        url: urlFile,
        fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
        mes: fecha.getMonth() + 1,
        year: fecha.getFullYear()
    }

    // Validando si ya tiene un informe montado
    const tieneArchivo = await consultarDatos('archivos_plan_empresarial', `WHERE empresa = "${e.id_empresas}" AND tipo = "${tipo}"`)
    let archivoActual = null;

    if (tieneArchivo.length > 0) {
        urlFile = '../archivos_plan_empresarial/' + req.file.originalname; 
        const actualizar = {
            nombre,
            url: urlFile,
            fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
            mes: fecha.getMonth() + 1,
            year: fecha.getFullYear()
        }
        archivoActual = await pool.query('UPDATE archivos_plan_empresarial SET ? WHERE empresa = ? AND tipo = ?', [actualizar, e.id_empresas, tipo])
    } else {
        archivoActual = await insertarDatos('archivos_plan_empresarial', nuevoArchivo)
    }

    console.log("ARCHIVO ACTUAL PRO CON: >>>> ", archivoActual)

    if (archivoActual.affectedRows > 0) {
        let asunto = 'Se ha cargado un nuevo archivo en Plan Empresarial'
        let template = archivosPlanEmpresarialHTML(e.nombre_empresa);
        
        // Enviar Email
        const resultEmail = await sendEmail(e.email, asunto, template)

        if (resultEmail == false) {
            console.log("\n<<<<< Ocurrio un error inesperado al enviar el email de archivo subido a la empresa >>>> \n")
        } else {
            console.log("\n<<<<< Se ha notificado la subida de un archivo al email de la empresa >>>>>\n")
        }

        r.ok = true;
        r.fecha = fecha.toLocaleString("en-US", { timeZone: zonaHoraria });
        r.url = urlFile;
    }

    res.send(r)
}

dashboardController.websiteEmpresarial = async (req, res) => {
    const r = { ok: false }
    const { codigoEmpresa, link, zonaHoraria } = req.body

    console.log(req.body);
    
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.codigo == codigoEmpresa)
    const fecha = new Date()
    const nuevoArchivo = {
        empresa: e.id_empresas,
        tipo: 'Website',
        nombre: 'Website',
        url: link,
        fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
        mes: fecha.getMonth() + 1,
        year: fecha.getFullYear()
    }


    // Validando si ya tiene un informe montado
    const tieneLink = await consultarDatos('archivos_plan_empresarial', `WHERE empresa = "${e.id_empresas}" AND tipo = "Website"`)
    let linkActual = null;

    if (tieneLink.length > 0) {
        console.log("\n\n----- Hola desde Actualizar WEBSITE\n\n----- ")
        const actualizar = {
            url: link,
            fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
            mes: fecha.getMonth() + 1,
            year: fecha.getFullYear()
        }
        console.log(actualizar)
        linkActual = await pool.query('UPDATE archivos_plan_empresarial SET ? WHERE empresa = ? AND tipo = ?', [actualizar, e.id_empresas, 'Website'])
    } else {
        console.log("\n\n----- Hola desde INSERTAR WEBSITE\n\n----- ")
        linkActual = await insertarDatos('archivos_plan_empresarial', nuevoArchivo)
    }

    if (linkActual.affectedRows > 0) {
        const email = e.email
        let asunto = 'Se ha cargado un nuevo link en Plan Empresarial'
        let template = archivosPlanEmpresarialHTML(e.nombre_empresa);
        
        // Enviar Email
        const resultEmail = await sendEmail(email, asunto, template)

        if (resultEmail == false) {
            console.log("\n<<<<< Ocurrio un error inesperado al enviar el email de link subido a la empresa >>>> \n")
        } else {
            console.log("\n<<<<< Se ha notificado la subida de un nuevo link de Plan Empresarial al email de la empresa >>>>>\n")
        }

        r.ok = true;
        r.fecha = nuevoArchivo.fecha;
        r.url = nuevoArchivo.url
    }

    res.send(r)
}

dashboardController.finalizarEtapa = async (req, res) => {
    const { codigo } = req.body;
    let empresa = await consultarDatos('empresas')
    empresa = empresa.find(e => e.codigo == codigo)
    let result = false;
    if (empresa) {
        const etapa = {etapa_empresarial: 1}
        await pool.query('UPDATE empresas SET ? WHERE codigo = ?', [etapa, codigo]);
        const texto = 'Ingresa a tu cuenta para revisar los archivos cargados por tu consultor.'
        const link = 'plan-empresarial';
        template = etapaFinalizadaHTML(empresa.nombre_empresa, 'Plan Empresarial', texto, link);
        // Enviar Email
        const resultEmail = await sendEmail(empresa.email, 'Plan Empresarial finalizado', template)
        if (resultEmail == false) {
            console.log("\n<<<<< Ocurrio un error inesperado al enviar el email de etapa de Plan Empresarial finalizada >>>> \n")
        } else {
            console.log("\n<<<<< Se ha notificado al email de la empresa que ha finalizado la etapa de Plan Empresarial >>>>>\n")
            result = true;
        }
    }
    res.send(result)
}