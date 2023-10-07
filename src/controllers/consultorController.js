const consultorController = exports;
const pool = require('../database')
const { sendEmail, propuestaCargadaHTML, tareaCompletadaHTML, tareaNuevaHTML, solicitarArchivoHTML } = require('../lib/mail.config')
const { consultarDatos, insertarDatos, eliminarDatos, consultarTareasConsultores } = require('../lib/helpers')
const { getResponseChatGPT, checkGPT3Connectivity } = require('../lib/openai');
const preguntas2 = require('../config/preguntas_etapa2.json');
const helpers = require('../lib/helpers');

// Dashboard Administrativo
consultorController.index = async (req, res) => {
    const { codigo } = req.user
    let empresas = []
    const consultores = await consultarDatos('consultores')
    const consultor = consultores.find(x => x.codigo == codigo)
    const consultores_asignados = await consultarDatos('consultores_asignados', `WHERE consultor = ${consultor.id_consultores} ORDER BY id DESC`)
    const idEmpresas = consultores_asignados.reduce((acc,item) => {
        if(!acc.includes(item.empresa)) acc.push(item.empresa);
        return acc;
    },[])
    let dataEmpresas = await consultarDatos('empresas')
    idEmpresas.forEach(x => {
        const e = dataEmpresas.find(i => i.id_empresas == x)
        if (empresas.length < 2) if (e) empresas.push(e);
    })

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE EMPRESAS ASIGANADAS MENSUALMENTE <<====
    const empresas_asignadas = await pool.query("SELECT * FROM (SELECT * FROM historial_empresas_consultor WHERE idConsultor = ? ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;", [consultor.id_consultores]);
    let datosJson_empresas_asignadas
    if (empresas_asignadas.length > 0) { datosJson_empresas_asignadas = JSON.stringify(empresas_asignadas) }
    // FIN DE LA FUNCIÓN <<====

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE INFORMES REGISTRADOS MENSUALMENTE <<====
    const historialInformes = await pool.query("SELECT * FROM (SELECT * FROM historial_informes_consultor WHERE idConsultor = ? ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;", [consultor.id_consultores]);
    let datosJson_historialI_consultor
    if (historialInformes.length > 0) { datosJson_historialI_consultor = JSON.stringify(historialInformes) }
    // FIN DE LA FUNCIÓN <<====

    // ÚLTIMOS INFORMES CARGADOS
    let ultimosInformes = await consultarDatos('informes', `WHERE consultor = ${consultor.id_consultores} ORDER BY id_informes DESC LIMIT 2`)
    if (ultimosInformes.length > 0) {
        ultimosInformes.forEach(x => {
            if (x.nombre == 'Informe diagnóstico') { x.etapa = 'Diagnóstico' }
            if (x.nombre == 'Informe de dimensión producto' || x.nombre == 'Informe de dimensión administración' || x.nombre == 'Informe de dimensión operaciones' || x.nombre == 'Informe de dimensión marketing' || x.nombre == 'Informe de análisis') { x.etapa = 'Análisis' }
            if (x.nombre == 'Informe de plan estratégico') { x.etapa = 'Plan estratégico' }
        })
    }

    /**
     * TAREAS ADMINISTRADOR
     */
    const fechaActual = new Date().toLocaleDateString('fr-CA');
    const tareas = await consultarTareasConsultores(consultor.id_consultores, fechaActual)

    res.render('consultor/panelConsultor', {
        consultorDash: true, itemActivo: 1, empresas, graficas1: true,
        datosJson_empresas_asignadas, datosJson_historialI_consultor,
        ultimosInformes, ide_consultor: consultor.id_consultores, fechaActual, tareas, datosUsuario: JSON.stringify(req.user)
    });
}

// EMPRESAS ASIGANADAS
consultorController.empresasAsignadas = async (req, res) => {
    const empresas = []
    let consulActual = await consultarDatos('consultores')
    consulActual = consulActual.find(x => x.codigo == req.user.codigo)
    const consultoresAsignados = await consultarDatos('consultores_asignados')

    let tablaEmpresas = await pool.query('SELECT e.*, f.telefono FROM empresas e LEFT OUTER JOIN ficha_cliente f ON e.id_empresas = f.id_empresa INNER JOIN users u ON e.codigo = u.codigo AND rol = "Empresa"')
    // let tablaEmpresas = await pool.query('SELECT e.*, u.codigo, u.estadoAdm, f.telefono, f.id_empresa, p.id_empresa, p.diagnostico_negocio, p.analisis_negocio, a.id_empresa, a.estadoAcuerdo, d.consecutivo, d.id_empresa FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = e.id_empresas LEFT OUTER JOIN pagos p ON p.id_empresa = e.id_empresas LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = e.id_empresas INNER JOIN users u ON u.codigo = e.codigo AND rol = "Empresa" LEFT OUTER JOIN dg_empresa_establecida d ON d.id_empresa = e.id_empresas')
    
    tablaEmpresas.forEach(data => {
        const tieneConsultor = consultoresAsignados.filter(x => x.consultor == consulActual.id_consultores && x.empresa == data.id_empresas)
        // console.log("\nEmpresa ID -> ", data.id_empresas)
        // console.log("Info tiene consultor: ", tieneConsultor)

        if (tieneConsultor.length > 0) {
            data.etapa = ''
            tieneConsultor.forEach(c => {
                data.etapa += c.etapa + "<br>" 
            });
            empresas.push(data)
        }
    })
    res.render('consultor/empresas', { consultorDash: true, itemActivo: 2, empresas })
}

/********************************************************************************/
// Etapa 2 - Análisis de Negocio
/********************************************************************************/
/* ------------------------------------------------------------------------------------------------ */
// PROPUESTA DE ANÁLISIS, PLAN EMPRESARIAL Y ESTRATÉGICO
consultorController.enviarPropuesta = async (req, res) => {
    const { precioPropuesta, idEmpresa, codigo, tipo_propuesta, limiteSub } = req.body
    const empresas = await consultarDatos('empresas')
    const empresa = empresas.find(x => x.codigo == codigo)
    const email = empresa.email
    const nombreEmpresa = empresa.nombre_empresa
    const propuestasDB = await consultarDatos('propuestas');
    const fila = propuestasDB.find(i => i.empresa == idEmpresa && i.tipo_propuesta == tipo_propuesta)
    const link_propuesta = '../propuestas_empresa/' + urlPropuestaNegocio
    const fecha = new Date().toLocaleDateString("en-US")
    const precio_per1 = parseFloat(precioPropuesta) * 0.6
    const precio_per2 = parseFloat(precioPropuesta) * 0.2
    const precio_per3 = parseFloat(precioPropuesta) * 0.2

    let hash = '';
    let asunto = ''
    let etapa = ''
    let link = '' 
    if (tipo_propuesta == 'Análisis de negocio') {
        hash = '#analisis_';
        asunto = 'Tenemos una propuesta de análisis de negocio para tu empresa'
        etapa = 'Análisis de Negocio'
        link = 'analisis-de-negocio' 
    } else if (tipo_propuesta == 'Plan estratégico') {
        hash = '#plan-estrategico';
        asunto = 'Tenemos una propuesta de plan estratégico para tu empresa'
        etapa = 'Plan Estratégico'
        link = 'plan-estrategico'
    } else {
        hash = '#plan-empresarial';
        asunto = 'Tenemos una propuesta de plan empresarial para tu empresa'
        etapa = 'Plan Empresarial'
        link = 'plan-empresarial'
    }

    if (fila) {
        const actualizarPropuesta = { precio_total: precioPropuesta, precio_per1, precio_per2, precio_per3, fecha, link_propuesta }
        await pool.query('UPDATE propuestas SET ? WHERE empresa = ? AND tipo_propuesta = ?', [actualizarPropuesta, idEmpresa, tipo_propuesta]);
    } else {
        const nuevaPropuesta = { empresa: idEmpresa, tipo_propuesta, precio_total: precioPropuesta, precio_per1, precio_per2, precio_per3, fecha, link_propuesta, limiteSub }
        await insertarDatos('propuestas', nuevaPropuesta)
    }

    // Obtener la plantilla de Email
    const template = propuestaCargadaHTML(nombreEmpresa, etapa, link);

    // Enviar Email
    const resultEmail = await sendEmail(email, asunto, template)

    resultEmail ? console.log("\n<<<<< Se envió Email de la propuesta de " + tipo_propuesta)
    : console.log("Ocurrio un error inesperado al enviar el email propuesta de " + tipo_propuesta)

    res.redirect('/empresas/' + codigo + hash)
}

