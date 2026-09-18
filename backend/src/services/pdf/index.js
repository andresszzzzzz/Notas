const { generarConstanciaPDF } = require('./constancia');
const { generarCertificadoPDF } = require('./certificado');
const { generarCarnetPDF } = require('./carnet');
const { ETIQUETA_ROL } = require('./helpers');

module.exports = {
  ETIQUETA_ROL,
  generarConstanciaPDF,
  generarCertificadoPDF,
  generarCarnetPDF
};