const dropArea = document.querySelector(".drop-area");
const dragText = dropArea.querySelector("h2");
const button = dropArea.querySelector("#btnfile");
const input = dropArea.querySelector("#inputt-file");
let files;

button.addEventListener("click", (e) => {
    input.click();
});

input.addEventListener("change", (e) => {
    files = e.target.files;
    dropArea.classList.add("active");
    showFiles(files);
    dropArea.classList.remove("active");
});

document.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("active");
    dragText.textContent = "Suelta para subir los archivos";
});

document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropArea.classList.remove("active");
    dragText.textContent = "Arrastra y suelta archivos";
});

document.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("active");
    dragText.textContent = "Arrastra y suelta archivos";
    files = e.dataTransfer.files;
    showFiles(files);
});

function showFiles(files) {
    if (files.length === undefined) {
        processFile(files);
    } else {
        for (const file of files) {
            processFile(file);
        }
    }
}

function processFile(file) {
   const docType = file.type;
   const validarExtension = ['image/jpeg','image/jpg', 'image/png', 'image/gif' ]
   const fileReader = new fileReader()
   const id = `file-${Math.random().toString(32).substring(7)}`;

   fileReader.addEventListener("load", (e) => {
    e.preventDefault();
    const fileUrl = fileReader.result
    const image = `
        <div id="${id}" class="file-container">
            <img src="${fileUrl}">
            <div class="status">
                <span>${file.name}</span>
                <span class="status-text"Cargando...</span>
            </div>
        </div>
    `;
    const html = document.querySelector('#preview').innerHTML
    document.querySelector('#preview').innerHTML = image + html;
   })
   fileReader.readAsdDataURL(file);
   uploadFile(file, id)
   if (validarExtension.includes(docType)) {
    console.log("Si papu");
   }else {
    console.log("NO papu");
   }
}

function uploadFile(file){}
