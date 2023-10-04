const dashboardController = exports;
const pool = require("../database");
const passport = require("passport");
const multer = require("multer");
const path = require("path");
const helpers = require("../lib/helpers");
const fs = require('fs-extra');
const { sendEmail, consultorAsignadoHTML, consultorAprobadoHTML, informesHTML, etapaFinalizadaHTML, consultor_AsignadoEtapa, archivosPlanEmpresarialHTML } = require("../lib/mail.config");
const stripe = require("stripe")(process.env.CLIENT_SECRET_STRIPE);
const { getResponseChatGPT, checkGPT3Connectivity } = require("../lib/openai");
const preguntas1 = require('../config/preguntas_etapa1.json');
const { log } = require("console");

let aprobarConsultor = false;

// Dashboard Administrativo
dashboardController.admin = async (req, res) => {
  const consultores = await pool.query(
    "SELECT * FROM consultores WHERE id_consultores != 1 ORDER BY id_consultores DESC LIMIT 2"
  );
  const empresas = await pool.query(
    'SELECT * FROM empresas WHERE fecha_creacion != "" ORDER BY id_empresas DESC LIMIT 2'
  );

  /** Acceso directo para Consultores pendientes por aprobar */
  aprobarConsultor = false;
  const pendientes = await pool.query(
    'SELECT id_usuarios, codigo, estadoAdm FROM users WHERE rol = "Consultor" AND estadoAdm = 0 ORDER BY id_usuarios ASC;'
  );
  pendientes.length > 0
    ? (aprobarConsultor = pendientes[0].codigo)
    : (aprobarConsultor = aprobarConsultor);

  const consultorAsignado = await helpers.consultarDatos("consultores");
  const ficha = await helpers.consultarDatos("ficha_cliente");

  empresas.forEach((e) => {
    consultorAsignado.forEach((c) => {
      if (e.consultor == c.id_consultores) {
        e.nombre_consultor = c.nombres + " " + c.apellidos;
      }
    });

    // e.ficha = false;
    ficha.forEach((f) => {
      if (f.id_empresa == e.id_empresas) {
        e.ficha = true;
      }
    });
  });

  // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE CONSULTORES REGISTRADOS MENSUALMENTE <<====
  let historialConsultores = await pool.query(
    "SELECT * FROM (SELECT * FROM historial_consultores_admin ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;"
  );
  let datosJson_historialC_adm;
  if (historialConsultores.length > 0) {
    datosJson_historialC_adm = JSON.stringify(historialConsultores);
    console.log("\n");
    console.log(
      "IMPIMIENDO datosJson_historialC_adm ====>>>",
      datosJson_historialC_adm
    );
  }
  // FIN DE LA FUNCIÓN <<====

  // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE EMPRESAS REGISTRADOS MENSUALMENTE <<====
  let historialEmpresas = await pool.query(
    "SELECT * FROM (SELECT * FROM historial_empresas_admin ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;"
  );
  let datosJson_historialE_adm;
  if (historialEmpresas.length > 0) {
    datosJson_historialE_adm = JSON.stringify(historialEmpresas);
    console.log("\n");
    console.log(
      "IMPIMIENDO datosJson_historialE_adm ====>>>",
      datosJson_historialE_adm
    );
  }
  // FIN DE LA FUNCIÓN <<====

  // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE INFORMES REGISTRADOS MENSUALMENTE <<====
  let historialInformes = await pool.query(
    "SELECT * FROM (SELECT * FROM historial_informes_admin ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;"
  );
  let datosJson_historialI_adm;
  if (historialInformes.length > 0) {
    datosJson_historialI_adm = JSON.stringify(historialInformes);
    console.log("\n");
    console.log(
      "IMPIMIENDO datosJson_historialI_adm ====>>>",
      datosJson_historialI_adm
    );
  }
  // FIN DE LA FUNCIÓN <<====

  /**
   * TAREAS ADMINISTRADOR
   */
  let consultor = await helpers.consultarDatos("consultores");
  consultor = consultor.find((x) => x.codigo == req.user.codigo);
  const fechaActual = new Date().toLocaleDateString("fr-CA");
  const tareas = await helpers.consultarTareasConsultores(
    consultor.id_consultores,
    fechaActual
  );

  res.render("admin/panelAdmin", {
    adminDash: true,
    itemActivo: 1,
    consultores,
    empresas,
    aprobarConsultor,
    graficas1: true,
    datosJson_historialC_adm,
    datosJson_historialE_adm,
    datosJson_historialI_adm,
    ide_consultor: consultor.id_consultores,
    fechaActual,
    tareas,
    datosUsuario: JSON.stringify(req.user),
  });
};

// CONSULTORES
dashboardController.registroConsultores = (req, res) => {
  res.render("auth/registroConsultor", {
    wizarx: true,
    csrfToken: req.csrfToken(),
  });
};

dashboardController.addConsultores = (req, res, next) => {
  passport.authenticate("local.registroConsultores", {
    successRedirect: "/registro-de-consultores",
    failureRedirect: "/registro-de-consultores",
    failureFlash: true,
  })(req, res, next);
};

dashboardController.mostrarConsultores = async (req, res) => {
  let consultores = await pool.query(
    'SELECT c.*, u.codigo, u.foto, u.estadoAdm FROM consultores c JOIN users u ON c.codigo = u.codigo AND rol = "Consultor" AND c.id_consultores != 1;'
  );

  consultores.forEach(async (c) => {
    const num = await pool.query(
      "SELECT COUNT(distinct empresa) AS numEmpresas FROM consultores_asignados WHERE consultor = ?",
      [c.id_consultores]
    );
    c.num_empresas = num[0].numEmpresas;
  });

  /** Acceso directo para Consultores pendientes por aprobar */
  aprobarConsultor = false;
  const pendientes = await pool.query(
    'SELECT id_usuarios, codigo, estadoAdm FROM users WHERE rol = "Consultor" AND estadoAdm = 0 ORDER BY id_usuarios ASC;'
  );
  pendientes.length > 0
    ? (aprobarConsultor = pendientes[0].codigo)
    : (aprobarConsultor = aprobarConsultor);

  res.render("admin/mostrarConsultores", {
    adminDash: true,
    itemActivo: 2,
    consultores,
    aprobarConsultor,
  });
};

dashboardController.editarConsultor = async (req, res) => {
  const codigo = req.params.codigo;
  let consultor = await pool.query(
    'SELECT c.*, u.codigo, u.estadoAdm, u.rol FROM consultores c LEFT OUTER JOIN users u ON c.codigo = ? AND c.codigo = u.codigo AND u.rol = "Consultor";',
    [codigo]
  );
  consultor = consultor[0];
  if (consultor.certificado) {
    consultor.txtCertificado = consultor.certificado.split("/")[2];
  }
  res.render("admin/editarConsultor", {
    adminDash: true,
    itemActivo: 2,
    consultor,
    formEdit: true,
    aprobarConsultor,
  });
};

dashboardController.actualizarConsultor = async (req, res) => {
  let respuesta = false;
  const { codigo, estado, nivel } = req.body;
  const estadoNivel = { nivel };
  const nuevoEstado = { estadoAdm: estado }; // Estado Consultor Aprobado, Pendiente, Bloqueado
  const c1 = await pool.query(
    'UPDATE users SET ? WHERE codigo = ? AND rol = "Consultor"',
    [nuevoEstado, codigo]
  );
  const c2 = await pool.query("UPDATE consultores SET ? WHERE codigo = ?", [
    estadoNivel,
    codigo,
  ]);
  // Capturando el Consultor Aprobado
  let consultor = await helpers.consultarDatos("users");
  consultor = consultor.find((x) => x.codigo == codigo && x.rol == "Consultor");

  if (c1.changedRows > 0) {
    // Enviando Email - Consultor Aprobado
    if (consultor.estadoAdm == 1) {
      const nombre = consultor.nombres + " " + consultor.apellidos;
      const clave = consultor.codigo.slice(5, 13);

      // Obtener la plantilla de Email
      const template = consultorAprobadoHTML(nombre, clave);
      // Enviar Email
      const resultEmail = await sendEmail(
        consultor.email,
        "Has sido aprobado como consultor en 3C Sigma",
        template
      );

      if (resultEmail == false) {
        console.log(
          "\n*_*_*_*_*_* Ocurrio un error inesperado al enviar el email de Consultor Asignado *_*_*_*_*_* \n"
        );
      } else {
        console.log(
          `\n>>>> Email de Consultor Aprobado - ENVIADO a => ${consultor.email} <<<<<\n`
        );
        respuesta = true;
      }
    }
  }

  if (c2.affectedRows > 0) respuesta = true;

  res.send(respuesta);
};

dashboardController.bloquearConsultor = async (req, res) => {
  const { id } = req.body;
  let respu = false;
  const actualizar = { estadoAdm: 2 };
  const consultor = await pool.query(
    "SELECT id_consultores, codigo FROM consultores WHERE id_consultores = ? LIMIT 1",
    [id]
  );
  if (consultor.length > 0) {
    const c = await pool.query(
      'SELECT * FROM users WHERE codigo = ? AND rol = "Consultor"',
      [consultor[0].codigo]
    );
    if (c.length > 0 && c[0].estadoAdm == 2) {
      res.send(respu);
    } else {
      await pool.query(
        'UPDATE users SET ? WHERE codigo = ? AND rol = "Consultor"',
        [actualizar, consultor[0].codigo],
        (err, result) => {
          if (err) throw err;
          if (result.affectedRows > 0) {
            respu = true;
          }
          res.send(respu);
        }
      );
    }
  }
};

// EMPRESAS
dashboardController.mostrarEmpresas = async (req, res) => {
  let empresas = await pool.query(
    'SELECT e.*, u.codigo, u.estadoEmail, u.estadoAdm, f.telefono, f.id_empresa, p.*, a.id_empresa, a.estadoAcuerdo FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = e.id_empresas LEFT OUTER JOIN pagos p ON p.id_empresa = e.id_empresas LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = e.id_empresas INNER JOIN users u ON u.codigo = e.codigo AND rol = "Empresa"'
  );

  const dg_nueva = await helpers.consultarDatos("dg_empresa_nueva");
  const dg_establecida = await helpers.consultarDatos("dg_empresa_establecida");
  const dg_analisis = await helpers.consultarDatos("analisis_empresa");
  const consultor = await helpers.consultarDatos("consultores");
  const informe = await helpers.consultarDatos("informes");
  const propuestas = await helpers.consultarDatos("propuestas");

  empresas.forEach((e) => {
    e.pagoEtapa1 = false;
    e.etapa = "Email sin confirmar";
    e.estadoEmail == 1 ? (e.etapa = "Email confirmado") : (e.etapa = e.etapa);
    // e.diagnostico_negocio == 1 ? e.etapa = 'Diagnóstico pagado' : e.etapa = e.etapa;
    // Pago de la Etapa 1 - Diagnóstico de Negocio
    if (e.diagnostico_negocio) {
      const p1 = JSON.parse(e.diagnostico_negocio);
      if (p1.estado == 1) {
        e.etapa = "Valoración situacional pagada";
        e.pagoEtapa1 = true;
      } else {
        e.etapa = e.etapa;
      }
    }
    e.estadoAcuerdo == 2 ? (e.etapa = "Acuerdo firmado") : (e.etapa = e.etapa);
    e.telefono ? (e.etapa = "Ficha cliente") : (e.etapa = e.etapa);
    if (dg_nueva.length > 0) {
      const _diag = dg_nueva.find((i) => i.id_empresa == e.id_empresas);
      if (_diag) {
        _diag.consecutivo
          ? (e.etapa = "Cuestionario empresa nueva")
          : (e.etapa = e.etapa);
      }
    }

    if (dg_establecida.length > 0) {
      const _diag = dg_establecida.find((i) => i.id_empresa == e.id_empresas);
      if (_diag) {
        _diag.consecutivo
          ? (e.etapa = "Cuestionario empresa establecida")
          : (e.etapa = e.etapa);
      }
    }

    let informe_empresa = informe.find(
      (i) => i.id_empresa == e.id_empresas && i.nombre == "Informe diagnóstico"
    );
    if (informe_empresa) {
      e.etapa = "Informe diagnóstico";
    }

    /** PROPUESTA DE ANÁLISIS DE NEGOCIO - PDF */
    const propuesta = propuestas.find((i) => i.empresa == e.id_empresas);
    if (propuesta) {
      e.etapa = "Propuesta de análisis enviada";
    }

    // Pago de la Etapa 2 - Análisis de negocio
    if (e.analisis_negocio) {
      let p2 = JSON.parse(e.analisis_negocio);
      p2.estado == 1 ? (e.etapa = "Análisis pagado") : (e.etapa = e.etapa);
      p2 = JSON.parse(e.analisis_negocio1);
      p2.estado == 2 ? (e.etapa = "60% Análisis pagado") : (e.etapa = e.etapa);
      p2 = JSON.parse(e.analisis_negocio2);
      p2.estado == 2 ? (e.etapa = "80% Análisis pagado") : (e.etapa = e.etapa);
      p2 = JSON.parse(e.analisis_negocio3);
      p2.estado == 2 ? (e.etapa = "Análisis pagado") : (e.etapa = e.etapa);
    }

    if (dg_analisis.length > 0) {
      const dim = dg_analisis.find((i) => i.id_empresa == e.id_empresas);
      if (dim) {
        if (dim.producto) e.etapa = "Cuestionario producto";
        if (dim.administracion) e.etapa = "Cuestionario administración";
        if (dim.operacion) e.etapa = "Cuestionario operación";
        if (dim.marketing) e.etapa = "Cuestionario marketing";
      }
    }

    informe_empresa = informe.find(
      (i) =>
        i.id_empresa == e.id_empresas &&
        i.nombre == "Informe de dimensión producto"
    );
    if (informe_empresa) {
      e.etapa = "Informe producto";
    }
    informe_empresa = informe.find(
      (i) =>
        i.id_empresa == e.id_empresas &&
        i.nombre == "Informe de dimensión administración"
    );
    if (informe_empresa) {
      e.etapa = "Informe administración";
    }
    informe_empresa = informe.find(
      (i) =>
        i.id_empresa == e.id_empresas &&
        i.nombre == "Informe de dimensión operaciones"
    );
    if (informe_empresa) {
      e.etapa = "Informe operación";
    }
    informe_empresa = informe.find(
      (i) =>
        i.id_empresa == e.id_empresas &&
        i.nombre == "Informe de dimensión marketing"
    );
    if (informe_empresa) {
      e.etapa = "Informe marketing";
    }
    informe_empresa = informe.find(
      (i) => i.id_empresa == e.id_empresas && i.nombre == "Informe de análisis"
    );
    if (informe_empresa) {
      e.etapa = "Informe análisis";
    }
    informe_empresa = informe.find(
      (i) =>
        i.id_empresa == e.id_empresas &&
        i.nombre == "Informe de plan estratégico"
    );
    if (informe_empresa) {
      e.etapa = "Informe plan estratégico";
    }

    const consultor_empresa = consultor.find(
      (item) => item.id_consultores == e.consultor
    );
    if (consultor_empresa) {
      e.nombre_consultor =
        consultor_empresa.nombres + " " + consultor_empresa.apellidos;
      e.codigo_consultor = consultor_empresa.codigo;
    }
  });

  res.render("admin/mostrarEmpresas", {
    adminDash: true,
    itemActivo: 3,
    empresas,
    aprobarConsultor,
  });
};

