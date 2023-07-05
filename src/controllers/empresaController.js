const pool = require("../database");
const empresaController = exports;
const {
  encriptarTxt,
  desencriptarTxt,
  consultarTareasEmpresarial,
  consultarDatos,
  tareasGenerales,
  eliminarDatos,
  actualizarDatos,
  insertarDatos,
  cargarArchivo,
} = require("../lib/helpers");
const { sendEmail, archivosCargadosHTML } = require("../lib/mail.config");
const { Country } = require("country-state-city");
const { getResponseChatGPT, checkGPT3Connectivity } = require("../lib/openai");

let pagoPendiente = true,
  etapa1,
  consulAsignado = {},
  id_empresa = false,
  etapaCompleta = {};
let modalAcuerdo = false;

/** Función para mostrar Dashboard de Empresas */
empresaController.index = async (req, res) => {
  etapaCompleta = {};
  consulAsignado = {};
  modalAcuerdo = false;
  req.session.intentPay = undefined; // Intento de pago
  const empresas = await consultarDatos("empresas");
  const empresa = empresas.find((x) => x.email == req.user.email);
  id_empresa = empresa.id_empresas;
  let idEmpresaActual = empresa.id_empresas;
  etapa1 = {};

  // VALIDACIÓN PARA SABER SI LA EMPRESA TIENE CONSULTOR DE DIAGNÓSTICO ASIGNADO
  let cAsignado = await consultarDatos("consultores_asignados");
  if (cAsignado.length > 0) {
    const c1 = cAsignado.find(
      (x) => x.empresa == idEmpresaActual && x.orden == 1
    );
    c1 ? (consulAsignado.c1 = c1) : (consulAsignado.c1 = false);

    const c2 = cAsignado.find(
      (x) => x.empresa == idEmpresaActual && x.orden == 2
    );
    c2 ? (consulAsignado.c2 = c2) : (consulAsignado.c2 = false);

    const c3 = cAsignado.find(
      (x) => x.empresa == idEmpresaActual && x.orden == 3
    );
    c3 ? (consulAsignado.c3 = c3) : (consulAsignado.c3 = false);

    const c4 = cAsignado.find(
      (x) => x.empresa == idEmpresaActual && x.orden == 4
    );
    c4 ? (consulAsignado.c4 = c4) : (consulAsignado.c4 = false);
  }

  /** ETAPAS DEL DIAGNOSTICO EN LA EMPRESA */
  const dataEmpresa = await pool.query(
    'SELECT e.*, u.codigo, u.estadoAdm, f.telefono, f.id_empresa, p.*, a.id_empresa, a.estadoAcuerdo FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = ? LEFT OUTER JOIN pagos p ON p.id_empresa = ? LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = ? INNER JOIN users u ON u.codigo = ? AND rol = "Empresa" LIMIT 1',
    [id_empresa, id_empresa, id_empresa, empresa.codigo]
  );
  const diagEmpresa = await pool.query(
    "SELECT * FROM dg_empresa_establecida WHERE id_empresa = ? LIMIT 2",
    [id_empresa]
  );
  const diagEmpresa2 = await pool.query(
    "SELECT * FROM dg_empresa_nueva WHERE id_empresa = ? LIMIT 2",
    [id_empresa]
  );

  /**
   * diagEmpresa -> EMPRESA ESTABLECIDA
   * diagEmpresa2 -> EMPRESA NUEVA
   */

  // PORCENTAJE ETAPA 1
  let porcentaje = 100 / 4,
    porcentajeEtapa1 = 0;
  // porcentaje = Math.round(porcentaje)
  const diagPorcentaje = { num: 0 };

  const e = dataEmpresa[0];
  // const diagnosticoPago = JSON.parse(e.diagnostico_negocio)
  // if (diagnosticoPago.estado == 1) {
  //     diagPorcentaje.txt = 'Diagnóstico pagado'
  //     porcentajeEtapa1 = porcentaje
  // }
  // if (e.estadoAcuerdo == 1) {
  //     diagPorcentaje.txt = 'Acuerdo enviado'
  //     porcentajeEtapa1 = porcentaje * 2
  // }
  if (e.estadoAcuerdo == 2) {
    diagPorcentaje.txt = "Acuerdo aceptado";
    porcentajeEtapa1 = porcentaje;
  }
  if (e.telefono) {
    diagPorcentaje.txt = "Ficha Cliente";
    porcentajeEtapa1 = porcentaje * 2;
  }

  if (diagEmpresa.length > 0 || diagEmpresa2.length > 0) {
    diagPorcentaje.txt = "Cuestionario diagnóstico";
    porcentajeEtapa1 = porcentaje * 3;
  }

  // INFORMES GENERADOS POR CHATGPT
  const informesIA = await consultarDatos("informes_ia");

  // VERIFICACIÓN DE ETAPAS FINALIZADAS (Estapa 1)
  const informe1_IA = informesIA.find(
    (x) => x.empresa == id_empresa && x.tipo == "Diagnóstico"
  );
  if (informe1_IA) {
    porcentajeEtapa1 = 100;
    etapaCompleta.e1 = true;

    /*****************************************************
     * VALIDANDO EL TIPO DE EMPRESA (NUEVA O ESTABLECIDA) - PARA HABILITAR EL MENÚ
     */
    // Empresa Establecida
    if (diagEmpresa.length > 0) {
      etapaCompleta.verAnalisis = true;
      etapaCompleta.verEmpresarial = true;
      etapa1.fecha1 = new Date(diagEmpresa[0].fecha).toLocaleDateString(
        "en-US"
      );
      // Activando Páginación paa gráficas de Indicadores
      if (diagEmpresa.length > 1) {
        const lastElement = diagEmpresa[diagEmpresa.length - 1];
        etapa1.fecha2 = new Date(lastElement.fecha).toLocaleDateString("en-US");
      }

      // Empresa Nueva
    } else if (diagEmpresa2.length > 0) {
      etapaCompleta.verAnalisis = false;
      // etapaCompleta.verEmpresarial = true;
      etapaCompleta.verEstrategico = true;
      etapa1.fecha1 = new Date(diagEmpresa2[0].fecha).toLocaleDateString(
        "en-US"
      );
      // Activando Páginación para gráficas de Indicadores
      if (diagEmpresa2.length > 1) {
        const lastElement = diagEmpresa2[diagEmpresa2.length - 1];
        etapa1.fecha2 = new Date(lastElement.fecha).toLocaleDateString("en-US");
      }
    }
  }

  /****************************************************************************** */
  // PORCENTAJE ETAPA 2
  // let porcentaje2 = 100/4
  // porcentaje2 = Math.round(porcentaje2)
  let analisisEmpresa = await consultarDatos("analisis_empresa");
  analisisEmpresa = analisisEmpresa.find((i) => i.id_empresa == id_empresa);
  let porcentajeEtapa2 = 0;
  if (analisisEmpresa) {
    if (analisisEmpresa.producto) {
      porcentajeEtapa2 = porcentajeEtapa2 + 12.5;
    }
    if (analisisEmpresa.administracion) {
      porcentajeEtapa2 = porcentajeEtapa2 + 12.5;
    }
    if (analisisEmpresa.operacion) {
      porcentajeEtapa2 = porcentajeEtapa2 + 12.5;
    }
    if (analisisEmpresa.marketing) {
      porcentajeEtapa2 = porcentajeEtapa2 + 12.5;
    }
  }

  const informeProducto = informesIA.find(
    (x) => x.empresa == id_empresa && x.tipo == "Análisis producto"
  );
  if (informeProducto) porcentajeEtapa2 = porcentajeEtapa2 + 12.5;
  const informeAdministracion = informesIA.find(
    (x) => x.empresa == id_empresa && x.tipo == "Análisis administración"
  );
  if (informeAdministracion) porcentajeEtapa2 = porcentajeEtapa2 + 12.5;
  const informeOperaciones = informesIA.find(
    (x) => x.empresa == id_empresa && x.tipo == "Análisis operación"
  );
  if (informeOperaciones) porcentajeEtapa2 = porcentajeEtapa2 + 12.5;
  const informeMarketing = informesIA.find(
    (x) => x.empresa == id_empresa && x.tipo == "Análisis marketing"
  );
  if (informeMarketing) porcentajeEtapa2 = porcentajeEtapa2 + 12.5;

  if (porcentajeEtapa2 == 100) {
    etapaCompleta.e2 = true;
    etapaCompleta.verEstrategico = true;
  }

  /************************************************************************** */
  // PORCENTAJE ETAPA 4
  let porcentajeEtapa4 = 0;
  let tareasEmpresa = await consultarDatos("tareas_plan_estrategico");
  tareasEmpresa = tareasEmpresa.filter((x) => x.empresa == id_empresa);
  const totalTareas = tareasEmpresa.length;
  let tareasCompletadas = tareasEmpresa.filter((x) => x.estado == 2);
  tareasCompletadas = tareasCompletadas.length;
  let verGraficasCircular = false;
  if (totalTareas > 0) {
    porcentajeEtapa4 = (tareasCompletadas / totalTareas) * 100;
    porcentajeEtapa4 = Math.round(porcentajeEtapa4);
    verGraficasCircular = true;
  }
  if (porcentajeEtapa4 == 100) etapaCompleta.e4 = true;
  // const informeEtapa4 = informesIA.find(x => x.empresa == id_empresa && x.tipo == 'Estratégico')
  // if (informeEtapa4) {
  //     porcentajeEtapa4 = 100;
  //     etapaCompleta.e4 = true;
  // }

  /**************************************
   * PORCENTAJE GENERAL DE LA EMPRESA
   */
  // Empresa Establecida
  let porcentajeTotal = Math.round(
    (porcentajeEtapa1 + porcentajeEtapa2 + porcentajeEtapa4) / 3
  );
  // Empresa Nueva
  if (diagEmpresa2.length > 0) {
    porcentajeTotal = Math.round((porcentajeEtapa1 + porcentajeEtapa4) / 2);
  }

  /************** DATOS PARA LAS GRÁFICAS AREAS VITALES & POR DIMENSIONES & PERCEPCIÓN ESTADÍSTICA ****************/
  /**
   * PC => Percepción Cliente
   * PE => Percepción Estadística
   */
  let jsonIndicadores = {},
    nuevosProyectos = 0,
    rendimiento = {};
  let areasVitales_ = await consultarDatos("indicadores_areasvitales");
  areasVitales_ = areasVitales_.filter((x) => x.id_empresa == id_empresa);
  // Ordenando el Array para asegurar usar el 1ero y último
  areasVitales_.sort((a, b) => {
    return a.id_ - b.id_;
  });
  if (areasVitales_.length > 0) {
    const areasVitales = areasVitales_[0];
    rendimiento.ok = true;
    jsonIndicadores.areasVitales1 = areasVitales;
    if (areasVitales.rendimiento_op >= 1) {
      rendimiento.op = areasVitales.rendimiento_op;
    } else {
      rendimiento.op = false;
    }
    // ÚLTIMA FILA DE LA TABLA
    if (areasVitales_.length > 1) {
      const lastElement = areasVitales_[areasVitales_.length - 1];
      rendimiento.op2 = false;
      if (lastElement.rendimiento_op >= 1)
        rendimiento.op2 = lastElement.rendimiento_op;
      jsonIndicadores.areasVitales2 = lastElement;
    }
  }

  // Empresas Nuevas
  let resulCateg = await consultarDatos("resultado_categorias");
  resulCateg = resulCateg.filter((x) => x.id_empresa == id_empresa);
  if (resulCateg.length > 0) {
    rendimiento.ok = true;
    jsonIndicadores.dimensiones1 = resulCateg[0];
    nuevosProyectos = 1;
    // Rendimiento del Proyecto
    rendimiento.num = resulCateg[0].rendimiento;
    if (rendimiento.num < 50) {
      rendimiento.txt = "Mejorable";
      rendimiento.color = "badge-danger";
    } else if (rendimiento.num > 51 && rendimiento.num < 74) {
      rendimiento.txt = "Satisfactorio";
      rendimiento.color = "badge-warning";
    } else {
      rendimiento.txt = "Óptimo";
      rendimiento.color = "badge-success";
    }

    if (resulCateg.length > 1) {
      const lastElement = resulCateg[resulCateg.length - 1];
      jsonIndicadores.dimensiones2 = lastElement;
      // Rendimiento del Proyecto
      rendimiento.num2 = lastElement.rendimiento;
      if (rendimiento.num2 < 50) {
        rendimiento.txt2 = "Mejorable";
        rendimiento.color2 = "badge-danger";
      } else if (rendimiento.num2 > 51 && rendimiento.num2 < 74) {
        rendimiento.txt2 = "Satisfactorio";
        rendimiento.color2 = "badge-warning";
      } else {
        rendimiento.txt2 = "Óptimo";
        rendimiento.color2 = "badge-success";
      }
    }
  }

  /*************************************************************************************** */
  // Empresas Establecidas
  let xDimensiones_ = await consultarDatos("indicadores_dimensiones");
  xDimensiones_ = xDimensiones_.filter((x) => x.id_empresa == id_empresa);
  // Ordenando el Array para asegurar usar el 1ero y último
  xDimensiones_.sort((a, b) => {
    return a.id_ - b.id_;
  });
  if (xDimensiones_.length > 0) {
    const xDimensiones = xDimensiones_[0];
    jsonIndicadores.ok = true;
    jsonIndicadores.dimensiones1 = xDimensiones;
    nuevosProyectos = 0;

    if (xDimensiones_.length > 1) {
      const lastElement = xDimensiones_[xDimensiones_.length - 1];
      jsonIndicadores.dimensiones2 = lastElement;
    }
  }

  // Percepción Estadística
  let pe_areasVitales_ = await consultarDatos("percepcion_estadistica_areas");
  pe_areasVitales_ = pe_areasVitales_.filter((x) => x.empresa == id_empresa);
  // Ordenando el Array para asegurar usar el 1ero y último
  pe_areasVitales_.sort((a, b) => {
    return a.id_ - b.id_;
  });
  if (pe_areasVitales_.length > 0) {
    rendimiento.pe1 = true;
    jsonIndicadores.pe_Areas1 = pe_areasVitales_[0];
    nuevosProyectos = 0;
    // ÚLTIMA FILA DE LA TABLA
    if (pe_areasVitales_.length > 1) {
      const lastElement = pe_areasVitales_[pe_areasVitales_.length - 1];
      jsonIndicadores.pe_Areas2 = lastElement;
    }
  }

  let pe_dimensiones_ = await consultarDatos(
    "percepcion_estadistica_dimensiones"
  );
  pe_dimensiones_ = pe_dimensiones_.filter((x) => x.empresa == id_empresa);
  // Ordenando el Array para asegurar usar el 1ero y último
  pe_dimensiones_.sort((a, b) => {
    return a.id_ - b.id_;
  });
  if (pe_dimensiones_.length > 0) {
    jsonIndicadores.pe_Dimensiones1 = pe_dimensiones_[0];
    nuevosProyectos = 0;
    // ÚLTIMA FILA DE LA TABLA
    if (pe_dimensiones_.length > 1) {
      const lastElement = pe_dimensiones_[pe_dimensiones_.length - 1];
      jsonIndicadores.pe_Dimensiones2 = lastElement;
    }
  }

  /************************************************************************************* */
  /** TAREAS ASIGNADAS ETAPA 3 - PLAN ESTRATÉGICO DE NEGOCIO */
  let tareas = await consultarDatos(
    "tareas_plan_estrategico",
    "ORDER BY id DESC LIMIT 2"
  );
  tareas = tareas.filter((x) => x.empresa == id_empresa);
  tareas.forEach((x) => {
    x.fecha_entrega = new Date(x.fecha_entrega).toLocaleDateString("en-US");
    if (x.prioridad == 0) x.prioridad = "Sin especificar";
    else if (x.prioridad == 1) x.prioridad = "Baja";
    else if (x.prioridad == 2) x.prioridad = "Media";
    else if (x.prioridad == 3) x.prioridad = "Alta";
    else if (x.prioridad == 4) x.prioridad = "Crítica";
  });

  /************************************************************************************* */
  const fechaActual = new Date().toLocaleDateString("fr-CA");
  const dimObj = await tareasGenerales(id_empresa, fechaActual);
  let jsonDim_empresa = false;
  if (dimObj.tareas.todas.length > 0) {
    const listo = dimObj.listo;
    jsonDim_empresa = JSON.stringify([
      { ok: listo[0], pendiente: 100 - listo[0] },
      { ok: listo[1], pendiente: 100 - listo[1] },
      { ok: listo[2], pendiente: 100 - listo[2] },
      { ok: listo[3], pendiente: 100 - listo[3] },
    ]);
  }

  if (req.user.programa == 1) {
    etapaCompleta.gratis = true;
    porcentajeTotal = porcentajeEtapa1;
    etapaCompleta.verAnalisis = etapaCompleta.verEstrategico = false;
  }

  req.session.etapaCompleta = etapaCompleta;
  req.session.consulAsignado = consulAsignado;

  /**
   * VIDEOS TURIALES ACTIVAR o DESACTIVAR
   */
  const tutoriales = {};
  let registros = await consultarDatos("registro_tutoriales");
  registros = registros.find((x) => x.empresa == id_empresa);
  if (registros) {
    if (registros.etapa0 == 1) tutoriales.etapa = true;
  } else {
    const data = { empresa: id_empresa };
    await insertarDatos("registro_tutoriales", data);
  }

  // RENDIMIENTO DE LA EMRPESA
  let datosTabla = await consultarDatos("rendimiento_empresa");
  datosTabla = datosTabla.filter((x) => x.empresa == id_empresa);
  if (datosTabla.length == 3) {
    rendimiento.btnDisabled = true;
  }
  let jsonRendimiento = false;
  if (datosTabla.length > 0) jsonRendimiento = JSON.stringify(datosTabla);

  res.render("empresa/dashboard", {
    user_dash: true,
    pagoPendiente,
    itemDashboard: true,
    consulAsignado,
    etapa1,
    porcentajeEtapa1,
    porcentajeEtapa2,
    porcentajeEtapa4,
    porcentajeTotal,
    tareas,
    verGraficasCircular,
    nuevosProyectos,
    rendimiento,
    jsonDim_empresa,
    etapaCompleta,
    modalAcuerdo,
    tutoriales,
    jsonRendimiento,
    jsonIndicadores: JSON.stringify(jsonIndicadores),
  });
};

