const fs = require('fs/promises'); // Importa el módulo de archivos (opcional, dependiendo de tu lógica)
const path = require('path'); // Importa el módulo de rutas (opcional, dependiendo de tu lógica)
const CryptoJS = require('crypto-js');
const pool = require('../../database/mongo'); // Asegúrate de que la conexión a la base de datos está bien
const moment = require('moment-timezone');

// Lógica de login
const login = async (req, res) => {
  const datos = req.body; // Debe contener email y password
  console.log("Datos recibidos:", datos); // Para ver qué datos se reciben

  const hashedPassword = CryptoJS.SHA256(datos.password, process.env.CODE_SECRET_DATA).toString();
  console.log("SIN ENCRIPTAR: ", datos.password);
  console.log("HACKEO: ", hashedPassword);

  try {
      const login = await pool.db('margarita').collection('users').findOne({
          correo: datos.email, // Cambiado de email a correo
          password: hashedPassword
      });

      if (login) {
          // Aquí se procesa el login exitoso
          res.json({ status: "Bienvenido", user: datos.email, role: login.role });
      } else {
          res.json({ status: "ErrorCredenciales" });
      }
  } catch (error) {
      console.error('Error al iniciar sesión:', error);
      res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};



const register = async (req, res) => {
  const { nombre, fecha, cedula, correo, celular, ciudad, contraseña } = req.body;

  const hashedPassword = CryptoJS.SHA256(contraseña, process.env.CODE_SECRET_DATA).toString();

  try {
      const existingUser = await pool.db('margarita').collection('users').findOne({ correo });
      if (existingUser) {
          return res.status(400).json({ status: "Error", message: "El correo ya está en uso" });
      }

      const newUser = {
          nombre,
          fecha,
          cedula,
          correo,
          celular,
          ciudad,
          password: hashedPassword,
          role: 'user'
      };

      await pool.db('margarita').collection('users').insertOne(newUser);
      res.status(201).json({ status: "Éxito", message: "Usuario registrado correctamente" });
  } catch (error) {
      console.error('Error al registrar el usuario:', error);
      res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

const reclamarCodigo = async (req, res) => {
  const { userId, codigo } = req.body; // Asegúrate de que se están recibiendo los datos correctamente
  console.log("Datos recibidos para reclamar código:", req.body);
  
  let client; // Declarar client aquí

  try {
      client = await pool.connect(); // Conectar a MongoDB
      const db = client.db('margarita');
      const codigosCollection = db.collection('codigos');

      // Verificar si el código existe y su estado
      const codigoReclamado = await codigosCollection.findOne({ codigo });

      if (!codigoReclamado) {
          return res.json({ status: "Error", message: "Código no válido." });
      }

      if (codigoReclamado.estado !== "por reclamar") {
          return res.json({ status: "Error", message: "Este código ya fue reclamado." });
      }

      // Cambiar el estado del código y guardar la información del usuario que reclamó
      const montoGanado = codigoReclamado.monto; // Obtener el monto desde el código
      const nuevaFecha = new Date().toISOString();
      
      await codigosCollection.updateOne(
          { codigo },
          {
              $set: {
                  estado: `ya reclamado (${userId})`, // Cambia el estado al ID del usuario
                  fechaReclamo: nuevaFecha // Guarda la fecha del reclamo
              }
          }
      );

      // Aquí podrías también guardar el reclamo en otra colección para llevar un registro
      // Ejemplo: await db.collection('reclamos').insertOne({ userId, codigo, montoGanado, nuevaFecha });

      // Responder con el resultado del reclamo
      res.json({
          status: "Éxito",
          message: `¡Ganaste! Monto: $${montoGanado}`,
          userId // Este es el ID del usuario que reclama el código
      });

  } catch (error) {
      console.error('Error al reclamar código:', error);
      res.status(500).json({ status: "Error", message: "Error en el servidor" });
  } finally {
      if (client) {
          client.close(); // Cerrar la conexión con la base de datos si client fue definido
      }
  }
};


// Exporta la función de login
module.exports = {
    login,
    register,
    reclamarCodigo
};