dashboardController.editarEmpresa = async (req, res) => {
  const codigo = req.params.codigo,
    datos = {};
  const fechaActual = new Date().toLocaleDateString("fr-CA");
  const userEmpresa = (await helpers.consultarDatos("users")).find(
    (x) => x.codigo == codigo && x.rol == "Empresa"
  );
  // Empresa tabla Usuarios
  const datosEmpresa = (await helpers.consultarDatos("empresas")).find(
    (x) => x.codigo == codigo
  );
  const idEmpresa = datosEmpresa.id_empresas;
  // Empresa tabla Ficha Cliente
  const empresa = (await helpers.consultarDatos("ficha_cliente")).find((x) => x.id_empresa == idEmpresa);
  const pago_diagnostico = {
    color: "badge-warning",
    texto: "Pendiente",
    btn: false,
    fecha: "N/A",
    activarBtn: false,
    sede: false,
  };

  // Capturando Consultores Activos
  const consultores = await pool.query(
    'SELECT c.*, u.codigo, u.estadoAdm, u.rol FROM consultores c INNER JOIN users u ON u.estadoAdm = 1 AND c.codigo = u.codigo AND u.rol != "Empresa"'
  );

  datos.nombre_completo = datosEmpresa.nombres + " " + datosEmpresa.apellidos;
  datos.nombre_empresa = datosEmpresa.nombre_empresa;
  datos.email = datosEmpresa.email;
  datos.estadoAdm = userEmpresa.estadoAdm;
  datos.code = codigo;
  datos.idEmpresa = idEmpresa;
  datos.foto = userEmpresa.foto;
  datos.idConsultor = 1;
  datos.consultor_diagnostico = false;

  // PAGOS DE LA EMPRESA
  let pagos = await helpers.consultarDatos("pagos");
  let pay = pagos.find((i) => i.id_empresa == idEmpresa);
  if (!pay) {
    const estado = JSON.stringify({ estado: 0 });
    const nuevoPago = {
      id_empresa: idEmpresa,
      diagnostico_negocio: estado,
      analisis_negocio: estado,
      analisis_negocio1: JSON.stringify({ estado: 1 }),
      analisis_negocio2: estado,
      analisis_negocio3: estado,
      estrategico: estado,
      empresarial0: estado,
      empresarial1: JSON.stringify({ estado: 1 }),
      empresarial2: estado,
      empresarial3: estado,
    };
    await helpers.insertarDatos("pagos", nuevoPago);
  }

  // INFO DE LA EMPRESA HASTA LA FICHA CLIENTE
  let pagoDg_Realizado = false;
  if (datosEmpresa) {
    datosEmpresa.estadoEmail == 1
      ? (datos.etapa = "Email confirmado")
      : (datos.etapa = datos.etapa);
    // datosEmpresa.consultor != null ? datos.etapa = 'Consultor asignado' : datos.etapa = datos.etapa;

    let consulDg = await helpers.consultarDatos("consultores_asignados");
    let infoConsul = await helpers.consultarDatos("consultores");
    if (consulDg.length > 0) {
      // Buscando el Consultor asignado en la Etapa Diagnóstico para la empresa actual
      consulDg = consulDg.find(
        (x) => x.empresa == datos.idEmpresa && x.orden == 1
      );
      if (consulDg) {
        datos.consultor_diagnostico = true;
        infoConsul = infoConsul.find(
          (x) => x.id_consultores == consulDg.consultor
        );
        pago_diagnostico.btn = "color: white;";
        datos.idConsultor = infoConsul.id_consultores;
        if (infoConsul.nivel == "1") {
          pago_diagnostico.valor = process.env.PRECIO_NIVEL1;
        } else if (infoConsul.nivel == "2") {
          pago_diagnostico.valor = process.env.PRECIO_NIVEL2;
        } else if (infoConsul.nivel == "3") {
          pago_diagnostico.valor = process.env.PRECIO_NIVEL3;
        } else if (infoConsul.nivel == "4") {
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
    pagos = await helpers.consultarDatos("pagos");
    pay = pagos.find((i) => i.id_empresa == idEmpresa);
    // Validando Diagnóstico de negocio ha sido pagado
    if (pay) {
      const pagoDiagnostico = JSON.parse(pay.diagnostico_negocio);
      if (pagoDiagnostico.estado == 1) {
        datos.etapa = "Diagnóstico pagado";
        pago_diagnostico.color = "badge-success";
        pago_diagnostico.texto = "Pagado";
        pago_diagnostico.valor = pagoDiagnostico.precio;
        pago_diagnostico.fecha = pagoDiagnostico.fecha;
        pagoDg_Realizado = true; // Pago de Diagnóstico realizado
      }
    }

    let acuerdo = await helpers.consultarDatos("acuerdo_confidencial");
    acuerdo = acuerdo.find((x) => x.id_empresa == idEmpresa);
    if (acuerdo)
      acuerdo.estadoAcuerdo == 2
        ? (datos.etapa = "Acuerdo firmado")
        : (datos.etapa = datos.etapa);

    if (empresa) {
      empresa.telefono != null
        ? (datos.etapa = "Ficha Cliente")
        : (datos.etapa = datos.etapa);

      const fNac = new Date(empresa.fecha_nacimiento);
      empresa.fecha_nacimiento = fNac.toLocaleDateString("en-US");

      if (empresa.redes_sociales) {
        datos.redesOK = false;
        datos.redes = JSON.parse(empresa.redes_sociales);
        datos.redes.twitter != ""
          ? (datos.redes.twitter = datos.redes.twitter)
          : (datos.redes.twitter = false);
        datos.redes.facebook != ""
          ? (datos.redes.facebook = datos.redes.facebook)
          : (datos.redes.facebook = false);
        datos.redes.instagram != ""
          ? (datos.redes.instagram = datos.redes.instagram)
          : (datos.redes.instagram = false);
        datos.redes.otra != ""
          ? (datos.redes.otra = datos.redes.otra)
          : (datos.redes.otra = false);

        if (
          datos.redes.twitter ||
          datos.redes.facebook ||
          datos.redes.instagram ||
          datos.redes.otra
        ) {
          datos.redesOK = true;
        }
      }
      datos.objetivos = JSON.parse(empresa.objetivos);
      datos.fortalezas = JSON.parse(empresa.fortalezas);
      datos.problemas = JSON.parse(empresa.problemas);
    }
  }

  // CAPTURANDO CONSULTORES ASIGNADOS A LA EMPRESA
  let divConsultores = "none";
  let consultores_asignados = (await helpers.consultarDatos("consultores_asignados","ORDER BY orden ASC")).filter((x) => x.empresa == idEmpresa);
  if (consultores_asignados.length > 0) {
    divConsultores = "contents";
    consultores_asignados.forEach((c) => {
      const consultor = consultores.find(
        (x) => x.id_consultores == c.consultor
      );
      c.idConsultor = c.consultor;
      c.consultor = consultor.nombres + " " + consultor.apellidos;
      c.idFila = c.etapa.replace(/[$ ]/g, "_");
    });
  }

  /************************************************************************************************************* */
  // Tabla de Diagnóstico - Empresas Nuevas & Establecidas
  const frmDiag = {},
    cuestionario = {
      diagnostico: { respuestas: {} },
      diagnostico2: { respuestas: {} },
    };
  const diagnostico = (
    await helpers.consultarDatos("dg_empresa_establecida")
  ).find((x) => x.id_empresa == idEmpresa);
  const dgNuevasEmpresas = (
    await helpers.consultarDatos("dg_empresa_nueva")
  ).find((x) => x.id_empresa == idEmpresa);

  if (!diagnostico && !dgNuevasEmpresas) {
    frmDiag.color = "badge-danger";
    frmDiag.texto = "Pendiente";
    frmDiag.fechaLocal = true;
    frmDiag.tablasVacias = true;
    cuestionario.diagnostico = false;
    cuestionario.diagnostico2 = false;
  } else {
    frmDiag.color = "badge-success";
    frmDiag.estilo =
      "linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%); color: #FFFF";
    frmDiag.texto = "Completado";
    frmDiag.estado = true;
    cuestionario.diagnostico.ver = true;

    if (diagnostico) {
      datos.etapa = "Cuestionario empresa establecida";
      frmDiag.fecha = diagnostico.fecha;
      frmDiag.tabla1 = true;
      frmDiag.tabla2 = false;
    } else {
      datos.etapa = "Cuestionario empresa nueva";
      frmDiag.fecha = dgNuevasEmpresas.fecha;
      frmDiag.tabla1 = false;
      frmDiag.tabla2 = true;
      datos.nueva = true;
    }

    if (datosEmpresa.diagnostico_fecha2 == 1) {
      cuestionario.diagnostico2.ver = true;
    }

    if (empresa_fichaCliente.tipo_empresa == 1) {
      cuestionario.diagnostico.color = "badge-danger";
      cuestionario.diagnostico.texto = "Pendiente";
      cuestionario.diagnostico.btnEdit = true;
      cuestionario.diagnostico.link = "/empresas/" + datosEmpresa.codigo;

      if (cuestionario.diagnostico2.ver) {
        cuestionario.diagnostico2.color = "badge-danger";
        cuestionario.diagnostico2.texto = "Pendiente";
        cuestionario.diagnostico2.btnEdit = true;
      }

      const data = (await helpers.consultarDatos("dg_empresa_nueva")).filter(x => x.id_empresa == idEmpresa);
      // Ordenando el Array para asegurar usar el 1ero y último
      data.sort((a, b) => { return a.id_ - b.id_; });
      if (data.length > 0) {
        const datos = data[0];
        cuestionario.diagnostico.fecha = datos.fecha;
        cuestionario.diagnostico.btnEdit = false;
        cuestionario.diagnostico.color = "badge-success";
        cuestionario.diagnostico.texto = "Completado";
        cuestionario.diagnostico.modal = "#modalNuevosProyectos";
        cuestionario.nuevo = true;

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
      cuestionario.diagnostico.link = "/empresas/" + datosEmpresa.codigo;

      if (cuestionario.diagnostico2.ver) {
        cuestionario.diagnostico2.dos = true;
        cuestionario.diagnostico2.color = "badge-danger";
        cuestionario.diagnostico2.texto = "Pendiente";
        cuestionario.diagnostico2.btnEdit = true;
      }
      let data = await helpers.consultarDatos("dg_empresa_establecida");
      data = data.filter((x) => x.id_empresa == idEmpresa);
      if (data.length > 0) {
        const datos = data[0];
        cuestionario.diagnostico.fecha = datos.fecha;
        cuestionario.diagnostico.btnEdit = false;
        cuestionario.diagnostico.color = "badge-success";
        cuestionario.diagnostico.texto = "Completado";
        cuestionario.diagnostico.modal = "#modalEmpresasEstablecidas";
        cuestionario.establecido = true;

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

    // // Respuestas del Cuestionario Diagnóstico Empresa Establecida
    // const resDiag = {}
    // datos.cuestionarios = false;
    // if (frmDiag.tabla1) {
    //     datos.cuestionarios = true;
    //     const r = diagnostico
    //     resDiag.producto = JSON.parse(r.productos_servicios)
    //     resDiag.administracion = JSON.parse(r.administracion)
    //     resDiag.talento = JSON.parse(r.talento_humano)
    //     resDiag.finanzas = JSON.parse(r.finanzas)
    //     resDiag.servicio = JSON.parse(r.servicio_alcliente)
    //     resDiag.operaciones = JSON.parse(r.operaciones)
    //     resDiag.ambiente = JSON.parse(r.ambiente_laboral)
    //     resDiag.innovacion = JSON.parse(r.innovacion)
    //     resDiag.marketing = JSON.parse(r.marketing)
    //     resDiag.ventas = JSON.parse(r.ventas)
    //     resDiag.fortalezas = JSON.parse(r.fortalezas)
    //     resDiag.oportunidades = JSON.parse(r.oportunidades_mejoras)
    //     resDiag.metas = JSON.parse(r.metas_corto_plazo)
    // }
    // // Respuestas del Cuestionario Diagnóstico Empresa Nueva
    // if (frmDiag.tabla2) {
    //     console.log("Info para Diagnóstico empresa nueva")
    //     datos.cuestionarios = true;
    //     const r = dgNuevasEmpresas
    //     resDiag.rubro = r.rubro
    //     resDiag.exp_rubro = JSON.parse(r.exp_rubro)
    //     resDiag.mentalidad = JSON.parse(r.mentalidad_empresarial)
    //     resDiag.viabilidad = JSON.parse(r.viabilidad)
    //     resDiag.producto = JSON.parse(r.productos_servicios)
    //     resDiag.administracion = JSON.parse(r.administracion)
    //     resDiag.talento = JSON.parse(r.talento_humano)
    //     resDiag.finanzas = JSON.parse(r.finanzas)
    //     resDiag.servicio = JSON.parse(r.servicio_cliente)
    //     resDiag.operaciones = JSON.parse(r.operaciones)
    //     resDiag.ambiente = JSON.parse(r.ambiente_laboral)
    //     resDiag.innovacion = JSON.parse(r.innovacion)
    //     resDiag.marketing = JSON.parse(r.marketing)
    //     resDiag.ventas = JSON.parse(r.ventas)
    //     resDiag.metas = JSON.parse(r.metas)
    // }
  }

  /***************** Tabla de Informes ******************* */
  const frmInfo = {};
  const info = {
    prod: { ver: "none" },
    adm: { ver: "none" },
    op: { ver: "none" },
    marketing: { ver: "none" },
    analisis: { ver: "none" },
    plan: { ver: "none" },
  };
  let tablaInformes = await helpers.consultarDatos(
    "informes",
    "ORDER BY id_informes DESC"
  );
  tablaInformes = tablaInformes.find((x) => x.id_empresa == idEmpresa);
  if (tablaInformes) {
    frmInfo.fecha = tablaInformes.fecha;
    frmInfo.ver1 = "block";
    frmInfo.url = tablaInformes.url;
  } else {
    frmInfo.ver1 = "none";
    frmInfo.url = false;
  }

  /** **************************************************************** */
  // Informe de diagnóstico
  const informeDiag = await helpers.consultarInformes(
    idEmpresa,
    "Informe diagnóstico"
  );
  // Informe de dimensión producto
  const informeProd = await helpers.consultarInformes(
    idEmpresa,
    "Informe de dimensión producto"
  );
  // Informe de dimensión administración
  const informeAdmin = await helpers.consultarInformes(
    idEmpresa,
    "Informe de dimensión administración"
  );
  // Informe de dimensión operaciones
  const informeOperaciones = await helpers.consultarInformes(
    idEmpresa,
    "Informe de dimensión operaciones"
  );
  // Informe de dimensión marketing
  const informeMarketing = await helpers.consultarInformes(
    idEmpresa,
    "Informe de dimensión marketing"
  );
  // Informe de análisis
  const informeAnalisis = await helpers.consultarInformes(
    idEmpresa,
    "Informe de análisis"
  );
  // Informe de Plan estratégico
  const informePlan = await helpers.consultarInformes(
    idEmpresa,
    "Informe de plan estratégico"
  );

  if (informeDiag) {
    frmInfo.fecha = informeDiag.fecha;
    frmInfo.ver1 = "block";
    frmInfo.url = informeDiag.url;
    datos.etapa = "Informe general de diagnóstico de negocio";
  }

  /************************************************************************************* */

  /** PROPUESTA DE ANÁLISIS DE NEGOCIO - PDF */
  const propuestas = await helpers.consultarDatos("propuestas");
  const propuesta = {};
  propuesta.analisis = propuestas.find(
    (i) => i.empresa == idEmpresa && i.tipo_propuesta == "Análisis de negocio"
  );
  let pagos_analisis = {};
  if (propuesta.analisis) {
    datos.etapa = "Propuesta de análisis enviada";

    /** PAGOS DE ANÁLISIS DE NEGOCIO (ÚNICO o DIVIDIDO) */
    pagos_analisis.unico = JSON.parse(pay.analisis_negocio);
    pagos_analisis.uno = JSON.parse(pay.analisis_negocio1);
    pagos_analisis.dos = JSON.parse(pay.analisis_negocio2);
    pagos_analisis.tres = JSON.parse(pay.analisis_negocio3);

    pagos_analisis.unico.color =
      pagos_analisis.uno.color =
      pagos_analisis.dos.color =
      pagos_analisis.tres.color =
        "warning";
    pagos_analisis.unico.txt =
      pagos_analisis.uno.txt =
      pagos_analisis.dos.txt =
      pagos_analisis.tres.txt =
        "Pendiente";
    pagos_analisis.unico.btn = pagos_analisis.uno.btn = true;
    pagos_analisis.dos.btn = pagos_analisis.tres.btn = false;

    pagos_analisis.unico.precio = parseFloat(
      propuesta.analisis.precio_total * 0.9
    );
    pagos_analisis.uno.precio = propuesta.analisis.precio_per1;
    pagos_analisis.dos.precio = propuesta.analisis.precio_per2;
    pagos_analisis.tres.precio = propuesta.analisis.precio_per3;

    if (pagos_analisis.unico.estado == 1) {
      propuesta.analisis.precio_total = propuesta.analisis.precio_total;
      datos.etapa = "Análisis de negocio pago único";
      pagos_analisis.unico.color = "success";
      pagos_analisis.unico.txt = "Pagado 100%";
      propuesta.analisis.pago = true;
      pagos_analisis.unico.btn = false;
    }
    if (pagos_analisis.uno.estado == 2) {
      datos.etapa = "Análisis de negocio - Pagado 60%";
      pagos_analisis.uno.color = "success";
      pagos_analisis.uno.txt = "Pagado 60%";
      propuesta.analisis.pago = true;
      pagos_analisis.uno.btn = false;
      pagos_analisis.dos.btn = true;
    }
    if (pagos_analisis.dos.estado == 2) {
      datos.etapa = "Análisis de negocio - Pagado 80%";
      pagos_analisis.dos.color = "success";
      pagos_analisis.dos.txt = "Pagado 80%";
      pagos_analisis.dos.btn = false;
      pagos_analisis.tres.btn = true;
    }
    if (pagos_analisis.tres.estado == 2) {
      datos.etapa = "Análisis de negocio - Pagado 100%";
      pagos_analisis.tres.color = "success";
      pagos_analisis.tres.txt = "Pagado 100%";
      pagos_analisis.tres.btn = false;
    }
  }

  if (informeProd) {
    info.prod.fecha = informeProd.fecha;
    info.prod.ver = "block";
    info.prod.url = informeProd.url;
    datos.etapa = "Informe análisis dimensión producto";
  }

  if (informeAdmin) {
    info.adm.fecha = informeAdmin.fecha;
    info.adm.ver = "block";
    info.adm.url = informeAdmin.url;
    datos.etapa = "Informe análisis dimensión administración";
  }

  if (informeOperaciones) {
    info.op.fecha = informeOperaciones.fecha;
    info.op.ver = "block";
    info.op.url = informeOperaciones.url;
    datos.etapa = "Informe análisis dimensión operaciones";
  }

  if (informeMarketing) {
    info.marketing.fecha = informeMarketing.fecha;
    info.marketing.ver = "block";
    info.marketing.url = informeMarketing.url;
    datos.etapa = "Informe análisis dimensión marketing";
  }

  if (informeAnalisis) {
    info.analisis.fecha = informeAnalisis.fecha;
    info.analisis.ver = "block";
    info.analisis.url = informeAnalisis.url;
    datos.etapa = "Informe general de análisis de negocio";
  }

  if (informePlan) {
    // info.plan.ok = true;
    info.plan.fecha = informePlan.fecha;
    info.plan.ver = "block";
    info.plan.url = informePlan.url;
    datos.etapa = "Informe de plan estratégico de negocio";
  }

  /************** DATOS PARA LAS GRÁFICAS AREAS VITALES & POR DIMENSIONES & PERCEPCIÓN ESTADÍSTICA ****************/
  /**
   * PC => Percepción Cliente
   * PE => Percepción Estadística
   */
  let jsonIndicadores = {},
    nuevosProyectos = 0,
    rendimiento = {};
  const areasVitales_ = (
    await helpers.consultarDatos("indicadores_areasvitales")
  ).filter((x) => x.id_empresa == idEmpresa);
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
  const resulCateg = (
    await helpers.consultarDatos("resultado_categorias")
  ).filter((x) => x.id_empresa == idEmpresa);
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
  const xDimensiones_ = (
    await helpers.consultarDatos("indicadores_dimensiones")
  ).filter((x) => x.id_empresa == idEmpresa);
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
  const pe_areasVitales_ = (
    await helpers.consultarDatos("percepcion_estadistica_areas")
  ).filter((x) => x.empresa == idEmpresa);
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

  const pe_dimensiones_ = (
    await helpers.consultarDatos("percepcion_estadistica_dimensiones")
  ).filter((x) => x.empresa == idEmpresa);
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
  /** ANÁLISIS DE NEGOCIO POR DIMENSIONES - RESPUESTAS DE CUESTIONARIOS */
  let dimProducto = false,
    dimAdmin = false,
    dimOperacion = false,
    dimMarketing = false;
  const analisisDimensiones = (
    await helpers.consultarDatos("analisis_empresa")
  ).find((x) => x.id_empresa == idEmpresa);
  if (analisisDimensiones) {
    const dimension = analisisDimensiones;
    if (dimension.producto) {
      const prod = JSON.parse(dimension.producto);
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
      };
    }
    if (dimension.administracion) {
      const admin = JSON.parse(dimension.administracion);
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
    if (dimension.operacion) {
      const op = JSON.parse(dimension.operacion);
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
    if (dimension.marketing) {
      const mark = JSON.parse(dimension.marketing);
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
        estrategias: mark.estrategias,
      };
    }
  }
  let divInformes = false;
  const filaInforme = {
    producto: false,
    administracion: false,
    operaciones: false,
    marketing: false,
  };
  if (dimProducto || dimAdmin || dimOperacion || dimMarketing) {
    divInformes = true;
    if (dimProducto) filaInforme.producto = true;
    if (dimAdmin) filaInforme.administracion = true;
    if (dimOperacion) filaInforme.operaciones = true;
    if (dimMarketing) filaInforme.marketing = true;
    if (dimProducto && dimAdmin && dimOperacion && dimMarketing)
      filaInforme.completo = true;
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

  //     const archivosEmpresarial = await helpers.consultarDatos("archivos_plan_empresarial", `WHERE empresa = ${idEmpresa}`)
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
  propuesta.estrategico = propuestas.find(
    (i) => i.empresa == idEmpresa && i.tipo_propuesta == "Plan estratégico"
  );
  let pagoEstrategico = {};
  if (propuesta.estrategico) {
    datos.etapa = "Propuesta de plan estratégico enviada";

    // PAGO DE PLAN ESTRATÉGICO
    pagoEstrategico = JSON.parse(pay.estrategico);
    pagoEstrategico.color = "warning";
    pagoEstrategico.txt = "Pendiente";
    pagoEstrategico.btn = false;
    pagoEstrategico.precio = propuesta.estrategico.precio_total;

    /** VALIDANDO ESTADO DE LA SUBSCRIPCIÓN - POR SI RENUEVA O NO LA SUB */
    let id_sub = null;
    let subscription = null;
    if (pagoEstrategico.subscription) {
      id_sub = pagoEstrategico.subscription;
      subscription = await stripe.subscriptions.retrieve(id_sub);
      if (subscription.cancel_at != null) {
        pagoEstrategico.fechaCancelacion = new Date(
          subscription.cancel_at * 1000
        ).toLocaleDateString("en-US");
      } else {
        pagoEstrategico.fechaCancelacion = false;
      }
      console.log("\n>>> DATA SUBSCRIPTION DESDE ADMIN ===> ", subscription);
      console.log("\n*******************\n");
      if (
        subscription.status == "active" &&
        !subscription.cancel_at_period_end &&
        subscription.cancel_at != null
      ) {
        datos.etapa = "Pago por subscripción de plan estratégico iniciado";
        pagoEstrategico.color = "success";
        pagoEstrategico.txt = "Activa";
        pagoEstrategico.btn = true;
        propuesta.estrategico.pago = true;
        propuesta.pagada = true;
      } else if (
        subscription.status == "active" &&
        subscription.cancel_at_period_end &&
        subscription.cancel_at != null
      ) {
        datos.etapa = "Subscripción de plan estratégico pendiente por cancelar";
        pagoEstrategico.txt = "Pendiente por cancelar";
        pagoEstrategico.color = "secondary";
        pagoEstrategico.btn = false;
        propuesta.estrategico.pago = true;
        propuesta.pagada = true;
      } else if (
        subscription.status == "active" &&
        !subscription.cancel_at_period_end &&
        subscription.cancel_at == null
      ) {
        datos.etapa = "Subscripción de plan estratégico pendiente por renovar";
        pagoEstrategico.txt = "Pendiente por renovar";
        pagoEstrategico.color = "info";
        pagoEstrategico.btn = true;
        propuesta.estrategico.pago = true;
        propuesta.pagada = true;
      } else {
        datos.etapa = "Subscripción de plan estratégico cancelada";
        pagoEstrategico.color = "danger";
        pagoEstrategico.txt = "Cancelada";
        pagoEstrategico.btn = false;
        propuesta.estrategico.pago = true;
      }
    }
  }

  // PROCESO PARA LAS TAREAS DE LA EMPRESA (PLAN ESTRATÉGICO)
  const dimObj = await helpers.tareasGenerales(idEmpresa, fechaActual);
  const tareas = dimObj.tareas;
  let jsonDim = false;
  if (tareas.todas.length > 0) {
    const listo = dimObj.listo;
    // jsonDim => Array para la gráfica de Plan Estratégico
    jsonDim = JSON.stringify([
      { ok: Math.round(listo[0]), pendiente: Math.round(100 - listo[0]) },
      { ok: Math.round(listo[1]), pendiente: Math.round(100 - listo[1]) },
      { ok: Math.round(listo[2]), pendiente: Math.round(100 - listo[2]) },
      { ok: Math.round(listo[3]), pendiente: Math.round(100 - listo[3]) },
    ]);
  }

  let datosTabla = (await helpers.consultarDatos("rendimiento_empresa")).filter((x) => x.empresa == idEmpresa);
  let jsonRendimiento = false;
  if (datosTabla.length > 0) jsonRendimiento = JSON.stringify(datosTabla);
  const rentabilidad_actual = ((datosTabla[datosTabla.length - 1]).rentabilidad).toFixed(2);

  /*************************************************************************************************** */
  // Objeto para Botones de las tarjetas con base a la etapa del consultor
  let rolAdmin = false,
    consultorDash = false,
    itemActivo = 3,
    adminDash = true;
  const botonesEtapas = { uno: false, dos: false, plan1: false, plan2: false };

  // VALIDAR EL ROL DEL USUARIO
  if (req.user.rol == "Admin") {
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

    let cLogin = await helpers.consultarDatos("consultores"); // Consulta a la tabla de consultores
    cLogin = cLogin.find((i) => i.codigo == req.user.codigo); // Buscando el código del consultor logueado
    // Filtro para saber a que etapas de la empresa está asignado el consultor
    const etapasAsignadas = consultores_asignados.filter(
      (x) => x.idConsultor == cLogin.id_consultores
    );
    console.group("\n* Soy un consultor - ETAPAS ASIGNADAS");
    console.log(etapasAsignadas);
    console.log(botonesEtapas);
    console.groupEnd();
    if (etapasAsignadas.length > 0) {
      etapasAsignadas.forEach((x) => {
        console.log("X Etapa -> ", x.etapa);
        x.orden == 1 ? (botonesEtapas.uno = true) : false;
        x.orden == 2 ? (botonesEtapas.dos = true) : false;
        x.orden == 3 ? (botonesEtapas.plan1 = true) : false;
        x.orden == 4 ? (botonesEtapas.plan2 = true) : false;
      });
    }

    console.log("BOTONES ETAPAS - RESULTADO >> ", botonesEtapas);
  }

  let tab_tareaAsignada;
  if (botonesEtapas.uno) tab_tareaAsignada = "color: #85bb65;";
  if (botonesEtapas.dos) tab_tareaAsignada = "color: #85bb65;";
  if (botonesEtapas.plan1) tab_tareaAsignada = "color: #85bb65;";
  if (botonesEtapas.plan2) tab_tareaAsignada = "color: #85bb65;";

  // VALIDANDO CUALES TAREAS ESTÁN COMPLETADAS (EN GENERAL)
  // TAREAS PLAN EMPRESARIAL
  // if (tareasEmpresarial) {
  //     tareasEmpresarial.forEach(x => {
  //         botonesEtapas.plan1 ? x.taskBtns = true : x.taskBtns = false;
  //     })
  // }

  // TAREAS PLAN ESTRATÉGICO
  if (tareas) {
    tareas.todas.forEach((x) => {
      botonesEtapas.plan2 ? (x.taskBtns = true) : (x.taskBtns = false);
    });
  }

  let tblConclusiones = await helpers.consultarDatos("conclusiones");
  tblConclusiones = tblConclusiones.filter((x) => x.id_empresa == idEmpresa);
  let objconclusion = {};

  if (tblConclusiones) {
    const e1 = tblConclusiones.find((i) => i.etapa == 1);
    if (e1) {
      objconclusion.e1 = e1.conclusion;
    }

    const e2 = tblConclusiones.find((i) => i.etapa == 2);
    if (e2) {
      objconclusion.e2 = e2.conclusion;
    }

    const e3 = tblConclusiones.find((i) => i.etapa == 3);
    if (e3) {
      objconclusion.e3 = e3.conclusion;
    }

    const e4 = tblConclusiones.find((i) => i.etapa == 4);
    if (e4) {
      objconclusion.e4 = e4.conclusion;
    }
  }

  /******************************************************************************
   * SOLICITUD DE ARCHIVOS PARA LAS ETAPAS 2, 3 Y 4
   */
  let archivos_solicitados = {};
  archivos_solicitados.analisis = await helpers.consultarDatos(
    "archivos_analisis"
  );
  archivos_solicitados.analisis = archivos_solicitados.analisis.filter(
    (x) => x.empresa == idEmpresa
  );
  archivos_solicitados.analisis.forEach((x) => {
    x.color = "warning";
    x.estado = "Pendiente";
    if (x.link) {
      x.color = "success";
      x.estado = "Cargado";
    }
  });
  archivos_solicitados.empresarial = await helpers.consultarDatos(
    "archivos_empresarial"
  );
  archivos_solicitados.empresarial = archivos_solicitados.empresarial.filter(
    (x) => x.empresa == idEmpresa
  );
  archivos_solicitados.empresarial.forEach((x) => {
    x.color = "warning";
    x.estado = "Pendiente";
    if (x.link) {
      x.color = "success";
      x.estado = "Cargado";
    }
  });
  archivos_solicitados.estrategico = await helpers.consultarDatos(
    "archivos_estrategico"
  );
  archivos_solicitados.estrategico = archivos_solicitados.estrategico.filter(
    (x) => x.empresa == idEmpresa
  );
  archivos_solicitados.estrategico.forEach((x) => {
    x.color = "warning";
    x.estado = "Pendiente";
    if (x.link) {
      x.color = "success";
      x.estado = "Cargado";
    }
  });
  /******************************************************************************/

  res.render("admin/editarEmpresa", {
    adminDash,
    consultorDash,
    itemActivo,
    empresa,
    formEdit: true,
    datos,
    consultores,
    aprobarConsultor,
    frmDiag,
    frmInfo,
    consultores_asignados,
    divConsultores,
    jsonIndicadores: JSON.stringify(jsonIndicadores),
    cuestionario,
    nuevosProyectos,
    rendimiento,
    graficas2: true,
    propuesta,
    pagos_analisis,
    divInformes,
    filaInforme,
    pagoEstrategico,
    info,
    dimProducto,
    dimAdmin,
    dimOperacion,
    dimMarketing,
    tareas,
    jsonDim,
    jsonRendimiento,
    fechaActual,
    pagoDg_Realizado,
    rolAdmin,
    botonesEtapas,
    objconclusion,
    datosUsuario: JSON.stringify(req.user),
    tab_tareaAsignada,
    archivos_solicitados,
    rentabilidad_actual
  });
};

dashboardController.conclusiones = async (req, res) => {
  const { id_empresa, etapa, conclusion } = req.body;
  let row = await helpers.consultarDatos("conclusiones");

  row = row.find((x) => x.id_empresa == id_empresa && x.etapa == etapa);
  console.log(" ROW ==>", row);
  if (row) {
    const obj = { conclusion };
    await pool.query(
      "UPDATE conclusiones SET ? WHERE id_empresa = ? AND etapa = ?",
      [obj, id_empresa, etapa]
    );
  } else {
    const objConclusion = { id_empresa, etapa, conclusion };
    await helpers.insertarDatos("conclusiones", objConclusion);
  }
  res.send(true);
};

dashboardController.actualizarEmpresa = async (req, res) => {
  const { idEmpresa, codigo, estadoAdm, mapa } = req.body;
  const mapaConsultores = new Map(Object.entries(mapa));
  console.log("mapaConsultores > ", mapaConsultores);

  const linkBase = "https://3csigma.com/app_public_files/emails_consultor/";
  // Consultar Datos de la empresa
  let empresa = await helpers.consultarDatos("empresas");

  empresa = empresa.find((x) => x.codigo == codigo);
  console.log("Empresa Actual --> ", empresa);

  // Consultores Asignados
  const asignados = await helpers.consultarDatos(
    "consultores_asignados",
    `WHERE empresa = "${idEmpresa}"`
  );
  for (const [key, value] of mapaConsultores) {
    const filtro = asignados.find((x) => x.etapa == key);
    // console.log("\n FILTRO ---> ", filtro)
    let orden = 1;
    let link_Imagen = "";
    let mensaje =
      "Recibirás instrucciones sobre como continuar en tu plataforma 3C sigma o a través de tu correo";
    if (key == "Diagnóstico") {
      link_Imagen = linkBase + "Consultor-asignado_Diagnostico.jpg";
      mensaje = "Ahora puedes realizar el pago del Diagnóstico de Negocio";
    }
    if (key == "Análisis") {
      orden = 2;
      link_Imagen = linkBase + "Consultor-asignado_analisis.jpg";
    }
    if (key == "Plan Empresarial") {
      orden = 3;
      link_Imagen = linkBase + "Consultor-asignado_Plan_Empresarial.jpg";
    }
    if (key == "Plan Estratégico") {
      orden = 4;
      link_Imagen = linkBase + "Consultor-asignado_Plan_Estrategico.jpg";
    }
    if (filtro) {
      const dato = { consultor: value.id };
      if (value.sede) {
        dato.sede = value.sede;
      }
      await pool.query(
        "UPDATE consultores_asignados SET ? WHERE empresa = ? AND etapa = ?",
        [dato, idEmpresa, key]
      );
    } else {
      const datos = {
        consultor: value.id,
        empresa: idEmpresa,
        etapa: key,
        orden,
      };
      if (value.sede) {
        datos.sede = value.sede;
      }
      await helpers.insertarDatos("consultores_asignados", datos);

      /** INFO PARA ENVÍO DE EMAIL A LA EMPRESA - NOTIFICANDO CONSULTOR ASIGNADO */
      console.log("Enviando email de consultor Asignado - Etapa: " + key);
      const asunto = "Tu Consultor ha sido asignado para la etapa de " + key;
      const plantilla = consultorAsignadoHTML(
        empresa.nombre_empresa,
        link_Imagen,
        mensaje
      );
      const resultEmail = await sendEmail(empresa.email, asunto, plantilla);
      if (resultEmail == false) {
        console.log(
          "\nOcurrio un error inesperado al enviar el email consultor asignado"
        );
      } else {
        console.log(
          "\n<<<<< Se envío emails de consultor(es) asignados a la empresa - Email: " +
            empresa.email +
            " >>>>>\n"
        );
      }

      /** INFO PARA ENVÍO DE EMAIL A LA EMPRESA - NOTIFICANDO CONSULTOR ASIGNADO */
      let consultor = await helpers.consultarDatos("consultores");
      consultor = consultor.find((x) => x.id_consultores == value.id);
      console.log(
        "\nEnviando email para el consultor de que fue Asignado a una empresa en la Etapa: " +
          key
      );
      const subject = "Has sido asignado a una empresa para la etapa de " + key;
      const template = consultor_AsignadoEtapa(
        consultor.nombres,
        empresa.nombre_empresa,
        key
      );
      const resultConsultor = await sendEmail(
        consultor.email,
        subject,
        template
      );
      if (resultConsultor == false) {
        console.log(
          "\nOcurrio un error inesperado al enviar el email *Haz sido asignado a una empresa*"
        );
      } else {
        console.log(
          "\n<<<<< Se envío email para el consultor de que ha sido asignado a una empresa - Email Consultor: " +
            consultor.email +
            " >>>>>\n"
        );
      }
    }
  }

  // Cambiando estado de la cuenta de la empresa (Activa o Bloqueada)
  const estado = { estadoAdm };
  await pool.query(
    'UPDATE users SET ? WHERE codigo = ? AND rol = "Empresa"',
    [estado, codigo],
    (err, result) => {
      if (err) {
        res.send(false);
        throw err;
      }
      res.send(true);
    }
  );
};

dashboardController.bloquearEmpresa = async (req, res) => {
  const { id } = req.body;
  let respu = false;
  const actualizar = { estadoAdm: 0 };
  const empresa = await pool.query(
    "SELECT id_empresas, codigo FROM empresas WHERE id_empresas = ? LIMIT 1",
    [id]
  );
  if (empresa.length > 0) {
    const e = await pool.query(
      'SELECT * FROM users WHERE codigo = ?  AND rol = "Empresa"',
      [empresa[0].codigo]
    );
    if (e.length > 0 && e[0].estadoAdm == 0) {
      res.send(respu);
    } else {
      await pool.query(
        'UPDATE users SET ? WHERE codigo = ? AND rol = "Empresa"',
        [actualizar, empresa[0].codigo],
        (err, result) => {
          if (err) throw err;
          if (result.affectedRows > 0) {
            respu = true;
          }
          res.send(respu);
        }
      );
    }
  }
};

/** PAGOS MANUALES ETAPA 1 y 2 */
dashboardController.pagoManualDiagnostico = async (req, res) => {
  const { id, precio } = req.body;
  const pagos = await helpers.consultarDatos("pagos");
  let pago_empresa = pagos.find((i) => i.id_empresa == id);
  const fecha = new Date().toLocaleDateString("en-US");
  const data = { estado: 1, fecha, precio };
  const actualizarPago = { diagnostico_negocio: JSON.stringify(data) };
  await pool.query(
    "UPDATE pagos SET ? WHERE id_empresa = ?",
    [actualizarPago, id],
    (err, result) => {
      if (err) throw err;
      res.send(result);
    }
  );
};

dashboardController.pagoManualEmpresas = async (req, res) => {
  const { num, id, etapa, precio } = req.body;
  const fecha = new Date().toLocaleDateString("en-US");
  let actualizarPago = false;
  const data = { estado: 2, fecha };

  if (etapa == 2) {
    if (num == 0) {
      actualizarPago = {
        analisis_negocio: JSON.stringify({ estado: 1, fecha, precio }),
        analisis_negocio1: JSON.stringify({ estado: 0 }),
      };
    } else if (num == 1) {
      actualizarPago = { analisis_negocio1: JSON.stringify(data) };
    } else if (num == 2) {
      actualizarPago = { analisis_negocio2: JSON.stringify(data) };
    } else {
      actualizarPago = { analisis_negocio3: JSON.stringify(data) };
    }
  } else if (etapa == 3) {
    actualizarPago = {
      estrategico: JSON.stringify({ estado: 1, fecha }),
    };
  } else {
    if (num == 0) {
      actualizarPago = {
        empresarial0: JSON.stringify({ estado: 1, fecha }),
        empresarial1: JSON.stringify({ estado: 0 }),
      };
    } else if (num == 1) {
      actualizarPago = { empresarial1: JSON.stringify(data) };
    } else if (num == 2) {
      actualizarPago = { empresarial2: JSON.stringify(data) };
    } else {
      actualizarPago = { empresarial3: JSON.stringify(data) };
    }
  }

  await pool.query(
    "UPDATE pagos SET ? WHERE id_empresa = ?",
    [actualizarPago, id],
    (err, result) => {
      if (err) throw err;
      if (result.affectedRows > 0) res.send(true);
      else res.send(false);
    }
  );
};

// CUESTIONARIO DIAGNÓSTICO DE NEGOCIO EXCEL (EMPRESA ESTABLECIDA)
dashboardController.cuestionario = async (req, res) => {
  const { codigo } = req.params;
  let linkCerrar = "/diagnostico-de-negocio";
  if (req.user.rol != "Empresa") {
    linkCerrar = `/empresas/${codigo}#diagnostico_`;
  }

  const preguntas = {
    "producto": [...preguntas1.producto],
    "propuesta": [...preguntas1.porpuesta_valor],
    "rAdmin": [...preguntas1.recursos_admin],
    "rFinancieros": [...preguntas1.recursos_financieros],
    "rHumano": [...preguntas1.recursos_humanos],
    "estrategica": [...preguntas1.planeacion_estrategica],
    "operativos": [...preguntas1.procesos_operativos],
    "integracion": [...preguntas1.integracion],
    "modelo_negocio": [...preguntas1.modelo_negocio],
    "asistencia": [...preguntas1.asistencia_cliente],
    "marketing": [...preguntas1.marketing],
    "ventas": [...preguntas1.ventas],
  }

  res.render("consultor/cuestionario", {
    wizarx: true,
    user_dash: false,
    adminDash: false,
    codigo,
    rolUser: req.user.rol,
    linkCerrar,
    preguntas
  });
};
dashboardController.enviarCuestionario = async (req, res) => {
  const { codigoEmpresa, zhActualAdm, rolUser } = req.body;
  // Capturar Fecha de guardado
  const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm });
  // Capturar ID Empresa
  const dataEmpresa = (await helpers.consultarDatos("empresas")).find((x) => x.codigo == codigoEmpresa);
  const id_empresa = dataEmpresa.id_empresas;
  // Datos individuales del Formulario
  const { rubro, e_ofrece, producto_ofrece, servicio_ofrece } = req.body;

  // RENDIMIENTO EMPRESA
  let { total_ventas, total_compras, total_gastos } = req.body;

  let empresa_ofrece = { e_ofrece };
  producto_ofrece != "" ? (empresa_ofrece.producto_ofrece = producto_ofrece) : (empresa_ofrece.servicio_ofrece = servicio_ofrece);
  empresa_ofrece = JSON.stringify(empresa_ofrece);

  const data = {
    producto: [],
    propuesta: [],
    rAdmin: [],
    rFinancieros: [],
    rHumano: [],
    estrategica: [],
    operativos: [],
    integracion: [],
    modelo_negocio: [],
    asistencia: [],
    marketing: [],
    ventas: []
  };

  const calificaciones = {
    producto: parseFloat(req.body.calificacion_producto),
    propuesta: parseFloat(req.body.calificacion_propuesta),
    rAdmin: parseFloat(req.body.calificacion_admin),
    rFinancieros: parseFloat(req.body.calificacion_financieros),
    rHumano: parseFloat(req.body.calificacion_rHumano),
    estrategica: parseFloat(req.body.calificacion_estrategica),
    operativos: parseFloat(req.body.calificacion_operativos),
    integracion: parseFloat(req.body.calificacion_integracion),
    modelo_negocio: parseFloat(req.body.calificacion_negocio),
    asistencia: parseFloat(req.body.calificacion_asistencia),
    marketing: parseFloat(req.body.calificacion_marketing),
    ventas: parseFloat(req.body.calificacion_ventas)
  };  

  console.log("calificaciones::::: ");
  console.log(calificaciones);

  const keys = Object.keys(data);
  for (let i = 0; i < 10; i++) {
    keys.forEach(key => {
        const reqKey = `${key}${i}`;
        data[key].push(req.body[reqKey]);
    });
  }
  // Verificar el tamaño de los arrays, sea 10
  const arraysSizeTen = keys.every(key => data[key].length === 10);
  if (arraysSizeTen) {
    // Agregar las calificaciones a los arrays correspondientes
    keys.forEach(key => {
      if (calificaciones.hasOwnProperty(key)) {
          data[key].push(calificaciones[key]);
      }
    });
  }

  // Creando Objetos para guardar en la base de datos
  const nuevoDiagnostico = {
    id_empresa,
    fecha,
    rubro,
    empresa_ofrece,
    productos_servicios: JSON.stringify(data.producto),
    propuesta_valor: JSON.stringify(data.propuesta),
    recursos_administrativos: JSON.stringify(data.rAdmin),
    recursos_financieros: JSON.stringify(data.rFinancieros),
    recursos_humano: JSON.stringify(data.rHumano),
    planeacion_estrategica: JSON.stringify(data.estrategica),
    procesos_operativos: JSON.stringify(data.operativos),
    integracion: JSON.stringify(data.integracion),
    modelo_negocio: JSON.stringify(data.modelo_negocio),
    asistencia: JSON.stringify(data.asistencia),
    marketing: JSON.stringify(data.marketing),
    ventas: JSON.stringify(data.ventas)
  };

  // Guardando en la Base de datos
  const cuestionario = await helpers.insertarDatos("dg_empresa_establecida", nuevoDiagnostico);
  if (cuestionario.affectedRows > 0) {
    const preguntas_producto = [...preguntas1.producto]
    const preguntas_propuesta = [...preguntas1.porpuesta_valor]
    const preguntas_rAdmin = [...preguntas1.recursos_admin]
    const preguntas_rFinancieros = [...preguntas1.recursos_financieros]
    const preguntas_rHumano = [...preguntas1.recursos_humanos]
    const preguntas_estrategica = [...preguntas1.planeacion_estrategica]
    const preguntas_operativos = [...preguntas1.procesos_operativos]
    const preguntas_integracion = [...preguntas1.integracion]
    const preguntas_modelo_negocio = [...preguntas1.modelo_negocio]
    const preguntas_asistencia = [...preguntas1.asistencia_cliente]
    const preguntas_marketing = [...preguntas1.marketing]
    const preguntas_ventas = [...preguntas1.ventas]

    /************************************************************************************************* */
    // RENDIMIENTO DE LA EMPRESA
    const parseAndClean = (value) => {
      const num = value.replace(/\$/g, '').replace(/ /g, '');
      // Reemplazar coma por punto
      return parseFloat(num.replace(',', '.'));
    };

    total_ventas = parseAndClean(total_ventas);
    total_compras = parseAndClean(total_compras);
    total_gastos = parseAndClean(total_gastos);
   
    const rentabilidad = (((total_ventas - (total_compras + total_gastos)) / total_ventas) * 100).toFixed(2);
    const utilidad = total_ventas - total_compras - total_gastos;

    const nuevoRendimiento = {
      empresa: id_empresa,
      total_ventas,
      total_compras,
      total_gastos,
      rentabilidad,
      utilidad,
      fecha: new Date().toLocaleDateString("en-US"),
    };

    const rendimientos = (await helpers.consultarDatos("rendimiento_empresa")).filter((x) => x.empresa == id_empresa);
    const calculatePercentage = (total, prevTotal) => ((total - prevTotal) / prevTotal) * 100;
    
    if (rendimientos.length > 0) {
      const ventas1 = parseFloat(rendimientos[0].total_ventas);
      const utilidad1 = parseFloat(rendimientos[0].utilidad);

      nuevoRendimiento.porcentaje_ventas = calculatePercentage(total_ventas, ventas1);
      nuevoRendimiento.porcentaje_utilidad = calculatePercentage(utilidad, utilidad1);

      if (rendimientos.length === 2) {
        const ventas2 = parseFloat(rendimientos[1].total_ventas);
        const utilidad2 = parseFloat(rendimientos[1].utilidad);

        nuevoRendimiento.porcentaje_ventas = calculatePercentage(total_ventas, ventas2);
        nuevoRendimiento.porcentaje_utilidad = calculatePercentage(utilidad, utilidad2);
      }

      nuevoRendimiento.porcentaje_ventas = nuevoRendimiento.porcentaje_ventas.toFixed(2);
      nuevoRendimiento.porcentaje_utilidad = nuevoRendimiento.porcentaje_utilidad.toFixed(2);
    }

    const rendimiento = await helpers.insertarDatos("rendimiento_empresa", nuevoRendimiento );
    /************************************************************************************************************
     * CÁLCULANDO LA PERCEPCIÓN ESTADÍSTICA
    ************************************************************************************************************/
    // Función para calcular el PE por áreas
    const calcularPE = (areas, data) => {
      const siConteo = areas.map(area => ({area, si: data[area].filter(item => item === 'Si').length}));
      const sumatoria = siConteo.reduce((sum, { si }) => sum + si, 0);
      const pe = (sumatoria / areas.length).toFixed(2);
    
      return { pe, siConteo };
    };
    // 
    /**
     * Definir las áreas para cada caso
    */
    const areasPE1 = ['producto', 'propuesta']; // SISTEMA DE SOLUCIONES Y VALOR
    const areasPE2 = ['rAdmin', 'rFinancieros', 'rHumano']; // GESTION DE RECURSOS
    const areasPE3 = ['estrategica', 'operativos', 'integracion', 'modelo_negocio']; // OPERACIONAL
    const areasPE4 = ['asistencia', 'marketing', 'ventas']; // COMERCIALIZACIÓN

    // Calcular PE para cada caso
    const _Soluciones = calcularPE(areasPE1, data);
    const _Gestion = calcularPE(areasPE2, data);
    const _Operacional = calcularPE(areasPE3, data);
    const _Comercializacion = calcularPE(areasPE4, data);

    console.log(`\nSISTEMA DE SOLUCIONES Y VALOR`);
    console.log(_Soluciones);
    console.log(`GESTION DE RECURSOS`);
    console.log(_Gestion);
    console.log(`OPERACIONAL`);
    console.log(_Operacional);
    console.log(`COMERCIALIZACIÓN`);
    console.log(_Comercializacion);

    /************************************************************************************************* */
    // Rendimiento Operativo Empresarial (Percepción Cliente)
    let rendimiento_operativo = parseFloat(
      calificaciones.producto +
      calificaciones.propuesta +
      calificaciones.rAdmin +
      calificaciones.rFinancieros +
      calificaciones.rHumano +
      calificaciones.estrategica +
      calificaciones.operativos +
      calificaciones.integracion +
      calificaciones.modelo_negocio +
      calificaciones.asistencia + 
      calificaciones.marketing +
      calificaciones.ventas
    )

    console.log("rendimiento_operativo:: ", rendimiento_operativo);

    rendimiento_operativo = (parseFloat(rendimiento_operativo/1.2)).toFixed(2);

    const areasVitales = {
      id_empresa,
      productos_servicios: calificaciones.producto,
      propuesta_valor: calificaciones.propuesta,
      recursos_administrativos: calificaciones.rAdmin,
      recursos_financieros: calificaciones.rFinancieros,
      recursos_humano: calificaciones.rHumano,
      planeacion_estrategica: calificaciones.estrategica,
      procesos_operativos: calificaciones.operativos,
      integracion: calificaciones.integracion,
      modelo_negocio: calificaciones.modelo_negocio,
      asistencia: calificaciones.asistencia,
      marketing: calificaciones.marketing,
      ventas: calificaciones.ventas,
      rendimiento_operativo
    };

    const areasDimensiones = {
      id_empresa,
      soluciones_valor: parseFloat((calificaciones.producto + calificaciones.propuesta) / 2).toFixed(2),
      gestion_recursos: parseFloat((calificaciones.rAdmin + calificaciones.rFinancieros + calificaciones.rHumano) / 3).toFixed(2),
      operacional: parseFloat((calificaciones.estrategica + calificaciones.operativos + calificaciones.integracion + calificaciones.modelo_negocio) / 4),
      comercializacion: parseFloat((calificaciones.asistencia + calificaciones.marketing + calificaciones.ventas) / 3).toFixed(2)
    };

    const datos_pe_areas = {
      empresa: id_empresa,
      productos_servicios: _Soluciones.siConteo[0].si,
      propuesta_valor: _Soluciones.siConteo[1].si,
      recursos_administrativos: _Gestion.siConteo[0].si,
      recursos_financieros: _Gestion.siConteo[1].si,
      recursos_humano: _Gestion.siConteo[2].si,
      planeacion_estrategica: _Operacional.siConteo[0].si,
      procesos_operativos: _Operacional.siConteo[1].si,
      integracion: _Operacional.siConteo[2].si,
      modelo_negocio: _Operacional.siConteo[3].si,
      asistencia: _Comercializacion.siConteo[0].si,
      marketing: _Comercializacion.siConteo[1].si,
      ventas: _Comercializacion.siConteo[2].si,
    };

    // Rendimiento Operativo Empresarial (Percepción Estadística)
    let sumaPE_ = 0;
    for (const key in datos_pe_areas) {
      if (key !== 'empresa') {
        sumaPE_ += parseFloat(datos_pe_areas[key]);
      }
    }
    sumaPE_ = parseFloat(sumaPE_/1.2)
    datos_pe_areas.rendimiento_operativo = sumaPE_.toFixed(2);

    const datos_pe_dimensiones = {
      empresa: id_empresa,
      soluciones_valor: _Soluciones.pe,
      gestion_recursos: _Gestion.pe,
      operacional: _Operacional.pe,
      comercializacion: _Comercializacion.pe
    };

    const aVitales = await helpers.insertarDatos("indicadores_areasvitales", areasVitales);
    const aDimensiones = await helpers.insertarDatos("indicadores_dimensiones", areasDimensiones);
    const pe_areas = await helpers.insertarDatos("percepcion_estadistica_areas", datos_pe_areas);
    const pe_dimensiones = await helpers.insertarDatos("percepcion_estadistica_dimensiones", datos_pe_dimensiones);

    if (aVitales.affectedRows > 0 && aDimensiones.affectedRows > 0 && rendimiento.affectedRows > 0 && pe_areas.affectedRows > 0 && pe_dimensiones.affectedRows > 0) {
      console.log("\nINSERCIÓN COMPLETA DE LOS INDICADORES DE LA EMPRESA\n");
      /**
       * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS
       */
      const obj_respuestas = {
        'Área de Interés: PRODUCTOS O SERVICIOS' : {
            'Calidad y Consistencia' : {
                [preguntas_producto[0].txt]: data.producto[0],
              },
              'Disponibilidad y Accesibilidad' : {
              [preguntas_producto[1].txt]: data.producto[1],
            },
            'Integración en la Gama de Productos o Servicios Según Actividad Comercial' : {
              [preguntas_producto[2].txt]: data.producto[2],
            },
            'Presentación del Producto o Servicio' : {
              [preguntas_producto[3].txt]: data.producto[3],
            },
            'Nivel de Precio' : {
              [preguntas_producto[4].txt]: data.producto[4],
            },
            'Adaptabilidad a las Necesidades del Cliente' : {
              [preguntas_producto[5].txt]: data.producto[5],
            },
            'Postventa y Garantía' : {
              [preguntas_producto[6].txt]: data.producto[6],
            },
            'Feedback y Mejora Continua' : {
              [preguntas_producto[7].txt]: data.producto[7],
            },
            'Identificación con la Marca' : {
              [preguntas_producto[8].txt]: data.producto[8],
            },
            'Innovación y Desarrollo' : {
              [preguntas_producto[9].txt]: data.producto[9],
            },
            'Calificación' : {
              [preguntas_producto[10].txt]: data.producto[10],
            }
        },
        'Área de Interés: PROPUESTA DE VALOR' : {
          'Claridad' : {
            [preguntas_propuesta[0].txt]: data.propuesta[0],
          },
          'Beneficio' : {
            [preguntas_propuesta[1].txt]: data.propuesta[1],
          },
          'Diferenciación' : {
            [preguntas_propuesta[2].txt]: data.propuesta[2],
          },
          'Prueba o Validación' : {
            [preguntas_propuesta[3].txt]: data.propuesta[3],
          },
          'Relevancia del Beneficio' : {
            [preguntas_propuesta[4].txt]: data.propuesta[4],
          },
          'Coherencia Visual' : {
            [preguntas_propuesta[5].txt]: data.propuesta[5],
          },
          'Actualización' : {
            [preguntas_propuesta[6].txt]: data.propuesta[6],
          },
          'Feedback Positivo' : {
            [preguntas_propuesta[7].txt]: data.propuesta[7],
          },
          'Centrado en el Cliente' : {
            [preguntas_propuesta[8].txt]: data.propuesta[8],
          },
          'Conexión Emocional' : {
            [preguntas_propuesta[9].txt]: data.propuesta[9],
          },
          'Calificación' : {
            [preguntas_propuesta[10].txt]: data.propuesta[10],
          },
        },
        'Área de Interés: GESTION DE RECURSOS ADMINISTRATIVOS' : {
          'Recursos Materiales (MN)' : {
            [preguntas_rAdmin[0].txt]: data.rAdmin[0],
          },
          'Equipamiento Tecnológico (MN)' : {
            [preguntas_rAdmin[1].txt]: data.rAdmin[1],
          },
          'Software y Herramientas (MN)' : {
            [preguntas_rAdmin[2].txt]: data.rAdmin[2],
          },
          'Soluciones en la Nube' : {
            [preguntas_rAdmin[3].txt]: data.rAdmin[3],
          },
          'Sistemas Administrativos y Procedimientos' : {
            [preguntas_rAdmin[4].txt]: data.rAdmin[4],
          },
          'Comunicación Interna' : {
            [preguntas_rAdmin[5].txt]: data.rAdmin[5],
          },
          'Estructura Organizativa' : {
            [preguntas_rAdmin[6].txt]: data.rAdmin[6],
          },
          'Flujos de Trabajo' : {
            [preguntas_rAdmin[7].txt]: data.rAdmin[7],
          },
          'Adaptabilidad Tecnológica' : {
            [preguntas_rAdmin[8].txt]: data.rAdmin[8],
          },
          'Revisión de Sistemas' : {
            [preguntas_rAdmin[9].txt]: data.rAdmin[9],
          },
          'Calificación' : {
            [preguntas_rAdmin[10].txt]: data.rAdmin[10],
          },
        },
        'Área de Interés: GESTION DE RECURSOS FINACIEROS' : {
          'Planificación Financiera' : {
            [preguntas_rFinancieros[0].txt]: data.rFinancieros[0],
          },
          'Presupuestos' : {
            [preguntas_rFinancieros[1].txt]: data.rFinancieros[1],
          },
          'Estructura de Costos (MN)' : {
            [preguntas_rFinancieros[2].txt]: data.rFinancieros[2],
          },
          'Flujo de Efectivo' : {
            [preguntas_rFinancieros[3].txt]: data.rFinancieros[3],
          },
          'Fuentes de Ingreso Diversificadas (MN)' : {
            [preguntas_rFinancieros[4].txt]: data.rFinancieros[4],
          },
          'Acceso a Financiamiento' : {
            [preguntas_rFinancieros[5].txt]: data.rFinancieros[5],
          },
          'Cuentas por Pagar y Cobrar' : {
            [preguntas_rFinancieros[6].txt]: data.rFinancieros[6],
          },
          'Rentabilidad sobre las Ventas (ROS:Return on Sales)' : {
            [preguntas_rFinancieros[7].txt]: data.rFinancieros[7],
          },
          'Punto de Equilibrio' : {
            [preguntas_rFinancieros[8].txt]: data.rFinancieros[8],
          },
          'Análisis Financiero' : {
            [preguntas_rFinancieros[9].txt]: data.rFinancieros[9],
          },
          'Calificación' : {
            [preguntas_rFinancieros[10].txt]: data.rFinancieros[10],
          },
        },
        'Área de Interés: GESTION DEL RECURSO HUMANO' : {
          'Reconocimiento del Valor Individual' : {
            [preguntas_rHumano[0].txt]: data.rHumano[0],
          },
          'Desarrollo del Talento Humano' : {
            [preguntas_rHumano[1].txt]: data.rHumano[1],
          },
          'Retención del Talento' : {
            [preguntas_rHumano[2].txt]: data.rHumano[2],
            [preguntas_rHumano[3].txt]: data.rHumano[3],
          },
          'Remuneración Justa y Competitiva' : {
            [preguntas_rHumano[4].txt]: data.rHumano[4],
            [preguntas_rHumano[5].txt]: data.rHumano[5],
          },
          'Principales Funciones del Personal' : {
            [preguntas_rHumano[6].txt]: data.rHumano[6],
          },
          'Evaluación de Desempeño' : {
            [preguntas_rHumano[7].txt]: data.rHumano[7],
          },
          'Necesidades de Contratación' : {
            [preguntas_rHumano[8].txt]: data.rHumano[8],
          },
          'Proceso de Contratación' : {
            [preguntas_rHumano[9].txt]: data.rHumano[9],
          },
          'Calificación' : {
            [preguntas_rHumano[10].txt]: data.rHumano[10],
          },
        },
        'Área de Interés: PLANEACION ESTRATEGICA' : {
          'Comprensión del Mercado' : {
            [preguntas_estrategica[0].txt]: data.estrategica[0],
          },
          'Claridad en la Misión y Visión' : {
            [preguntas_estrategica[1].txt]: data.estrategica[1],
            [preguntas_estrategica[2].txt]: data.estrategica[2],
          },
          'Valores claros' : {
            [preguntas_estrategica[3].txt]: data.estrategica[3],
          },
          'Objetivos Definidos' : {
            [preguntas_estrategica[4].txt]: data.estrategica[4],
          },
          'Análisis FODA' : {
            [preguntas_estrategica[5].txt]: data.estrategica[5],
            [preguntas_estrategica[6].txt]: data.estrategica[6],
          },
          'Participación del Equipo' : {
            [preguntas_estrategica[7].txt]: data.estrategica[7],
          },
          'Evaluación de Competencia' : {
            [preguntas_estrategica[8].txt]: data.estrategica[8],
          },
          'Comunicación Estratégica' : {
            [preguntas_estrategica[9].txt]: data.estrategica[9],
          },
          'Calificación' : {
            [preguntas_estrategica[10].txt]: data.estrategica[10],
          },
        },
        'Área de Interés: PROCESOS OPERATIVOS' : {
          'Análisis y Mapeo de Procesos' : {
            [preguntas_operativos[0].txt]: data.operativos[0],
          },
          'Establecimiento de Objetivos Claros' : {
            [preguntas_operativos[1].txt]: data.operativos[1],
          },
          'Eficiencia' : {
            [preguntas_operativos[2].txt]: data.operativos[2],
          },
          'Flexibilidad' : {
            [preguntas_operativos[3].txt]: data.operativos[3],
          },
          'Medición y Monitoreo' : {
            [preguntas_operativos[4].txt]: data.operativos[4],
          },
          'Incorporación de Tecnología' : {
            [preguntas_operativos[5].txt]: data.operativos[5],
          },
          'Revisión Regular' : {
            [preguntas_operativos[6].txt]: data.operativos[6],
          },
          'Actividades Clave (MN)' : {
            [preguntas_operativos[7].txt]: data.operativos[7],
          },
          'Gestión del Tiempo' : {
            [preguntas_operativos[8].txt]: data.operativos[8],
          },
          'Canales de Distribución Efectivos (MN)' : {
            [preguntas_operativos[9].txt]: data.operativos[9],
          },
          'Calificación' : {
            [preguntas_operativos[10].txt]: data.operativos[10],
          },
        },
        'Área de Interés: INTEGRACION Y BIENESTAR LABORAL' : {
          'Liderazgo Comprometido' : {
            [preguntas_integracion[0].txt]: data.integracion[0],
          },
          'Comunicación Abierta y Transparente' : {
            [preguntas_propuesta[1].txt]: data.integracion[1],
          },
          'Flexibilidad' : {
            [preguntas_integracion[2].txt]: data.integracion[2],
          },
          'Espacio de Trabajo Adecuado' : {
            [preguntas_integracion[3].txt]: data.integracion[3],
          },
          'Actividades de Integración' : {
            [preguntas_integracion[4].txt]: data.integracion[4],
          },
          'Salud y Bienestar' : {
            [preguntas_integracion[5].txt]: data.integracion[5],
          },
          'Participación Activa' : {
            [preguntas_integracion[6].txt]: data.integracion[6],
          },
          'Entorno Laboral' : {
            [preguntas_integracion[7].txt]: data.integracion[7],
            [preguntas_integracion[8].txt]: data.integracion[8],
          },
          'Balance Vida-Trabajo' : {
            [preguntas_integracion[9].txt]: data.integracion[9],
          },
          'Calificación' : {
            [preguntas_integracion[10].txt]: data.integracion[10],
          },
        },
        'Área de Interés: MODELO DE NEGOCIO' : {
          'Comprensión del Modelo Actual' : {
            [preguntas_modelo_negocio[0].txt]: data.modelo_negocio[0],
          },
          'Propuesta de Valor' : {
            [preguntas_modelo_negocio[1].txt]: data.modelo_negocio[1],
          },
          'Claridad y Dirección' : {
            [preguntas_modelo_negocio[2].txt]: data.modelo_negocio[2],
          },
          'Competitividad en el Mercado' : {
            [preguntas_modelo_negocio[3].txt]: data.modelo_negocio[3],
          },
          'Adaptabilidad y Flexibilidad' : {
            [preguntas_modelo_negocio[4].txt]: data.modelo_negocio[4],
          },
          'Optimización de Recursos' : {
            [preguntas_modelo_negocio[5].txt]: data.modelo_negocio[5],
          },
          'Retroalimentación de Clientes' : {
            [preguntas_modelo_negocio[6].txt]: data.modelo_negocio[6],
          },
          'Evaluación Interna' : {
            [preguntas_modelo_negocio[7].txt]: data.modelo_negocio[7],
          },
          'Monitoreo del Mercado' : {
            [preguntas_modelo_negocio[8].txt]: data.modelo_negocio[8],
          },
          'Visión a Futuro' : {
            [preguntas_modelo_negocio[9].txt]: data.modelo_negocio[9],
          },
          'Calificación' : {
            [preguntas_modelo_negocio[10].txt]: data.modelo_negocio[10],
          },
        },
        'Área de Interés: ASISTENCIA Y RELACION CON EL CLIENTE' : {
          'Entendimiento profundo del cliente' : {
            [preguntas_asistencia[0].txt]: data.asistencia[0],
          },
          'Relaciones con Clientes (MN)' : {
            [preguntas_asistencia[1].txt]: data.asistencia[1],
            [preguntas_asistencia[2].txt]: data.asistencia[2],
          },
          'Comunicación efectiva (MN)' : {
            [preguntas_asistencia[3].txt]: data.asistencia[3],
          },
          'Capacitación del personal' : {
            [preguntas_asistencia[4].txt]: data.asistencia[4],
          },
          'Respuesta rápida' : {
            [preguntas_asistencia[5].txt]: data.asistencia[5],
          },
          'Uso de tecnología' : {
            [preguntas_asistencia[6].txt]: data.asistencia[6],
          },
          'Resolución de problemas' : {
            [preguntas_asistencia[7].txt]: data.asistencia[7],
          },
          'Recompensas y lealtad' : {
            [preguntas_asistencia[8].txt]: data.asistencia[8],
          },
          'Seguimiento proactivo' : {
            [preguntas_asistencia[9].txt]: data.asistencia[9],
          },
          'Calificación' : {
            [preguntas_asistencia[10].txt]: data.asistencia[10],
          },
        },
        'Área de Interés: MARKETING' : {
          'Comprensión del Público Objetivo (MN)' : {
            [preguntas_marketing[0].txt]: data.marketing[0],
          },
          'Presencia Digital - Sitio Web' : {
            [preguntas_marketing[1].txt]: data.marketing[1],
          },
          'Redes Sociales' : {
            [preguntas_marketing[2].txt]: data.marketing[2],
          },
          'Contenido de Calidad' : {
            [preguntas_marketing[3].txt]: data.marketing[3],
          },
          'Publicidad Segmentada' : {
            [preguntas_marketing[4].txt]: data.marketing[4],
          },
          'Medición y Análisis' : {
            [preguntas_marketing[5].txt]: data.marketing[5],
          },
          'Educación y Capacitación Continua' : {
            [preguntas_marketing[6].txt]: data.marketing[6],
          },
          'Asignación Adecuada de Recursos' : {
            [preguntas_marketing[7].txt]: data.marketing[7],
          },
          'Plan de Marketing' : {
            [preguntas_marketing[8].txt]: data.marketing[8],
          },
          'Manual de Identidad Corporativa' : {
            [preguntas_marketing[9].txt]: data.marketing[9],
          },
          'Calificación' : {
            [preguntas_marketing[10].txt]: data.marketing[10],
          },
        },
        'Área de Interés: VENTAS' : {
          'Estrategias de Ventas' : {
            [preguntas_ventas[0].txt]: data.ventas[0],
          },
          'Conocimiento del Producto/Servicio' : {
            [preguntas_ventas[1].txt]: data.ventas[1],
          },
          'Uso de Tecnología' : {
            [preguntas_ventas[2].txt]: data.ventas[2],
          },
          'Diversificación de Canales de Ventas' : {
            [preguntas_ventas[3].txt]: data.ventas[3],
            [preguntas_ventas[4].txt]: data.ventas[4],
          },
          'Entender al Cliente' : {
            [preguntas_ventas[5].txt]: data.ventas[5],
          },
          'Gestión de Precios' : {
            [preguntas_ventas[6].txt]: data.ventas[6],
          },
          'Integración con Marketing' : {
            [preguntas_ventas[7].txt]: data.ventas[7],
          },
          'Objetivos y Feedback' : {
            [preguntas_ventas[8].txt]: data.ventas[8],
            [preguntas_ventas[9].txt]: data.ventas[9],
          },
          'Calificación' : {
            [preguntas_ventas[10].txt]: data.ventas[10],
          },
        }
      }

      const prompt =
        JSON.stringify(obj_respuestas) +
        " Con base en las respuestas anteriores genera un informe de Valoración inicial separado por los 4 sistemas: Soluciones y Valor, Gestión de Recursos, Operacional, Comercialización. Adicionalmente, enumera las actividades a realizar por Sistema.";
      // console.log(
      //   `\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n`
      // );
      let resultAI = await getResponseChatGPT(prompt);
      const resp = resultAI.content.replaceAll("\n", "<br>");
      const informeAI = {
        empresa: id_empresa,
        tipo: "Diagnóstico",
        informe: resp,
        fecha: new Date().toLocaleDateString("en-US"),
      };
      const insertResult = await helpers.insertarDatos("informes_ia", informeAI);
      if (insertResult.affectedRows > 0) {
        rolUser == "Empresa" ? res.redirect("/diagnostico-de-negocio") : res.redirect("/empresas/" + codigoEmpresa + "#diagnostico_");
      }
    }
  }
};

// CUESTIONARIO DIAGNÓSTICO (EMPRESAS NUEVAS)
dashboardController.dgNuevosProyectos = async (req, res) => {
  const { codigo } = req.params;
  let linkCerrar = "/diagnostico-de-negocio";
  if (req.user.rol != "Empresa") {
    linkCerrar = `/empresas/${codigo}#diagnostico_`;
  }
  res.render("consultor/nuevos_proyectos", {
    wizarx: true,
    user_dash: false,
    adminDash: false,
    codigo,
    rolUser: req.user.rol,
    linkCerrar,
  });
};
dashboardController.guardarRespuestas = async (req, res) => {
  const { codigoEmpresa, zhActualAdm, rolUser } = req.body;
  // Capturar Fecha de guardado con base a su Zona Horaria
  const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm });
  // Consultando info de la empresa
  const infoEmp = (await helpers.consultarDatos('empresas')).find(x => x.codigo == codigoEmpresa)
  // Capturar ID Empresa
  const id_empresa = infoEmp.id_empresas;

  // EXPERIENCIA EN EL RUBRO
  const {
    rubro,
    e_ofrece,
    producto_ofrece,
    servicio_ofrece,
    exp_previa,
    foda,
    unidades_rubro,
    actividades,
    vision,
  } = req.body;
  let empresa_ofrece = { e_ofrece };
  producto_ofrece != ""
    ? (empresa_ofrece.producto_ofrece = producto_ofrece)
    : (empresa_ofrece.servicio_ofrece = servicio_ofrece);
  empresa_ofrece = JSON.stringify(empresa_ofrece);
  let exp_rubro = JSON.stringify({
    exp_previa,
    foda,
    unidades_rubro,
    actividades,
    vision,
  });

  // MENTALIDAD EMPRESARIAL
  const {
    proposito_alineado,
    objetivos_claros,
    valores,
    foda_personal,
    tiempo_completo,
  } = req.body;
  let mentalidad_empresarial = JSON.stringify({
    proposito_alineado,
    objetivos_claros,
    valores,
    foda_personal,
    tiempo_completo,
  });

  // VIABILIDAD DEL NEGOCIO
  const {
    socios,
    fondo_financiero,
    ubicacion_fisica,
    estudio_mercado,
    recursos_claves,
    posibles_proveedores,
  } = req.body;
  let viabilidad = JSON.stringify({
    socios,
    fondo_financiero,
    ubicacion_fisica,
    estudio_mercado,
    recursos_claves,
    posibles_proveedores,
  });

  // PRODUCTOS O SERVICIOS
  const {
    problema_resolver,
    producto_principal,
    precio_venta,
    factor_diferenciador,
    modelo_negocio,
  } = req.body;
  let productos_servicios = JSON.stringify({
    problema_resolver,
    producto_principal,
    precio_venta,
    factor_diferenciador,
    modelo_negocio,
  });

  // ADMINISTRACIÓN
  const {
    planeacion_estrategica,
    sistema_inventario,
    estructura_organizacional,
  } = req.body;
  let administracion = JSON.stringify({
    planeacion_estrategica,
    sistema_inventario,
    estructura_organizacional,
  });

  // TALENTO HUMANO
  const {
    funciones_principales,
    formacion_inicial,
    tiempo_colaboradores,
    experiencia_liderando,
    importancia_equipo,
  } = req.body;
  let talento_humano = JSON.stringify({
    funciones_principales,
    formacion_inicial,
    tiempo_colaboradores,
    experiencia_liderando,
    importancia_equipo,
  });

  // FINANZAS
  const {
    estructura_costos,
    gastos_fijos_variables,
    control_financiero,
    punto_equilibrio,
    recuperar_inversion,
  } = req.body;
  let finanzas = JSON.stringify({
    estructura_costos,
    gastos_fijos_variables,
    control_financiero,
    punto_equilibrio,
    recuperar_inversion,
  });

  // SERVICIO AL CLIENTE
  const {
    canales_atencion,
    estrategia_fidelizar,
    exp_brindar,
    medir_satisfaccion,
    calidad_producto,
  } = req.body;
  let servicio_cliente = JSON.stringify({
    canales_atencion,
    estrategia_fidelizar,
    exp_brindar,
    medir_satisfaccion,
    calidad_producto,
  });

  // OPERACIONES
  const {
    permisos,
    planificar_actividades,
    conocer_procesos,
    canales_comercial,
    proceso_devoluciones,
  } = req.body;
  let operaciones = JSON.stringify({
    permisos,
    planificar_actividades,
    conocer_procesos,
    canales_comercial,
    proceso_devoluciones,
  });

  // AMBIENTE LABORAL
  const {
    crecimiento,
    comunicacion_efectiva,
    resaltar_habilidades,
    capacitar_crecimiento,
    buen_ambiente,
  } = req.body;
  let ambiente_laboral = JSON.stringify({
    crecimiento,
    comunicacion_efectiva,
    resaltar_habilidades,
    capacitar_crecimiento,
    buen_ambiente,
  });

  // INNOVACION
  const { modelo_innovador, importancia_innovacion, gestion_datos } = req.body;
  let innovacion = JSON.stringify({
    modelo_innovador,
    importancia_innovacion,
    gestion_datos,
  });

  // MARKETING
  const {
    estrategia_marketing,
    dominio_web,
    segmento_cliente,
    tiene_logo,
    mercado_inicial,
  } = req.body;
  let marketing = JSON.stringify({
    estrategia_marketing,
    dominio_web,
    segmento_cliente,
    tiene_logo,
    mercado_inicial,
  });

  // VENTAS
  const { captacion_clientes, medios_pago, proyeccion } = req.body;
  let ventas = JSON.stringify({ captacion_clientes, medios_pago, proyeccion });

  // METAS A CORTO PLAZO
  const { m1, m2, m3, m4, m5 } = req.body;
  let metas = JSON.stringify({ m1, m2, m3, m4, m5 });

  const nuevoDiagnostico = {
    id_empresa,
    fecha,
    empresa_ofrece,
    rubro,
    exp_rubro,
    mentalidad_empresarial,
    viabilidad,
    productos_servicios,
    administracion,
    talento_humano,
    finanzas,
    servicio_cliente,
    operaciones,
    ambiente_laboral,
    innovacion,
    marketing,
    ventas,
    metas,
  };

  /* ========================== Calculos del Diagnóstico ========================== */
  // Categorías
  const categorias = [
    { nom: "Experiencia en el Rubro", peso: 25, cant: 5 },
    { nom: "Mentalidad Empresarial", peso: 25, cant: 5 },
    { nom: "Viabilidad del Negocio", peso: 25, cant: 6 },
    { nom: "Estructura del Negocio", peso: 25, cant: 44 },
  ];
  categorias.forEach((c) => {
    c.valor = parseFloat(c.peso / c.cant);
  });

  // Estructura del Negocio
  const eNegocio = [
    { nom: "Producto", peso: 2.5, cant: 5 },
    { nom: "Administración", peso: 2.5, cant: 3 },
    { nom: "Talento Humano", peso: 2.5, cant: 5 },
    { nom: "Finanzas", peso: 2.5, cant: 5 },
    { nom: "Serivicio al Cliente", peso: 2.5, cant: 5 },
    { nom: "Operaciones", peso: 2.5, cant: 5 },
    { nom: "Ambiente Laboral", peso: 2.5, cant: 5 },
    { nom: "Innovación", peso: 2.5, cant: 3 },
    { nom: "Marketing", peso: 2.5, cant: 5 },
    { nom: "Ventas", peso: 2.5, cant: 3 },
  ];
  eNegocio.forEach((e) => {
    e.valor = parseFloat(e.peso / e.cant);
  });

  // Resultado de Áreas Vitales
  let cant0 = JSON.parse(productos_servicios);
  cant0 = Object.values(cant0).filter((n) => n == "Si").length;
  let cant1 = JSON.parse(administracion);
  cant1 = Object.values(cant1).filter((n) => n == "Si").length;
  let cant2 = JSON.parse(talento_humano);
  cant2 = Object.values(cant2).filter((n) => n == "Si").length;
  let cant3 = JSON.parse(finanzas);
  cant3 = Object.values(cant3).filter((n) => n == "Si").length;
  let cant4 = JSON.parse(servicio_cliente);
  cant4 = Object.values(cant4).filter((n) => n == "Si").length;
  let cant5 = JSON.parse(operaciones);
  cant5 = Object.values(cant5).filter((n) => n == "Si").length;
  let cant6 = JSON.parse(ambiente_laboral);
  cant6 = Object.values(cant6).filter((n) => n == "Si").length;
  let cant7 = JSON.parse(innovacion);
  cant7 = Object.values(cant7).filter((n) => n == "Si").length;
  let cant8 = JSON.parse(marketing);
  cant8 = Object.values(cant8).filter((n) => n == "Si").length;
  let cant9 = JSON.parse(ventas);
  cant9 = Object.values(cant9).filter((n) => n == "Si").length;

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
  };

  console.log("\n<<<<< ÁREAS VITALES >>>>> ", areasVitales);

  // Resultado de Categorías
  let c1 = JSON.parse(exp_rubro);
  c1 = Object.values(c1).filter((n) => n == "Si").length;
  let c2 = JSON.parse(mentalidad_empresarial);
  c2 = Object.values(c2).filter((n) => n == "Si").length;
  let c3 = JSON.parse(viabilidad);
  c3 = Object.values(c3).filter((n) => n == "Si").length;
  let c4 = parseInt(cant0 + cant1 + cant2 + cant3 + cant4 + cant5 + cant6 + cant7 + cant8 + cant9);

  let valoracion = [
    Math.round(c1 * categorias[0].valor),
    Math.round(c2 * categorias[1].valor),
    Math.round(c3 * categorias[2].valor),
    Math.round(c4 * categorias[3].valor),
  ];

  // Sumar Valoración de las Categorías
  const suma = (acumulador, actual) => acumulador + actual;
  const rendimiento = valoracion.reduce(suma);
  console.log("RENDIMIENTO CATEGORIAS >>> ", rendimiento);

  const resulCategorias = {
    id_empresa,
    experiencia_rubro: valoracion[0],
    mentalidad: valoracion[1],
    viabilidad_: valoracion[2],
    estructura: valoracion[3],
    rendimiento: rendimiento,
  };

  // Guardando en la Base de datos
  const cuestionario = await helpers.insertarDatos(
    "dg_empresa_nueva",
    nuevoDiagnostico
  );
  if (cuestionario.affectedRows > 0) {
    const aVitales = await helpers.insertarDatos(
      "indicadores_areasvitales",
      areasVitales
    );
    const resultado_categorias = await helpers.insertarDatos(
      "resultado_categorias",
      resulCategorias
    );
    if (aVitales.affectedRows > 0 && resultado_categorias.affectedRows > 0) {
      console.log("\nINSERCIÓN COMPLETA DE LOS INDICADORES DE LA EMPRESA\n");
      /**
       * GENERANDO Y GUARDANDO INFORME DEL CHAT GPT EN LA BASE DE DATOS
       */
      const obj_respuestas = {
        "¿Tienes experiencia previa en el rubro?": exp_previa,
        "¿Has realizado un análisis FODA al negocio que deseas desarrollar?":
          foda,
        "¿Has pensando las diferentes unidades de negocio que se podrían implementar en este rubro?":
          unidades_rubro,
        "¿Conoces las actividades claves que se requieren en tu negocio?":
          actividades,
        "¿Conoces tu visión con este proyecto?": vision,
        "¿Tu propósito personal está alineado al propósito del negocio?":
          proposito_alineado,
        "¿Tienes claro los objetivos a nivel personal y empresarial?":
          objetivos_claros,
        "¿Tienes definido tus valores?": valores,
        "¿Te has realizado un FODA personal para que identifiques las herramientas necesarias a implementar en tu negocio?":
          foda_personal,
        "¿Dedicarías el 100% de tu tiempo a este negocio?": tiempo_completo,
        "¿Cuentas con algún socio para desarrollar tu negocio?": socios,
        "¿Dispones de algún fondo financiero personal?": fondo_financiero,
        "¿El negocio requiere ubicación física?": ubicacion_fisica,
        "¿Has realizado algún estudio de mercado con respecto a tu producto o tu servicio?":
          estudio_mercado,
        "¿Conoces los recursos claves para el funcionamiento de tu negocio?":
          recursos_claves,
        "¿Tienes identificado los posibles proveedores del negocio?":
          posibles_proveedores,
        Producto: {
          "¿Tienes identificado el problema que resolverá tu producto o servicio?":
            problema_resolver,
          "¿Sabes cuál es será el producto principal del negocio?":
            producto_principal,
          "¿Tienes definido el precio de venta de tu producto o servicio?":
            precio_venta,
          "¿Conoces cuál es el factor diferenciador del producto o servicio?":
            factor_diferenciador,
          "¿Tienes definido el modelo de negocio?": modelo_negocio,
        },
        Administración: {
          "¿Tienes una planeación estratégica de tu negocio?":
            planeacion_estrategica,
          "¿Se requiere de algún sistema de inventario para tu negocio?":
            sistema_inventario,
          "¿Tienes definido una estructura organizacional para el negocio?":
            estructura_organizacional,
          "¿Tienes definidas las funciones principales, la de tus socios y colaboradores en caso de tenerlas?":
            funciones_principales,
          "¿Cuentas con algún programa de formación inicial para operar tu negocio?":
            formacion_inicial,
          "¿Tienes definido en cuánto tiempo vas a necesitar colaboradores?":
            tiempo_colaboradores,
          "¿Tienes experiencia liderando equipos de trabajo?":
            experiencia_liderando,
          "¿Consideras importante la creación de un equipo de trabajo para el desarrollo y sostenibilidad de la empresa en el tiempo?":
            importancia_equipo,
          "¿Has realizado alguna estructura de costos para tu producto o servicio?":
            estructura_costos,
          "¿Sabes cuáles serán los gastos fijos y variables de tu negocio?":
            gastos_fijos_variables,
          "¿Tienes definidas las herramientas a utilizar para tu control administrativo y financiero?":
            control_financiero,
          "¿Conoce cuál es su punto de equilibrio?": punto_equilibrio,
          "¿Conoces cuál será tu inversión inicial y en cuánto tiempo la recuperarás?":
            recuperar_inversion,
        },
        Operaciones: {
          "¿Has pensado cuáles serán tus principales canales de atención al cliente?":
            canales_atencion,
          "¿Tienes definida una estrategia para fidelizar a tus futuros clientes?":
            estrategia_fidelizar,
          "¿Conoces qué experiencias quieres darles a tus clientes?":
            exp_brindar,
          "¿Has considerado tener alguna herramienta para la medición de la satisfacción del cliente?":
            medir_satisfaccion,
          "¿Crees que un buen servicio se basa solo en la calidad de tu producto?":
            calidad_producto,
          "¿Conoces los permisos que necesitas para comenzar a operar el negocio?":
            permisos,
          "¿Tienes idea de cómo planificar las actividades de tu negocio?":
            planificar_actividades,
          "¿Conoces al 100% los procesos de este negocio?": conocer_procesos,
          "¿Has definido cuáles son los canales de comercialización de tus productos?":
            canales_comercial,
          "¿Has considerado cómo sería el proceso de devoluciones y reclamaciones en tu negocio?":
            proceso_devoluciones,
          "¿Consideras que tu ambiente actual contribuye a tu crecimiento?":
            crecimiento,
          "¿Crees que tu comunicación es efectiva?": comunicacion_efectiva,
          "¿Se te hace sencillo resaltar las habilidades de las personas?":
            resaltar_habilidades,
          "¿Estarías dispuesto a capacitarte en crecimiento personal para el desarrollo de tu negocio?":
            capacitar_crecimiento,
          "¿Crees que tienes las herramientas necesarias para crear un buen ambiente laboral?":
            buen_ambiente,
          "¿Crees que tienes un modelo de negocio innovador?": modelo_innovador,
          "¿Sabes la importancia de utilizar metodologías de innovación a la hora de crear nuevos productos?":
            importancia_innovacion,
          "¿Conoces el proceso para la gestión correcta de los datos de los clientes?":
            gestion_datos,
        },
        Marketing: {
          "¿Cuentas con una estrategia de Marketing definida?":
            estrategia_marketing,
          "¿Tienes un dominio de sitio web reservado?": dominio_web,
          "¿Sabes a qué segmento de cliente te quieres dirigir?":
            segmento_cliente,
          "¿Cuentas con un logo y branding de tu negocio?": tiene_logo,
          "¿Has identificado qué mercado quieres abarcar inicialmente?":
            mercado_inicial,
          "¿Conoces cuáles son tus canales de captación de tus clientes potenciales?":
            captacion_clientes,
          "¿Tienes definido los medios de pago disponibles para tus clientes?":
            medios_pago,
          "¿Tienes alguna proyección de ventas?": proyeccion,
        },
        Metas: metas,
      };

      const prompt =
        JSON.stringify(obj_respuestas) +
        " Con base en las respuestas anteriores genera un informe de Valoración inicial separado por los 4 sistemas: Soluciones y Valor, Gestión de Recursos, Operacional, Comercialización. Adicionalmente, enumera las actividades a realizar por Sistema.";
      // console.log(
      //   `\n\n\n *:*:*:*:*:*:*:*:*:*:*:*:* \n\n PROMPT ENVIADO AL CHAT GPT *:*:*:*:*:*:*:*:*:* \n\n ${prompt} \n\n`
      // );
      let resultAI = await getResponseChatGPT(prompt);
      const resp = resultAI.content.replaceAll("\n", "<br>");
      const informeAI = {
        empresa: id_empresa,
        tipo: "Diagnóstico",
        informe: resp,
        fecha: new Date().toLocaleDateString("en-US"),
      };
      const insertResult = await helpers.insertarDatos(
        "informes_ia",
        informeAI
      );
      if (insertResult.affectedRows > 0) {
        rolUser == "Empresa"
          ? res.redirect("/diagnostico-de-negocio")
          : res.redirect("/empresas/" + codigoEmpresa + "#diagnostico_");
      }
    }
  }
};

/** ====================================== SUBIR INFORMES EMPRESAS ============================================= */
let urlInforme = "";
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const rutaInforme = path.join(__dirname, "../public/informes_empresas");
    cb(null, rutaInforme);
  },

  filename: function (req, file, cb) {
    // const fechaActual = Math.floor(Date.now() / 1000)
    urlInforme = "Informe-3C-Sigma-Empresa-" + file.originalname;
    cb(null, urlInforme);
  },
});
const subirInforme = multer({ storage });
dashboardController.subirInforme = subirInforme.single("file");
dashboardController.guardarInforme = async (req, res) => {
  const r = { ok: false };
  const { codigoEmpresa, consultor, nombreInforme, zonaHoraria } = req.body;
  const empresas = await helpers.consultarDatos("empresas");
  const e = empresas.find((x) => x.codigo == codigoEmpresa);

  const fecha = new Date();
  const nuevoInforme = {
    id_empresa: e.id_empresas,
    consultor,
    nombre: nombreInforme,
    url: "../informes_empresas/" + urlInforme,
    fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
    mes: fecha.getMonth() + 1,
    year: fecha.getFullYear(),
  };

  const actualizar = {
    url: "../informes_empresas/" + urlInforme,
    fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
    mes: fecha.getMonth() + 1,
    year: fecha.getFullYear(),
  };

  // Validando si ya tiene un informe montado
  const tieneInforme = await helpers.consultarDatos(
    "informes",
    `WHERE id_empresa = "${e.id_empresas}" AND nombre = "${nombreInforme}"`
  );
  let informe = null;

  if (tieneInforme.length > 0) {
    informe = await pool.query(
      "UPDATE informes SET ? WHERE id_empresa = ? AND nombre = ?",
      [actualizar, e.id_empresas, nombreInforme]
    );
  } else {
    informe = await helpers.insertarDatos("informes", nuevoInforme);
  }

  if (informe.affectedRows > 0) {
    const nombreEmpresa_ = e.nombre_empresa;
    const email = e.email;
    let tipoInforme = nombreInforme.toLowerCase();
    let asunto = "Se ha cargado un nuevo " + tipoInforme;
    let template = informesHTML(nombreEmpresa_, tipoInforme);
    const texto = "Tu consultor ha cargado el informe general.";

    if (nombreInforme == "Informe diagnóstico") {
      asunto = "Diagnóstico de negocio finalizado";
      const etapa = "Diagnóstico de negocio";
      const link = "diagnostico-de-negocio";
      template = etapaFinalizadaHTML(nombreEmpresa_, etapa, texto, link);
    }
    if (nombreInforme == "Informe de análisis") {
      asunto = "Análisis de negocio finalizado";
      const etapa = "Análisis de negocio";
      const link = "analisis-de-negocio";
      template = etapaFinalizadaHTML(nombreEmpresa_, etapa, texto, link);
    }
    if (nombreInforme == "Informe de plan estratégico") {
      asunto = "Plan estratégico de negocio finalizado";
      const etapa = "Plan estratégico de negocio";
      const link = "plan-estrategico";
      template = etapaFinalizadaHTML(nombreEmpresa_, etapa, texto, link);
    }

    // Enviar Email
    const resultEmail = await sendEmail(email, asunto, template);

    if (resultEmail == false) {
      console.log(
        "\n<<<<< Ocurrio un error inesperado al enviar el email de informe subido >>>> \n"
      );
    } else {
      console.log(
        "\n<<<<< Se ha notificado la subida de un informe al email de la empresa >>>>>\n"
      );
    }

    r.ok = true;
    r.fecha = nuevoInforme.fecha;
    r.url = nuevoInforme.url;
  }

  res.send(r);
};