// Mostrar perfil de Usuarios
empresaController.perfilUsuarios = async (req, res) => {
  const { rol, codigo } = req.user;

  let empresa = await pool.query("SELECT e.*, u.foto, u.rol, u.programa FROM empresas e JOIN users u ON e.codigo = u.codigo WHERE e.codigo = ?",[codigo] );
  empresa = empresa[0];
  let consultor = await pool.query("SELECT c.*, u.foto, u.rol FROM consultores c JOIN users u ON c.codigo = u.codigo WHERE c.codigo = ?", [codigo]);
  consultor = consultor[0];

  if (consultor) {
    if (consultor.nivel == 1) {
      consultor.nivel = "Business Representative";
    } else if (consultor.nivel == 2) {
      consultor.nivel = "Business Leader";
    } else if (consultor.nivel == 3) {
      consultor.nivel = "Business Director";
    } else if (consultor.nivel == 4) {
      consultor.nivel = "Executive Director";
    }
  }

  let user_dash = false,
    adminDash = false,
    consultorDash = false;
  if (rol == "Empresa") {
    user_dash = true;
    empresa.foto ? (empresa.foto = empresa.foto) : (empresa.foto = "../img/profile_default/user.jpg");
    if (empresa) {
      if (empresa.programa == 1) {
        empresa.programa = "Free trial";
      } else if (empresa.programa == 2) {
        empresa.programa = "Entrepreneur";
      } else if (empresa.programa == 3) {
        empresa.programa = "Business";
      } else if (empresa.programa == 4) {
        empresa.programa = "Enterprise";
      }
    }
  } else {
    consultor.foto
      ? (consultor.foto = consultor.foto)
      : (consultor.foto = "../img/profile_default/user.jpg");
    if (rol == "Consultor") {
      consultorDash = true;
      consultor.nivel;
    } else {
      adminDash = true;
      consultor.nivel;
    }
  }

  let acuerdo = await consultarDatos("acuerdo_confidencial");
  acuerdo = acuerdo.find((x) => x.id_empresa == empresa);

  res.render("pages/profile", {
    rol,
    adminDash,
    user_dash,
    consultorDash,
    consultor,
    empresa,
    pagoPendiente,
    etapa1,
    modalAcuerdo,
    consulAsignado: req.session.consulAsignado,
    etapaCompleta: req.session.etapaCompleta,
  });
};

empresaController.acuerdoCheck = async (req, res) => {
  /**
   * Estados (Acuerdo de Confidencialidad):
   * No firmado: 0, Firmado: 2
   */
  const { estado } = req.body;
  let datosEmpresa = await consultarDatos("empresas");
  datosEmpresa = datosEmpresa.find((x) => x.email == req.user.email);
  let acuerdo = await consultarDatos("acuerdo_confidencial");
  acuerdo = acuerdo.find((x) => x.id_empresa == datosEmpresa.id_empresas);
  let objRes = {};
  console.log("\nNo existen datos en la tabla de acuerdo para esta empresa\n");
  // Efectuando firma del acuerdo
  console.log("\nEfectuando firma del acuerdo.....");
  const insertarAcuerdo = {
    id_empresa: datosEmpresa.id_empresas,
    estadoAcuerdo: estado,
  };
  await insertarDatos("acuerdo_confidencial", insertarAcuerdo);
  objRes.ok = true;
  objRes.txt = "/diagnostico-de-negocio";
  res.send(objRes);
};

