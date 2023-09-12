(function () {
    // ATRAPAR LA OPCION CREADA EN EL SELECTOR Y MANDARLO A UN INPUT HIDDEN 
    $(document).ready(function () {
        function selectBuscar(id, categoriaHiddenId) {
        id.chosen({
            no_results_text: "Sin resultados para",
            allow_single_deselect: true,
            placeholder_text_single: "Selecciona una opción",
            width: '100%',
        });

        const campoBusqueda = id.next('.chosen-container').find('.chosen-search input');
        const categoriaHidden = $('#' + categoriaHiddenId);

        campoBusqueda.on('change', function () {
            const valorBusqueda = campoBusqueda.val().trim();

            const opcionExistente = id.find('option[value="' + valorBusqueda + '"]');
            if (opcionExistente.length) {
            opcionExistente.prop('selected', true);
            categoriaHidden.val(valorBusqueda);
            } else {
            id.prepend('<option value="' + valorBusqueda + '">' + valorBusqueda + '</option>');
            id.val(valorBusqueda);
            categoriaHidden.val(valorBusqueda);
            }

            id.trigger('chosen:updated');
        });

        $(document).on('click', function (e) {
            if (!$(e.target).closest('.chosen-container').length) {
            const opcionSeleccionada = id.find(":selected").val();

            categoriaHidden.val(opcionSeleccionada);
            }
        });
        }
    
        const claseCajaGeneralModulo = $('#categoriaSelectModulo');
        selectBuscar(claseCajaGeneralModulo, 'categoriaHiddenModulo');

    });
    })();

    /*********************************************************************************************************/
    //Arrastrar y soltar archivos 
    function dragOverHandler(event) {
        event.preventDefault(); // previene el comportamiento por defecto del evento
        event.currentTarget.classList.add("active"); // utiliza currentTarget en lugar de this para asegurarte de que se está agregando la clase al div correcto
        const h6 = event.currentTarget.querySelector("h6"); // utiliza currentTarget en lugar de this para asegurarte de que se está buscando en el div correcto
        h6.textContent = "Suelta para subir el archivo";
    }

    function dragLeaveHandler(event) {
        event.preventDefault(); // previene el comportamiento por defecto del evento
        event.currentTarget.classList.remove("active"); // utiliza currentTarget en lugar de this para asegurarte de que se está removiendo la clase del div correcto
        const h6 = event.currentTarget.querySelector("h6"); // utiliza currentTarget en lugar de this para asegurarte de que se está buscando en el div correcto
        h6.textContent = "Arrastra y suelta el archivo";
    }

    function dropHandler(event) {
        event.preventDefault(); // previene el comportamiento por defecto del evento
        event.currentTarget.classList.remove("active"); // utiliza currentTarget en lugar de this para asegurarte de que se está removiendo la clase del div correcto
        const h6 = event.currentTarget.querySelector("h6"); // utiliza currentTarget en lugar de this para asegurarte de que se está buscando en el div correcto
        h6.textContent = "Arrastra y suelta el archivo";
        const input = event.currentTarget.querySelector("input"); // utiliza currentTarget en lugar de this para asegurarte de que se está buscando en el div correcto
        input.files = event.dataTransfer.files
        cargarArchivo(input.files[0], input.className, input.id);
    }

    function btnFile_(event, div) {
        event.preventDefault();
        const input = div.querySelector("input");
        input.click();
    }

    function fileChange_(event, input) {
        cargarArchivo(input.files[0], input.className, input.id);
    }

    function toastError(msg) {
        return toastr.warning(msg, "Error", {
            positionClass: "toast-top-full-width",
            timeOut: 5000,
            closeButton: true,
            debug: false,
            newestOnTop: true,
            progressBar: true,
            preventDuplicates: true,
            onclick: null,
            showDuration: "500",
            hideDuration: "200",
            extendedTimeOut: "400",
            showEasing: "swing",
            hideEasing: "linear",
            showMethod: "fadeIn",
            hideMethod: "fadeOut",
            tapToDismiss: false,
        });
    }

    // Obtener la duración del video subido 
    function formatTime(duracionTotal) {
        // Redondear la duración a un número entero
        duracionTotal = (Math.round(duracionTotal)).toFixed(0);

        // Calcular los minutos y segundos
        let minutos = Math.floor(duracionTotal / 60);
        const segundos = duracionTotal % 60;
        // Calcular las horas, minutos y segundos
        const horas = Math.floor(minutos / 60);
        minutos = minutos % 60;

        //console.log('Duración del video:', horas, 'horas', minutos, 'minutos', segundos, 'segundos');
        let duracionVideo = ''
        if (horas > 0) duracionVideo = horas + ' horas ';
        if (minutos > 0) duracionVideo += minutos + ' minutos ';
        if (segundos > 0) duracionVideo += segundos + ' segundos ';
        return duracionVideo;
    }

    // Cargar la duración del video subido
    function cargarLaDuracion(video) {
        return new Promise((resolve, reject) => {
            if (!video) {
                resolve('Desconocida');
                return;
            }

            // Crear un objeto URL para el archivo seleccionado
            const objectURL = URL.createObjectURL(video);

            // Crear un elemento de video para obtener la duración
            const videoElement = document.createElement('video');

            // Escuchar el evento 'loadedmetadata' para obtener la duración una vez que los metadatos se hayan cargado
            videoElement.addEventListener('loadedmetadata', function () {
                // Duración del video en segundos
                const durationInSeconds = videoElement.duration;

                // Formatear la duración en el formato HH:mm:ss
                const formattedDuration = formatTime(durationInSeconds);

                // Liberar el objeto URL utilizado para el video una vez que ya no se necesite
                URL.revokeObjectURL(objectURL);

                resolve(formattedDuration);
            });

            // Establecer la fuente del video con el objeto URL creado
            videoElement.src = objectURL;
        });
    }

    const botonGuardar = document.querySelector('.sw-btn-guardar');
    const botonPublicar = document.querySelector('.sw-btn-submit');

    let estadoM = 2
    botonGuardar.addEventListener('click', function () {
        estadoM = 0
    });

    botonPublicar.addEventListener('click', function () {
        estadoM = 1
    });

    window.addEventListener('beforeunload', function (e) {
        if(estadoM != 0 && estadoM != 1) {
            e.preventDefault();
            e.returnValue = '';
        }
    })
