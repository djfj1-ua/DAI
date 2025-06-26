const base="/api";

var carrito= "";
const cabeceras= {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
}

let cuestionarioCounter = 1;

function queryAncestorSelector(node, selector) {
    if (!node) return null;

    let parent = node.parentNode;
    let all = document.querySelectorAll(selector);
    let found = false;

    while (parent && parent !== document && !found) {
        for (let i = 0; i < all.length && !found; i++) {
            found = (all[i] === parent);
        }
        parent = (!found) ? parent.parentNode : parent;
    }
    return (found) ? parent : null;
}


/*function borraPregunta(event) {
    const bloque = queryAncestorSelector(event.target, '.bloque');

    if (bloque) {
        const cuestionario = queryAncestorSelector(bloque, 'section');

        bloque.remove();

        const bloquesRestantes = cuestionario.querySelectorAll('.bloque');

        if (bloquesRestantes.length === 0) {
            cuestionario.remove();

            const indiceEntrada = document.querySelector(`a[href="#${cuestionario.id}"]`);
            if (indiceEntrada) {
                indiceEntrada.parentNode.remove();
            }
        }
    }
}*/

function addCruz(bloque) {
    const cruz = document.createElement("div");
    cruz.className = "borra";
    cruz.textContent = "\u2612";

    bloque.insertBefore(cruz, bloque.firstChild);
    cruz.addEventListener("click", borraPregunta);
}

function addFormPregunta(section) {
    const sectionId = section.id;

    const formulario = document.createElement("div");
    formulario.className = "formulario";

    formulario.innerHTML = `
        <ul>
            <li>
                <label for="${sectionId}_pregunta">Enunciado de la pregunta:</label>
                <input type="text" name="${sectionId}_pregunta" id="${sectionId}_pregunta">
            </li>
            <li>
                <label>Respuesta:</label>
                <input type="radio" name="${sectionId}_respuesta" value="verdadero" id="${sectionId}_v" checked>
                <label for="${sectionId}_v" class="radio">Verdadero</label>
                <input type="radio" name="${sectionId}_respuesta" value="falso" id="${sectionId}_f">
                <label for="${sectionId}_f" class="radio">Falso</label>
            </li>
            <li>
                <input type="button" value="Añadir nueva pregunta">
            </li>
        </ul>
    `;

    const primeraPregunta = section.querySelector(".bloque");
    if (primeraPregunta) {
        section.insertBefore(formulario, primeraPregunta);
    } else {
        section.appendChild(formulario);
    }

    const botonAñadir = formulario.querySelector("input[type='button']");
    botonAñadir.addEventListener("click", (event) => addPregunta(event));

    return formulario; // Devuelve el nodo del formulario
}

/*function addPregunta(event) {
    const formulario = event.target.closest('.formulario');
    const section = queryAncestorSelector(formulario, 'section');

    const enunciado = formulario.querySelector(`input[name="${section.id}_pregunta"]`).value.trim();
    const respuesta = formulario.querySelector(`input[name="${section.id}_respuesta"]:checked`).value;

    if (enunciado === "") {
        alert("Por favor, rellena el enunciado de la pregunta.");
        return;
    }

    const nuevoBloque = document.createElement("div");
    nuevoBloque.className = "bloque";

    const preguntaDiv = document.createElement("div");
    preguntaDiv.className = "pregunta";
    preguntaDiv.textContent = enunciado;

    const respuestaDiv = document.createElement("div");
    respuestaDiv.className = "respuesta";
    respuestaDiv.setAttribute("data-valor", respuesta === "verdadero");

    nuevoBloque.appendChild(preguntaDiv);
    nuevoBloque.appendChild(respuestaDiv);

    const primeraPregunta = section.querySelector(".bloque");
    if (primeraPregunta) {
        section.insertBefore(nuevoBloque, primeraPregunta);
    } else {
        section.appendChild(nuevoBloque);
    }

    addCruz(nuevoBloque);

    formulario.querySelector(`input[name="${section.id}_pregunta"]`).value = "";
    formulario.querySelectorAll(`input[name="${section.id}_respuesta"]`).forEach(radio => {
        radio.checked = radio.defaultChecked;
    })
}*/

