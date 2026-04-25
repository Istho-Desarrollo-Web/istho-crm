'use strict';

/**
 * Jest globalSetup — corre UNA VEZ antes de todos los test suites.
 * Aplica migraciones y crea datos mínimos necesarios para los tests.
 * Corre en un proceso separado al de los test files.
 */
module.exports = async () => {
  require('dotenv').config();

  const path = require('path');
  const { Umzug, SequelizeStorage } = require('umzug');
  const db = require('../models');
  const { sequelize, Sequelize, Usuario } = db;

  await sequelize.authenticate();

  // Migraciones
  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, '../migrations/*.js'),
      resolve: ({ name, path: migPath, context }) => {
        const migration = require(migPath);
        return {
          name,
          up: async () => migration.up(context, Sequelize),
          down: async () => migration.down(context, Sequelize),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: undefined,
  });

  await umzug.up();

  // Seeds esenciales
  const seedRolesPermisos = require('../scripts/seedRolesPermisos');
  await seedRolesPermisos({ standalone: false });

  // Admin por defecto (el test hace login con este usuario)
  const adminExiste = await Usuario.findOne({ where: { rol: 'admin' } });
  if (!adminExiste) {
    await Usuario.crearConPassword({
      username: 'admin',
      email: 'admin@istho.com.co',
      password: process.env.SEED_PASSWORD_ADMIN || 'Admin2026*',
      nombre_completo: 'Administrador ISTHO',
      rol: 'admin',
    });
  }

  await sequelize.close();
};