dashboardController.guardarArchivo_Empresarial = async (req, res) => {
  const r = { ok: false };
  const { codigoEmpresa, tipo, nombreArchivo, zonaHoraria } = req.body;

  const empresas = await helpers.consultarDatos("empresas");
  const e = empresas.find((x) => x.codigo == codigoEmpresa);
  const fecha = new Date();
  let nombre = "",
    urlFile = "../archivos_plan_empresarial/" + req.file.filename;
  tipo == "Otro" || tipo == "Otro2" || tipo == "Otro3"
    ? (nombre = nombreArchivo)
    : (nombre = req.file.originalname);
  const nuevoArchivo = {
    empresa: e.id_empresas,
    tipo,
    nombre,
    url: urlFile,
    fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
    mes: fecha.getMonth() + 1,
    year: fecha.getFullYear(),
  };

  // Validando si ya tiene un informe montado
  const tieneArchivo = await helpers.consultarDatos(
    "archivos_plan_empresarial",
    `WHERE empresa = "${e.id_empresas}" AND tipo = "${tipo}"`
  );
  let archivoActual = null;

  if (tieneArchivo.length > 0) {
    urlFile = "../archivos_plan_empresarial/" + req.file.originalname;
    const actualizar = {
      nombre,
      url: urlFile,
      fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
      mes: fecha.getMonth() + 1,
      year: fecha.getFullYear(),
    };
    archivoActual = await pool.query(
      "UPDATE archivos_plan_empresarial SET ? WHERE empresa = ? AND tipo = ?",
      [actualizar, e.id_empresas, tipo]
    );
  } else {
    archivoActual = await helpers.insertarDatos(
      "archivos_plan_empresarial",
      nuevoArchivo
    );
  }

  if (archivoActual.affectedRows > 0) {
    let asunto = "Se ha cargado un nuevo archivo en Plan Empresarial";
    let template = archivosPlanEmpresarialHTML(e.nombre_empresa);

    // Enviar Email
    const resultEmail = await sendEmail(e.email, asunto, template);

    if (resultEmail == false) {
      console.log(
        "\n<<<<< Ocurrio un error inesperado al enviar el email de archivo subido a la empresa >>>> \n"
      );
    } else {
      console.log(
        "\n<<<<< Se ha notificado la subida de un archivo al email de la empresa >>>>>\n"
      );
    }

    r.ok = true;
    r.fecha = fecha.toLocaleString("en-US", { timeZone: zonaHoraria });
    r.url = urlFile;
  }

  res.send(r);
};

