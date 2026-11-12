// Função serverless da Vercel: expõe o backend Express (compilado em backend/dist no build).
// As rotas /api/* são reescritas para cá no vercel.json; o Express recebe a URL original.
module.exports = require('../backend/dist/src/app').default;
