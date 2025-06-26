'use strict';

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// carga y ejecuta config.js
const config = require('./config.js');

// objeto global que referencia a la librería Knex.js
var knex= null;

// inicializa Knex.js para usar diferentes bases de datos según el entorno:
function conectaBD () {
  if (knex===null) {
    var options;
    if (process.env.CARRITO_ENV === 'gae') {
      options= config.gae;
      console.log('Usando Cloud SQL (MySQL) como base de datos en Google App Engine');
    } else if (process.env.CARRITO_ENV === 'gaesqlite3') {
      options= config.gaesqlite3;
      console.log('Usando SQLite como base de datos en Google App Engine');
    } else {
      options= config.localbd;
      console.log('Usando SQLite como base de datos local');
    }
    // La siguiente opción muestra la conversión a SQL de cada consulta:
    // options.debug= true;
    knex= require('knex')(options);
  }
}

// crea las tablas si no existen:
async function creaEsquema(res) {
  try {
    let existeTabla= await knex.schema.hasTable('cuestionarios');
    if (!existeTabla) {
      await knex.schema.createTable('cuestionarios', (tabla) => {
        tabla.increments('cuestionarioID').primary();
        tabla.string('tema', 100).notNullable();
      });
      console.log("Se ha creado la tabla cuestionarios");
    }
    existeTabla= await knex.schema.hasTable('preguntas');
    if (!existeTabla) {
      await knex.schema.createTable('preguntas', (table) => {
        table.increments('preguntaID').primary();
        table.integer('cuestionarioID').unsigned().notNullable();
        table.string('texto', 100).notNullable();
        table.string('respuestaCorrecta', 255).notNullable();
        table.foreign('cuestionarioID').references('tema').inTable('cuestionarios');
      });
      console.log("Se ha creado la tabla preguntas");
    }
  }
  catch (error) {
    console.log(`Error al crear las tablas: ${error}`);
    res.status(404).send({ result:null,error:'error al crear la tabla; contacta con el administrador. Tonto' });
  }
}

async function numeroCarritos() {
  let n= await knex('carritos').countDistinct('nombre as n');
  // the value returned by count in this case is an array of objects like [ { n: 2 } ]
  return n[0]['n'];
}

async function numeroItems(carrito) {
  let r= await knex('productos').select('item')
                                .where('carrito',carrito);
  return r.length;
}

async function existeCuestionario(cuestionarios) {
  let r= await knex('cuestionarios').select('tema')
                               .where('tema',cuestionarios);
  return r.length>0;
}

async function existeItem(item,carrito) {
  let r= await knex('productos').select('item')
                                .where('item',item)
                                .andWhere('carrito',carrito);
  return r.length>0;
}


// convierte el cuerpo del mensaje de la petición en JSON al objeto de JavaScript req.body:
app.use(express.json());

// middleware para descodificar caracteres UTF-8 en la URL:
app.use( (req, res, next) => {
  req.url = decodeURI(req.url);
  next();
});

// middleware para las cabeceras de CORS:
app.use( (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST, OPTIONS');
  res.header("Access-Control-Allow-Headers", "content-type");
  next();
});


// middleware que establece la conexión con la base de datos y crea las 
// tablas si no existen; en una aplicación más compleja se crearía el
// esquema fuera del código del servidor:
app.use( async (req, res, next) => {
  conectaBD();
  await creaEsquema(res);
  next();
});

//crea un cuestionrio nuevo
app.post(config.app.base+'/creacuestionario', async (req, res) => {
  try{

    const tema = req.body.tema;

    if (!tema){
      res.status(400).send({result: null, error: 'El tema es requerido'});
      return;
    }

    let existe = await existeCuestionario(tema);
    if(existe){
      res.status(400).send({result: null, error: `El tema ${tema} ya existe en la base de datos.`});
      return;
    }
    
    var item = {tema: tema};
    const ids = await knex('cuestionarios').insert(item);
    const id = ids[0];
    res.status(200).send({result: {id: id, tema: tema}, error: null});

  }catch (error){
    console.log(`No se puede crear el cuestionario: ${error}`);
    res.status(404).send({result: null, error: 'no se pudo crear el cuestionario'});
  }
})