dashboardController.websiteEmpresarial = async (req, res) => {
  const r = { ok: false };
  const { codigoEmpresa, link, zonaHoraria } = req.body;

  const empresas = await helpers.consultarDatos("empresas");
  const e = empresas.find((x) => x.codigo == codigoEmpresa);
  const fecha = new Date();
  const nuevoArchivo = {
    empresa: e.id_empresas,
    tipo: "Website",
    nombre: "Website",
    url: link,
    fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
    mes: fecha.getMonth() + 1,
    year: fecha.getFullYear(),
  };

  // Validando si ya tiene un informe montado
  const tieneLink = await helpers.consultarDatos(
    "archivos_plan_empresarial",
    `WHERE empresa = "${e.id_empresas}" AND tipo = "Website"`
  );
  let linkActual = null;

  if (tieneLink.length > 0) {
    console.log("\n\n----- Hola desde Actualizar WEBSITE\n\n----- ");
    const actualizar = {
      url: link,
      fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
      mes: fecha.getMonth() + 1,
      year: fecha.getFullYear(),
    };
    console.log(actualizar);
    linkActual = await pool.query(
      "UPDATE archivos_plan_empresarial SET ? WHERE empresa = ? AND tipo = ?",
      [actualizar, e.id_empresas, "Website"]
    );
  } else {
    console.log("\n\n----- Hola desde INSERTAR WEBSITE\n\n----- ");
    linkActual = await helpers.insertarDatos(
      "archivos_plan_empresarial",
      nuevoArchivo
    );
  }

  if (linkActual.affectedRows > 0) {
    const email = e.email;
    let asunto = "Se ha cargado un nuevo link en Plan Empresarial";
    let template = archivosPlanEmpresarialHTML(e.nombre_empresa);

    // Enviar Email
    const resultEmail = await sendEmail(email, asunto, template);

    if (resultEmail == false) {
      console.log(
        "\n<<<<< Ocurrio un error inesperado al enviar el email de link subido a la empresa >>>> \n"
      );
    } else {
      console.log(
        "\n<<<<< Se ha notificado la subida de un nuevo link de Plan Empresarial al email de la empresa >>>>>\n"
      );
    }

    r.ok = true;
    r.fecha = nuevoArchivo.fecha;
    r.url = nuevoArchivo.url;
  }

  res.send(r);
};