/** Mostrar vista del Panel Diagnóstico de Negocio */
empresaController.diagnostico = async (req, res) => {
  // ID Empresa Global => id_empresa
  // Consultor Asignado => consulAsignado

  /** Consultando si el usuario ya firmó el acuerdo de confidencialidad */
  let acuerdo = await consultarDatos("acuerdo_confidencial");
  acuerdo = acuerdo.find((x) => x.id_empresa == id_empresa);
  if (acuerdo) {
    if (acuerdo.estadoAcuerdo == 2) {
      modalAcuerdo = false;
    }
  }

  const cuestionario = {
    fichaCliente: {},
    diagnostico: { respuestas: {} },
    diagnostico2: { respuestas: {} },
  };
  cuestionario.fichaCliente.id = id_empresa;
  cuestionario.fichaCliente.usuario = encriptarTxt("" + id_empresa);
  cuestionario.fichaCliente.estado = false;
  // const fichaCliente = await consultarDatos('ficha_cliente', `WHERE id_empresa = ${id_empresa}`)
  const dataEmpresa_ = await pool.query(
    `SELECT e.diagnostico_fecha2, f.redes_sociales, f.tipo_empresa, f.fecha_modificacion FROM empresas e JOIN ficha_cliente f ON e.id_empresas = ${id_empresa}`
  );

  if (dataEmpresa_.length == 0) {
    cuestionario.fichaCliente.color = "badge-danger";
    cuestionario.fichaCliente.texto = "Pendiente";
    cuestionario.fichaCliente.fechaLocal = true;
    cuestionario.diagnostico = false;
    cuestionario.diagnostico2 = false;
  } else {
    const ficha = dataEmpresa_[0];
    const redes_sociales = JSON.parse(ficha.redes_sociales);
    cuestionario.fichaCliente.fecha = ficha.fecha_modificacion;
    cuestionario.diagnostico.ver = true;

    if (
      ficha.page_web == "" ||
      redes_sociales.twitter == "" ||
      redes_sociales.facebook == "" ||
      redes_sociales.instagram == ""
    ) {
      cuestionario.fichaCliente.color = "badge-warning";
      cuestionario.fichaCliente.texto = "Incompleto";
      cuestionario.fichaCliente.estado = true;
    } else {
      cuestionario.fichaCliente.color = "badge-success";
      cuestionario.fichaCliente.estilo =
        "linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%); color: #FFFF";
      cuestionario.fichaCliente.texto = "Completado";
      cuestionario.fichaCliente.estado = true;
    }

    if (!checkGPT3Connectivity()) {
      cuestionario.diagnostico.btnDisabled = true;
    }

    if (ficha.diagnostico_fecha2 > 0) {
      cuestionario.diagnostico2.ver = true;
    }

    if (ficha.tipo_empresa == 1) {
      cuestionario.diagnostico.color = "badge-danger";
      cuestionario.diagnostico.texto = "Pendiente";
      cuestionario.diagnostico.btnEdit = true;
      cuestionario.diagnostico.link =
        "/diagnostico-proyecto/" + req.user.codigo;

      if (cuestionario.diagnostico2.ver) {
        cuestionario.diagnostico2.color = "badge-danger";
        cuestionario.diagnostico2.texto = "Pendiente";
        cuestionario.diagnostico2.btnEdit = true;
      }

      let data = await consultarDatos("dg_empresa_nueva");
      data = data.filter((x) => x.id_empresa == id_empresa);
      // Ordenando el Array para asegurar usar el 1ero y último
      data.sort((a, b) => {
        return a.id_ - b.id_;
      });
      if (data.length > 0) {
        const datos = data[0];
        cuestionario.diagnostico.fecha = datos.fecha;
        cuestionario.diagnostico.btnEdit = false;
        cuestionario.diagnostico.color = "badge-success";
        cuestionario.diagnostico.texto = "Completado";
        cuestionario.diagnostico.modal = "#modalNuevosProyectos";
        cuestionario.nuevo = true;

        if (req.user.programa == 1) {
          req.session.etapaCompleta.gratis = true;
          req.session.etapaCompleta.verAnalisis =
            req.session.etapaCompleta.verEstrategico = false;
          req.session.etapaCompleta.upgrade1 = true;
        }

        // Respuestas del Cuestionario Diagnóstico Empresa Nueva
        cuestionario.diagnostico.respuestas.rubro = datos.rubro;
        const obj = JSON.parse(datos.empresa_ofrece);
        let ofrece_ = "";
        for (let x in obj) {
          ofrece_ += obj[x] + ". ";
        }
        cuestionario.diagnostico.respuestas.ofrece = ofrece_;
        cuestionario.diagnostico.respuestas.exp_rubro = JSON.parse(
          datos.exp_rubro
        );
        cuestionario.diagnostico.respuestas.mentalidad = JSON.parse(
          datos.mentalidad_empresarial
        );
        cuestionario.diagnostico.respuestas.viabilidad = JSON.parse(
          datos.viabilidad
        );
        cuestionario.diagnostico.respuestas.producto = JSON.parse(
          datos.productos_servicios
        );
        cuestionario.diagnostico.respuestas.administracion = JSON.parse(
          datos.administracion
        );
        cuestionario.diagnostico.respuestas.talento = JSON.parse(
          datos.talento_humano
        );
        cuestionario.diagnostico.respuestas.finanzas = JSON.parse(
          datos.finanzas
        );
        cuestionario.diagnostico.respuestas.servicio = JSON.parse(
          datos.servicio_cliente
        );
        cuestionario.diagnostico.respuestas.operaciones = JSON.parse(
          datos.operaciones
        );
        cuestionario.diagnostico.respuestas.ambiente = JSON.parse(
          datos.ambiente_laboral
        );
        cuestionario.diagnostico.respuestas.innovacion = JSON.parse(
          datos.innovacion
        );
        cuestionario.diagnostico.respuestas.marketing = JSON.parse(
          datos.marketing
        );
        cuestionario.diagnostico.respuestas.ventas = JSON.parse(datos.ventas);
        cuestionario.diagnostico.respuestas.metas = JSON.parse(datos.metas);

        // ÚLTIMA FILA DE LA TABLA
        if (data.length > 1) {
          const dato = data[data.length - 1];
          cuestionario.diagnostico2.fecha = dato.fecha;
          cuestionario.diagnostico2.btnEdit = false;
          cuestionario.diagnostico2.color = "badge-success";
          cuestionario.diagnostico2.texto = "Completado";
          cuestionario.diagnostico2.modal = "#modalNuevosProyectos2";
          cuestionario.nuevo2 = true;

          // Respuestas del 2do Cuestionario Diagnóstico Empresa Nueva
          cuestionario.diagnostico2.respuestas.rubro = dato.rubro;
          const obj = JSON.parse(dato.empresa_ofrece);
          let ofrece_ = "";
          for (let x in obj) {
            ofrece_ += obj[x] + ". ";
          }
          cuestionario.diagnostico2.respuestas.ofrece = ofrece_;
          cuestionario.diagnostico2.respuestas.exp_rubro = JSON.parse(
            dato.exp_rubro
          );
          cuestionario.diagnostico2.respuestas.mentalidad = JSON.parse(
            dato.mentalidad_empresarial
          );
          cuestionario.diagnostico2.respuestas.viabilidad = JSON.parse(
            dato.viabilidad
          );
          cuestionario.diagnostico2.respuestas.producto = JSON.parse(
            dato.productos_servicios
          );
          cuestionario.diagnostico2.respuestas.administracion = JSON.parse(
            dato.administracion
          );
          cuestionario.diagnostico2.respuestas.talento = JSON.parse(
            dato.talento_humano
          );
          cuestionario.diagnostico2.respuestas.finanzas = JSON.parse(
            dato.finanzas
          );
          cuestionario.diagnostico2.respuestas.servicio = JSON.parse(
            dato.servicio_cliente
          );
          cuestionario.diagnostico2.respuestas.operaciones = JSON.parse(
            dato.operaciones
          );
          cuestionario.diagnostico2.respuestas.ambiente = JSON.parse(
            dato.ambiente_laboral
          );
          cuestionario.diagnostico2.respuestas.innovacion = JSON.parse(
            dato.innovacion
          );
          cuestionario.diagnostico2.respuestas.marketing = JSON.parse(
            dato.marketing
          );
          cuestionario.diagnostico2.respuestas.ventas = JSON.parse(dato.ventas);
          cuestionario.diagnostico2.respuestas.metas = JSON.parse(dato.metas);
        }
      }
    } else {
      cuestionario.diagnostico.color = "badge-danger";
      cuestionario.diagnostico.texto = "Pendiente";
      cuestionario.diagnostico.btnEdit = true;
      cuestionario.diagnostico.link =
        "/cuestionario-diagnostico/" + req.user.codigo;

      if (cuestionario.diagnostico2.ver) {
        cuestionario.diagnostico2.dos = true;
        cuestionario.diagnostico2.color = "badge-danger";
        cuestionario.diagnostico2.texto = "Pendiente";
        cuestionario.diagnostico2.btnEdit = true;
      }
      let data = await consultarDatos("dg_empresa_establecida");
      data = data.filter((x) => x.id_empresa == id_empresa);
      if (data.length > 0) {
        const datos = data[0];
        cuestionario.diagnostico.fecha = datos.fecha;
        cuestionario.diagnostico.btnEdit = false;
        cuestionario.diagnostico.color = "badge-success";
        cuestionario.diagnostico.texto = "Completado";
        cuestionario.diagnostico.modal = "#modalEmpresasEstablecidas";
        cuestionario.establecido = true;
        req.session.etapaCompleta.verAnalisis = true;

        if (req.user.programa == 1) {
          req.session.etapaCompleta.gratis = true;
          req.session.etapaCompleta.verAnalisis =
            req.session.etapaCompleta.verEstrategico = false;
          req.session.etapaCompleta.upgrade2 = true;
        }

        // Respuestas del Cuestionario Diagnóstico Empresa Establecida
        cuestionario.diagnostico.respuestas.rubro = datos.rubro;
        const obj = JSON.parse(datos.empresa_ofrece);
        let ofrece_ = "";
        for (let x in obj) {
          ofrece_ += obj[x] + ". ";
        }
        cuestionario.diagnostico.respuestas.ofrece = ofrece_;
        cuestionario.diagnostico.respuestas.producto = JSON.parse(
          datos.productos_servicios
        );
        cuestionario.diagnostico.respuestas.administracion = JSON.parse(
          datos.administracion
        );
        cuestionario.diagnostico.respuestas.talento = JSON.parse(
          datos.talento_humano
        );
        cuestionario.diagnostico.respuestas.finanzas = JSON.parse(
          datos.finanzas
        );
        cuestionario.diagnostico.respuestas.servicio = JSON.parse(
          datos.servicio_alcliente
        );
        cuestionario.diagnostico.respuestas.operaciones = JSON.parse(
          datos.operaciones
        );
        cuestionario.diagnostico.respuestas.ambiente = JSON.parse(
          datos.ambiente_laboral
        );
        cuestionario.diagnostico.respuestas.innovacion = JSON.parse(
          datos.innovacion
        );
        cuestionario.diagnostico.respuestas.marketing = JSON.parse(
          datos.marketing
        );
        cuestionario.diagnostico.respuestas.ventas = JSON.parse(datos.ventas);
        cuestionario.diagnostico.respuestas.fortalezas = JSON.parse(
          datos.fortalezas
        );
        cuestionario.diagnostico.respuestas.oportunidades = JSON.parse(
          datos.oportunidades_mejoras
        );
        cuestionario.diagnostico.respuestas.metas = JSON.parse(
          datos.metas_corto_plazo
        );

        // ÚLTIMA FILA DE LA TABLA
        if (data.length > 1) {
          const dato = data[data.length - 1];
          cuestionario.diagnostico2.fecha = dato.fecha;
          cuestionario.diagnostico2.btnEdit = false;
          cuestionario.diagnostico2.color = "badge-success";
          cuestionario.diagnostico2.texto = "Completado";
          cuestionario.diagnostico2.modal = "#modalEmpresasEstablecidas2";
          cuestionario.establecido2 = true;

          // Respuestas del 2do Cuestionario Diagnóstico Empresa Establecida
          cuestionario.diagnostico2.respuestas.rubro = dato.rubro;
          const obj = JSON.parse(dato.empresa_ofrece);
          let ofrece_ = "";
          for (let x in obj) {
            ofrece_ += obj[x] + ". ";
          }
          cuestionario.diagnostico2.respuestas.ofrece = ofrece_;
          cuestionario.diagnostico2.respuestas.producto = JSON.parse(
            dato.productos_servicios
          );
          cuestionario.diagnostico2.respuestas.administracion = JSON.parse(
            dato.administracion
          );
          cuestionario.diagnostico2.respuestas.talento = JSON.parse(
            dato.talento_humano
          );
          cuestionario.diagnostico2.respuestas.finanzas = JSON.parse(
            dato.finanzas
          );
          cuestionario.diagnostico2.respuestas.servicio = JSON.parse(
            dato.servicio_alcliente
          );
          cuestionario.diagnostico2.respuestas.operaciones = JSON.parse(
            dato.operaciones
          );
          cuestionario.diagnostico2.respuestas.ambiente = JSON.parse(
            dato.ambiente_laboral
          );
          cuestionario.diagnostico2.respuestas.innovacion = JSON.parse(
            dato.innovacion
          );
          cuestionario.diagnostico2.respuestas.marketing = JSON.parse(
            dato.marketing
          );
          cuestionario.diagnostico2.respuestas.ventas = JSON.parse(dato.ventas);
          cuestionario.diagnostico2.respuestas.fortalezas = JSON.parse(
            dato.fortalezas
          );
          cuestionario.diagnostico2.respuestas.oportunidades = JSON.parse(
            dato.oportunidades_mejoras
          );
          cuestionario.diagnostico2.respuestas.metas = JSON.parse(
            dato.metas_corto_plazo
          );
        }
      }
    }
  }

  /**
   * VIDEOS TURIALES ACTIVAR o DESACTIVAR
   */
  const tutoriales = {};
  let registros = await consultarDatos("registro_tutoriales");
  registros = registros.find((x) => x.empresa == id_empresa);
  if (registros) {
    if (registros.etapa1 == 1) {
      tutoriales.etapa = true;
    } else {
      const data = { etapa1: 1 };
      await actualizarDatos(
        "registro_tutoriales",
        data,
        `WHERE empresa = ${id_empresa}`
      );
    }
  }

  res.render("empresa/diagnostico", {
    user_dash: true,
    cuestionario,
    actualYear: req.actualYear,
    etapa1,
    itemDiagnostico: true,
    consulAsignado: req.session.consulAsignado,
    etapaCompleta: req.session.etapaCompleta,
    modalAcuerdo,
    tutoriales,
    id_empresa,
  });
};

