import path from 'node:path';
import { prepararProposta } from '../utils/proposta.js';
import { gerarPDFMultilimp } from '../utils/multilimpPdf.js';

export async function gerarOrcamento(req, res) {
  let proposta;
  try { proposta = prepararProposta(req.body); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const file = await gerarPDFMultilimp(proposta);
    res.json({ sucesso: true, caminhoOrcamento: '/orcamentos/' + path.basename(file) });
  } catch (error) {
    console.error('Falha ao gerar PDF:', error.message);
    res.status(500).json({ error: 'Não foi possível gerar o PDF. Verifique as imagens e tente novamente.' });
  }
}