//Devuelve los cuestionarios
app.get(config.app.base+'/cuestionarios', async (req, res) => {
  try{
    const cuestionarios = await knex('cuestionarios').select('*');
    res.status(200).send({result: cuestionarios, error: null});
  }catch(error){
    console.log(`No se pudieron obtener los cuestionarios: ${error}`);
    res.status(500).send({result: null, error: 'No se pudieron obtener los cuestionarios'});
  }
})

// crea una nueva pregunta
app.post(config.app.base + '/nuevaPregunta/:id/preguntas', async (req, res) => {
  try{
    const idCuestionario = parseInt(req.params.id);
    if (isNaN(idCuestionario)) {
      res.status(400).send({ result: null, error: 'El ID de cuestionario debe ser numérico.' });
      return;
    }
    const {texto, respuestaCorrecta} = req.body;

    if(!texto || !respuestaCorrecta){
      res.status(400).send({result:null, error: 'Faltan datos: texto y respuesta son obligatorios.'});
      return;
    }

    const preguntaExistente = await knex('preguntas')
    .where('cuestionarioID', idCuestionario)
    .andWhere('texto', texto)
    .first();

    if (preguntaExistente) {
      res.status(400).send({ result: null, error: `La pregunta '${texto}' ya existe en el cuestionario.` });
      return;
    }


    const cuestionario = await knex('cuestionarios').where('cuestionarioID', idCuestionario).first();
    if(!cuestionario){
      res.status(404).send({result:null, error:`El cuestionario con ID ${idCuestionario} no existe.`});
      return;
    }

    const [idPregunta] = await knex('preguntas').insert({
      cuestionarioID: idCuestionario,
      texto: texto,
      respuestaCorrecta: respuestaCorrecta
    });

    res.status(200).send({
      result: {idPregunta: idPregunta},
      error: null
    });

  }catch(error){
    console.log(`Error al insertar la pregunta ${error}`);
    res.status(500).send({result:null, error: 'Error al añadir la pregunta'});
  }
})

// devuelve las preguntas dado un cuestionario
app.get(config.app.base + '/cuestionarios/:id/preguntas', async (req,res) => {
  try{
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).send({ result: null, error: 'El ID de cuestionario debe ser numérico.' });
      return;
    }

    const cuestionario = await knex('cuestionarios').where('cuestionarioID',id).first();
    if(!cuestionario){
      res.status(404).send({result: null, error: `Cuestionario con ID ${id} no encontrado`});
      return;
    }

    const preguntas = await knex('preguntas').where('cuestionarioID',id).select('preguntaID','texto','respuestaCorrecta');

    res.status(200).send({result: preguntas, error: null});
  }catch(error){
    console.error(`Error obteniendo preguntas del cuestionario ${id}:`, error);
    res.status(500).send({ result: null, error: 'Error al obtener las preguntas' });
  }
})

//borra una pregunta dado su id
app.delete(config.app.base + '/preguntas/:id', async (req, res) => {
  try {
    const idPregunta = parseInt(req.params.id);
    if (isNaN(idPregunta)) {
      res.status(400).send({ result: null, error: 'El ID de cuestionario debe ser numérico.' });
      return;
    }

    // Buscar la pregunta antes de borrarla
    const pregunta = await knex('preguntas').where('preguntaID', idPregunta).first();

    if (!pregunta) {
      res.status(404).send({ result: null, error: `La pregunta con ID ${idPregunta} no existe.` });
      return;
    }

    const cuestionarioID = pregunta.cuestionarioID;

    // Borrar la pregunta
    await knex('preguntas').where('preguntaID', idPregunta).del();

    // Contar preguntas restantes en ese cuestionario
    const totalRestantes = await knex('preguntas').where('cuestionarioID', cuestionarioID).count('* as n');

    if (totalRestantes[0].n == 0) {
      // Borrar el cuestionario si ya no quedan preguntas
      await knex('cuestionarios').where('cuestionarioID', cuestionarioID).del();
      console.log(`Cuestionario ${cuestionarioID} eliminado porque ya no tenía preguntas.`);
    }

    res.status(200).send({ result: 'ok', error: null });
  } catch (error) {
    console.error(`Error al borrar la pregunta ${req.params.id}: `, error);
    res.status(500).send({ result: null, error: 'Error al borrar la pregunta' });
  }
});