function addPregunta(event){
    const formulario = event.target.closest('.formulario');
    const section = queryAncestorSelector(formulario, 'section');

    const cuestionarioId = section.getAttribute('data-id');

    const enunciado = formulario.querySelector(`input[name="${section.id}_pregunta"]`).value.trim();
    const respuesta = formulario.querySelector(`input[name="${section.id}_respuesta"]:checked`).value;

    if(enunciado === ""){
        alert("Por favor, rellena el enunciado de la pregunta.");
        return;
    }

    const url = `${base}/nuevaPregunta/${cuestionarioId}/preguntas`;
    const payload = {
        texto: enunciado,
        respuestaCorrecta: respuesta
    };

    fetch(url, {
        method: 'POST',
        headers: cabeceras,
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(json => {
        if(json.error !== null){
            alert("Error al insertar la pregunta: " + json.error);
            return;
        }

        const nuevoBloque = document.createElement("div");
        nuevoBloque.className = "bloque";
        nuevoBloque.setAttribute('data-id',json.result.idPregunta);

        const preguntaDiv = document.createElement("div");
        preguntaDiv.className = "pregunta";
        preguntaDiv.textContent = enunciado;

        const respuestaDiv = document.createElement("div");
        respuestaDiv.className = "respuesta";
        respuestaDiv.setAttribute("data-valor", respuesta === "verdadero");

        nuevoBloque.appendChild(preguntaDiv);
        nuevoBloque.appendChild(respuestaDiv);
        addCruz(nuevoBloque);

        const primeraPregunta = section.querySelector(".bloque");
        if(primeraPregunta){
            section.insertBefore(nuevoBloque, primeraPregunta);
        }else{
            section.appendChild(nuevoBloque);
        }

        formulario.querySelector(`input[name="${section.id}_pregunta"]`).value = "";
        formulario.querySelectorAll(`input[name="${section.id}_respuesta"]`).forEach(radio => {
            radio.checked = radio.defaultChecked;
        });
    })
    .catch(error => {
        console.log("Error en la petición fetch: ", error);
        alert('Error en la comunicación con el servidor.');
    });
}

function addCuestionario(){
    const formulario = document.getElementById('nuevoCuestionario');
    const tema = formulario.querySelector('#tema').value.trim();

    if (tema === ""){
        alert("Por favor, introduce un tema para el cuestionario.");
        return;
    }

    const url = `${base}/creacuestionario`;
    const datos = {tema: tema};

    fetch(url , {
        method: 'POST',
        headers: cabeceras,
        body: JSON.stringify(datos)
    })
    .then(response => response.json())
    .then(r => {
        if(r.error){
            alert("Error al crear el cuestionario: " + r.error);
            return;
        }

        const nuevaSeccion = document.createElement("section");
        nuevaSeccion.id = `c${cuestionarioCounter++}`;
        nuevaSeccion.setAttribute('data-id', r.result.id || "");
        addBotonBorrarCuestionario(nuevaSeccion);

        const encabezado = document.createElement('encabezado-cuestionario');
        encabezado.setAttribute('data-tema', tema);
        nuevaSeccion.appendChild(encabezado);

        //addFormPregunta(nuevaSeccion);

        const main = document.querySelector("main");
        main.appendChild(nuevaSeccion);

        formulario.querySelector('#tema').value = "";
        const form = addFormPregunta(nuevaSeccion);
    })
    .catch(error => {
        console.error('Error de conexión con el servidor: ', error);
        alert('Error de red al crear el cuestionario.')
    })
}

/*function addCuestionario(event) {
    event.preventDefault();

    const formulario = document.getElementById('nuevoCuestionario');
    const tema = formulario.querySelector('#tema').value.trim();

    if (tema === "") {
        alert("Por favor, rellena el tema del cuestionario.");
        return;
    }

    // Crear una nueva sección
    const nuevaSeccion = document.createElement("section");
    nuevaSeccion.id = `c${cuestionarioCounter++}`;

    // Usar el componente encabezado-cuestionario
    const encabezado = document.createElement('encabezado-cuestionario');
    encabezado.setAttribute('data-tema', tema);
    nuevaSeccion.appendChild(encabezado);

    // Añadir el formulario de preguntas
    const formularioNodo = addFormPregunta(nuevaSeccion);

    // Añadir la nueva sección al main
    const main = document.querySelector("main");
    main.appendChild(nuevaSeccion);

    // Limpiar el formulario de nuevo cuestionario
    formulario.querySelector('#tema').value = "";

    // Añadir el enlace de navegación
    const nav = document.querySelector('nav ul');
    const nuevaEntrada = document.createElement('li');
    const enlace = document.createElement('a');
    enlace.href = `#${nuevaSeccion.id}`;
    enlace.textContent = tema;
    nuevaEntrada.appendChild(enlace);
    nav.appendChild(nuevaEntrada);
}*/

function muestraCuestionarios(){

    const main = document.querySelector("main");
    const nav = document.querySelector("nav ul");

    main.innerHTML = "";
    nav.innerHTML = "";

    const url= `${base}/cuestionarios`;
    const request = {
        method: 'GET',
        headers: cabeceras,
    };
    fetch(url,request)
    .then (response => response.json())
    .then (r => {
        console.log("Muestra los cuestionarios.");
        console.log(r);

        if(r.result){

            r.result.forEach(cuestionario => {
                const nuevaSeccion = document.createElement("section");
                nuevaSeccion.id = `c${cuestionario.cuestionarioID}`;
                nuevaSeccion.setAttribute('data-id',cuestionario.cuestionarioID);
                addBotonBorrarCuestionario(nuevaSeccion);

                const encabezado = document.createElement('encabezado-cuestionario');
                encabezado.setAttribute('data-tema', cuestionario.tema);
                nuevaSeccion.appendChild(encabezado);

                main.appendChild(nuevaSeccion);

                const nuevaEntrada = document.createElement('li');
                const enlace = document.createElement('a');
                enlace.href = `#${nuevaSeccion.id}`;
                enlace.textContent = cuestionario.tema;
                nuevaEntrada.appendChild(enlace);
                nav.appendChild(nuevaEntrada);
                const form = addFormPregunta(nuevaSeccion);

                muestraPreguntas(nuevaSeccion);
            })
        }
    })
    .catch(error => console.log("`Problema de conexión:`"+ error));
}

function borraPregunta(event) {
    const bloque = queryAncestorSelector(event.target, '.bloque');
    if (!bloque) return;

    const idPregunta = bloque.getAttribute('data-id');
    if (!idPregunta) {
        console.error("La pregunta no tiene atributo data-id");
        return;
    }

    const url = `${base}/preguntas/${idPregunta}`;

    fetch(url, {
        method: 'DELETE',
        headers: cabeceras
    })
    .then(response => response.json())
    .then(json => {
        if (json.error) {
            alert(`Error al borrar la pregunta: ${json.error}`);
            return;
        }

        bloque.remove();

        const cuestionario = queryAncestorSelector(bloque, 'section');
        if (cuestionario) {
            const bloquesRestantes = cuestionario.querySelectorAll('.bloque');

            if (bloquesRestantes.length === 0) {
                cuestionario.remove();

                const navEntry = document.querySelector(`a[href="#${cuestionario.id}"]`);
                if (navEntry && navEntry.parentNode) {
                    navEntry.parentNode.remove();
                }

                console.log(`Cuestionario ${cuestionario.id} eliminado por no tener más preguntas.`);
            }
        }
        muestraCuestionarios();
    })
    .catch(error => {
        console.error('Error en la petición DELETE:', error);
        alert('Error de red al intentar borrar la pregunta');
    });
}

function borraCuestionario(section) {
    const tema = section.querySelector('encabezado-cuestionario').getAttribute('data-tema');
    const url = `${base}/cuestionario/${encodeURIComponent(tema)}`;

    fetch(url, {
        method: 'DELETE',
        headers: cabeceras
    })
    .then(response => response.json())
    .then(json => {
        if (json.error) {
            alert(`Error al borrar el cuestionario: ${json.error}`);
            return;
        }

        section.remove();

        const navEntry = document.querySelector(`a[href="#${section.id}"]`);
        if (navEntry && navEntry.parentNode) {
            navEntry.parentNode.remove();
        }

        console.log(`Cuestionario '${tema}' eliminado correctamente.`);
    })
    .catch(error => {
        console.error('Error al borrar el cuestionario:', error);
        alert('Error de red al intentar borrar el cuestionario.');
    });
}


function addBotonBorrarCuestionario(section) {
    const boton = document.createElement('button');
    boton.textContent = "Borrar cuestionario";
    boton.addEventListener('click', () => borraCuestionario(section));
    section.appendChild(boton);
}


function muestraPreguntas(section){
    const cuestionarioID = section.getAttribute('data-id');
    const url = `${base}/cuestionarios/${cuestionarioID}/preguntas`;

    fetch(url, {
        method: 'GET',
        headers: cabeceras
    })
    .then(response => response.json())
    .then(json => {
        if(json.error){
            console.error('Error al obtener las preguntas: ', json.error);
            return;
        }

        const preguntasExistentes = section.querySelectorAll('.bloque');
        preguntasExistentes.forEach(b => b.remove());

        json.result.forEach(pregunta => {
            const bloque = document.createElement('div');
            bloque.className = 'bloque';
            bloque.setAttribute('data-id', pregunta.preguntaID);

                        const preguntaDiv = document.createElement('div');
            preguntaDiv.className = 'pregunta';
            preguntaDiv.textContent = pregunta.texto;

            const respuestaDiv = document.createElement('div');
            respuestaDiv.className = 'respuesta';
            respuestaDiv.setAttribute('data-valor', pregunta.respuestaCorrecta === 'verdadero');

            bloque.appendChild(preguntaDiv);
            bloque.appendChild(respuestaDiv);

            addCruz(bloque);

            section.appendChild(bloque);
        });
    })
    .catch(error => {
        console.error('Error en la peticion fetch: ', error);
    });
}

function init() {
    const botonCrear = document.querySelector('input[name="crea"]');
    botonCrear.addEventListener("click", addCuestionario);

    /*const bloques = document.querySelectorAll(".bloque");
    bloques.forEach(bloque => addCruz(bloque));

    const secciones = document.querySelectorAll("section");
    secciones.forEach(section => {
        const formularioNodo = addFormPregunta(section);
        const imgNode = section.querySelector('h2 img');
    });*/
    muestraCuestionarios();
}


// Inicialización al cargar la página
document.addEventListener("DOMContentLoaded", init);