// ANÁLISIS DIMENSIÓN PRODUCTO
consultorController.analisisProducto = async (req, res) => {
    const { codigo } = req.params;
    let linkCerrar = '/analisis-de-negocio'
    if (req.user.rol != 'Empresa') {
        linkCerrar = `/empresas/${codigo}#analisis_`
    }

    const preguntas = {
        "producto": [...preguntas2.producto],
        "propuesta": [...preguntas2.propuesta]
    }

    res.render('consultor/analisisProducto', { wizarx: true, user_dash: false, adminDash: false, codigo, linkCerrar, preguntas})
}
consultorController.guardarAnalisisProducto = async (req, res) => {
    const { codigoEmpresa, producto, propuesta, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    const respuestasProducto = producto;
    const respuestasPropuesta = propuesta;
    const preguntasProducto = [...preguntas2.producto]
    const preguntasPropuesta = [...preguntas2.propuesta]

    // Verificando si existen registros Análisis de empresa en la Base de datos
    const empresa = (await consultarDatos('empresas')).find(item => item.codigo == codigoEmpresa)

    if (empresa) {
        const id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Evaluación Empresarial Sistema de Soluciones y Valor
        const dataForm = JSON.stringify({
            fecha,
            "producto": respuestasProducto,
            "propuesta": respuestasPropuesta
        })

        /**
         * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS 
        */
        const obj_respuestas = {
            'Área de enfoque: Producto - Servicio' : {
                'Calidad y Consistencia' : {
                    [preguntasProducto[0].txt]: respuestasProducto[0],
                    [preguntasProducto[1].txt]: respuestasProducto[1],
                },
                'Disponibilidad y Accesibilidad' : {
                    [preguntasProducto[2].txt]: respuestasProducto[2],
                    [preguntasProducto[3].txt]: respuestasProducto[3],
                },
                'Integración en la Gama de Productos o Servicios Según Actividad Comercial' : {
                    [preguntasProducto[4].txt]: respuestasProducto[4],
                    [preguntasProducto[5].txt]: respuestasProducto[5],
                },
                'Presentación del Producto o Servicio' : {
                    [preguntasProducto[6].txt]: respuestasProducto[6],
                    [preguntasProducto[7].txt]: respuestasProducto[7],
                },
                'Nivel de Precio' : {
                    [preguntasProducto[8].txt]: respuestasProducto[8],
                    [preguntasProducto[9].txt]: respuestasProducto[9],
                },
                'Adaptabilidad a las Necesidades del Cliente' : {
                    [preguntasProducto[10].txt]: respuestasProducto[10],
                    [preguntasProducto[11].txt]: respuestasProducto[11],
                },
                'Postventa y Garantía' : {
                    [preguntasProducto[12].txt]: respuestasProducto[12],
                    [preguntasProducto[13].txt]: respuestasProducto[13],
                },
                'Feedback y Mejora Continua' : {
                    [preguntasProducto[14].txt]: respuestasProducto[14],
                    [preguntasProducto[15].txt]: respuestasProducto[15],
                },
                'Identificación con la Marca' : {
                    [preguntasProducto[16].txt]: respuestasProducto[16],
                    [preguntasProducto[17].txt]: respuestasProducto[17],
                },
                'Innovación y Desarrollo' : {
                    [preguntasProducto[18].txt]: respuestasProducto[18],
                    [preguntasProducto[19].txt]: respuestasProducto[19],
                },
            },
            'Área de enfoque: Propuesta de Valor' : {
                'Claridad' : {
                    [preguntasPropuesta[0].txt]: respuestasPropuesta[0],
                    [preguntasPropuesta[1].txt]: respuestasPropuesta[1],
                },
                'Beneficio' : {
                    [preguntasPropuesta[2].txt]: respuestasPropuesta[2],
                    [preguntasPropuesta[3].txt]: respuestasPropuesta[3],
                },
                'Diferenciación' : {
                    [preguntasPropuesta[4].txt]: respuestasPropuesta[4],
                    [preguntasPropuesta[5].txt]: respuestasPropuesta[5],
                },
                'Prueba o Validación' : {
                    [preguntasPropuesta[6].txt]: respuestasPropuesta[6],
                    [preguntasPropuesta[7].txt]: respuestasPropuesta[7],
                },
                'Relevancia del Beneficio' : {
                    [preguntasPropuesta[8].txt]: respuestasPropuesta[8],
                    [preguntasPropuesta[9].txt]: respuestasPropuesta[9],
                },
                'Coherencia Visual' : {
                    [preguntasPropuesta[10].txt]: respuestasPropuesta[10],
                    [preguntasPropuesta[11].txt]: respuestasPropuesta[11],
                },
                'Actualización' : {
                    [preguntasPropuesta[12].txt]: respuestasPropuesta[12],
                },
                'Feedback Positivo' : {
                    [preguntasPropuesta[13].txt]: respuestasPropuesta[13],
                    [preguntasPropuesta[14].txt]: respuestasPropuesta[14],
                    [preguntasPropuesta[15].txt]: respuestasPropuesta[15],
                },
                'Centrado en el Cliente' : {
                    [preguntasPropuesta[16].txt]: respuestasPropuesta[16],
                    [preguntasPropuesta[17].txt]: respuestasPropuesta[17],
                },
                'Conexión Emocional' : {
                    [preguntasPropuesta[18].txt]: respuestasPropuesta[18],
                    [preguntasPropuesta[19].txt]: respuestasPropuesta[19],
                }
            }
        }

        // Guardando en la Base de datos
        const tablaAnalisis = (await consultarDatos('analisis_empresa')).find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { producto: dataForm }
            await helpers.actualizarDatos('analisis_empresa', actualizarAnalisis, `WHERE id_empresa = ${id_empresa}`)
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, producto: dataForm }
            await insertarDatos('analisis_empresa', nuevoAnalisis)
        }

        const prompt = (JSON.stringify(obj_respuestas)+" Con base las respuestas anteriores dame un informe de Evaluación Empresarial, Sistema de Soluciones y Valor que incluya las oportunidades de mejora, sugerencias, y actividades a realizar, separado por títulos.")
        console.log(`\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n\n`);
        let resultAI = await getResponseChatGPT(prompt)
        const resp = resultAI.content.replaceAll('\n', '<br>');
        const informeAI = { empresa: id_empresa, tipo: 'Análisis producto', informe: resp, fecha: new Date().toLocaleDateString("en-US") }
        const insertResult = await insertarDatos('informes_ia', informeAI)
        if (insertResult.affectedRows > 0) {
            // ENVIAR NOTIFICACIÓN AL EMAIL INFORME GENERADO
            await helpers.notificacion_nuevoInforme('soluciones', empresa.nombre_empresa)
            req.user.rol == 'Empresa' ? res.redirect('/analisis-de-negocio')
            : res.redirect('/empresas/' + codigoEmpresa + '#analisis_')
        }

    }
}