app.delete(config.app.base + '/cuestionario/:tema', async (req, res) => {
  try {
    const temaCuestionario = req.params.tema;

    // Verificar si el cuestionario existe
    const cuestionario = await knex('cuestionarios').where('tema', temaCuestionario).first();
    if (!cuestionario) {
      res.status(404).send({ result: null, error: `No existe ningún cuestionario con el tema '${temaCuestionario}'.` });
      return;
    }

    const idCuestionario = cuestionario.cuestionarioID;

    // Borrar primero todas sus preguntas
    await knex('preguntas').where('cuestionarioID', idCuestionario).del();

    // Borrar el cuestionario
    await knex('cuestionarios').where('tema', temaCuestionario).del();

    res.status(200).send({ result: 'ok', error: null });
  } catch (error) {
    console.error(`Error al borrar el cuestionario con tema '${req.params.tema}':`, error);
    res.status(500).send({ result: null, error: 'Error interno al borrar el cuestionario.' });
  }
});






/*
-----------------------------------------------------------------------------------------------------------------------
--------------------------------------------------------CARRITOOOOOOO--------------------------------------------------
-----------------------------------------------------------------------------------------------------------------------
*/








// crea un carrito:
app.post(config.app.base+'/creacarrito', async (req,res) => {
  try {
    let n= await numeroCarritos();
    if (n>=config.app.maxCarritos) {
      res.status(404).send({ result:null,error:'No caben más carritos; contacta con el administrador' });
      return;
    }
    let existe= true;
    while (existe) {
      var nuevo = Math.random().toString(36).substring(7);
      existe= await existeCarrito(nuevo);
    }
    var c= { nombre:nuevo };
    await knex('carritos').insert(c);
    res.status(200).send({ result:{ nombre:nuevo },error:null });
  } catch (error) {
    console.log(`No se puede crear el carrito: ${error}`);
    res.status(404).send({ result:null,error:'no se pudo crear el carrito' });
  }
});


// crea un nuevo item:
app.post(config.app.base+'/:carrito/productos', async (req, res) => {
  if (!req.body.item || !req.body.cantidad) {
    res.status(404).send({ result:null,error:'datos mal formados' });
    return;
  }
  try {
    let existe= await existeCarrito(req.params.carrito);
    if (!existe) {
      res.status(404).send({ result:null,error:`carrito ${req.params.carrito} no existente` });
      return;  
    }
    existe= await existeItem(req.body.item,req.params.carrito);
    if (existe) {
      res.status(404).send({ result:null,error:`item ${req.body.item} ya existente` });
      return;
    }
    let n= await numeroItems(req.params.carrito);
    if (n>=config.app.maxProductos) {
      res.status(404).send({ result:null,error:`No caben más productos en el carrito ${req.params.carrito}` });
      return;
    }
    var i= { carrito:req.params.carrito,item:req.body.item,cantidad:req.body.cantidad };
    await knex('productos').insert(i);
    res.status(200).send({ result:'ok',error:null });
  } catch (error) {
    console.log(`No se puede añadir el item: ${error}`);
    res.status(404).send({ result:null,error:'no se pudo añadir el item' });
  }
});


// lista los items de un carrito:
app.get(config.app.base+'/:carrito/productos', async (req, res) => {
  try {
    let existe= await existeCarrito(req.params.carrito);
    if (!existe) {
      res.status(404).send({ result:null,error:`carrito ${req.params.carrito} no existente` });
      return;  
    }
    let i= await knex('productos').select(['item','cantidad'])
                                  .where('carrito',req.params.carrito);
    res.status(200).send({ result:i,error:null });
  } catch (error) {
    console.log(`No se puede obtener los productos del carrito: ${error}`);
    res.status(404).send({ result:null,error:'no se pudo obtener los datos del carrito' });
  }
});


