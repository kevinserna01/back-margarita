const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const router = express.Router();
const { login } = require('./controllers/margaritaControllers');

// Cargar las variables de entorno correctamente
dotenv.config({ path: './config.env' });

// Conectar a MongoDB
mongoose.connect(process.env.DB_CONNECTION)
   .then(() => {
       console.log('Conexión exitosa a MongoDB');
   })
   .catch(err => {
       console.error('Error al conectar a MongoDB:', err);
   });

// Ruta para el login
router.post('/login', login);

module.exports = router;