// GUARDAR RECURSOS SUELTOS ::
empresaController.cargar_recurso = async (req, res) => {
  const { nombre_recurso, categoria, idEmpresa } = req.body;

  // Obtener la fecha actual
  let fechaActual = new Date();
  // Obtener el día, el mes y el año
  let dia = fechaActual.getDate();
  let mes = fechaActual.toLocaleString("default", { month: "short" });
  let año = fechaActual.getFullYear();
  // Eliminar el punto después del mes
  mes = mes.replace(".", "");
  // Formatear la fecha en el formato deseado
  let fecha = dia + "/" + mes + "/" + año;
  let tipo_archivo = "Otro", recurso = ""
  if (req.file) {
    const archivo = req.file;
    recurso = "../recurso_empresa/" + archivo.filename;
    const ext = archivo.filename.split(".").pop().toLowerCase();

    const extensionesMap = {
      doc: "word",
      docx: "word",
      docm: "word",
      xls: "excel",
      xlsx: "excel",
      xlsm: "excel",
      xltx: "excel",
      jpg: "imagen",
      jpeg: "imagen",
      png: "imagen",
      gif: "imagen",
      svg: "imagen",
      psd: "imagen",
      ai: "imagen",
      tiff: "imagen",
      pdf: "pdf",
      mov: "video",
      mp4: "video",
      avi: "video",
    };

    if (extensionesMap.hasOwnProperty(ext)) {
      tipo_archivo = extensionesMap[ext];
    }

    console.log("TIPO DE ARCHIVO ---- => ");
    console.log(tipo_archivo);
  }

  const dataRecurso = {
    idEmpresa,
    nombre_recurso,
    categoria,
    fecha,
    tipo_archivo,
    recurso,
  };
  
  await insertarDatos("recursos", dataRecurso);

  res.redirect("/recursos/");
};
// GUARDAR LINK DE RECURSOS::
empresaController.cargar_link = async (req, res) => {
  const { nombre_recurso, categoria, recurso, idEmpresa } = req.body;

  const fechaActual = new Date();
  let mes = fechaActual.toLocaleString("default", { month: "short" });
  // Eliminar el punto después del mes
  mes = mes.replace(".", "");
  // Formatear la fecha en el formato deseado
  let fecha = fechaActual.getDate() + "/" + mes + "/" + fechaActual.getFullYear();
  let tipo_archivo = "Pagina web";
  const tipos = {
    "drive.google": "Google Drive",
    youtube: "Youtube",
    vimeo: "Vimeo",
    notion: "Notion",
  };

  for (const x in tipos) {
    if (recurso.includes(x)) {
      tipo_archivo = tipos[x];
      break;
    }
  }

  const dataRecurso = {
    idEmpresa,
    nombre_recurso,
    categoria,
    fecha,
    tipo_archivo,
    recurso,
  };
  await insertarDatos("recursos", dataRecurso);
  res.redirect("/recursos/");
};

// ELIMINAR LINK DE RECURSOS
empresaController.eliminarRecurso = async (req, res) => {
  const { id } = req.body;
  const recurso = await eliminarDatos("recursos", `WHERE id = ${id}`);
  let respu = undefined;
  if (recurso.affectedRows > 0) {
    console.log("Eliminando recurso...");
    respu = true;
  } else {
    respu = false;
  }
  res.send(respu);
};

// EDITAR CATEGORIA
empresaController.editarCategoria = async (req, res) => {
  let { categoria, categoriaTemporal} = req.body;
  categoria = categoria || 'Sin categoría';
  const data = { categoria }
  await actualizarDatos("recursos", data, `WHERE categoria = "${categoriaTemporal}"`)
  res.send(true);
};


// GUARDAR GRUPO DE RECURSOS ::
empresaController.guardar_grupo = async (req, res) => {
  const { idEmpresa, nombre_grupo, descrip_grupo, esFormulario } = req.body;
  let { color_grupo } = req.body;
  if (!color_grupo) {
    // color_grupo = obtenerColorAlAzar();
    color_grupo =
      "linear-gradient(180deg, #FED061 -149.33%, #812082 -19.27%, #50368C 158.67%) !important";
  }

  // Obtener los datos acumulados de la variable de sesión
  const datosAcumulados = req.session.datosAcumulados || [];

  // Acceder a los archivos subidos en req.files
  const archivos = req.files,
    tipoCampo = req.body.tipo,
    numeroIcono = req.body.numeroIcono,
    campoId = req.body.id;
  let valor,
    valorCampo = req.body.valor;

  // Recorrer los archivos y obtener sus nombres
  if (archivos && archivos.length > 0) {
    archivos.forEach((archivo) => {
      valor = "../grupo_recursos/" + archivo.filename;
      valorCampo = valor;
    });
  }

  // Verificar si el campo ya existe en los datos acumulados
  const campoExistente = datosAcumulados.find((dato) => dato.id === campoId);
  console.log("CAMPO EXISTENTE ===> ", campoExistente);
  if (campoExistente) {
    // Si el campo existe, actualizar su valor y tipo
    campoExistente.valor = valorCampo;
    campoExistente.tipo = tipoCampo;
    campoExistente.numeroIcono = numeroIcono;
  } else if(valorCampo) {
    // Si el campo no existe y tiene un valor, agregarlo a los datos acumulados con su valor y tipo
    const nuevoCampo = {
      id: campoId,
      valor: valorCampo,
      tipo: tipoCampo,
      numeroIcono,
    };
    datosAcumulados.push(nuevoCampo);
  }

  // Guardar los datos acumulados en la variable de sesión
  req.session.datosAcumulados = datosAcumulados;
  console.log("--------");
  console.log("DATOS ACUMULADOS");
  console.log(datosAcumulados);
  console.log("--------");
  const recurso_armado = JSON.stringify(datosAcumulados);

  if (esFormulario === "true") {
    // Ejecuta la sentencia SQL solo si la solicitud proviene del formulario
    await pool.query(
      "INSERT INTO grupo_recursos (idEmpresa, nombre_grupo, descrip_grupo, color_grupo, recurso_armado) VALUES (?, ?, ?, ?, ?)",
      [idEmpresa, nombre_grupo, descrip_grupo, color_grupo, recurso_armado]
    );
    req.session.datosAcumulados = null;
  }

  res.redirect("/recursos/");
};

// ELIMINAR CAMPOS EN EL MOMENTO DE CREAR GRUPO
empresaController.eliminarCampo = async (req, res) => {
  const { idCampo, idGrupo } = req.body;
  if (!idGrupo) {
    // Obtener los datos acumulados de la variable de sesión
    let datosAcumulados = req.session.datosAcumulados || [];

    // Filtrar los datos acumulados para eliminar el campo con el ID especificado
    datosAcumulados = datosAcumulados.filter((dato) => dato.id !== idCampo);

    // Actualizar los datos acumulados en la variable de sesión
    req.session.datosAcumulados = datosAcumulados;
    console.log(
      "--- Array para ELIMINAR CAMPOS EN EL MOMENTO DE CREAR GRUPO ---"
    );
    console.log(datosAcumulados);

    // Realizar otras operaciones necesarias, como eliminar el campo de título de la base de datos si es necesario
    // res.json({ success: true });
    res.send({ success: true });
  } else {
    console.log("Entrando en modo Editar >> ");
    console.log(idGrupo);
    console.log(idCampo);
    const grupo =
      req.user.rol == "Admin"
        ? (await consultarDatos("recursos_compartidos")).find(
            (x) => x.id == idGrupo
          )
        : (await consultarDatos("grupo_recursos")).find((x) => x.id == idGrupo);
    if (grupo) {
      console.log("Grupo DB =>>");
      console.log(grupo);
      let objRecurso = JSON.parse(grupo.recurso_armado);
      console.log("Recurso DB =>>");
      console.log(objRecurso);
      objRecurso = objRecurso.filter((obj) => obj.id !== idCampo);
      console.log("Recurso DB ACTUALIZADO =>>");
      console.log(objRecurso);

      const data = { recurso_armado: JSON.stringify(objRecurso) };
      req.user.rol == "Admin"
        ? await actualizarDatos(
            "recursos_compartidos",
            data,
            `WHERE id = ${idGrupo}`
          )
        : await actualizarDatos(
            "grupo_recursos",
            data,
            `WHERE id = ${idGrupo}`
          );

      res.send(true);
    } else {
      res.send(false);
    }
  }
};

// ELIMINAR EL GRUPO COMO TAL UNA VEZ CREADO
empresaController.eliminarGrupo = async (req, res) => {
  const { id } = req.body;
  const recurso =
    req.user.rol == "Admin"
      ? await eliminarDatos("recursos_compartidos", `WHERE id = ${id}`)
      : await eliminarDatos("grupo_recursos", `WHERE id = ${id}`);
  let respu = undefined;
  if (recurso.affectedRows > 0) {
    console.log("Eliminando recurso...");
    respu = true;
  } else {
    respu = false;
  }
  res.send(respu);
};

