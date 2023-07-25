// Obtener elementos del DOM
const lessonsContainer = document.getElementById('lessonsContainer');
const addLessonBtn = document.getElementById('addLessonBtn');
let lessonCounter = 1, contFile = 1;
// Función para crear el HTML de una nueva lección
const createLessonHTML = () => {
    const lessonHTML = `
    <div class="accordion__item">
      <div class="accordion__header" data-toggle="collapse" data-target="#bordered_collapse_${lessonCounter}">
        <span class="accordion__header--text">Accordion Header ${lessonCounter}</span>
        <span class="accordion__header--indicator"></span>
      </div>
      <div id="bordered_collapse_${lessonCounter}" class="collapse accordion__body show" data-parent="#accordion-two">
        <div class="accordion__body--text">
          <!-- Contenido de la nueva lección -->
          <div class="row">
            <div class="col-lg-8 mb-2">
              <div class="form-group">
                <label class="text-label">Nombre de la lección*</label>
                <input type="text" id="leccion_${lessonCounter}" class="form-control" style="border: 1px solid #DBDBDB;" required>
              </div>
            </div>
          </div>
          <!-- --- -->
          <div class="row" style="display: grid;">
            <div class="col-6">
              <label class="text-label">Video de la lección*</label>
              <div class="drag-area file-videoleccion file-leccion" style="width: 385px !important; height:142px;border: 1px dashed #DBDBDB;background-repeat: round;">
                <center>
                  <button id="btnvideoleccion_${lessonCounter}" style="border: 1px solid #ffffff00;background: #f0f8ff00;background-repeat: round;">
                    <img src="../img/thumbnail.svg" alt="" style="width: 121px; margin-top: -37px;">
                  </button>
                </center>
                <h6 class="fw-700 text-black">Escoge o <span style="color:#812082;font-weight: 700;font-size: 14px;">arrastra </span>un archivo</h6>
                <input type="file" name="file" class="fileVideo_" id="videoleccion_${lessonCounter}" hidden>
              </div>
            </div>
            <div id="msgFile-video-${lessonCounter}"></div>
          </div>
          <!-- --- -->
          <!-- Summernote -->
          <div class="row">
            <div class="col-xl-12 col-xxl-12">
              <div class="summernote-theme-1">
                <textarea name="name" class="summernote" id="summernote_${lessonCounter}" rows="10"></textarea>
              </div>
            </div>
          </div>
          <!-- --- -->
          <div class="row" style="display: grid;">
            <div class="col-6">
              <label class="text-label">Material descargable</label>
              <div class="drag-area file-material file-leccion" style="width: 385px !important; height:142px;border: 1px dashed #DBDBDB;background-repeat: round;">
                <center>
                  <button id="btnMaterial_${lessonCounter}" style="border: 1px solid #ffffff00;background: #f0f8ff00;background-repeat: round;">
                    <img src="../img/thumbnail.svg" alt="" style="width: 121px; margin-top: -37px;">
                  </button>
                </center>
                <h6 class="fw-700 text-black">Escoge o <span style="color:#812082;font-weight: 700;font-size: 14px;">arrastra </span>un archivo</h6>
                <input type="file" name="file" class="fileVideo_" id="material_${lessonCounter}" hidden>
              </div>
            </div>
            <div id="msgFile-material-${lessonCounter}"></div>
          </div>
          <!-- --- -->
        </div>
      </div>
    </div>
  `;
  return lessonHTML;
};

// Función para manejar el evento de clic en el botón "+ Nueva lección"
const handleAddLesson = () => {
    const lessonHTML = createLessonHTML();
    lessonsContainer.insertAdjacentHTML('beforeend', lessonHTML);
    alert("lessonCounter: " + lessonCounter)

    // Encuentra el elemento de texto Summernote utilizando el ID generado dinámicamente
    const newSummernoteElement = document.getElementById(`summernote_${lessonCounter}`);

    // Inicializa Summernote para el nuevo elemento
    $(newSummernoteElement).summernote({
        height: 190,
        minHeight: null,
        maxHeight: null,
        focus: false
    });
    lessonCounter++;
    contFile++
};
// Asignar el evento de clic al botón "+ Nueva lección"
addLessonBtn.addEventListener('click', handleAddLesson);