// ANÁLISIS DIMENSIÓN ADMINISTRACIÓN
consultorController.analisisAdministracion = async (req, res) => {
    const { codigo } = req.params;
    let linkCerrar = '/analisis-de-negocio'
    if (req.user.rol != 'Empresa') {
        linkCerrar = `/empresas/${codigo}#analisis_`
    }
    const preguntas = {
        "admin": [...preguntas2.admin],
        "rFinanciero": [...preguntas2.recurso_financiero],
        "rHumano": [...preguntas2.recurso_humano]
    }
    res.render('consultor/analisisAdministracion', { wizarx: true, user_dash: false, adminDash: false, codigo, linkCerrar, preguntas })
}
consultorController.guardarAnalisisAdministracion = async (req, res) => {
    const { codigoEmpresa, admin, rFinanciero, rHumano, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    const respuestasAdmin = admin
    const respuestas_rFinanciero = rFinanciero
    const respuestas_rHumano = rHumano
    const preguntasAdmin = [...preguntas2.admin]
    const preguntas_rFinanciero = [...preguntas2.recurso_financiero]
    const preguntas_rHumano = [...preguntas2.recurso_humano]

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = (await consultarDatos('empresas')).find(item => item.codigo == codigoEmpresa)
    const analisis_empresa = await consultarDatos('analisis_empresa');

    if (empresa) {
        let id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Evaluación Empresarial Sistema Gestion de Recursos
        const dataForm = JSON.stringify({
            fecha,
            "admin": respuestasAdmin,
            "rFinanciero": respuestas_rFinanciero,
            "rHumano": respuestas_rHumano,
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { administracion: dataForm }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, administracion: dataForm }
            await insertarDatos('analisis_empresa', nuevoAnalisis)
        }

        /**
         * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS 
        */
        const obj_respuestas = {
            'Área de enfoque: Gestión de Recursos Administrativos' : {
                'Recursos Materiales (MN)' : {
                    [preguntasAdmin[0].txt]: respuestasAdmin[0],
                    [preguntasAdmin[1].txt]: respuestasAdmin[1],
                },
                'Equipamiento Tecnológico – Hardware (MN)' : {
                    [preguntasAdmin[2].txt]: respuestasAdmin[2],
                    [preguntasAdmin[3].txt]: respuestasAdmin[3],
                    [preguntasAdmin[4].txt]: respuestasAdmin[4],
                },
                'Software y Herramientas (MN)' : {
                    [preguntasAdmin[5].txt]: respuestasAdmin[5],
                    [preguntasAdmin[6].txt]: respuestasAdmin[6],
                },
                'Soluciones en la Nube' : {
                    [preguntasAdmin[7].txt]: respuestasAdmin[7],
                    [preguntasAdmin[8].txt]: respuestasAdmin[8],
                },
                'Sistemas Administrativos - Procedimientos' : {
                    [preguntasAdmin[9].txt]: respuestasAdmin[9],
                    [preguntasAdmin[10].txt]: respuestasAdmin[10],
                },
                'Comunicación interna' : {
                    [preguntasAdmin[11].txt]: respuestasAdmin[11],
                    [preguntasAdmin[12].txt]: respuestasAdmin[12],
                },
                'Estructura Organizativa' : {
                    [preguntasAdmin[13].txt]: respuestasAdmin[13],
                    [preguntasAdmin[14].txt]: respuestasAdmin[14],
                    [preguntasAdmin[15].txt]: respuestasAdmin[15],
                },
                'Flujos de Trabajo' : {
                    [preguntasAdmin[16].txt]: respuestasAdmin[16],
                    [preguntasAdmin[17].txt]: respuestasAdmin[17],
                },
                'Flujos de Trabajo' : {
                    [preguntasAdmin[18].txt]: respuestasAdmin[18],
                    [preguntasAdmin[19].txt]: respuestasAdmin[19],
                },
                'Revisión de Sistemas' : {
                    [preguntasAdmin[20].txt]: respuestasAdmin[20],
                    [preguntasAdmin[21].txt]: respuestasAdmin[21],
                },
            },
            'Área de enfoque: Gestión de Recursos Financieros' : {
                'Planificación Financiera' : {
                    [preguntas_rFinanciero[0].txt]: respuestas_rFinanciero[0],
                    [preguntas_rFinanciero[1].txt]: respuestas_rFinanciero[1],
                },
                'Presupuestos' : {
                    [preguntas_rFinanciero[2].txt]: respuestas_rFinanciero[2],
                    [preguntas_rFinanciero[3].txt]: respuestas_rFinanciero[3],
                },
                'Estructura de Costos (MN)' : {
                    [preguntas_rFinanciero[4].txt]: respuestas_rFinanciero[4],
                    [preguntas_rFinanciero[5].txt]: respuestas_rFinanciero[5],
                },
                'Flujo de Efectivo' : {
                    [preguntas_rFinanciero[6].txt]: respuestas_rFinanciero[6],
                    [preguntas_rFinanciero[7].txt]: respuestas_rFinanciero[7],
                },
                'Fuentes de Ingreso (MN)' : {
                    [preguntas_rFinanciero[8].txt]: respuestas_rFinanciero[8],
                    [preguntas_rFinanciero[9].txt]: respuestas_rFinanciero[9],
                },
                'Acceso a Financiamiento' : {
                    [preguntas_rFinanciero[10].txt]: respuestas_rFinanciero[10],
                    [preguntas_rFinanciero[11].txt]: respuestas_rFinanciero[11],
                },
                'Cuentas por Pagar y Cobrar' : {
                    [preguntas_rFinanciero[12].txt]: respuestas_rFinanciero[12],
                    [preguntas_rFinanciero[13].txt]: respuestas_rFinanciero[13],
                },
                'Rentabilidad sobre las Ventas (ROS: Return on Sales)' : {
                    [preguntas_rFinanciero[14].txt]: respuestas_rFinanciero[14],
                    [preguntas_rFinanciero[15].txt]: respuestas_rFinanciero[15],
                    [preguntas_rFinanciero[16].txt]: respuestas_rFinanciero[16],
                },
                'Punto de Equilibrio' : {
                    [preguntas_rFinanciero[17].txt]: respuestas_rFinanciero[17],
                    [preguntas_rFinanciero[18].txt]: respuestas_rFinanciero[18],
                },
                'Análisis Financiero:' : {
                    [preguntas_rFinanciero[19].txt]: respuestas_rFinanciero[19],
                    [preguntas_rFinanciero[20].txt]: respuestas_rFinanciero[20],
                }
            },
            'Área de enfoque: Gestión de Recurso Humano' : {
                'Reconocimiento del Valor Individual' : {
                    [preguntas_rHumano[0].txt]: respuestas_rHumano[0],
                    [preguntas_rHumano[1].txt]: respuestas_rHumano[1],
                },
                'Desarrollo del Talento Humano' : {
                    [preguntas_rHumano[2].txt]: respuestas_rHumano[2],
                    [preguntas_rHumano[3].txt]: respuestas_rHumano[3],
                },
                'Retención del Talento:' : {
                    [preguntas_rHumano[4].txt]: respuestas_rHumano[4],
                    [preguntas_rHumano[5].txt]: respuestas_rHumano[5],
                },
                'Remuneración Justa y Competitiva' : {
                    [preguntas_rHumano[6].txt]: respuestas_rHumano[6],
                    [preguntas_rHumano[7].txt]: respuestas_rHumano[7],
                    [preguntas_rHumano[8].txt]: respuestas_rHumano[8],
                    [preguntas_rHumano[9].txt]: respuestas_rHumano[9],
                },
                'Principales Funciones del Personal' : {
                    [preguntas_rHumano[10].txt]: respuestas_rHumano[10],
                    [preguntas_rHumano[11].txt]: respuestas_rHumano[11],
                },
                'Evaluación de Desempeño' : {
                    [preguntas_rHumano[12].txt]: respuestas_rHumano[12],
                    [preguntas_rHumano[13].txt]: respuestas_rHumano[13],
                },
                'Evaluación de Desempeño' : {
                    [preguntas_rHumano[14].txt]: respuestas_rHumano[14],
                    [preguntas_rHumano[15].txt]: respuestas_rHumano[15],
                },
                'Proceso de Contratación' : {
                    [preguntas_rHumano[16].txt]: respuestas_rHumano[16],
                    [preguntas_rHumano[17].txt]: respuestas_rHumano[17],
                }
            }
        }

        const prompt = (JSON.stringify(obj_respuestas)+" Con base las respuestas anteriores dame un informe de Evaluación Empresarial, Sistema de Gestión de Recursos que incluya las oportunidades de mejora, sugerencias, y actividades a realizar, separado por títulos.")
        //console.log(`\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n\n`);
        let resultAI = await getResponseChatGPT(prompt)
        const resp = resultAI.content.replaceAll('\n', '<br>');
        const informeAI = { empresa: id_empresa, tipo: 'Análisis administración', informe: resp, fecha: new Date().toLocaleDateString("en-US") }
        const insertResult = await insertarDatos('informes_ia', informeAI)
        if (insertResult.affectedRows > 0) {
            // ENVIAR NOTIFICACIÓN AL EMAIL INFORME GENERADO
            await helpers.notificacion_nuevoInforme('gestión', empresa.nombre_empresa)
            req.user.rol == 'Empresa' ? res.redirect('/analisis-de-negocio')
            : res.redirect('/empresas/' + codigoEmpresa + '#analisis_')
        }
    }
}

// ANÁLISIS DIMENSIÓN OPERACION
consultorController.analisisOperacion = async (req, res) => {
    const { codigo } = req.params;
    let linkCerrar = '/analisis-de-negocio'
    if (req.user.rol != 'Empresa') {
        linkCerrar = `/empresas/${codigo}#analisis_`
    }
    const preguntas = {
        "estrategica": [...preguntas2.planeacion_estrategica],
        "operativos": [...preguntas2.procesos_operativos],
        "integracion": [...preguntas2.integracion],
        "modelo_negocio": [...preguntas2.modelo_negocio],
    }
    res.render('consultor/analisisOperacion', { wizarx: true, user_dash: false, adminDash: false, codigo, linkCerrar, preguntas })
}
consultorController.guardarAnalisisOperacion = async (req, res) => {
    const { codigoEmpresa, estrategica, operativos, integracion, modelo_negocio, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    const respuestas_estrategica = estrategica
    const respuestas_operativos = operativos
    const respuestas_integracion = integracion
    const respuestas_modeloNegocio = modelo_negocio
    const preguntas_estrategica = [...preguntas2.planeacion_estrategica]
    const preguntas_operativos = [...preguntas2.procesos_operativos]
    const preguntas_integracion = [...preguntas2.integracion]
    const preguntas_modeloNegocio = [...preguntas2.modelo_negocio]

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = (await consultarDatos('empresas')).find(item => item.codigo == codigoEmpresa)
    const analisis_empresa = await consultarDatos('analisis_empresa');

    if (empresa) {
        let id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Evaluación Empresarial Sistema Operacional
        const dataForm = JSON.stringify({
            fecha,
            "estrategica": respuestas_estrategica,
            "operativos": respuestas_operativos,
            "integracion": respuestas_integracion,
            "modelo_negocio": respuestas_modeloNegocio,
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { operacion: dataForm }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, operacion: dataForm }
            await insertarDatos('analisis_empresa', nuevoAnalisis)
        }

        /**
         * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS 
        */
        const obj_respuestas = {
            'Área de enfoque: Planeación Estratégica' : {
                'Comprensión del Mercado' : {
                    [preguntas_estrategica[0].txt]: respuestas_estrategica[0],
                    [preguntas_estrategica[1].txt]: respuestas_estrategica[1],
                },
                'Claridad en la Misión y Visión' : {
                    [preguntas_estrategica[2].txt]: respuestas_estrategica[2],
                    [preguntas_estrategica[3].txt]: respuestas_estrategica[3],
                    [preguntas_estrategica[4].txt]: respuestas_estrategica[4],
                },
                'Valores claros' : {
                    [preguntas_estrategica[5].txt]: respuestas_estrategica[5],
                },
                'Objetivos Definidos' : {
                    [preguntas_estrategica[6].txt]: respuestas_estrategica[6],
                },
                'Análisis FODA' : {
                    [preguntas_estrategica[7].txt]: respuestas_estrategica[7],
                    [preguntas_estrategica[8].txt]: respuestas_estrategica[8],
                },
                'Participación del Equipo' : {
                    [preguntas_estrategica[9].txt]: respuestas_estrategica[9],
                    [preguntas_estrategica[10].txt]: respuestas_estrategica[10],
                },
                'Evaluación de la Competencia' : {
                    [preguntas_estrategica[11].txt]: respuestas_estrategica[11],
                    [preguntas_estrategica[12].txt]: respuestas_estrategica[12],
                },
                'Comunicación Estratégica' : {
                    [preguntas_estrategica[13].txt]: respuestas_estrategica[13],
                    [preguntas_estrategica[14].txt]: respuestas_estrategica[14],
                }
            },
            'Área de enfoque: Procesos Operativos' : {
                'Análisis y Mapeo de Procesos' : {
                    [preguntas_operativos[0].txt]: respuestas_operativos[0],
                    [preguntas_operativos[1].txt]: respuestas_operativos[1],
                    [preguntas_operativos[2].txt]: respuestas_operativos[2],
                },
                'Establecimiento de Objetivos Claros' : {
                    [preguntas_operativos[3].txt]: respuestas_operativos[3],
                    [preguntas_operativos[4].txt]: respuestas_operativos[4],
                },
                'Eficiencia' : {
                    [preguntas_operativos[5].txt]: respuestas_operativos[5],
                },
                'Flexibilidad' : {
                    [preguntas_operativos[6].txt]: respuestas_operativos[6],
                    [preguntas_operativos[7].txt]: respuestas_operativos[7],
                },
                'Incorporación de Tecnología' : {
                    [preguntas_operativos[8].txt]: respuestas_operativos[8],
                    [preguntas_operativos[9].txt]: respuestas_operativos[9],
                },
                'Revisión Regular' : {
                    [preguntas_operativos[10].txt]: respuestas_operativos[10],
                    [preguntas_operativos[11].txt]: respuestas_operativos[11],
                },
                'Actividades Clave (MN)' : {
                    [preguntas_operativos[12].txt]: respuestas_operativos[12],
                },
                'Gestión del Tiemp' : {
                    [preguntas_operativos[13].txt]: respuestas_operativos[13],
                    [preguntas_operativos[14].txt]: respuestas_operativos[14],
                },
                'Canales de Distribución (MN)' : {
                    [preguntas_operativos[15].txt]: respuestas_operativos[15],
                    [preguntas_operativos[16].txt]: respuestas_operativos[16],
                    [preguntas_operativos[17].txt]: respuestas_operativos[17],
                },
                'Alianzas Estratégicas (MN)' : {
                    [preguntas_operativos[18].txt]: respuestas_operativos[18],
                    [preguntas_operativos[19].txt]: respuestas_operativos[19],
                }
            },
            'Área de enfoque: Integración y Bienestar Laboral' : {
                'Liderazgo Comprometido' : {
                    [preguntas_integracion[0].txt]: respuestas_integracion[0],
                },
                'Comunicación Abierta y Transparente' : {
                    [preguntas_integracion[1].txt]: respuestas_integracion[1],
                },
                'Flexibilidad' : {
                    [preguntas_integracion[2].txt]: respuestas_integracion[2],
                    [preguntas_integracion[3].txt]: respuestas_integracion[3],
                },
                'Espacio de Trabajo Adecuado' : {
                    [preguntas_integracion[4].txt]: respuestas_integracion[4],
                    [preguntas_integracion[5].txt]: respuestas_integracion[5],
                },
                'Actividades de Integración' : {
                    [preguntas_integracion[6].txt]: respuestas_integracion[6],
                    [preguntas_integracion[7].txt]: respuestas_integracion[7],
                    [preguntas_integracion[8].txt]: respuestas_integracion[8],
                    [preguntas_integracion[9].txt]: respuestas_integracion[9],
                },
                'Participación activa' : {
                    [preguntas_integracion[10].txt]: respuestas_integracion[10],
                    [preguntas_integracion[11].txt]: respuestas_integracion[11],
                },
                'Entorno Laboral' : {
                    [preguntas_integracion[12].txt]: respuestas_integracion[12],
                    [preguntas_integracion[13].txt]: respuestas_integracion[13],
                },
                'Balance Vida-Trabajo' : {
                    [preguntas_integracion[14].txt]: respuestas_integracion[14],
                }
            },
            'Área de enfoque: Modelo de Negocio' : {
                'Comprensión del Modelo Actual' : {
                    [preguntas_modeloNegocio[0].txt]: respuestas_modeloNegocio[0],
                },
                'Propuesta de Valor' : {
                    [preguntas_modeloNegocio[1].txt]: respuestas_modeloNegocio[1],
                    [preguntas_modeloNegocio[2].txt]: respuestas_modeloNegocio[2],
                },
                'Claridad y Dirección' : {
                    [preguntas_modeloNegocio[3].txt]: respuestas_modeloNegocio[3],
                },
                'Competitividad en el Mercado' : {
                    [preguntas_modeloNegocio[4].txt]: respuestas_modeloNegocio[4],
                },
                'Adaptabilidad y Flexibilidad' : {
                    [preguntas_modeloNegocio[5].txt]: respuestas_modeloNegocio[5],
                },
                'Optimización de Recursos' : {
                    [preguntas_modeloNegocio[6].txt]: respuestas_modeloNegocio[6],
                    [preguntas_modeloNegocio[7].txt]: respuestas_modeloNegocio[7],
                },
                'Retroalimentación de Clientes' : {
                    [preguntas_modeloNegocio[8].txt]: respuestas_modeloNegocio[8],
                },
                'Evaluación Interna' : {
                    [preguntas_modeloNegocio[9].txt]: respuestas_modeloNegocio[9],
                    [preguntas_modeloNegocio[10].txt]: respuestas_modeloNegocio[10],
                },
                'Monitoreo del Mercado:' : {
                    [preguntas_modeloNegocio[11].txt]: respuestas_modeloNegocio[11],
                    
                },
                'Visión a Futuro' : {
                    [preguntas_modeloNegocio[12].txt]: respuestas_modeloNegocio[12],
                }
            }
        }

        const prompt = (JSON.stringify(obj_respuestas)+" Con base las respuestas anteriores dame un informe de Evaluación Empresarial, Sistema Operacional que incluya las oportunidades de mejora, sugerencias, y actividades a realizar, separado por títulos.")
        //console.log(`\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n\n`);
        let resultAI = await getResponseChatGPT(prompt)
        const resp = resultAI.content.replaceAll('\n', '<br>');
        const informeAI = { empresa: id_empresa, tipo: 'Análisis operación', informe: resp, fecha: new Date().toLocaleDateString("en-US") }
        const insertResult = await insertarDatos('informes_ia', informeAI)
        if (insertResult.affectedRows > 0) {
            // ENVIAR NOTIFICACIÓN AL EMAIL INFORME GENERADO
            await helpers.notificacion_nuevoInforme('operacional', empresa.nombre_empresa)
            req.user.rol == 'Empresa' ? res.redirect('/analisis-de-negocio')
            : res.redirect('/empresas/' + codigoEmpresa + '#analisis_')
        }

    }
}

// ANÁLISIS DIMENSIÓN MARKETING
consultorController.analisisMarketing = async (req, res) => {
    const { codigo } = req.params;
    let linkCerrar = '/analisis-de-negocio'
    if (req.user.rol != 'Empresa') {
        linkCerrar = `/empresas/${codigo}#analisis_`
    }
    const preguntas = {
        "asistencia": [...preguntas2.asistencia_cliente],
        "marketing": [...preguntas2.marketing],
        "ventas": [...preguntas2.ventas],
    }
    res.render('consultor/analisisMarketing', { wizarx: true, user_dash: false, adminDash: false, codigo, linkCerrar, preguntas })
}
consultorController.guardarAnalisisMarketing = async (req, res) => {
    const { codigoEmpresa, asistencia, marketing, ventas, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    const respuestas_asistencia = asistencia
    const respuestas_markeging = marketing
    const respuestas_ventas = ventas
    const preguntas_asistencia = [...preguntas2.asistencia_cliente]
    const preguntas_marketing = [...preguntas2.marketing]
    const preguntas_ventas = [...preguntas2.ventas]

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = (await consultarDatos('empresas')).find(item => item.codigo == codigoEmpresa)
    const analisis_empresa = await consultarDatos('analisis_empresa');

    if (empresa) {
        let id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Evaluación Empresarial Sistema de Comercialización
        const dataForm = JSON.stringify({
            fecha,
            "asistencia": respuestas_asistencia,
            "marketing": respuestas_markeging,
            "ventas": respuestas_ventas
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { marketing: dataForm }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, marketing: dataForm }
            await insertarDatos('analisis_empresa', nuevoAnalisis)
        }

        /**
         * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS 
        */
        const obj_respuestas = {
            'Área de enfoque: Asistencia y Relación con el Cliente' : {
                'Entendimiento profundo del cliente' : {
                    [preguntas_asistencia[0].txt]: respuestas_asistencia[0],
                    [preguntas_asistencia[1].txt]: respuestas_asistencia[1],
                },
                'Relaciones con Clientes (MN)' : {
                    [preguntas_asistencia[2].txt]: respuestas_asistencia[2],
                    [preguntas_asistencia[3].txt]: respuestas_asistencia[3],
                    [preguntas_asistencia[4].txt]: respuestas_asistencia[4],
                },
                'Comunicación efectiva (MN)' : {
                    [preguntas_asistencia[5].txt]: respuestas_asistencia[5],
                    [preguntas_asistencia[6].txt]: respuestas_asistencia[6],
                },
                'Capacitación del personal' : {
                    [preguntas_asistencia[7].txt]: respuestas_asistencia[7],
                },
                'Respuesta rápida' : {
                    [preguntas_asistencia[8].txt]: respuestas_asistencia[8],
                    [preguntas_asistencia[9].txt]: respuestas_asistencia[9],
                },
                'Uso de tecnología' : {
                    [preguntas_asistencia[10].txt]: respuestas_asistencia[10],
                },
                'Resolución de problemas' : {
                    [preguntas_asistencia[11].txt]: respuestas_asistencia[11],
                    [preguntas_asistencia[12].txt]: respuestas_asistencia[12],
                },
                'Recompensas y lealtad' : {
                    [preguntas_asistencia[13].txt]: respuestas_asistencia[13],
                    [preguntas_asistencia[14].txt]: respuestas_asistencia[14],
                },
                'Seguimiento proactivo' : {
                    [preguntas_asistencia[15].txt]: respuestas_asistencia[15],
                },
                'Integridad y transparencia' : {
                    [preguntas_asistencia[16].txt]: respuestas_asistencia[16]
                }
            },
            'Área de enfoque: Marketing' : {
                'Comprensión del Público Objetivo (MN)' : {
                    [preguntas_marketing[0].txt]: respuestas_markeging[0],
                    [preguntas_marketing[1].txt]: respuestas_markeging[1],
                    [preguntas_marketing[2].txt]: respuestas_markeging[2],
                },
                'Conocimiento del Cliente Objetivo (MN)' : {
                    [preguntas_marketing[3].txt]: respuestas_markeging[3],
                    [preguntas_marketing[4].txt]: respuestas_markeging[4],
                },
                'Propuesta de Valor (MN)' : {
                    [preguntas_marketing[5].txt]: respuestas_markeging[5],
                    [preguntas_marketing[6].txt]: respuestas_markeging[6],
                    [preguntas_marketing[7].txt]: respuestas_markeging[7],
                },
                'Presencia Digital - Sitio Web' : {
                    [preguntas_marketing[8].txt]: respuestas_markeging[8],
                    [preguntas_marketing[9].txt]: respuestas_markeging[9],
                    [preguntas_marketing[10].txt]: respuestas_markeging[10],
                },
                'Redes Sociales' : {
                    [preguntas_marketing[11].txt]: respuestas_markeging[11],
                    [preguntas_marketing[12].txt]: respuestas_markeging[12],
                    [preguntas_marketing[13].txt]: respuestas_markeging[13],
                },
                'Contenido de Calidad' : {
                    [preguntas_marketing[14].txt]: respuestas_markeging[14],
                    [preguntas_marketing[15].txt]: respuestas_markeging[15],
                },
                'SEO' : {
                    [preguntas_marketing[16].txt]: respuestas_markeging[16],
                    [preguntas_marketing[17].txt]: respuestas_markeging[17],
                },
                'Publicidad Segmentada' : {
                    [preguntas_marketing[18].txt]: respuestas_markeging[18],
                    [preguntas_marketing[19].txt]: respuestas_markeging[19],
                },
                'Educación y Capacitación Continua' : {
                    [preguntas_marketing[20].txt]: respuestas_markeging[20],
                },
                'Asignación Adecuada de Recursos' : {
                    [preguntas_marketing[21].txt]: respuestas_markeging[21],
                },
                'Plan de Marketing' : {
                    [preguntas_marketing[22].txt]: respuestas_markeging[22],
                    [preguntas_marketing[23].txt]: respuestas_markeging[23],
                },
                'Manual de Identidad Corporativa' : {
                    [preguntas_marketing[24].txt]: respuestas_markeging[24],
                },
            },
            'Área de enfoque: Ventas' : {
                'Estrategias de Ventas' : {
                    [preguntas_ventas[0].txt]: respuestas_ventas[0],
                    [preguntas_ventas[1].txt]: respuestas_ventas[1],
                },
                'Conocimiento del Producto/Servicio' : {
                    [preguntas_ventas[2].txt]: respuestas_ventas[2],
                    [preguntas_ventas[3].txt]: respuestas_ventas[3],
                },
                'Uso de Tecnología' : {
                    [preguntas_ventas[4].txt]: respuestas_ventas[4],
                },
                'Diversificación de Canales de Ventas' : {
                    [preguntas_ventas[5].txt]: respuestas_ventas[5],
                    [preguntas_ventas[6].txt]: respuestas_ventas[6],
                },
                'Entender al Cliente' : {
                    [preguntas_ventas[7].txt]: respuestas_ventas[7],
                },
                'Gestión de Precios' : {
                    [preguntas_ventas[8].txt]: respuestas_ventas[8],
                },
                'Integración con Marketing' : {
                    [preguntas_ventas[9].txt]: respuestas_ventas[9],
                    [preguntas_ventas[10].txt]: respuestas_ventas[10],
                },
                'Relaciones a Largo Plazo' : {
                    [preguntas_ventas[11].txt]: respuestas_ventas[11],
                    [preguntas_ventas[12].txt]: respuestas_ventas[12],
                },
                'Objetivos y Feedback' : {
                    [preguntas_ventas[13].txt]: respuestas_ventas[13],
                    [preguntas_ventas[14].txt]: respuestas_ventas[14],
                },
                'Red de Contactos (Networking)' : {
                    [preguntas_ventas[15].txt]: respuestas_ventas[15],
                    [preguntas_ventas[16].txt]: respuestas_ventas[16],
                },
                'Cultura de Ventas Positiva' : {
                    [preguntas_ventas[17].txt]: respuestas_ventas[17],
                }
            }
        }

        const prompt = (JSON.stringify(obj_respuestas)+" Con base las respuestas anteriores dame un informe de Evaluación Empresarial, Sistema de Comercialización que incluya las oportunidades de mejora, sugerencias, y actividades a realizar, separado por títulos.")
       // console.log(`\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n\n`);
        let resultAI = await getResponseChatGPT(prompt)
        const resp = resultAI.content.replaceAll('\n', '<br>');
        const informeAI = { empresa: id_empresa, tipo: 'Análisis marketing', informe: resp, fecha: new Date().toLocaleDateString("en-US") }
        const insertResult = await insertarDatos('informes_ia', informeAI)
        if (insertResult.affectedRows > 0) {
            // ENVIAR NOTIFICACIÓN AL EMAIL INFORME GENERADO
            await helpers.notificacion_nuevoInforme('comercialización', empresa.nombre_empresa)
            req.user.rol == 'Empresa' ? res.redirect('/analisis-de-negocio')
            : res.redirect('/empresas/' + codigoEmpresa + '#analisis_')
        }

    }
}
/* ------------------------------------------------------------------------------------------------ */

/********************************************************************************/
// Etapa 3 - Plan Estratégico de Negocio
/********************************************************************************/
// AGREGAR NUEVAS TAREAS (PARA EMPRESAS Y CONSULTORES)
consultorController.agregarTarea = async (req, res) => {
    const { actividad, fecha_inicio, fecha_entrega, dimension, empresa, nombreEmpresa, email } = req.body
    // nuevaTarea.fecha_inicio = new Date().toLocaleDateString("en-CA")
    if (dimension != undefined) {
        if (req.user.rol != 'Empresa') {
            /** Enviando Notificación al Email de nueva tarea */
            const asunto = 'Se ha agregado una nueva tarea';
            const template = tareaNuevaHTML(actividad, nombreEmpresa);
            const resultEmail = await sendEmail(email, asunto, template);
            if (resultEmail == false) {
                console.log("\n<<<<< Ocurrio un error inesperado al enviar el email tarea nueva >>>> \n")
            } else {
                console.log("\n<<<<< Se ha notificado al email ("+email+") que se ha agregado una nueva tarea >>>>>\n")
            }
            /******************************************************* */
        }
        const nuevaTarea = { actividad, fecha_inicio, fecha_entrega, dimension, empresa }
        const tarea = await insertarDatos('tareas_plan_estrategico', nuevaTarea)
        console.log("INFO TAREA DB >>> ", tarea)
        res.send(tarea)
    } else {
        const nuevaTarea = { empresa, actividad, fecha_inicio, fecha_entrega }
        const tarea = await insertarDatos('tareas_plan_empresarial', nuevaTarea)
        console.log("INFO TAREA DB >>> ", tarea)
        res.send(tarea)
    }
}

consultorController.editarTarea = async (req, res) => {
    const { idTarea, item } = req.body
    if (item == 1) {
        let infoTarea = await consultarDatos('tareas_plan_empresarial')
        infoTarea = infoTarea.find(x => x.id === idTarea)
        console.log("\n *********** INFO TAREA EMPRESARIAL DB >>> ", infoTarea)
        res.send(infoTarea)
    } else if (item == 2) {
        let infoTarea = await consultarDatos('tareas_plan_estrategico')
        infoTarea = infoTarea.find(x => x.id === idTarea)
        console.log("\n *********** INFO TAREA ESTRATEGICO DB >>> ", infoTarea)
        res.send(infoTarea)
    } else {
        let infoTarea = await consultarDatos('tareas_consultores')
        infoTarea = infoTarea.find(x => x.id === idTarea)
        console.log("\n *********** INFO TAREAS CONSULTORES DB >>> ", infoTarea)
        res.send(infoTarea)
    }
}

// ACTUALIZAR TAREA x EMPRESA CON BASE A SU ID
consultorController.actualizarTarea = async (req, res) => {
    const { idTarea, actividad, responsable, descripcion, fecha_inicio, fecha_entrega, dimension, estado, prioridad, item } = req.body

    // Para Plan Empresarial
    if (item == 1) {
        const actualizarTarea = { actividad, responsable, descripcion, fecha_inicio, fecha_entrega, estado, prioridad }
        const tarea = await pool.query('UPDATE tareas_plan_empresarial SET ? WHERE id = ?', [actualizarTarea, idTarea])
        console.log("INFO TAREA PLAN EMPRESARIAL DB >>> ", tarea)
        res.send(tarea)
    }
    // Para Plan Estrategico
    else if (item == 2) {
        const actualizarTarea = { actividad, responsable, descripcion, fecha_inicio, fecha_entrega, dimension, estado, prioridad }
        if (req.user.rol != 'Empresa') {
            if (estado == 2) {
                const email = req.body.email;
                const asunto = 'Haz completado una tarea';
                const template = tareaCompletadaHTML(actividad);
                const resultEmail = await sendEmail(email, asunto, template)
                if (resultEmail == false) {
                    console.log("\n<<<<< Ocurrio un error inesperado al enviar el email tarea completada >>>> \n")
                } else {
                    console.log("\n<<<<< Se ha notificado la tarea completada al email de la empresa >>>>>\n")
                }
            }
        }

        const tarea = await pool.query('UPDATE tareas_plan_estrategico SET ? WHERE id = ?', [actualizarTarea, idTarea])
        console.log("INFO TAREA PLAN ESTRATÉGICO DB >>> ", tarea)
        res.send(tarea)
    } else {
        const actualizarTarea = { actividad, responsable, descripcion, fecha_inicio, fecha_entrega, estado, prioridad }
        const tarea = await pool.query('UPDATE tareas_consultores SET ? WHERE id = ?', [actualizarTarea, idTarea])
        console.log("INFO TAREA TAREAS CONSULTORES DB >>> ", tarea)
        res.send(tarea)
    }
}

// COMENTARIO DE TAREAS
consultorController.comentarioTareas = async (req, res) => {
    const { comentario, idTarea, fecha, item } = req.body
    let objActualizar = {mensajes:null}, resultado = false;
    let datosTareas = false;

    if (item == 1) {
        datosTareas = await consultarDatos('tareas_plan_empresarial')
        datosTareas = datosTareas.find(x => x.id == idTarea)
    } else if (item == 2) {
        datosTareas = await consultarDatos('tareas_plan_estrategico')
        datosTareas = datosTareas.find(x => x.id == idTarea)
    } else {
        datosTareas = await consultarDatos('tareas_consultores')
        datosTareas = datosTareas.find(x => x.id == idTarea)
    }

    if (datosTareas != false){
        let mensajes = datosTareas.mensajes
        const objMensaje = {
            fecha: fecha,
            mensaje: comentario,
            rol: req.user.rol,
            nombres: req.user.nombres,
            apellidos: req.user.apellidos,
        }
        
        if (mensajes == null) {
            let arregloComentarios = []
            arregloComentarios.push(objMensaje)
            arregloComentarios = JSON.stringify(arregloComentarios)
            objActualizar = {mensajes: arregloComentarios}
        } else {
            mensajes = JSON.parse(mensajes)
            mensajes.push(objMensaje)
            mensajes = JSON.stringify(mensajes)
            objActualizar = {mensajes}
        }
    }

    if (item == 1) {
        const addMensaje = await pool.query('UPDATE tareas_plan_empresarial SET ? WHERE id = ?', [objActualizar, idTarea])
        console.log("\nMENSAJE AGREGADO A DB PLAN EMPRESARIAL: ", addMensaje)
        console.log("------------------------------------------------");
        if (addMensaje.affectedRows > 0 || addMensaje.changedRows == 1) {
            resultado = true;
        }
    } else if (item == 2) {
        const addMensaje = await pool.query('UPDATE tareas_plan_estrategico SET ? WHERE id = ?', [objActualizar, idTarea])
        console.log("\nMENSAJE AGREGADO A DB PLAN ESTRATÉGICO: ", addMensaje)
        console.log("------------------------------------------------");
        if (addMensaje.affectedRows > 0 || addMensaje.changedRows == 1) {
            resultado = true;
        }
    } else {
        const addMensaje = await pool.query('UPDATE tareas_consultores SET ? WHERE id = ?', [objActualizar, idTarea])
        console.log("\nMENSAJE AGREGADO A DB TAREAS CONSULTORES: ", addMensaje)
        console.log("------------------------------------------------");
        if (addMensaje.affectedRows > 0 || addMensaje.changedRows == 1) {
            resultado = true;
        }
    }

    res.send(resultado)
}


// ELIMINAR TAREA x EMPRESA CON BASE A SU ID
consultorController.eliminarTarea = async (req, res) => {
    const { idTarea, item } = req.body
    if (item == 1) {
        const infoTarea = await eliminarDatos('tareas_plan_empresarial', `WHERE id = ${idTarea}`)
        console.log("ELIMINAR => INFO PLAN EMPRESARIAL ---- ", infoTarea)
    } else if (item == 2) {
        const infoTarea = await eliminarDatos('tareas_plan_estrategico', `WHERE id = ${idTarea}`)
        console.log("ELIMINAR => INFO PLAN ESTRATÉGICO ---- ", infoTarea)
    } else {
        const infoTarea = await eliminarDatos('tareas_consultores', `WHERE id = ${idTarea}`)
        console.log("ELIMINAR => INFO TAREAS CONSULTORES ---- ", infoTarea)
    }

    res.send(true)
}

/************************************************************************************************* */
// SOLICITAR ARCHIVOS (ETAPA 2, 3 Y 4)
consultorController.solicitarArchivo = async (req, res) => {
    const { empresa, dimension, descripcion, tabla }  = req.body;
    const datos = { empresa, dimension, descripcion }
    const insertar = await insertarDatos(tabla, datos)
    if (insertar.affectedRows == 1) {
        let datosEmpresa = await consultarDatos('empresas')
        datosEmpresa = datosEmpresa.find(x => x.id_empresas == empresa)
        if (datosEmpresa) {
            let etapa = '', link = '';
            if (tabla == 'archivos_analisis') {
                etapa = 'Análisis de Negocio'
                link = 'analisis-de-negocio'
            } else if (tabla == 'archivos_empresarial') {
                etapa = 'Proyecto de Consultoría'
                link = 'plan-empresarial'
            } else {
                etapa = 'Plan Estratégico de Negocio'
                link = 'plan-estrategico'
            }

            const asunto = 'Se ha solitado un nuevo archivo';
            const template = solicitarArchivoHTML(datosEmpresa.nombre_empresa, descripcion, etapa, link)
            const resultEmail = await sendEmail(datosEmpresa.email, asunto, template);
            console.log("Result email >>>> ");
            console.log(resultEmail);
            if (resultEmail == false) {
                console.log("\n<<<<< Ocurrio un error inesperado al enviar el email de nuevo archivo solicitado >>>> \n")
            } else {
                console.log("\n<<<<< Se ha notificado al email ("+datosEmpresa.email+") que se ha solicitado un nuevo archivo >>>>>\n")
            }
        }
        res.send(true)
    } else {
        res.send(false);
    }
}

// ELIMINAR ARCHIVOS EMPRESAS (ETAPA 2, 3 Y 4)
consultorController.eliminarArchivo = async (req, res) => {
    const { id, tabla } = req.body;
    const eliminar = await eliminarDatos(tabla, `WHERE id = ${id}` )
    console.log("<<<<<<<<<<<<<<<<< result insertar archivo >>>>>>>>>>");
    console.log(eliminar);
    console.log("<<<<<<<<<<<<<<<<< result insertar archivo >>>>>>>>>>");
    eliminar.affectedRows == 1 ? res.send(true) : res.send(false);
}

// AGREGAR NUEVO RENDIMIENTO DE LA EMPRESA (VENTAS, COMPRAS, GASTOS)
consultorController.nuevoRendimiento = async (req, res) => {
    let { total_ventas, total_compras, total_gastos, codigo } = req.body
    let result = false;
    if (req.user.rol == 'Empresa') {
        codigo = req.user.codigo;
    }
    console.log("Código", codigo);
    let datosTabla = await consultarDatos('empresas')
    datosTabla = datosTabla.find(item => item.codigo == codigo)
    if (datosTabla) {
        const empresa = datosTabla.id_empresas
        const fecha = new Date().toLocaleDateString('en-US')
        // RENDIMIENTO DE LA EMPRESA
        total_ventas = total_ventas.replace(/[$ ]/g, '');
        total_ventas = total_ventas.replace(/[,]/g, '.');
        total_compras = total_compras.replace(/[$ ]/g, '');
        total_compras = total_compras.replace(/[,]/g, '.');
        total_gastos = total_gastos.replace(/[$ ]/g, '');
        total_gastos = total_gastos.replace(/[,]/g, '.');
        const utilidad = parseFloat(total_ventas) - parseFloat(total_compras) - parseFloat(total_gastos)
        const rentabilidad = ((( parseFloat(total_ventas) - (parseFloat(total_compras) + parseFloat(total_gastos) ) ) / parseFloat(total_ventas)) * 100).toFixed(2);
        console.log("rentabilidad: ", rentabilidad);
        const nuevoRendimiento = { empresa, total_ventas, total_compras, total_gastos, rentabilidad, utilidad, fecha }

        let rendimientos = await consultarDatos('rendimiento_empresa')
        rendimientos = rendimientos.filter(x => x.empresa == empresa)

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

        result = await insertarDatos('rendimiento_empresa', nuevoRendimiento)
        if (result.affectedRows > 0) result = true;
    }
    res.redirect(req.headers.referer)
}

/************************************************************************************** */
// AGREGAR NUEVAS TAREAS CONSULTORES/ADMIN
consultorController.agregarTareaConsultores = async (req, res) => {
    const { consultor, actividad, fecha_inicio, fecha_entrega } = req.body
    const nuevaTarea = { consultor, actividad, fecha_inicio, fecha_entrega }
    const tarea = await insertarDatos('tareas_consultores', nuevaTarea)
    console.log("INFO TAREA DB >>> ", tarea)
    res.send(tarea)
}