// RENDERIZADO DE RECURSOS ::
empresaController.recursos = async (req, res) => {
  const emailEmpresa = req.user.email;
  let info = (await consultarDatos("empresas")).find( (x) => x.email === emailEmpresa );
  const id_empresa = info.id_empresas;
  let categorias = [], datos = [], grupos = [];
  let recurso = await pool.query("SELECT DISTINCT categoria FROM recursos WHERE idEmpresa = ?", [id_empresa]);
  if (recurso.length > 0) {
    recurso.forEach((r) => {categorias.push(r.categoria)})
  }
  
  let categoriaAnterior = null, iconoSVG;
  // MOSTRAR LOS LINK
  const infoRecursos = await pool.query("SELECT * FROM recursos ORDER BY categoria;");
  if (infoRecursos.length > 0) {
    infoRecursos.forEach((i) => {
      if (i.categoria !== categoriaAnterior) {
        datos.push({ idCategoria: i.id, categoria: i.categoria });
        categoriaAnterior = i.categoria;
      }

      if (i.tipo_archivo == "Google Drive") {
        iconoSVG = "../logos_recursos/Archivo_Google_Drive.svg";
      } else if (i.tipo_archivo == "Pagina web") {
        iconoSVG = "../logos_recursos/Pagina_Web.svg";
      } else if (i.tipo_archivo == "Youtube") {
        iconoSVG = "../logos_recursos/Video_Youtube.svg";
      } else if (i.tipo_archivo == "Vimeo") {
        iconoSVG = "../logos_recursos/Video_Vimeo.svg";
      } else if (i.tipo_archivo == "Notion") {
        iconoSVG = "../logos_recursos/notion.svg";
      } else if (i.tipo_archivo == "word") {
        iconoSVG = "../logos_recursos/Documento_Word.svg";
      } else if (i.tipo_archivo == "excel") {
        iconoSVG = "../logos_recursos/Documento_Excel.svg";
      } else if (i.tipo_archivo == "pdf") {
        iconoSVG = "../logos_recursos/Documento_PDF.svg";
      } else if (i.tipo_archivo == "imagen") {
        iconoSVG = "../logos_recursos/Archivo_imagen.svg";
      } else if (i.tipo_archivo == "video") {
        iconoSVG = "../logos_recursos/icon_Video.svg";
      } else {
        iconoSVG = "../logos_recursos/Otro.svg";
      }

      datos.push({
        iconoSVG,
        idRecurso: i.id,
        fecha: i.fecha,
        nombre_recurso: i.nombre_recurso,
        recurso: i.recurso,
        tipo_archivo: i.tipo_archivo,
      }); 
    });
  }

  // MOSTRAR LOS GRUPOS DE RECURSOS
  const resultado = (await pool.query("SELECT * FROM grupo_recursos ")).filter(
    (x) => x.idEmpresa == id_empresa
  );

  if (resultado.length > 0) {
    resultado.forEach((r) => {
      let iconos = [], cuerpoHTML = "";
      const recursoArmado = JSON.parse(r.recurso_armado);
      const contador = { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 };

      recursoArmado.forEach((recurso) => {
        if (recurso.tipo === "1") {
          contador.t1++;
          cuerpoHTML += `
                    <div id="divElemento_${recurso.id}">
                    <i class="fas fa-trash-alt icono-borrar" style="color: red;" id="iconG${r.id}_${recurso.id}" onclick="eliminarCampo('${r.id}','${recurso.id}')"></i>
                    <input style="width:100% !important;font-size: 1.5em; font-weight: 700; color: black !important; border: 0px solid #000000 !important; text-align: left;" class="form-control input-recursos camposD" id="grupo${r.id}_${recurso.id}" value="${recurso.valor}" placeholder="Ingrese el título aquí">
                    </div>`;
        } else if (recurso.tipo === "2") {
          contador.t2++;
          cuerpoHTML += `
                    <i class="fas fa-trash-alt icono-borrar" style="color: red; padding-top:6px" id="iconG${r.id}_${recurso.id}" onclick="eliminarCampo('${r.id}','${recurso.id}')"></i>
                    <textarea style="color: black !important; border: 0px solid; text-align: left; font-weight: 100;" class="form-control camposD" id="grupo${r.id}_${recurso.id}" placeholder="Agrega algo de texto">${recurso.valor}</textarea>`;
        } else if (recurso.tipo === "3") {
          contador.t3++;
          cuerpoHTML += `
                    <div class="campo-separador" id="campo${r.id}_${recurso.id}" style="border:1px solid white">
                    <i class="fas fa-trash-alt icono-borrar" style="color: red;" id="iconG${r.id}_${recurso.id}" onclick="eliminarCampo('${r.id}','${recurso.id}')"></i>
                    <hr class="separador" id="grupo${r.id}_${recurso.id}" style="border:1px solid #5c5c5c">
                    </div>`;
        } else if (recurso.tipo === "4") {
          contador.t4++;
          let iconoUrl;
          if (recurso.numeroIcono === "1") {
            iconoUrl = "../logos_recursos/Video_Youtube.svg";
          } else if (recurso.numeroIcono === "2") {
            iconoUrl = "../logos_recursos/Video_Vimeo.svg";
          } else if (recurso.numeroIcono === "3") {
            iconoUrl = "../logos_recursos/notion.svg";
          } else if (recurso.numeroIcono === "4") {
            iconoUrl = "../logos_recursos/Archivo_Google_Drive.svg";
          } else if (recurso.numeroIcono === "5") {
            iconoUrl = "../logos_recursos/Pagina_Web.svg";
          }
          if (iconos.length < 7) {
            iconos.push({ ruta: iconoUrl, grupo: r.id });
          }

          cuerpoHTML += `
                    <i class="fas fa-trash-alt icono-borrar" style="color: red; padding-top: 20px;" id="iconG${r.id}_${recurso.id}" onclick="eliminarCampo('${r.id}','${recurso.id}')"></i>
                    <table class="table header-border" id="tablaUrl_g${r.id}_${recurso.id}">
                    <tbody>
                        <tr class="text-black">
                        <td style="width: 0px;padding-right: 0px;"><a href="${recurso.valor}" target="_blank"><img src="${iconoUrl}" class="icono-svg" alt="Icono"></a></td>
                        <td>
                            <input data-numero-icono="${recurso.numeroIcono}" style="color: black !important;border: 0px solid;text-align: left;text-decoration-line: underline;" class="form-control campo_url camposD" id="grupo${r.id}_${recurso.id}" value="${recurso.valor}" placeholder="Ingrese la URL">
                        </td>
                        </tr>
                    </tbody>
                    </table>`;
        } else if (recurso.tipo === "5") {
          contador.t5++;
          let iconoUrl = "../logos_recursos/Otro.svg";
          if (recurso.numeroIcono === "1") {
            iconoUrl = "../logos_recursos/Documento_Word.svg";
          } else if (recurso.numeroIcono === "2") {
            iconoUrl = "../logos_recursos/Documento_PDF.svg";
          } else if (recurso.numeroIcono === "3") {
            iconoUrl = "../logos_recursos/Documento_PowerPoint.svg";
          } else if (recurso.numeroIcono === "4") {
            iconoUrl = "../logos_recursos/Documento_Excel.svg";
          } else if (recurso.numeroIcono === "5") {
            iconoUrl = "../logos_recursos/Archivo_imagen.svg";
          } else if (recurso.numeroIcono === "6") {
            iconoUrl = "../logos_recursos/icon_Video.svg";
          }
          if (iconos.length < 7) {
            iconos.push({ ruta: iconoUrl, grupo: r.id });
          }

          if (recurso.valor.includes("/")) {
            recurso.valor = recurso.valor.split("/").pop();
          }
          cuerpoHTML += `
                    <i class="fas fa-trash-alt icono-borrar" style="color: red; padding-top: 10px;" id="iconG${r.id}_${recurso.id}" onclick="eliminarCampo('${r.id}','${recurso.id}')"></i>
                    <table class="table header-border" id="tablaFile_g${r.id}_${recurso.id}">
                    <tbody>
                        <tr class="text-black">
                        <td style="width: 0px;">
                            <a href="../grupo_recursos/${recurso.valor}" target="_blank">
                            <img data-numerofile-icono="${iconoUrl}" src="${iconoUrl}" class="icono-svg" alt="IconoDocs">
                            </a>
                        </td>
                        <td style="width: 20px">
                            <label for="grupo${r.id}_${recurso.id}">
                            <img src="../logos_recursos/cargar_Archivo.svg" class="icono-cargar-archivo" alt="IconoCargarArchivo">
                            </label>
                            <input type="file" class="campo_archivo" name="${recurso.id}" id="grupo${r.id}_${recurso.id}" accept=".pdf,.docx,.xlsx,.jpg,.png" style="display: none;">
                        </td>
                        <td>
                            <span style="color: black !important; text-decoration: none; border: 0px solid; text-align: left;" id="grupo${r.id}_${recurso.id}" class="nombre-archivo">${recurso.valor}</span>
                        </td>
                        </tr>
                    </tbody>
                    </table>`;
        }
      });

      iconos = iconos.filter((valor, indice, self) => {
        return !self
          .slice(indice + 1)
          .some((objeto) => objeto.ruta === valor.ruta);
      });

      r.contadorElementos = contador;

      grupos.push({
        idGrupo: r.id,
        nombre_grupo: r.nombre_grupo,
        descrip_grupo: r.descrip_grupo,
        color_grupo: r.color_grupo,
        recurso_armado: r.recurso_armado,
        cuerpoHTML: cuerpoHTML,
        iconos: iconos.filter((icono) => icono.grupo === r.id),
        contador: JSON.stringify(r.contadorElementos),
      });
    });
  }

  const recursoCompartido = [];
  const resul = (await pool.query("SELECT * FROM recursos_compartidos")).filter( (x) => (JSON.parse(x.programa)).includes(req.user.programa.toString()));
  if (resul.length > 0) {
    resul.forEach((re) => {
      let iconos = [], cuerpoHTML = "";
      const recursoArmado = JSON.parse(re.recurso_armado);
      recursoArmado.forEach((recurso) => {
        if (recurso.tipo === "1") {
          cuerpoHTML += `
                <input id="${recurso.id}" style="width:100% !important;font-size: 1.5em; font-weight: 700; color: black !important; border: 0px solid #000000 !important; text-align: left;" class="form-control input-recursos camposAdm" readonly value="${recurso.valor}">`;
        } else if (recurso.tipo === "2") {
          cuerpoHTML += `
                <textarea id="${recurso.id}" style="color: black !important; border: 0px solid; text-align: left; font-weight: 100;" class="form-control camposAdm" readonly>${recurso.valor}</textarea>`;
        } else if (recurso.tipo === "3") {
          cuerpoHTML += `
                <${recurso.valor} style="width: 100%;margin-left: 5px;border:1px solid #5c5c5c" value="hr" id="${recurso.id}" class="camposAdm">`;
        } else if (recurso.tipo === "4") {
          let iconoUrl;
          if (recurso.numeroIcono === "1") {
            iconoUrl = "../logos_recursos/Video_Youtube.svg";
          } else if (recurso.numeroIcono === "2") {
            iconoUrl = "../logos_recursos/Video_Vimeo.svg";
          } else if (recurso.numeroIcono === "3") {
            iconoUrl = "../logos_recursos/notion.svg";
          } else if (recurso.numeroIcono === "4") {
            iconoUrl = "../logos_recursos/Archivo_Google_Drive.svg";
          } else if (recurso.numeroIcono === "5") {
            iconoUrl = "../logos_recursos/Pagina_Web.svg";
          }
          if (iconos.length < 7) { 
            iconos.push({ ruta: iconoUrl, grupo: re.id });
          }

          cuerpoHTML += `
                <table class="table header-border">
                <tbody>
                    <tr class="text-black">
                    <td style="width: 0px;padding-right: 0px;"><a href="${recurso.valor}" target="_blank"><img src="${iconoUrl}" class="icono-svg" alt="Icono"></a></td>
                    <td>
                        <input id="${recurso.id}" data-numero-icono="${recurso.numeroIcono}" style="color: black !important;border: 0px solid;text-align: left;text-decoration-line: underline;" class="form-control campo_url camposAdm" readonly  value="${recurso.valor}">
                    </td>
                    </tr>
                </tbody>
                </table>`;
        } else if (recurso.tipo === "5") {
          let iconoUrl = "../logos_recursos/Otro.svg";
          if (recurso.numeroIcono === "1") {
            iconoUrl = "../logos_recursos/Documento_Word.svg";
          } else if (recurso.numeroIcono === "2") {
            iconoUrl = "../logos_recursos/Documento_PDF.svg";
          } else if (recurso.numeroIcono === "3") {
            iconoUrl = "../logos_recursos/Documento_PowerPoint.svg";
          } else if (recurso.numeroIcono === "4") {
            iconoUrl = "../logos_recursos/Documento_Excel.svg";
          } else if (recurso.numeroIcono === "5") {
            iconoUrl = "../logos_recursos/Archivo_imagen.svg";
          } else if (recurso.numeroIcono === "6") {
            iconoUrl = "../logos_recursos/icon_Video.svg";
          }
          if (iconos.length < 7) {
            iconos.push({ ruta: iconoUrl, grupo: re.id });
          }

          if (recurso.valor.includes("/")) {
            recurso.valor = recurso.valor.split("/").pop();
          }
          cuerpoHTML += `
                <table class="table header-border">
                <tbody>
                    <tr class="text-black">
                    <td style="width: 0px;">
                        <a href="../grupo_recursos/${
                          recurso.valor
                        }" target="_blank">
                        <img data-numerofile-icono="${iconoUrl}" src="${iconoUrl}" class="icono-svg" alt="IconoDocs">
                        </a>
                    </td>
                    <td>
                        <span data-valor="${
                          recurso.valor
                        }" data-numero-icono="${
            recurso.numeroIcono
          }" style="color: black !important; text-decoration: none; border: 0px solid; text-align: left;" id="grupo${
            re.id
          }_${recurso.id}" class="nombre-archivo camposAdm">${recurso.valor
            .split("/")
            .pop()}</span>
                    </td>
                    </tr>
                </tbody>
                </table>`;
        }
      });

    //   re.programa = JSON.parse(re.programa);
    //   re.programa.includes('1') ? re.programa[0] = 'Free Trial' : false;
    //   re.programa.includes('2') ? re.programa[1] = 'Entrepreneur' : false;
    //   re.programa.includes('3') ? re.programa[2] = 'Business' : false;
    //   re.programa.includes('4') ? re.programa[3] = 'Enterprise' : false;

      recursoCompartido.push({
        idGrupo: re.id,
        nombre_grupo: re.nombre_grupo,
        descrip_grupo: re.descrip_grupo,
        color_grupo: re.color_grupo,
        recurso_armado: re.recurso_armado,
        cuerpoHTML: cuerpoHTML,
        iconos: iconos.filter((icono) => icono.grupo === re.id),
        contador: JSON.stringify(re.contadorElementos),
      });
    });
  }

  res.render("empresa/recursos", {
    user_dash: true, adminDash: false,
    id_empresa,
    categorias,
    recurso,
    datos,
    grupos,
    recursoCompartido,
  });
};