// lista los datos de un item:
app.get(config.app.base+'/:carrito/productos/:item', async (req, res) => {
  try {
    let existe= await existeCarrito(req.params.carrito);
    if (!existe) {
      res.status(404).send({ result:null,error:`carrito ${req.params.carrito} no existente` });
      return;  
    }
    existe= await existeItem(req.params.item,req.params.carrito);
    if (!existe) {
      res.status(404).send({ result:null,error:`item ${req.params.item} no existente` });
      return;
    }
    let i= await knex('productos').select(['item','cantidad'])
                                  .where('carrito',req.params.carrito)
                                  .andWhere('item',req.params.item);
    res.status(200).send({ result:i[0],error:null });
  } catch (error) {
    console.log(`No se pudo obtener el item: ${error}`);
    res.status(404).send({ result:null,error:'no se pudo obtener el item' });
  }
});


// modifica un item:
app.put(config.app.base+'/:carrito/productos/:item', async (req, res) => {
  if (!req.body.cantidad) {
    res.status(404).send({ result:null,error:'datos mal formados' });
    return;
  }
  try {
    let existe= await existeCarrito(req.params.carrito);
    if (!existe) {
      res.status(404).send({ result:null,error:`carrito ${req.params.carrito} no existente` });
      return;  
    }
    existe= await existeItem(req.params.item,req.params.carrito);
    if (!existe) {
      res.status(404).send({ result:null,error:`item ${req.params.item} no existente` });
      return;
    }
    await knex('productos').update('cantidad',req.body.cantidad)
                           .where('carrito',req.params.carrito)
                           .andWhere('item',req.params.item);
    res.status(200).send({ result:'ok',error:null });
  } catch (error) {
    console.log(`No se pudo obtener el item: ${error}`);
    res.status(404).send({ result:null,error:'no se pudo obtener el item' });
  }
});


// borra un item:
app.delete(config.app.base+'/:carrito/productos/:item', async (req, res) => {
  try {
    let existe= await existeCarrito(req.params.carrito);
    if (!existe) {
      res.status(404).send({ result:null,error:`carrito ${req.params.carrito} no existente` });
      return;  
    }
    existe= await existeItem(req.params.item,req.params.carrito);
    if (!existe) {
      res.status(404).send({ result:null,error:`item ${req.params.item} no existente` });
      return;
    }
    await knex('productos').where('carrito',req.params.carrito).andWhere('item',req.params.item).del();
    res.status(200).send({ result:'ok',error:null });
  } catch (error) {
    console.log(`No se pudo obtener el item: ${error}`);
    res.status(404).send({ result:null,error:'no se pudo obtener el item' });
  }
});


// borra un carrito:
app.delete(config.app.base+'/:carrito', async (req, res) => {
  try {
    let existe= await existeCarrito(req.params.carrito);
    if (!existe) {
      res.status(404).send({ result:null,error:`carrito ${req.params.carrito} no existente` });
      return;  
    }
    await knex('productos').where('carrito',req.params.carrito)
                           .del();
    await knex('carritos').where('nombre',req.params.carrito)
                          .del();
    res.status(200).send({ result:'ok',error:null });
  } catch (error) {
    console.log(`No se pudo encontrar el carrito: ${error}`);
    res.status(404).send({ result:null,error:'no se pudo encontrar el carrito' });
  }
});


// borra toda la base de datos:
app.get(config.app.base+'/clear', async (req,res) => {
  try {
    await knex('productos').where('carrito',req.params.carrito)
                           .del();
    await knex('carrito').where('nombre',req.params.carrito)
                         .del();
    res.status(200).send({ result:'ok',error:null });
  } catch (error) {
    console.log(`No se pudo borrar la base de datos: ${error}`);
  }
});


const path = require('path');
const publico = path.join(__dirname, 'public');
// __dirname: directorio del fichero que se está ejecutando

app.get(config.app.base+'/', (req, res) => {
  res.status(200).send('API web para gestionar cuestionarios.');
});

app.get(config.app.base/*+'/ayuda'*/, (req, res) => res.sendFile(path.join(publico, 'index.html')));

app.use('/', express.static(publico));

app.listen(port, function () {
  console.log(`Aplicación lanzada en el puerto ${ port }!`);
});
