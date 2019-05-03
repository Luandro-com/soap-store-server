const pagseguro = require('pagseguro.js')
const fetch = require('node-fetch')
const xml2js = require('xml2js')
const js2xmlparser = require('js2xmlparser')
const parser = new xml2js.Parser({'async': true, 'attrkey': '@', 'explicitArray': false})
const uri = process.env.PRODUCTION ? 'ws.pagseguro' : 'ws.sandbox.pagseguro'

const initSession = () => new Promise((resolve, reject) => {
  const url =  `https://${uri}.uol.com.br/v2/sessions?email=${process.env.PAGSEGURO_EMAIL}&token=${process.env.PAGSEGURO_TOKEN}`
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  .then(res => res.text())
  .then(text => {
    if (text === 'Internal Server Error') reject(text)
    parser.parseString(text, (err, result) => {
      if (err) throw err
      console.log('ID', result.session.id)
      resolve(result.session.id)
    })
  })
  .catch(err => reject(err))
})

const transaction = data => new Promise((resolve, reject) => {
  const body = js2xmlparser.parse("payment", data)
  console.log('data', body)
  const url =  `https://${uri}.uol.com.br/v2/transactions?email=${process.env.PAGSEGURO_EMAIL}&token=${process.env.PAGSEGURO_TOKEN}`
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
    },
    body,
  })
  .then(res => res.text())
  .then(text => {
    console.log('TEXT', text)
    if (text === 'Internal Server Error') reject(text)
    parser.parseString(text, (err, result) => {
      if (err) throw err
      console.log('RESULT', result)
      if (result.errors && result.errors.error) {
        console.log(result.errors.error)
        reject(result.errors.error)
      }
      resolve(result)
    })
  })
  .catch(err => reject(err))
})

// Ao iniciar a instância deve-se passar os dados do
// vendedor para obter acesso à API.
const getCheckoutCode = () => new Promise((resolve, reject) => {
  const compra = pagseguro({
    name: process.env.PAGSEGURO_STORE_NAME,
    email: process.env.PAGSEGURO_EMAIL,
    token: process.env.PAGSEGURO_TOKEN
  })
  
  compra.product.add({
    'id': 'Livro - A Lei de Parkinson',
    'description': 'A "Lei de Parkinson" é um achado genial de transparente simplicidade.',
    'amount': 35.9,
    'quantity': 1,
    'weight': 30
  })
  
  compra.sender.set({
    'name': 'João da Silva',
    'email': 'comprador@uol.com.br',
    'areaCode': 11,
    'phone': '3030-3344',
    'document': '99999999999',
    'born': '14/05/1978'
  })
  
  compra.shipping.set({
    'type': 3,
    'cost': 5.60,
    'postalCode': '01001-000',
    'state': 'SP',
    'city': 'São Paulo',
    'district': 'Sé',
    'street': 'Praça da Sé',
    'number': '500',
    'complement': 'Lado Impar'
  })
  
  // Efetuando o request e recebendo o código de compra
  
  compra.checkout((err, res, body) => {
    if (res.body === 'Unauthorized') {
      reject('Unauthorized')
    } else {
      console.log('boDY', body, res.body)
      console.log('-----------------', err)
      if( !!err === false && !!body.errors === false ) {
        resolve(body.checkout)
      } else {
        reject('Error')
      }
    }
  })
})

const checkTransaction = (code) => new Promise((resolve, reject) => {
  compra.transactions(code, (err, res, body) => {
    if( !!err === false && !!res.statusCode !== 404 ) {
      resolve(body.checkout)
    } else reject(err)
  })
})

module.exports = {
  getCheckoutCode,
  checkTransaction,
  initSession,
  transaction,
}