// ACTUALIZAR CAMPOS EN GRUPOS YA CREADOS
empresaController.actualizarRecurso = async (req, res) => {
  const archivo = req.files;
  let {idCampo,idRecurso,tipo,numeroIcono,valor, nombre_grupo, descrip_grupo, color_grupo } = req.body;

  if (archivo && archivo[0]) {
    valor = "../grupo_recursos/" + archivo[0].filename;
  }

  if (idCampo && idCampo.includes("_")) {
    idCampo = idCampo.split("_")[1];
  }

  const infoRecursos = req.user.rol == "Admin" ? (await consultarDatos("recursos_compartidos")).find((x) => x.id == idRecurso)
      : (await consultarDatos("grupo_recursos")).find((x) => x.id == idRecurso);
        nombre_grupo = nombre_grupo == null || nombre_grupo == "" ? infoRecursos.nombre_grupo: nombre_grupo;
        descrip_grupo = descrip_grupo == null || descrip_grupo == "" ? infoRecursos.descrip_grupo : descrip_grupo;
        color_grupo = color_grupo == null || color_grupo == null ? infoRecursos.color_grupo : color_grupo;

    let recursos = JSON.parse(infoRecursos.recurso_armado);

    let campoEncontrado = false;
    recursos.forEach((recurso) => {
        if (recurso.id == idCampo) {
        recurso.valor = valor;
        recurso.numeroIcono = numeroIcono;
        campoEncontrado = true;
        }
    });

    if (!campoEncontrado && valor) {
        // Agregar validación para evitar valores en blanco
        recursos.push({id: idCampo,valor: valor,tipo: tipo, numeroIcono: numeroIcono });
    }

    const data = {
        nombre_grupo,
        descrip_grupo,
        color_grupo,
        recurso_armado: JSON.stringify(recursos),
    };

        if (req.user.rol == "Admin") {
            const programa = req.body.programa || ["1"];
            data.programa = JSON.stringify(programa);
            await actualizarDatos(
            "recursos_compartidos",
            data,
            `WHERE id = ${idRecurso}`
            );
            res.redirect("/recursos-compartidos/");
        } else {
            await actualizarDatos("grupo_recursos", data, `WHERE id = ${idRecurso}`);
            res.redirect("/recursos/");
        }
};

empresaController.copiarRecurso = async (req, res) => {
    const { id } = req.body;
    const e = (await consultarDatos('empresas')).find(x => x.codigo == req.user.codigo)
    const recursoAdmin = (await consultarDatos('recursos_compartidos')).find(x => x.id == id)
    if (recursoAdmin) {
        const data = { 
            idEmpresa: e.id_empresas,
            nombre_grupo: recursoAdmin.nombre_grupo,
            descrip_grupo: recursoAdmin.descrip_grupo,
            color_grupo: recursoAdmin.color_grupo,
            recurso_armado: recursoAdmin.recurso_armado
        }
        await insertarDatos("grupo_recursos", data);
        res.send(true);
    } else {
        res.send(false);
    }
  
};

/** Mostrar vista del formulario Ficha Cliente */
empresaController.validarFichaCliente = async (req, res) => {
  const { id } = req.params;
  let row = await consultarDatos(
    "empresas",
    `WHERE email = "${req.user.email}" LIMIT 1`
  );
  row = row[0];
  const id_empresa = desencriptarTxt(id);
  if (row.id_empresas == id_empresa) {
    req.session.fichaCliente = true;
  } else {
    req.session.fichaCliente = false;
  }
  res.redirect("/ficha-cliente");
};

empresaController.fichaCliente = async (req, res) => {
  req.session.fichaCliente = false;
  const row = await consultarDatos(
    "empresas",
    `WHERE email = "${req.user.email}" LIMIT 1`
  );
  const empresa = row[0];
  const id_empresa = row[0].id_empresas,
    datos = {};
  const fichaCliente = await consultarDatos(
    "ficha_cliente",
    `WHERE id_empresa = "${id_empresa}"`
  );
  const ficha = fichaCliente[0];
  if (fichaCliente.length > 0) {
    ficha.es_propietario === "Si"
      ? (datos.prop1 = "checked")
      : (datos.prop2 = "checked");
    ficha.socios === "Si"
      ? (datos.socio1 = "checked")
      : (datos.socio2 = "checked");
    ficha.etapa_actual === "En proyecto"
      ? (datos.etapa1 = "checked")
      : (datos.etapa1 = "");
    ficha.etapa_actual === "Operativo"
      ? (datos.etapa2 = "checked")
      : (datos.etapa2 = "");
    ficha.etapa_actual === "En expansión"
      ? (datos.etapa3 = "checked")
      : (datos.etapa3 = "");

    if (etapaCompleta.e1) {
      datos.etapa1 = datos.etapa1 + " disabled";
      datos.etapa2 = datos.etapa2 + " disabled";
      datos.etapa3 = datos.etapa3 + " disabled";
    }

    datos.redes_sociales = JSON.parse(ficha.redes_sociales);
    datos.objetivos = JSON.parse(ficha.objetivos);
    datos.fortalezas = JSON.parse(ficha.fortalezas);
    datos.problemas = JSON.parse(ficha.problemas);

    datos.descripcion = ficha.descripcion;
    datos.motivo = ficha.motivo_consultoria;

    datos.socioMin = 1;

    if (datos.socio2) {
      datos.estiloSocio = "background:#f2f2f2;";
      datos.socioNo = "disabled";
      datos.socioMin = 0;
    }
  }
  // Obteniendo todos los países
  datos.paises = Country.getAllCountries();
  // Capturando Fecha Máxima - 18 años atrás
  let fm = new Date();
  const max = fm.getFullYear() - 18; // Restando los años
  fm.setFullYear(max); // Asignando nuevo año
  const fechaMaxima = fm.toLocaleDateString("fr-CA"); // Colocando el formato yyyy-mm-dd
  console.log(fechaMaxima);

  res.render("empresa/fichaCliente", {
    ficha,
    datos,
    fechaMaxima,
    wizarx: true,
    user_dash: false,
    empresa,
  });
};

empresaController.addFichaCliente = async (req, res) => {
  let {
    nombres,
    apellidos,
    email,
    countryCode,
    telFicha,
    fecha_nacimiento,
    pais,
    twitter,
    facebook,
    instagram,
    otra,
    es_propietario,
    socios,
    nombre_empresa,
    cantidad_socios,
    porcentaje_accionario,
    tiempo_fundacion,
    promedio_ingreso_anual,
    num_empleados,
    page_web,
    descripcion,
    etapa_actual,
    objetivo1,
    objetivo2,
    objetivo3,
    fortaleza1,
    fortaleza2,
    fortaleza3,
    problema1,
    problema2,
    problema3,
    motivo_consultoria,
    fecha_zh,
  } = req.body;
  let redes_sociales = JSON.stringify({ twitter, facebook, instagram, otra });
  let objetivos = JSON.stringify({ objetivo1, objetivo2, objetivo3 });
  let fortalezas = JSON.stringify({ fortaleza1, fortaleza2, fortaleza3 });
  let problemas = JSON.stringify({ problema1, problema2, problema3 });
  const telefono = "+" + countryCode + " " + telFicha;
  let tipo_empresa = 1;

  etapa_actual == "En proyecto"
    ? (tiempo_fundacion = "Proyecto nuevo")
    : (tipo_empresa = 2);

  es_propietario != undefined ? es_propietario : (es_propietario = "No");
  socios != undefined ? socios : (socios = "No");
  const row = await consultarDatos(
    "empresas",
    `WHERE email = "${req.user.email}" LIMIT 1`
  );
  const id_empresa = row[0].id_empresas;
  cantidad_socios == null
    ? (cantidad_socios = 0)
    : (cantidad_socios = cantidad_socios);

  const fecha_modificacion = new Date().toLocaleString("en-US", {
    timeZone: fecha_zh,
  });

  page_web = page_web.replace(/[$ ]/g, "");

  const nuevaFichaCliente = {
    telefono,
    fecha_nacimiento,
    pais,
    redes_sociales,
    es_propietario,
    socios,
    cantidad_socios,
    porcentaje_accionario,
    tiempo_fundacion,
    tipo_empresa,
    promedio_ingreso_anual,
    num_empleados,
    page_web,
    descripcion,
    etapa_actual,
    objetivos,
    fortalezas,
    problemas,
    motivo_consultoria,
    id_empresa,
    fecha_modificacion,
  };

  const userUpdate = { nombres, apellidos, nombre_empresa, email };

  // Actualizando datos bases de la empresa
  await pool.query("UPDATE empresas SET ? WHERE id_empresas = ?", [
    userUpdate,
    id_empresa,
  ]);

  // Consultar si ya existen datos en la Base de datos
  const ficha = await consultarDatos(
    "ficha_cliente",
    `WHERE id_empresa = "${id_empresa}"`
  );
  if (ficha.length > 0) {
    await pool.query("UPDATE ficha_cliente SET ? WHERE id_empresa = ?", [
      nuevaFichaCliente,
      id_empresa,
    ]);
  } else {
    await insertarDatos("ficha_cliente", nuevaFichaCliente);
  }
  // JSON.parse(redes_sociales) // CONVERTIR  JSON A UN OBJETO
  res.redirect("/diagnostico-de-negocio");
};

empresaController.eliminarFicha = async (req, res) => {
  const { id } = req.body;
  // const ficha = await pool.query('DELETE FROM ficha_cliente WHERE id_empresa = ?', [id])
  const ficha = await eliminarDatos("ficha_cliente", `WHERE id = ${id}`);
  let respu = undefined;
  // console.log(ficha.affectedRows)
  if (ficha.affectedRows > 0) {
    console.log("Eliminando ficha cliente");
    respu = true;
  } else {
    respu = false;
  }
  res.send(respu);
};

