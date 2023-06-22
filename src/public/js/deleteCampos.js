function borrarCampo(idCampo) {
  console.log("........ ID CAMPO -.-.-.-.-.- .........", idCampo);
  fetch("/eliminarCampo", {
    method: "POST",
    body: JSON.stringify({ idCampo, idGrupo: false }),
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Campo eliminado:", data);
    })
    .catch((error) => {
      console.log("Error al eliminar campo:", error);
    });
}