dashboardController.finalizarEtapa = async (req, res) => {
  const { codigo } = req.body;
  let empresa = await helpers.consultarDatos("empresas");
  empresa = empresa.find((e) => e.codigo == codigo);
  let result = false;
  if (empresa) {
    const etapa = { etapa_empresarial: 1 };
    await pool.query("UPDATE empresas SET ? WHERE codigo = ?", [etapa, codigo]);
    const texto =
      "Ingresa a tu cuenta para revisar los archivos cargados por tu consultor.";
    const link = "plan-empresarial";
    template = etapaFinalizadaHTML(
      empresa.nombre_empresa,
      "Plan Empresarial",
      texto,
      link
    );
    // Enviar Email
    const resultEmail = await sendEmail(
      empresa.email,
      "Plan Empresarial finalizado",
      template
    );
    if (resultEmail == false) {
      console.log(
        "\n<<<<< Ocurrio un error inesperado al enviar el email de etapa de Plan Empresarial finalizada >>>> \n"
      );
    } else {
      console.log(
        "\n<<<<< Se ha notificado al email de la empresa que ha finalizado la etapa de Plan Empresarial >>>>>\n"
      );
      result = true;
    }
  }
  res.send(result);
};

dashboardController.recursosCompartidos = async (req, res) => {
  const recursos = await helpers.consultarDatos("recursos_compartidos");
  const grupos = [];
  if (recursos.length > 0) {
    recursos.forEach((r) => {
      let iconos = [],
        cuerpoHTML = "";
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
      r.programa = JSON.parse(r.programa);
      const programa = { n1: false, n2: false, n3: false, n4: false, n5: false, n6: false, txt: [] };

      if (r.programa.includes("1")) {
        programa.n1 = true;
        programa.txt.push("Free Trial");
      }
      if (r.programa.includes("2")) {
        programa.n2 = true;
        programa.txt.push("Entrepreneur");
      }
      if (r.programa.includes("3")) {
        programa.n3 = true;
        programa.txt.push("Business");
      }
      if (r.programa.includes("4")) {
        programa.n4 = true;
        programa.txt.push("Enterprise");
      }
      if (r.programa.includes("5")) {
        programa.n5 = true;
        programa.txt.push("Accelerate");
      }
      if (r.programa.includes("6")) {
        programa.n6 = true;
        programa.txt.push("Por compra");
      }
      if (r.programa.includes("7")) {
        programa.n7 = true;
        programa.txt.push("NAR");
      }

      const palabrasConComas = programa.txt
        .slice(0, -1)
        .map((palabra) => palabra + ", ");
      programa.txt = [
        ...palabrasConComas,
        programa.txt[programa.txt.length - 1],
      ];

      grupos.push({
        idGrupo: r.id,
        programa,
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

  res.render("admin/recursosCompartidos", {
    adminDash: true,
    itemActivo: 4,
    grupos,
    aprobarConsultor,
    datosUsuario: JSON.stringify(req.user),
  });
};

dashboardController.addRecursos_Compartidos = async (req, res) => {
  console.log("Hola desde Add Recurso Compartidos Admin");
  const { nombre_grupo, descrip_grupo, esFormulario, programas } = req.body;
  let { color_grupo } = req.body;
  if (!color_grupo) {
    color_grupo =
      "linear-gradient(180deg, #FED061 -149.33%, #812082 -19.27%, #50368C 158.67%) !important;";
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
  } else if (valorCampo) {
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
  const recurso_armado = JSON.stringify(datosAcumulados);

  if (esFormulario === "true") {
    const programa = programas || ["1"];

    const datos = {
      programa: JSON.stringify(programas),
      nombre_grupo,
      descrip_grupo,
      color_grupo,
      recurso_armado,
    }

    // Actualizando Tabla Módulos si este, pertenece al programa "Por Compra con # 6"
    if (programa.includes("6")) {
      console.log("Generando idCurso Random");
      const codigo = nombre_grupo + '6';
      datos.idCurso = (helpers.encriptarTxt((codigo).toString())).slice(0, 7)
    }

    await helpers.insertarDatos('recursos_compartidos', datos)
    
    req.session.datosAcumulados = null;
  }

  res.redirect("/recursos-compartidos/");
};

function getProgramaName(num) {
    switch (num) {
        case 1:
            return 'Free Trial';
        case 2:
            return 'Entrepreneur';
        case 3:
            return 'Business';
        case 4:
            return 'Enterprise';
        case 5:
          return "Accelerate";
        case 6:
          return "Por compra";
        case 7:
          return "NAR";
    }
}

dashboardController.verModulos = async (req, res) => {
    const modulos = await helpers.consultarDatos('modulos');
    
    modulos.forEach(async (m) => {
      m.codigo = helpers.encriptarTxt((m.id).toString())
      m.estado = m.estado === 1 ? 'Publicado' : 'Borrador';
      m.color = m.estado === 'Publicado' ? 'text-success' : 'text-danger';
      
      const lecciones = await pool.query('SELECT COUNT(id_modulo) As numLecciones FROM lecciones WHERE id_modulo = ?', [m.id]);
      if (lecciones.length > 0) {
          m.numLecciones = lecciones[0].numLecciones;
      } else {
          m.numLecciones = 0;
      }

    m.programa = JSON.parse(m.programa); // Convertir el campo "programa" de nuevo a un arreglo
    m.programa = m.programa.map(Number); // Convertir los elementos del array a números

    // Crear una nueva propiedad en el objeto "m" que contenga el nombre del programa
    m.programas = m.programa.map(getProgramaName).join(', ');

  });

  res.render("admin/verModulos", {
    adminDash: true,
    formViewModulos: true,
    modulos,
  });
};

dashboardController.crearModulo = async (req, res) => {
  // const categorias = (await helpers.consultarDatos('modulos')).map(x => x.categoria)
  let modulos = await helpers.consultarDatos('modulos')
  let categorias = [];
  if (modulos.length > 0) {
    modulos.lastId = modulos[modulos.length - 1].id
    categorias = [...new Set(modulos.map(({ categoria }) => categoria))];
  }
  res.render('admin/crearModulo', { adminDash: true, formModulos:true, itemActivo: 5, modulos, categorias })
}

dashboardController.guardarModulo = async (req, res) => {
  console.log("\n-+-+-+-+-\nAgregando módulo.....");
  const { nombre, insignia, nombre_insignia, categoria, programa, lecciones_size, estado } = req.body;
  const programaArray = Array.isArray(programa) ? programa : [programa];

  // Convertir el array programaArray a formato JSON
  const programaJSON = JSON.stringify(programaArray);

  const moduloData = {
    nombre,
    insignia,
    nombre_insignia,
    categoria,
    programa: programaJSON,
    estado
  };

  // Actualizando Tabla Módulos si este, pertenece al programa "Por Compra con # 6"
  if (programaArray.includes("6")) {
    console.log("Generando id_categoría Random");
    const codigo = categoria + '6';
    moduloData.id_categoria = (helpers.encriptarTxt((codigo).toString())).slice(0, 7)
  }

  const miniatura_insignira = req.files
  if (miniatura_insignira) {
    miniatura_insignira.forEach((mi) => {
      const campo = mi.fieldname;
      if (campo.startsWith("miniatura")) {
        moduloData.miniatura  = `../data_modulo/${mi.filename}`;
      } 
    });
  }

  const { insertId } = (await helpers.insertarDatos("modulos", moduloData));


  // Guardar las lecciones asociadas al módulo
  console.log("Agregando lecciones.....");
  for (let i = 0; i < lecciones_size; i++) {
    const nombre = req.body[`nombre_${i}`];
    const descripcion = req.body[`descripcion_${i}`];
    const duracion = req.body[`duracion_${i}`];
    const leccionData = {
      orden: i,
      id_modulo: insertId,
      nombre,
      duracion,
      descripcion,
    };
    const archivos = req.files.filter((file) => file.fieldname.includes(i));
    if (archivos) {
      archivos.forEach((vm) => {
        const campo = vm.fieldname;
        console.log("campo ==> ", campo)
        if (campo.startsWith("video")) {
          leccionData.video = `../data_modulo/${vm.filename}`;
        } else if (campo.startsWith("material")) {
          leccionData.material = `../data_modulo/${vm.filename}`;
        }
      });
    }
    console.log("******************************");
    console.log("Data LECCIONES ==> " + i);
    console.log(leccionData);
    console.log("******************************");

    await helpers.insertarDatos("lecciones", leccionData);
  }
  insertId ? res.send(true) : res.send(false);
};

dashboardController.eliminarModulos = async (req, res) => {
    const id = req.body.id
    await pool.query('DELETE m, l FROM modulos m INNER JOIN lecciones l ON m.id = l.id_modulo WHERE m.id = ?',[id]);
    res.send(true);
}

dashboardController.updateCategory = async (req, res) => {
    const { categoria_actual, categoria } = req.body;
    const data = { categoria }
    await helpers.actualizarDatos("modulos", data, `WHERE categoria = "${categoria_actual}"`)
    res.redirect('/ver-modulos');
}

dashboardController.infoModulo = async (req, res) => {
    let { id } = req.params;
    id = helpers.desencriptarTxt(id); 
    console.log("ID DESENCRIPTADO ==> ");
    console.log(id);
    if (!id) {
        res.redirect('/ver-modulos');
    } else {
        const modulo = (await helpers.consultarDatos("modulos")).find(x => x.id == id)
        const lecciones = (await helpers.consultarDatos("lecciones", `ORDER BY orden ASC`)).filter(l => l.id_modulo == modulo.id)
        modulo.lecciones = null;

        if (lecciones.length > 0) {
            modulo.lecciones = lecciones.map((leccion, index) => {
            leccion.num = index + 1; // Agregar el nuevo atributo "num" con el número de la lección (1, 2....)
            return leccion;
            });
        }

        console.log("Info modulo: ");
        console.log(modulo);

        res.render("empresa/modulo", {
            adminDash: true, itemActivo: 5,
            modulo, lecciones: JSON.stringify(modulo.lecciones)
        });
    }
}

// dashboardController.editarModulo = async (req, res) => {
//   let { id } = req.params;
//   id = helpers.desencriptarTxt(id); 
//   console.log("ID DESENCRIPTADO ==> ");
//   console.log(id);
//   if (!id) {
//     res.redirect('/ver-modulos');
//   } else {
//     const modulo = (await helpers.consultarDatos("modulos")).find(x => x.id == id)
//     const lecciones = (await helpers.consultarDatos("lecciones")).filter(l => l.id_modulo == modulo.id)
//     modulo.lecciones = null;
    
//     if (lecciones.length > 0) {
//       modulo.lecciones = lecciones.map((leccion, index) => {
//         leccion.num = index + 1; // Agregar el nuevo atributo "num" con el número de la lección (1, 2....)
//         return leccion;
//       });
//     }

//     console.log("Info modulo: ");
//     console.log(modulo);
    
//   res.render("admin/editarModulos", {adminDash: true, itemActivo: 5, modulo, lecciones: JSON.stringify(modulo.lecciones)})
//   }
// }

dashboardController.editarModulo = async (req, res) => {
    let { id } = req.params;
    id = helpers.desencriptarTxt(id); 
    console.log("ID DESENCRIPTADO ==> ");
    console.log(id);
    if (!id) {
        res.redirect('/ver-modulos');
    } else {
      const categorias = (await pool.query("SELECT DISTINCT categoria FROM modulos")).map(x => x.categoria);
      const modulo = (await helpers.consultarDatos("modulos")).find(x => x.id == id)
      const lecciones = (await helpers.consultarDatos("lecciones")).filter(l => l.id_modulo == modulo.id)

      lecciones.forEach(x => {
        if (x.video == null) {
          x.video = false;
        }
        if (x.material == null) {
          x.material = 'Sin material'
        }
      })

      // modulo.lecciones = lecciones.slice(1);
      const leccionesOrden = lecciones.slice()
      modulo.lecciones = leccionesOrden.sort((a, b) => a.orden - b.orden)
      
      if (lecciones.length > 0) {
        modulo.numLecciones = lecciones.length;
        //modulo.leccion0 = lecciones[0];
        modulo.lastId = lecciones[lecciones.length - 1].id + 1;
      }

      const programasDB = JSON.parse(modulo.programa);
      const programas = { p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false };

      const programaOptions = ["1", "2", "3", "4", "5", "6", "7"];

      for (const option of programaOptions) {
        if (programasDB.includes(option)) {
          programas["p" + option] = true;
        }
      }

      console.log("Info modulo: ");
      console.log(modulo);
      res.render("admin/modulo", {
          adminDash: true, itemActivo: 5, modulo,
          formModulos:true, programas, 
          jsonLecciones: JSON.stringify(leccionesOrden),
          categorias
      });
    }
}

dashboardController.subirArchivos = async (req, res) => {
  const archivos = req.files
  const { currentURL, tabla, columna, id } = req.body;
  let dataURL = false;
  console.log("currentURL: ", currentURL)

  if (currentURL != '') {
    // Usar el métonombredo replace con una expresión regular
    const nombre = currentURL.replace(/^\.\.\/data_modulo\//, '');
    // Ruta completa del archivo a eliminar
    const filePath = path.join(__dirname, '../public/' + 'data_modulo/' + nombre);

    // Verificar si el archivo existe
    if (fs.existsSync(filePath)) {
      // Eliminar el archivo
      fs.unlinkSync(filePath);
      console.log(`Archivo ${nombre} eliminado con éxito.`);
    } else {
      console.error(`El archivo ${nombre} no existe.`);
    }
  }

  if (archivos) {
    archivos.forEach((x) => {
      dataURL = `../data_modulo/${x.filename}`;
    });
  }

  // Subir nueva url a la Base de datos
  const datos = {[columna]: dataURL}
  if (columna == 'video') {
    datos.duracion = req.body.duracion;
  }
  console.log(datos)
  const sd = await helpers.actualizarDatos(tabla, datos, `WHERE id = '${id}'`)
  console.log("actualizar:: ")
  console.log(sd)

  res.send(JSON.stringify(dataURL))
};

dashboardController.actualizarModulo = async (req, res) => {
  console.log("Actualizando módulo...");
  const { nombre, categoria, programa, insignia, nombre_insignia, idModulo } = req.body;
  console.log(req.body);
  const programaArray = Array.isArray(programa) ? programa : [programa];
  // Convertir el array programaArray a formato JSON
  const programaJSON = JSON.stringify(programaArray);

  let moduloData = {
    nombre,
    categoria,
    programa: programaJSON,
    insignia,
    nombre_insignia,
    estado: 0
  };

  if (programaArray.includes("6")) {
    console.log("Generando id_categoría Random");
    const codigo = categoria + '6';
    moduloData.id_categoria = (helpers.encriptarTxt((codigo).toString())).slice(0, 7)
  }

  const result = await helpers.actualizarDatos('modulos', moduloData, `WHERE id = ${idModulo}`)
  console.log(":::: Resultado Actualizar Módulo ::::")
  console.log(result);
  const r = {ok: true, result}

  res.send(JSON.stringify(r))
}

dashboardController.actualizarLeccion = async (req, res) => {
  console.log("Actualizando Lección ===> ", req.body.id);
  await helpers.actualizarDatos('lecciones', req.body, `WHERE id = ${req.body.id}`)
  res.send(true)
}

dashboardController.actualizar_ordenLecciones = async (req, res) => {
  console.log("Actualizando Lecciones ===> ");
  const { lecciones_temp, id_modulo } = req.body;
  lecciones_temp.forEach(async x => {
    const data = { orden: x.orden }
    await helpers.actualizarDatos('lecciones', data, `WHERE id = ${x.id} AND id_modulo = ${id_modulo}`)
  })
  res.send(true)
}

dashboardController.agregarLeccionDB = async (req, res) => {
  console.log("Agregando Nueva Lección ===> ", req.body);
  const { i, id_modulo } = req.body;
  const data = {
    id_modulo,
    orden: i,
    nombre: 'Lección por defecto ' + i,
    duracion: 'Desconocida'
  }
  const { insertId } = await helpers.insertarDatos('lecciones', data)
  console.log(insertId)
  res.send(JSON.stringify(insertId))
}

dashboardController.consultarLecciones = async (req, res) => {
  const { id_modulo } = req.body;
  const datos = await helpers.consultarDatos('lecciones', `WHERE id_modulo = ${id_modulo} ORDER BY orden ASC`)
  console.log("Datos actualizar:")
  console.log(datos);
  res.send(JSON.stringify(datos))
}

dashboardController.eliminarLeccion = async (req, res) => {
  const { id } = req.body;
  await helpers.eliminarDatos('lecciones', `WHERE id = ${id}`)
  res.send(true)
}

dashboardController.actualizar_estadoModulo = async (req, res) => {
  const { id, estado } = req.body;
  const data = { estado }
  await helpers.actualizarDatos('modulos', data, `WHERE id = ${id}`)
  res.send(true)
}