/** Mostrar vista del Panel Análisis de Negocio */
empresaController.analisis = async (req, res) => {
  let empresa = await consultarDatos("empresas");
  empresa = empresa.find((e) => e.email == req.user.email);
  const id_empresa = empresa.id_empresas;
  const etapa1 = { lista: true };
  const cuestionario = {
    producto: { btnEdit: true, color: "badge-warning", texto: "Pendiente" },
    administracion: {
      btnEdit: true,
      color: "badge-warning",
      texto: "Pendiente",
    },
    operacion: { btnEdit: true, color: "badge-warning", texto: "Pendiente" },
    marketing: { btnEdit: true, color: "badge-warning", texto: "Pendiente" },
  };
  let dimProducto = false,
    dimAdmin = false,
    dimOperacion = false,
    dimMarketing = false;
  /************************************************************************************* */
  // Verificando conexión estable a la API de OPEN AI
  if (!checkGPT3Connectivity()) {
    cuestionario.producto.btnDisabled = true;
    cuestionario.administracion.btnDisabled = true;
    cuestionario.operacion.btnDisabled = true;
    cuestionario.marketing.btnDisabled = true;
  }

  let analisis_empresa = await consultarDatos("analisis_empresa");
  analisis_empresa = analisis_empresa.find((a) => a.id_empresa == id_empresa);
  if (analisis_empresa) {
    // DIMENSIÓN PRODUCTO
    if (analisis_empresa.producto) {
      const a = JSON.parse(analisis_empresa.producto);
      cuestionario.producto.fecha = a.fecha;
      cuestionario.producto.color = "badge-success";
      cuestionario.producto.texto = "Completado";
      cuestionario.producto.btnEdit = false;
      dimProducto = a;
    }
    // DIMENSIÓN ADMINISTRACIÓN
    if (analisis_empresa.administracion) {
      const admin = JSON.parse(analisis_empresa.administracion);
      cuestionario.administracion.fecha = admin.fecha;
      cuestionario.administracion.color = "badge-success";
      cuestionario.administracion.texto = "Completado";
      cuestionario.administracion.btnEdit = false;
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
      };
    }
    // DIMENSIÓN OPERACIÓN
    if (analisis_empresa.operacion) {
      const op = JSON.parse(analisis_empresa.operacion);
      cuestionario.operacion.fecha = op.fecha;
      cuestionario.operacion.color = "badge-success";
      cuestionario.operacion.texto = "Completado";
      cuestionario.operacion.btnEdit = false;
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
      };
    }
    // DIMENSIÓN MARKETING
    if (analisis_empresa.marketing) {
      const a = JSON.parse(analisis_empresa.marketing);
      cuestionario.marketing.fecha = a.fecha;
      cuestionario.marketing.color = "badge-success";
      cuestionario.marketing.texto = "Completado";
      cuestionario.marketing.btnEdit = false;
      dimMarketing = a;
    }
  }

  /************************************************************************************* */
  // ARCHIVOS CARGADOS - ANÁLISIS DE NEGOCIO
  let archivos = await consultarDatos("archivos_analisis");
  archivos = archivos.filter((i) => i.empresa == id_empresa);
  if (archivos.length > 0) {
    archivos.forEach((x) => {
      x.estado = "Pendiente";
      x.color = "warning";
      x.display = "none";
      if (x.link != null) {
        x.estado = "Cargado";
        x.color = "success";
        x.display = "block";
      }
    });
  } else {
    archivos = false;
  }

  /************************************************************************************* */
  /**
   * VIDEOS TURIALES ACTIVAR o DESACTIVAR
   */
  const tutoriales = {};
  let registros = await consultarDatos("registro_tutoriales");
  registros = registros.find((x) => x.empresa == id_empresa);
  if (registros) {
    if (registros.etapa2 == 1) {
      tutoriales.etapa = true;
    } else {
      const data = { etapa2: 1 };
      await actualizarDatos(
        "registro_tutoriales",
        data,
        `WHERE empresa = ${id_empresa}`
      );
    }
  }

  res.render("empresa/analisis", {
    user_dash: true,
    actualYear: req.actualYear,
    id_empresa,
    codigo: empresa.codigo,
    itemAnalisis: true,
    etapa1,
    archivos,
    etapaCompleta: req.session.etapaCompleta,
    tutoriales,
    cuestionario,
    dimProducto,
    dimAdmin,
    dimOperacion,
    dimMarketing,
  });
};

/****************************************************************
 * GUARDAR ARCHIVOS SOLICITADOS POR EL CONSULTOR
 */
empresaController.guardarArchivos = async (req, res) => {
  const { id, empresa, etapa, tabla } = req.body;
  let info = await consultarDatos("consultores_asignados");
  let link = "";
  let linkEmail = "";
  let txtEtapa = "";
  if (etapa == 2) {
    link =
      "../archivos_analisis_empresa/Análisis-de-negocio_" +
      req.file.originalname;
    linkEmail = "analisis-de-negocio";
    txtEtapa = "Análisis de negocio";
    info = info.find((x) => x.empresa == empresa && x.orden == 2);
    const consultores = await consultarDatos("consultores");
    info = consultores.find((x) => x.id_consultores == info.consultor);
  } else if (etapa == 3) {
    link =
      "../archivos_empresarial_empresa/Plan-Empresarial_" +
      req.file.originalname;
    linkEmail = "plan-empresarial";
    txtEtapa = "Plan Empresarial";
    info = info.find((x) => x.empresa == empresa && x.orden == 3);
    const consultores = await consultarDatos("consultores");
    info = consultores.find((x) => x.id_consultores == info.consultor);
  } else {
    link =
      "../archivos_estrategico_empresa/Plan-estratégico_" +
      req.file.originalname;
    linkEmail = "plan-estrategico";
    txtEtapa = "Plan estratégico";
    info = info.find((x) => x.empresa == empresa && x.orden == 4);
    const consultores = await consultarDatos("consultores");
    info = consultores.find((x) => x.id_consultores == info.consultor);
  }
  let result = await cargarArchivo(id, empresa, link, tabla);
  if (result) {
    result = { ok: true, url: link };

    const nombreConsultor = info.nombres + " " + info.apellidos;
    let e = await consultarDatos("empresas");
    e = e.find((x) => x.id_empresas == empresa);
    const nombreEmpresa = e.nombre_empresa;
    // Obtener la plantilla de Email
    const template = archivosCargadosHTML(
      nombreConsultor,
      nombreEmpresa,
      txtEtapa,
      linkEmail
    );
    // Enviar Email
    const resultEmail = await sendEmail(
      info.email,
      "Una empresa ha cargado un archivo nuevo",
      template
    );

    if (resultEmail == false) {
      console.log(
        "\n*_*_*_*_*_* Ocurrio un error inesperado al enviar el email de Archivo Cargado *_*_*_*_*_* \n"
      );
    } else {
      console.log(
        `\n>>>> Email de Archivo cargado - ENVIADO a => ${info.email} <<<<<\n`
      );
      respuesta = true;
    }
  }
  res.send(result);
};

/************************************************************************* */

/** PLAN EMPRESARIAL + LISTADO DE TAREAS DEL CONSULTOR */
empresaController.planEmpresarial = async (req, res) => {
  const btnPagar = {};
  const fechaActual = new Date().toLocaleDateString("fr-CA");
  const row = await consultarDatos(
    "empresas",
    `WHERE email = "${req.user.email}" LIMIT 1`
  );
  const id_empresa = row[0].id_empresas;
  const propuestas = await consultarDatos("propuestas");
  const propuesta = propuestas.find(
    (i) => i.empresa == id_empresa && i.tipo_propuesta == "Plan empresarial"
  );
  const pagos = await consultarDatos("pagos");
  const pago_empresa = pagos.find((i) => i.id_empresa == id_empresa);
  const etapa2 = { lista: true };

  // PROCESO PARA LAS TAREAS DEL CONSULTOR (PLAN EMPRESARIAL)
  const tareas = await consultarTareasEmpresarial(id_empresa, fechaActual);

  /************************************************************************************* */
  let escena1 = false,
    escena2 = false,
    escena3 = false,
    escena4 = false,
    escena5 = false,
    escena6 = false,
    activarPagoUnico = true,
    msgActivo,
    msgDesactivo,
    msgDesactivo2 = true,
    msgDesactivo3 = true,
    btnActivo = "background: #85bb65;margin: 0 auto;border-color: #85bb65;",
    btnDesactivo = "background: #656c73;margin: 0 auto;border-color: #656c73;";
  /************************************************************************************* */

  // PROPUESTA DE PLAN EMPRESARIAL
  let tienePropuesta = false;
  if (propuesta) {
    tienePropuesta = true;
    btnPagar.etapa1 = false;
    btnPagar.activar1 = false;
    btnPagar.etapa2 = true;
    btnPagar.activar2 = true;
    propuesta.porcentaje = "0%";

    /************************************************************************************* */
    let fechaEmpresarial = JSON.parse(pago_empresa.empresarial1);
    fechaEmpresarial = fechaEmpresarial.fecha;
    let fechaDB = new Date(fechaEmpresarial);
    let fechaDB2 = new Date(fechaEmpresarial);

    if (msgDesactivo2) {
      fechaDB.setDate(fechaDB2.getDate() + 30);
      fechaDB = fechaDB.toLocaleDateString("en-US");
      msgDesactivo2 = "Pago disponible apartir de: " + fechaDB + "";
    }

    if (msgDesactivo3) {
      fechaDB2.setDate(fechaDB2.getDate() + 60);
      fechaDB2 = fechaDB2.toLocaleDateString("en-US");
      msgDesactivo3 = "Pago disponible apartir de: " + fechaDB2 + "";
    }
    /************************************************************************************* */

    const objEmpresarial = JSON.parse(pago_empresa.empresarial0);
    const objEmpresarial1 = JSON.parse(pago_empresa.empresarial1);
    const objEmpresarial2 = JSON.parse(pago_empresa.empresarial2);
    const objEmpresarial3 = JSON.parse(pago_empresa.empresarial3);

    btnPagar.obj1 = parseInt(objEmpresarial1.estado);
    btnPagar.obj2 = parseInt(objEmpresarial2.estado);
    btnPagar.obj3 = parseInt(objEmpresarial3.estado);

    // PAGÓ EL PLAN EMPRESARIAL
    if (objEmpresarial.estado == 1) {
      btnPagar.etapa1 = false;
      btnPagar.activar1 = false;
      btnPagar.etapa2 = true;
      btnPagar.activar2 = false;
      propuesta.porcentaje = "100%";
      btnPagar.empresarialPer = true;
      propuesta.precio_total = objEmpresarial.precio;

      escena6 = true;
      activarPagoUnico = false;
      btnDesactivo;
      msgDesactivo = "Plan empresarial pagado";
      msgDesactivo2 = "Plan empresarial pagado";
      msgDesactivo3 = "Plan empresarial pagado";
    } else if (
      objEmpresarial1.estado == 1 &&
      objEmpresarial2.estado == 0 &&
      objEmpresarial3.estado == 0
    ) {
      escena1 = true;
      msgActivo = "Primera cuota lista para pagarse";
      btnActivo;
      msgDesactivo = "Pago no disponible aun";
      btnDesactivo;
    } else if (
      objEmpresarial1.estado != 1 &&
      objEmpresarial2.estado == 0 &&
      objEmpresarial3.estado == 0
    ) {
      escena2 = true;
      activarPagoUnico = false;
      msgDesactivo = "Primera cuota pagada";
      msgDesactivo2;
      msgDesactivo3;
      btnDesactivo;
    } else if (
      objEmpresarial1.estado == 2 &&
      objEmpresarial2.estado == 1 &&
      objEmpresarial3.estado == 0
    ) {
      escena3 = true;
      activarPagoUnico = false;
      btnDesactivo;
      msgDesactivo = "Primera cuota pagada";
      msgActivo = "Segunda cuota lista para pagarse";
      btnActivo;
      msgDesactivo3;
    } else if (
      objEmpresarial1.estado == 2 &&
      objEmpresarial2.estado == 2 &&
      objEmpresarial3.estado == 0
    ) {
      escena4 = true;
      activarPagoUnico = false;
      btnDesactivo;
      msgDesactivo = "Primera cuota pagada";
      msgDesactivo2 = "Segunda cuota pagada";
      msgDesactivo3;
    } else if (
      objEmpresarial1.estado == 2 &&
      objEmpresarial2.estado == 2 &&
      objEmpresarial3.estado == 1
    ) {
      escena5 = true;
      activarPagoUnico = false;
      btnDesactivo;
      msgDesactivo = "Primera cuota pagada";
      msgDesactivo2 = "Segunda cuota pagada";
      msgActivo = "Tercera cuota lista para pagarse";
      btnActivo;
    } else if (
      objEmpresarial1.estado == 2 &&
      objEmpresarial2.estado == 2 &&
      objEmpresarial3.estado == 2
    ) {
      escena6 = true;
      activarPagoUnico = false;
      btnDesactivo;
      msgDesactivo = "Primera cuota pagada";
      msgDesactivo2 = "Segunda cuota pagada";
      msgDesactivo3 = "Tercera cuota pagada";
    }

    if (objEmpresarial1.estado == 2) {
      btnPagar.etapa1 = false;
      btnPagar.activar1 = false;
      btnPagar.etapa2 = true;
      btnPagar.activar2 = true;
      btnPagar.empresarialPer = true;
      propuesta.porcentaje = "60%";
    }
    if (objEmpresarial2.estado == 2) {
      propuesta.porcentaje = "80%";
    }
    if (objEmpresarial3.estado == 2) {
      propuesta.porcentaje = "100%";
    }
  }

  /************************************************************************************* */
  // ARCHIVOS CARGADOS
  let archivos = await consultarDatos("archivos_empresarial");
  archivos = archivos.filter((i) => i.empresa == id_empresa);
  if (archivos.length > 0) {
    archivos.forEach((x) => {
      x.estado = "Pendiente";
      x.color = "warning";
      x.display = "none";
      if (x.link != null) {
        x.estado = "Cargado";
        x.color = "success";
        x.display = "block";
      }
    });
  } else {
    archivos = false;
  }
  /************************************************************************************* */
  /**
   * VIDEOS TURIALES ACTIVAR o DESACTIVAR
   */
  const tutoriales = {};
  let registros = await consultarDatos("registro_tutoriales");
  registros = registros.find((x) => x.empresa == id_empresa);
  if (registros) {
    if (registros.etapa3 == 1) {
      tutoriales.etapa = true;
    } else {
      const data = { etapa3: 1 };
      await actualizarDatos(
        "registro_tutoriales",
        data,
        `WHERE empresa = ${id_empresa}`
      );
    }
  }

  res.render("empresa/planEmpresarial", {
    user_dash: true,
    actualYear: req.actualYear,
    propuesta,
    btnPagar,
    etapa2,
    archivos,
    escena1,
    escena2,
    escena3,
    escena4,
    escena5,
    escena6,
    msgActivo,
    msgDesactivo,
    msgDesactivo2,
    msgDesactivo3,
    activarPagoUnico,
    btnActivo,
    btnDesactivo,
    tienePropuesta,
    consulAsignado: req.session.consulAsignado,
    etapaCompleta: req.session.etapaCompleta,
    itemEmpresarial: true,
    tareas,
    modalAcuerdo,
    id_empresa,
    tutoriales,
  });
};

