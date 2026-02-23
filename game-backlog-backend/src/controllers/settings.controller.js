const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const { isValidEmail, isValidPassword, isValidUsername, sanitizeString, sanitizeUsernameAndPreserveCase } = require('../utils/validation');
const pool = require('../config/database');

// Cambiar contraseña
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validar que vengan los campos
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios'
      });
    }

    // Validar nueva contraseña
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener usuario actual (con password)
    const user = await User.findById(userId);
    // Necesitamos modificar findById para que incluya password
    const userWithPassword = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const currentUser = userWithPassword.rows[0];

    if (!currentUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Contraseña actual incorrecta'
      });
    }

    // Encriptar nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    await User.changePassword(userId, hashedPassword);

    res.json({
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error en changePassword:', error);
    res.status(500).json({
      error: 'Error al cambiar contraseña'
    });
  }
};

// Actualizar email
const updateEmail = async (req, res) => {
  try {
    const userId = req.user.userId;
    let { newEmail, password } = req.body;
    newEmail = sanitizeString(newEmail);

    // Validar que vengan los campos
    if (!newEmail || !password) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios'
      });
    }

    // Validar formato de email
    if (!isValidEmail(newEmail)) {
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }

    // Verificar que el email no esté en uso
    const existingEmail = await User.findByEmail(newEmail);
    if (existingEmail) {
      return res.status(409).json({
        error: 'Este email ya está en uso'
      });
    }

    // Obtener usuario actual (con password)
    const pool = require('../config/database');
    const userWithPassword = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const currentUser = userWithPassword.rows[0];

    if (!currentUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, currentUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Contraseña incorrecta'
      });
    }

    // Actualizar email
    const updatedUser = await User.updateEmail(userId, newEmail);

    res.json({
      message: 'Email actualizado exitosamente',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error en updateEmail:', error);
    res.status(500).json({
      error: 'Error al actualizar email'
    });
  }
};

// Actualizar username
const updateUsername = async (req, res) => {
  try {
    const userId = req.user.userId;
    let { newUsername, password } = req.body;
    newUsername = sanitizeUsernameAndPreserveCase(newUsername);

    // Validar que vengan los campos
    if (!newUsername || !password) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios'
      });
    }

    // Validar username
    if (!isValidUsername(newUsername)) {
      return res.status(400).json({
        error: 'Username debe tener entre 3-50 caracteres y solo letras, números y guiones bajos'
      });
    }

    // Verificar que el username no esté en uso (excluyendo al propio usuario)
    const existingUsername = await User.findByUsername(newUsername);
    if (existingUsername && existingUsername.id !== userId) {
      return res.status(409).json({
        error: 'Este username ya está en uso'
      });
    }

    // Verificar restricción de 30 días
    const lastChange = await User.getLastUsernameChange(userId);
    if (lastChange) {
      const daysSinceLastChange = Math.floor((Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastChange < 30) {
        return res.status(429).json({
          error: `Solo puedes cambiar tu username cada 30 días. Días restantes: ${30 - daysSinceLastChange}`,
          daysRemaining: 30 - daysSinceLastChange
        });
      }
    }

    // Obtener usuario actual (con password)
    const pool = require('../config/database');
    const userWithPassword = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const currentUser = userWithPassword.rows[0];

    if (!currentUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, currentUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Contraseña incorrecta'
      });
    }

    // Actualizar username
    const updatedUser = await User.updateUsername(userId, newUsername);

    res.json({
      message: 'Username actualizado exitosamente',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error en updateUsername:', error);
    res.status(500).json({
      error: 'Error al actualizar username'
    });
  }
};

// Eliminar cuenta
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    // Validar que venga la contraseña
    if (!password) {
      return res.status(400).json({
        error: 'La contraseña es obligatoria'
      });
    }

    // Obtener usuario actual (con password)
    const pool = require('../config/database');
    const userWithPassword = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const currentUser = userWithPassword.rows[0];

    if (!currentUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, currentUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Contraseña incorrecta'
      });
    }

    // Eliminar usuario (CASCADE eliminará sus juegos)
    await User.deleteUser(userId);

    res.json({
      message: 'Cuenta eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error en deleteAccount:', error);
    res.status(500).json({
      error: 'Error al eliminar cuenta'
    });
  }
};

// Actualizar visibilidad del perfil
const updateProfileVisibility = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isPublic } = req.body;

    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({
        error: 'El campo isPublic es obligatorio y debe ser booleano'
      });
    }

    const updatedUser = await User.updateProfileVisibility(userId, isPublic);

    res.json({
      message: 'Visibilidad del perfil actualizada',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error en updateProfileVisibility:', error);
    res.status(500).json({
      error: 'Error al actualizar visibilidad del perfil'
    });
  }
};

module.exports = {
  changePassword,
  updateEmail,
  updateUsername,
  deleteAccount,
  updateProfileVisibility,
};