function addModulo() {
    const modulo = $("#modulo").val();
    const insignia = document.getElementById("insignia").value
    const categoria = $("#categoriaHiddenModulo").val();
    const programa = $(".programa:checked").map(function() {
        return $(this).val();
    }).get();
    const thumbnail = document.getElementById("fileThumbnail").value

    console.log("**MODULOS**")
    console.log("NOMBRE ==>", modulo);
    console.log("insignia=>", insignia);
    console.log("categoria=>", categoria);
    console.log("programa=>", programa);
    console.log("thumbnail=>", thumbnail);
    console.log("========================");


    const leccion = $("#leccion").val();
    const videoleccion = document.getElementById("videoleccion").value
    const summernote = $("#summernote").val();
    const material = document.getElementById("material").value

    console.log("**TEMARIOS**");
    console.log("leccion=>", leccion);
    console.log("videoleccion=>", videoleccion);
    console.log("summernote=>", summernote);
    console.log("material=>", material);
    console.log("========================");
    

   // const formData = new FormData();
   // formData.append('file', insignia);
   // formData.append('modulo', modulo);
   // formData.append('programas', programasSeleccionados.join(','));
}

/*********************************************************************************************************/
const dropAreas = document.querySelectorAll(".file-leccion");
// Iterar sobre cada elemento de la clase file-leccion
dropAreas.forEach(dropArea => {
    const btn = dropArea.querySelector("button");
    const dragText = dropArea.querySelector("h6");
    const input = dropArea.querySelector("input");

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        input.click();
    });
        
    input.addEventListener("change", () => {
        cargarArchivo(input.files[0], input.className);
    });
        
    dropArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropArea.classList.add("active");
        dragText.textContent = "Suelta para subir el archivo";
    });
        
    dropArea.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dropArea.classList.remove("active");
        dragText.textContent = "Arrastra y suelta el archivo";
    });
    
    dropArea.addEventListener("drop", (e) => {
        e.preventDefault();
        cargarArchivo(e.dataTransfer.files[0], input.className);
        dropArea.classList.remove("active");
        dragText.textContent = "Arrastra y suelta el archivo";
    });

});

function cargarArchivo(file, clase) {
    // Si el div para el archivo es el de Video
    if ((clase == 'fileThumbnail_' || clase == 'fileMaterial_') && file.size >= 20 * 1024 * 1024) { // Validar el tamaño del video - 20 megabytes
        toastError("El archivo no puede superar los 20MB.")
    } else {
        const ext = file.name.split(".").pop().toLowerCase();
        let fileOk = true, id_Msg = 'msgFile-material-'+contFile;
        // Validando el tipo de archivo
        if (clase == 'fileThumbnail_') {
            const extensiones = ["jpg", "jpeg", "png", "svg", "psd", "ai", "tiff"];
            id_Msg = 'msgFile-thumbnail'
            // Si el archivo no es una imagen
            if (!extensiones.includes(ext)) {
                fileOk = false;
                toastError("Solo se admiten imagenes, intentelo nuevamente.")
            }
        } else if (clase == 'fileVideo_') {
            const extensiones = ['mov', 'mp4', 'avi', 'mkv']
            id_Msg = 'msgFile-video-'+contFile
            // Si el archivo no es video
            if (!extensiones.includes(ext)) {
                fileOk = false;
                toastError("Solo se admiten videos, intentelo nuevamente.")
            }
        }
        // Funcionamiento para subir Archivos (y si es un video, debe pesar menos de 20 MB)
        if (fileOk){
            try {
                const fileReader = new FileReader();
                fileReader.addEventListener("load", () => {
                    const preview = document.getElementById(id_Msg);
                    preview.innerHTML = `<span class="success">Archivo cargado exitosamente...</span>`
                })
                fileReader.readAsDataURL(file);
                console.log("File Todo OK: ", file)
            } catch (error) {
                // Código que se ejecuta en caso de error
                console.log('Ha ocurrido un error:', error.message);
                toastError("Ocurrio algo inesperado al subir el archivo")
            }
        }
    }
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