/** PLAN ESTRATÉGICO DE NEGOCIO - LISTADOD DE TAREAS + GRÁFICAS */
empresaController.planEstrategico = async (req, res) => {
  let empresa = await consultarDatos("empresas");
  empresa = empresa.find((x) => x.email == req.user.email);
  const fechaActual = new Date().toLocaleDateString("fr-CA");

  const dimObj = await tareasGenerales(empresa.id_empresas, fechaActual);
  const tareas = dimObj.tareas;

  if (tareas.completadas.cant == tareas.todas.length) {
    req.session.etapaCompleta.e4 = true;
  } else {
    req.session.etapaCompleta.e4 = false;
  }

  let datosTabla = await consultarDatos("rendimiento_empresa");
  datosTabla = datosTabla.filter((x) => x.empresa == empresa.id_empresas);
  const jsonRendimiento = JSON.stringify(datosTabla);

  /************************************************************************************* */
  // ARCHIVOS CARGADOS
  let archivos = await consultarDatos("archivos_estrategico");
  archivos = archivos.filter((i) => i.empresa == empresa.id_empresas);
  if (archivos.length > 0) {
    archivos.forEach((x) => {
      x.estado = "Pendiente";
      x.color = "warning";
      x.display = "none";
      if (x.link != null) {
        x.estado = "Cargado";
        x.color = "success";
        x.display = "block";
      }
    });
  } else {
    archivos = false;
  }
  /************************************************************************************* */
  /**
   * VIDEOS TURIALES ACTIVAR o DESACTIVAR
   */
  const tutoriales = {};
  let registros = await consultarDatos("registro_tutoriales");
  registros = registros.find((x) => x.empresa == empresa.id_empresas);
  if (registros) {
    if (registros.etapa4 == 1) {
      tutoriales.etapa = true;
    } else {
      const data = { etapa4: 1 };
      await actualizarDatos(
        "registro_tutoriales",
        data,
        `WHERE empresa = ${empresa.id_empresas}`
      );
    }
  }

  /************************************************************************************* */
  /**
   * CONSULTAR Y/O GENERAR INFORME POR CHATGPT
   */
  let verInforme = false;
  let informeIA = await consultarDatos("informes_ia");
  informeIA = informeIA.find(
    (x) => x.empresa == empresa.id_empresas && x.tipo == "Estratégico"
  );
  if (informeIA) {
    verInforme = true;
  }

  res.render("empresa/planEstrategico", {
    user_dash: true,
    actualYear: req.actualYear,
    tareas,
    dimObj,
    jsonRendimiento,
    itemEstrategico: true,
    consulAsignado: req.session.consulAsignado,
    etapaCompleta: req.session.etapaCompleta,
    modalAcuerdo,
    archivos,
    empresa: JSON.stringify(empresa),
    tutoriales,
    fechaActual,
    verInforme,
  });
};

/****************************************************************** */
/**
 * INFORME AUTOGENERADO
 */
empresaController.informeAutoGenerado = async (req, res) => {
  const { tipo } = req.params;
  let tituloInforme = tipo + " de",
    tipoInforme = "negocio";
  let tipoDB = "Diagnóstico";

  if (tipo == "dimensión_producto") {
    tituloInforme = "dimensión";
    tipoInforme = "producto";
    tipoDB = "Análisis producto";
  } else if (tipo == "dimensión_administración") {
    tituloInforme = "dimensión";
    tipoInforme = "administración";
    tipoDB = "Análisis administración";
  } else if (tipo == "dimensión_operación") {
    tituloInforme = "dimensión";
    tipoInforme = "operación";
    tipoDB = "Análisis operación";
  } else if (tipo == "dimensión_marketing") {
    tituloInforme = "dimensión";
    tipoInforme = "marketing";
    tipoDB = "Análisis marketing";
  } else if (tipo == "estratégico") {
    tituloInforme = "Plan Estratégico de";
    tipoDB = "Estratégico";
  }

  let codigo = req.user.codigo;
  if (req.user.rol != "Empresa") {
    const referer = req.headers.referer;
    codigo = referer.split("/").pop();
  }

  let empresa = await consultarDatos("empresas");
  empresa = empresa.find((e) => e.codigo == codigo);
  let data = await consultarDatos("informes_ia");
  data = data.filter(
    (x) => x.empresa == empresa.id_empresas && x.tipo == tipoDB
  );
  // Ordenando el Array para asegurar usar el 1ero y último
  data.sort((a, b) => {
    return a.id_ - b.id_;
  });
  if (tipo == "Diagnóstico_2") {
    tituloInforme = "Diagnóstico de";
    tipoInforme = "negocio #2";
    data = data[data.length - 1];
  } else {
    data = data[0];
  }
  const textoGPT = data.informe;
  res.render("pages/informeAutoGenerado", {
    empresa: empresa.nombre_empresa,
    tituloInforme,
    tipoInforme,
    textoGPT,
  });
};

empresaController.informeEstrategico = async (req, res) => {
  let empresa = await consultarDatos("empresas");
  empresa = empresa.find((x) => x.email == req.user.email);
  /**
   * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS
   */
  const informeIA = await consultarDatos("informes_ia");
  let informe1_IA = informeIA.find(
    (x) => x.empresa == empresa.id_empresas && x.tipo == "Diagnóstico"
  );
  if (informe1_IA) informe1_IA = informe1_IA.informe;
  let obj_respuestas = { "Diagnóstico de Negocio": { informe1_IA } };
  let txtGPT =
    "Con base en los informes anteriores, crea una lista de tareas o plan estratégico para esta empresa basado en prioridades y separado por dimensiones que tenga como principal propósito solucionar las falencias encontradas, que no supere los 3000 caracteres.";

  if (req.session.etapaCompleta.verAnalisis) {
    let informe2_IA = informeIA.find(
      (x) => x.empresa == empresa.id_empresas && x.tipo == "Análisis producto"
    );
    if (informe2_IA) informe2_IA = informe2_IA.informe;
    let informe3_IA = informeIA.find(
      (x) =>
        x.empresa == empresa.id_empresas && x.tipo == "Análisis administración"
    );
    if (informe3_IA) informe3_IA = informe3_IA.informe;
    let informe4_IA = informeIA.find(
      (x) => x.empresa == empresa.id_empresas && x.tipo == "Análisis operación"
    );
    if (informe4_IA) informe4_IA = informe4_IA.informe;
    let informe5_IA = informeIA.find(
      (x) => x.empresa == empresa.id_empresas && x.tipo == "Análisis marketing"
    );
    if (informe5_IA) informe5_IA = informe5_IA.informe;
    obj_respuestas["Análisis de Negocio - Dimensión Producto"] = {
      informe2_IA,
    };
    obj_respuestas["Análisis de Negocio - Dimensión Administración"] = {
      informe3_IA,
    };
    obj_respuestas["Análisis de Negocio - Dimensión Operación"] = {
      informe4_IA,
    };
    obj_respuestas["Análisis de Negocio - Dimensión Marketing"] = {
      informe5_IA,
    };
    txtGPT =
      "Con base en los informes anteriores, crea una lista de tareas o plan estratégico para esta empresa basado en prioridades y separado por dimensiones que tenga como principal propósito solucionar las falencias encontradas. Adicionalmente y por aparte con base en los informes anteriores, aplicar la Metodología Sigma (Simplificar Procesos, Identificar Problemas, Generar Soluciones, Medición de Resultados y Análisis de Datos) y generar una lista de tareas o plan estratégico para llevar a cabo la metodología, que no supere los 3000 caracteres.";
  }

  const prompt = JSON.stringify(obj_respuestas) + txtGPT;
  console.log(
    `\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT INFORME ESTRATÉGICO ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n\n`
  );
  let resultAI = await getResponseChatGPT(prompt);
  const resp = resultAI.content.replaceAll("\n", "<br>");
  const informeAI = {
    empresa: empresa.id_empresas,
    tipo: "Estratégico",
    informe: resp,
    fecha: new Date().toLocaleDateString("en-US"),
  };
  const insertResult = await insertarDatos("informes_ia", informeAI);
  if (insertResult.affectedRows > 0) {
    res.send(true);
  } else {
    res.send(false);
  }
};
