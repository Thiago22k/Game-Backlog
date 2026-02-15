const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { isValidEmail, isValidPassword, isValidUsername } = require('../utils/validation');

// Generar JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Registro de usuario
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validar que vengan todos los campos
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios'
      });
    }

    // Validar formato de email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }

    // Validar username
    if (!isValidUsername(username)) {
      return res.status(400).json({
        error: 'Username debe tener entre 3-50 caracteres y solo letras, números y guiones bajos'
      });
    }

    // Validar contraseña
    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el email ya existe
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        error: 'El email ya está registrado'
      });
    }

    // Verificar si el username ya existe
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        error: 'El username ya está en uso'
      });
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const newUser = await User.create(username, email, hashedPassword);

    // Generar token
    const token = generateToken(newUser.id);

    // Responder
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
      token,
    });

  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      error: 'Error al registrar usuario'
    });
  }
};

// Login de usuario
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // Acepta email o username

    // Validar que vengan los campos
    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios'
      });
    }

    // Detectar si el identifier es un email o username
    const isEmail = identifier.includes('@');
    
    // Buscar usuario por email o username según corresponda
    const user = isEmail 
      ? await User.findByEmail(identifier)
      : await User.findByUsername(identifier);

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Comparar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Generar token
    const token = generateToken(user.id);

    // Responder (sin enviar el password)
    res.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error al iniciar sesión'
    });
  }
};

// Obtener perfil del usuario autenticado
const getProfile = async (req, res) => {
  try {
    // req.user viene del middleware de autenticación
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({
      error: 'Error al obtener perfil'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
};