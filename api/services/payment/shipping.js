const request = require('request')
const xml2js = require('xml2js')
/*
código do serviço.
40010 SEDEX
41106 PAC
http://www.correios.com.br/webServices/PDF/SCPP_manual_implementacao_calculo_remoto_de_precos_e_prazos.pdf
*/
const parsePrice = (v) => parseInt(v.replace(/,/g, ''))

module.exports = (input) => new Promise ((resolve, reject) => {
  let { originZip, destinationZip, weigth, height, width, length, diameter, declaredValue } = input
  if (width < 15) width = 15
  const params = {
    'nCdEmpresa': '',
    'sDsSenha': '',
    'sCepOrigem': originZip.toString(),
    'sCepDestino': destinationZip.toString(),
    'nVlPeso': (parseFloat(weigth) / 1000).toString(),
    'nCdFormato': '1',
    'nVlComprimento': length.toString(),
    'nVlAltura': height ? height.toString() : '0',
    'nVlLargura': width.toString(),
    'nVlDiametro': diameter ? diameter.toString() : '0',
    'sCdMaoPropria': 'n',
    'nVlValorDeclarado': declaredValue ? declaredValue.toString() : '0',
    'sCdAvisoRecebimento': 'n',
    'StrRetorno': 'xml',
    'nCdServico': '40010,41106'
  }
  const url = 'http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx'
  const options = {
    'uri': url,
    'method': 'GET',
    'qs': params,
  }
  request(options, (error, response, body) => {
    if (error) {
      console.log('Erro ', error)
      reject(error)
    }
    const parser = new xml2js.Parser({'async': true, 'attrkey': '@', 'explicitArray': false})
    parser.parseString(body, async (err, xml) => {
      if (err) {
        console.log('Erro ', err)
        reject(err)
      }
      let data = {
        pac: {},
        sedex: {},
      }
      await xml.Servicos.cServico.map(i => {
        const prop = (i.Codigo === '40010') ? 'sedex' : 'pac'
        return data[prop] = {
          value: parsePrice(i.Valor),
          deliveryDays: parsePrice(i.PrazoEntrega),
          valueWithoutAddition: parsePrice(i.ValorSemAdicionais),
          valueHandling: parsePrice(i.ValorMaoPropria),
          valueReceive: parsePrice(i.ValorAvisoRecebimento),
          valueDeclaredValue: parsePrice(i.ValorValorDeclarado),
        }
      })
      resolve(data)
    })
  })
})
