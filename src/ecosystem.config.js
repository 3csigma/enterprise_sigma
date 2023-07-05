module.exports = {
    apps: [{
        name: "Enterprise",
        script: "./app.js",
        watch: ["server", "client"],
        watch_delay: 1000, // Delay between restart
        ignore_watch: [
            "node_modules",
            "./public/*/certificados_consultores",
            "./public/*/archivos_analisis_empresa",
            "./public/*/foto_profile",
            "./public/*/informes_empresas",
            "./public/*/propuestas_empresa",
            "./public/*/recurso_empresa",
            "./public/*/grupo_recursos",
        ],
    }]
}