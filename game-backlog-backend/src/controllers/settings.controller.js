const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const { isValidEmail, isValidPassword, isValidUsername, sanitizeString, sanitizeUsernameAndPreserveCase, isValidSocialHandle } = require('../utils/validation');

// Cambiar o establecer contraseña (soporta cuentas Steam-only sin contraseña previa)
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: 'La nueva contraseña es obligatoria'
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    const currentUser = await User.findByIdWithPassword(userId);
    if (!currentUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Si ya tiene contraseña, exigir la actual; si es cuenta Steam-only, permitir crearla directamente
    if (currentUser.password) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Todos los campos son obligatorios'
        });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Contraseña actual incorrecta'
        });
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await User.changePassword(userId, hashedPassword);

    res.json({
      message: currentUser.password ? 'Contraseña actualizada exitosamente' : 'Contraseña creada exitosamente',
      has_password: true,
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
    newEmail = sanitizeString(newEmail).toLowerCase();

    if (!newEmail) {
      return res.status(400).json({
        error: 'El nuevo email es obligatorio'
      });
    }

    if (!isValidEmail(newEmail)) {
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }

    const existingEmail = await User.findByEmail(newEmail);
    if (existingEmail && existingEmail.id !== userId) {
      return res.status(409).json({
        error: 'Este email ya está en uso'
      });
    }

    const currentUser = await User.findByIdWithPassword(userId);
    if (!currentUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    if (currentUser.password) {
      if (!password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
      }
      const isPasswordValid = await bcrypt.compare(password, currentUser.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
    }

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

    if (!newUsername) {
      return res.status(400).json({
        error: 'El nuevo username es obligatorio'
      });
    }

    if (!isValidUsername(newUsername)) {
      return res.status(400).json({
        error: 'Username debe tener entre 3-15 caracteres y solo letras, números y guiones bajos'
      });
    }

    const existingUsername = await User.findByUsername(newUsername);
    if (existingUsername && existingUsername.id !== userId) {
      return res.status(409).json({
        error: 'Este username ya está en uso'
      });
    }

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

    const currentUser = await User.findByIdWithPassword(userId);
    if (!currentUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    if (currentUser.password) {
      if (!password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
      }
      const isPasswordValid = await bcrypt.compare(password, currentUser.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
    }

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

    const currentUser = await User.findByIdWithPassword(userId);
    if (!currentUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    if (currentUser.password) {
      if (!password) {
        return res.status(400).json({ error: 'La contraseña es obligatoria' });
      }
      const isPasswordValid = await bcrypt.compare(password, currentUser.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
    }

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

// Actualizar bio y redes sociales
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    let { bio, social_twitch, social_discord, social_steam } = req.body;

    if (bio && bio.length > 200) {
      return res.status(400).json({ error: 'Bio debe tener máximo 200 caracteres' });
    }

    bio = bio?.trim() || null;
    social_twitch = social_twitch?.trim() || null;
    social_discord = social_discord?.trim() || null;
    social_steam = social_steam?.trim() || null;

    if (!isValidSocialHandle(social_twitch)) {
      return res.status(400).json({ error: 'Formato de handle de Twitch inválido' });
    }
    if (!isValidSocialHandle(social_discord)) {
      return res.status(400).json({ error: 'Formato de handle de Discord inválido' });
    }
    if (!isValidSocialHandle(social_steam)) {
      return res.status(400).json({ error: 'Formato de handle de Steam inválido' });
    }

    const updatedUser = await User.updateProfile(userId, { bio, social_twitch, social_discord, social_steam });

    res.json({ message: 'Perfil actualizado exitosamente', user: updatedUser });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

module.exports = {
  changePassword,
  updateEmail,
  updateUsername,
  deleteAccount,
  updateProfileVisibility,
  updateProfile,
};