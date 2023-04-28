const consultorController = exports;
const pool = require('../database')
const { sendEmail, propuestaCargadaHTML, tareaCompletadaHTML, tareaNuevaHTML, solicitarArchivoHTML } = require('../lib/mail.config')
const { consultarDatos, insertarDatos, eliminarDatos, consultarTareasConsultores } = require('../lib/helpers')
const { getResponseChatGPT, checkGPT3Connectivity } = require('../lib/openai');

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
    res.render('consultor/analisisProducto', { wizarx: true, user_dash: false, adminDash: false, codigo, linkCerrar})
}
consultorController.guardarAnalisisProducto = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await consultarDatos('empresas')
    const analisis_empresa = await consultarDatos('analisis_empresa');

    empresa = empresa.find(item => item.codigo == codigoEmpresa)

    let id_empresa;

    if (empresa) {
        id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Analisis dimensión Producto
        const { publico_objetivo, beneficios, tipo_producto, nivel_precio, mas_vendidos, razon_venta, utilizacion, integracion_gama, calidad, aceptacion } = req.body
        let producto = JSON.stringify({
            fecha, publico_objetivo, beneficios, tipo_producto, nivel_precio, mas_vendidos, razon_venta, utilizacion, integracion_gama, calidad, aceptacion
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { producto }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, producto }
            await insertarDatos('analisis_empresa', nuevoAnalisis)
        }

        /**
         * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS 
        */
        const obj_respuestas = {
            '¿A cuál segmento del mercado va dirigido su producto: hombres, mujeres, pequeñas empresas, etc.?': publico_objetivo,
            '¿Qué Beneficios aporta su producto? Y ¿Qué necesidad de este público satisface?': beneficios,
            '¿Cuál es su tipo de producto específicamente?': tipo_producto,
            'Explique ¿Cómo es el precio de su producto en relación al sector de mercado en el que se encuentra?': nivel_precio,
            '¿Cuáles son los Productos y/o Servicios que más vende?': mas_vendidos, 
            '¿Cuál es la razón por la que considera que estos Productos que describió anteriormente se venden más?': razon_venta,
            '¿Cómo se utiliza o consume su producto? ¿En qué ocasiones? ¿Por quién? ¿En dónde?': utilizacion,
            'Explique ¿Qué coherencia tienen sus productos dentro de la empresa?': integracion_gama,
            '¿Cómo es la calidad de su producto? Y ¿Qué tiene su producto para disponer de la calidad a que hace referencia?': calidad,
            '¿Qué aceptación tiene su producto?': aceptacion
        }

        const prompt = (JSON.stringify(obj_respuestas)+" usando las respuestas anteriores, genera un informe detallado de análisis de negocio en la dimensión producto para la empresa.")
        console.log(`\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n\n`);
        let resultAI = await getResponseChatGPT(prompt)
        const resp = resultAI.content.replaceAll('\n', '<br>');
        const informeAI = { empresa: id_empresa, tipo: 'Análisis producto', informe: resp, fecha: new Date().toLocaleDateString("en-US") }
        const insertResult = await insertarDatos('informes_ia', informeAI)
        if (insertResult.affectedRows > 0) {
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
    res.render('consultor/analisisAdministracion', { wizarx: true, user_dash: false, adminDash: false, codigo, linkCerrar })
}
consultorController.guardarAnalisisAdministracion = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await consultarDatos('empresas')
    const analisis_empresa = await consultarDatos('analisis_empresa');

    empresa = empresa.find(item => item.codigo == codigoEmpresa)

    if (empresa) {
        let id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Analisis dimensión Producto
        const { vision1, vision2, vision3, vision4, vision5, mision, valores, foda1, foda2, foda3, foda4, foda5, foda6, foda7, foda8, estructura_organizativa, tipo_sistema, sistema_facturacion, puesto1, funcion1, puesto2, funcion2, puesto3, funcion3, puesto4, funcion4, puesto5, funcion5, puesto6, funcion6, h_puesto1, habilidad_interp1, habilidad_tecnica1, h_puesto2, habilidad_interp2, habilidad_tecnica2, h_puesto3, habilidad_interp3, habilidad_tecnica3, h_puesto4, habilidad_interp4, habilidad_tecnica4, h_puesto5, habilidad_interp5, habilidad_tecnica5, h_puesto6, habilidad_interp6, habilidad_tecnica6, habilidad1, habilidad2, necesidad_contratacion, motivo_contratacion, proceso_contratacion1, proceso_contratacion2, evaluacion_cargo, proyeccion_ventas, costo_ventas, cuentas_pagar, cuentas_cobrar, costos_fijos_variables, estado_resultados_empresa, utilidad_neta, rentabilidad, punto_equilibrio, flujo_caja, retorno_inversion } = req.body

        const vision = { vision1, vision2, vision3, vision4, vision5 };
        const foda = { foda1, foda2, foda3, foda4, foda5, foda6, foda7, foda8 }
        const av_talento_humano = {
            puesto1, funcion1, puesto2, funcion2, puesto3, funcion3, puesto4, funcion4, puesto5, funcion5, puesto6, funcion6,
            h_puesto1, habilidad_interp1, habilidad_tecnica1, h_puesto2, habilidad_interp2, habilidad_tecnica2, h_puesto3, habilidad_interp3, habilidad_tecnica3, h_puesto4, habilidad_interp4, habilidad_tecnica4, h_puesto5, habilidad_interp5, habilidad_tecnica5, h_puesto6, habilidad_interp6, habilidad_tecnica6, habilidad1, habilidad2, necesidad_contratacion, motivo_contratacion, proceso_contratacion1, proceso_contratacion2, evaluacion_cargo
        }
        const av_finanzas = { proyeccion_ventas, costo_ventas, cuentas_pagar, cuentas_cobrar, costos_fijos_variables, estado_resultados_empresa, utilidad_neta, rentabilidad, punto_equilibrio, flujo_caja, retorno_inversion }

        let administracion = JSON.stringify({
            fecha, vision, mision, valores, foda, estructura_organizativa, tipo_sistema, sistema_facturacion, av_talento_humano, av_finanzas
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { administracion }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, administracion }
            await insertarDatos('analisis_empresa', nuevoAnalisis)
        }

        /**
         * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS 
        */
        const obj_respuestas = {
            '¿Qué queremos conseguir como Negocio?': vision1,
            '¿Cómo se enfrentará el negocio a los cambios?': vision2,
            '¿Cómo se diferenciará del resto?': vision3,
            '¿Cómo logrará ser competitivo?': vision4,
            'Declare su VISIÓN': vision5,
            'Declare su MISIÓN': mision,
            '¿Cuáles son los valores que rigen a su empresa?': valores,
            '¿Cuáles son las oportunidades que puede identificar en su mercado para su negocio?': foda1,
            '¿Cuáles son las amenazas que puede identificar en su mercado para su negocio?': foda2,
            '¿Cuáles son las fortalezas de su negocio?¿Cuáles son las oportunidades que puede identificar en su mercado para su negocio?¿Cuáles son las fortalezas de su negocio?': foda3,
            '¿Cuáles son los aspectos a mejorar que puede identificar de su negocio?': foda4,
            '¿Qué oportunidades de las que identificó puede aprovechar en este momento con las fortalezas que tiene?': foda5,
            '¿Qué oportunidades puede aprovechar si mejora los aspectos (debilidades) que identificó?': foda6,
            '¿Qué amenazas puede evitar en este momento utilizando las fortalezas que tiene?': foda7,
            '¿Qué amenazas puede evitar en este momento minimizando los aspectos a mejorar (debilidades) que identificó?': foda8,
            'Estructura Organizativa': estructura_organizativa,
            'Tipo de sistema administrativo': tipo_sistema,
            '¿Describa el tipo de sistema que está utilizando para la facturación de su empresa?': sistema_facturacion,
            'Principales funciones del personal': { puesto1,
            funcion1,
            puesto2, 
            funcion2,
            puesto3,
            funcion3,
            puesto4,
            funcion4,
            puesto5,
            funcion5,
            puesto6,
            funcion6, },
            '¿Qué habilidades se requieren para los distintos puestos?': { 
                'puesto': h_puesto1,
                'Habilidades interpersonales': habilidad_interp1,
                'Habilidades técnicas': habilidad_tecnica1,
                'puesto': h_puesto2,
                'Habilidades interpersonales': habilidad_interp2,
                'Habilidades técnicas': habilidad_tecnica2,
                'puesto': h_puesto3,
                'Habilidades interpersonales': habilidad_interp3,
                'Habilidades técnicas': habilidad_tecnica3,
                'puesto': h_puesto4,
                'Habilidades interpersonales': habilidad_interp4,
                'Habilidades técnicas': habilidad_tecnica4,
                'puesto': h_puesto5,
                'Habilidades interpersonales': habilidad_interp5,
                'Habilidades técnicas': habilidad_tecnica5,
                'puesto': h_puesto6,
                'Habilidades interpersonales': habilidad_interp6,
                'Habilidades técnicas': habilidad_tecnica6, },
            '¿Qué habilidades interpersonales considera que deberían desarrollar sus colaboradores?': habilidad1,
            '¿Qué habilidades técnicas considera que deberían desarrollar sus colaboradores?': habilidad2,
            '¿Qué personal considera que requiere en este momento para su empresa?': necesidad_contratacion,
            '¿Cuál es el motivo de contratación?': motivo_contratacion,
            '¿Cuál es el criterio que utiliza para contratar al personal?': proceso_contratacion1,
            '¿Cuál sería la información más importante que debería obtener de un futuro trabajador para ser contratado?': proceso_contratacion2,
            '¿Cómo mide actualmente el desempeño de los trabajadores en su puesto de trabajo?': evaluacion_cargo,
            '¿Cuál sería su proyección de ventas para los próximos meses?': proyeccion_ventas,
            '¿Cómo es la estructura de costos de sus productos?': costo_ventas,
            '¿A cuánto equivalen las cuentas por pagar de la empresa?': cuentas_pagar,
            '¿A cuánto equivalen las cuentas por cobrar de la empresa?': cuentas_cobrar,
            '¿Cuáles son los costos fijos y variables de la empresa?': costos_fijos_variables,
            '¿Qué información muestra el Estado de Resultados de la empresa?': estado_resultados_empresa,
            '¿Cuál es la utilidad neta de la empresa?': utilidad_neta,
            '¿Cuál es la rentabilidad de la empresa?': rentabilidad,
            '¿Cuál es el punto de equilibrio de la empresa?': punto_equilibrio,
            '¿Cómo ha sido el Flujo de Caja de la empresa en los últimos 6 meses?': flujo_caja,
            '¿Cuál es el retorno de inversión de la empresa?': retorno_inversion
        }

        const prompt = (JSON.stringify(obj_respuestas)+" usando las respuestas anteriores, genera un informe detallado de análisis de negocio en la dimensión administración para la empresa.")
        console.log(`\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n\n`);
        let resultAI = await getResponseChatGPT(prompt)
        const resp = resultAI.content.replaceAll('\n', '<br>');
        const informeAI = { empresa: id_empresa, tipo: 'Análisis administración', informe: resp, fecha: new Date().toLocaleDateString("en-US") }
        const insertResult = await insertarDatos('informes_ia', informeAI)
        if (insertResult.affectedRows > 0) {
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
    res.render('consultor/analisisOperacion', { wizarx: true, user_dash: false, adminDash: false, codigo, linkCerrar })
}
consultorController.guardarAnalisisOperacion = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await consultarDatos('empresas')
    const analisis_empresa = await consultarDatos('analisis_empresa');
    empresa = empresa.find(item => item.codigo == codigoEmpresa)

    if (empresa) {
        let id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Analisis dimensión Producto
        const { info_productos, satisfaccion, encuesta_clientes, informacion_deClientes, utilidad_libro_quejas, beneficio_libro_quejas, estrategia__libro_quejas, fidelizacion_clientes, instalaciones_op, areas_op, influencia_op, permisos1, permisos2, plan_trabajo1, plan_trabajo2, plan_trabajo3, procesos_estandarizados1, procesos_estandarizados2, ambiente_laboral, comunicacion, reconocimiento1, reconocimiento2, innovacion_inidividual1, innovacion_inidividual2, innovacion_productos, innovacion_procesos, innovacion_modelo, innovacion_gestion } = req.body

        const av_operaciones = { instalaciones_op, areas_op, influencia_op, permisos1, permisos2, plan_trabajo1, plan_trabajo2, plan_trabajo3, procesos_estandarizados1, procesos_estandarizados2 }
        const av_ambiente_laboral = { ambiente_laboral, comunicacion, reconocimiento1, reconocimiento2 }
        const av_innovacion = { innovacion_inidividual1, innovacion_inidividual2, innovacion_productos, innovacion_procesos, innovacion_modelo, innovacion_gestion };

        const operacion = JSON.stringify({
            fecha, info_productos, satisfaccion, encuesta_clientes, informacion_deClientes, utilidad_libro_quejas, beneficio_libro_quejas, estrategia__libro_quejas, fidelizacion_clientes, av_operaciones, av_ambiente_laboral, av_innovacion
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { operacion }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, operacion }
            await insertarDatos('analisis_empresa', nuevoAnalisis)
        }

        /**
         * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS 
        */
        const obj_respuestas = {
            '¿Cómo hace actualmente para facilitarle a sus clientes información rápida y efectiva de sus Productos y/o Servicios?': info_productos,
            '¿Cómo mide actualmente la satisfacción de sus clientes con respecto a sus Productos y/o Servicios?': satisfaccion,
            '¿Qué le preguntaría a sus clientes con respecto a sus Productos y/ o Servicios?': satisfaccion2,
            '¿Qué información le interesaría conocer de sus clientes?': informacion_deClientes,
            '¿Qué utilidad le ve a un Libro de quejas y reclamaciones?': utilidad_libro_quejas,
            '¿En qué se puede beneficiar la empresa de un Libro de quejas y reclamaciones?': beneficio_libro_quejas,
            '¿Qué estrategia puede utilizar para activar su usabilidad?': estrategia__libro_quejas,
            '¿Qué es lo que hace en la actualidad para fidelizar a sus clientes?': fidelizacion_clientes,
            '¿Qué tan adecuadas están las instalaciones donde opera el negocio?': instalaciones_op,
            '¿Cómo están distribuidas las áreas del negocio?': areas_op,
            '¿Qué influencia tienen las instalaciones en general hacia el éxito del negocio?': influencia_op,
            '¿Cuáles son los permisos necesarios que requiere para la correcta operación del negocio?': permisos1,
            '¿Qué tipo de permisos requiere actualmente o podría necesitar?': permisos2,
            '¿Cómo está elaborado el plan de trabajo de cada trabajador dentro de la empresa?': plan_trabajo1,
            '¿Cuál es la información más relevante que debe contener el plan de trabajo?': plan_trabajo2,
            '¿Qué podría ayudar a que el plan de trabajo se cumpla?': plan_trabajo3,
            '¿Qué tareas y procesos tiene actualmente estandarizados?': procesos_estandarizados1,
            '¿Cuáles tareas y procesos le gustaría estandarizar?': procesos_estandarizados2,
            '¿Qué hace actualmente para contribuir a generar un buen ambiente de trabajo dentro de la empresa?': ambiente_laboral,
            '¿De qué manera se llevan a cabo las comunicaciones dentro de la empresa?': comunicacion,
            '¿De qué manera le reconoce a sus colaboradores que están haciendo un buen trabajo?': reconocimiento1,
            '¿Cómo puede brindar reconocimiento a sus colaboradores cuando están haciendo un buen trabajo?': reconocimiento2,
            '¿Qué importancia le ve a la posibilidad de que sus trabajadores aportan ideas para la mejora dentro de la empresa?': innovacion_inidividual,
            '¿Qué tipo de ideas le gustaría recibir por parte de sus trabajadores?': innovacion_inidividual2,
            '¿Qué mejora en sus productos y/o servicios pueden incrementar tus ventas?': innovacion_productos,
            '¿Qué cambios podrían mejorar los procesos operativos para desarrollarsus Productos y/o Servicios?': innovacion_procesos,
            '¿Qué considera que podría innovar en su modelo de negocio?': innovacion_modelo,
            '¿Qué podría mejorar dentro de los sistemas de gestión que tiene actualmente?': innovacion_gestion
        }

        const prompt = (JSON.stringify(obj_respuestas)+" usando las respuestas anteriores, genera un informe detallado de análisis de negocio en la dimensión operación para la empresa.")
        console.log(`\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n\n`);
        let resultAI = await getResponseChatGPT(prompt)
        const resp = resultAI.content.replaceAll('\n', '<br>');
        const informeAI = { empresa: id_empresa, tipo: 'Análisis operación', informe: resp, fecha: new Date().toLocaleDateString("en-US") }
        const insertResult = await insertarDatos('informes_ia', informeAI)
        if (insertResult.affectedRows > 0) {
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
    res.render('consultor/analisisMarketing', { wizarx: true, user_dash: false, adminDash: false, codigo, linkCerrar })
}
consultorController.guardarAnalisisMarketing = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await consultarDatos('empresas')
    const analisis_empresa = await consultarDatos('analisis_empresa');

    empresa = empresa.find(item => item.codigo == codigoEmpresa)

    if (empresa) {
        let id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Analisis dimensión Producto
        const { objetivo_principal, cliente, posicionamiento, beneficios, mensaje, oferta1, oferta2, seguimiento, presupuesto, atraccion, fidelizacion, sitioWeb1, sitioWeb2, sitioWeb3, sitioWeb4, sitioWeb5, sitioWeb6, sitioWeb7, identidadC1, identidadC2, identidadC3, identidadC4, identidadC5, identidadC6, identidadC7, eslogan, estrategia1, estrategia2, estrategia3, estrategia4, estrategia5, estrategia6 } = req.body

        const sitioWeb = { s1: sitioWeb1, s2: sitioWeb2, s3: sitioWeb3, s4: sitioWeb4, s5: sitioWeb5, s6: sitioWeb6, s7: sitioWeb7 }
        const identidadC = { ic1: identidadC1, ic2: identidadC2, ic3: identidadC3, ic4: identidadC4, ic5: identidadC5, ic6: identidadC6, ic7: identidadC7 }
        const estrategias = { e1: estrategia1, e2: estrategia2, e3: estrategia3, e4: estrategia4, e5: estrategia5, e6: estrategia6 }

        const marketing = JSON.stringify({
            fecha, objetivo_principal, cliente, posicionamiento, beneficios, mensaje, oferta1, oferta2, seguimiento, presupuesto, atraccion, fidelizacion, sitioWeb, identidadC, eslogan, estrategias
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { marketing }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, marketing }
            await insertarDatos('analisis_empresa', nuevoAnalisis)
        }

        /**
         * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS 
        */
        const obj_respuestas = {
            '¿Cuál es el objetivo principal que quisieras conseguir con una estrategia de marketing? y ¿Cómo lo vas a medir?': objetivo_principal,
            '¿Quién es el cliente al que te diriges?': cliente,
            '¿Cuál será tu factor de diferenciación frente a la competencia?': posicionamiento,
            '¿Qué beneficios le aporta tu propuesta a quien adquiere tu producto?': beneficios,
            '¿Cuál es el mensaje con el que vas a captar la atención de tus clientes?': mensaje,
            '¿Cuál es la oferta de productos que tienes?': oferta1,
            '¿Cuál es tu producto de entrada? si tienes un producto Premium.': oferta2,
            '¿Cuáles pueden ser los problemas a resolver más importantes en cada fase del proceso de compra del cliente?': seguimiento,
            '¿Cuál podría ser tu presupuesto máximo?': presupuesto,
            '¿Qué acciones de atracción a clientes puedes realizar?': atraccion,
            '¿Qué acciones puedes proponer para para conseguir fidelizar a los clientes, y que vuelvan a comprar y que recomienden los productos?': fidelizacion,
            '¿Quieres trabajar sobre lo que está, o buscas algo totalmente nuevo?': sitioWeb1,
            '¿Cómo quieres que se vea tu página Web? da ejemplo': sitioWeb2,
            '¿Te gusta el diseño/funcionalidad de alguna página Web? Ejemplos': sitioWeb3,
            '¿Qué incluirías de ese diseño en la tuya/qué no incluirías?': sitioWeb4,
            '¿Cuál podría ser tu presupuesto máximo?': sitioWeb5,
            '¿Cuál es el estado de tu marca en el mundo digital de las redes sociales?': sitioWeb6,
            '¿Cuáles son tus redes sociales?': sitioWeb7,
            '¿Quisieras cambiar algo sobre lo que ya tienes?': identidadC1,
            '¿Hay algún elemento que quieras que aparezca en el logo?': identidadC2,
            'En tu opinión, ¿qué define un logotipo bien diseñado?': identidadC3,
            '¿Cuál es tu preferencia, en referencia a los iconos, tipografía, colores etc?': identidadC4,
            '¿Qué palabras o iconos se deben incluir en el logo?': identidadC5,
            '¿Qué logos te gustan y por qué?': identidadC6,
            '¿Qué logos no te gustan y por qué?': identidadC7,
            '¿Cuál es el eslogan que podría definir a tu empresa?': eslogan,
            '¿Como haces para proyectar las ventas que esperas conseguir?': estrategia1,
            '¿Qué haces para vender tus productos?': estrategia2,
            '¿Cuáles son los canales que utilizas para vender?': estrategia3,
            '¿Cómo organizas tus canales de ventas?': estrategia4,
            '¿Cómo es tu plan de ventas actual?': estrategia5,
            '¿Cómo le haces seguimiento al proceso de venta?': estrategia6
        }

        const prompt = (JSON.stringify(obj_respuestas)+" usando las respuestas anteriores, genera un informe detallado de análisis de negocio en la dimensión marketing para la empresa.")
        console.log(`\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n\n`);
        let resultAI = await getResponseChatGPT(prompt)
        const resp = resultAI.content.replaceAll('\n', '<br>');
        const informeAI = { empresa: id_empresa, tipo: 'Análisis marketing', informe: resp, fecha: new Date().toLocaleDateString("en-US") }
        const insertResult = await insertarDatos('informes_ia', informeAI)
        if (insertResult.affectedRows > 0) {
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
        const nuevoRendimiento = { empresa, total_ventas, total_compras, total_gastos, utilidad, fecha }
        // await pool.query('INSERT INTO rendimiento_empresa SET ?', [nuevoRendimiento])
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