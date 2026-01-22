module.exports = {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testEnvironment: 'node',
  // Esto limpia los datos falsos entre cada prueba
  clearMocks: true,
};