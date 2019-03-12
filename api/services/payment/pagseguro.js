const pagseguro = require('pagseguro.js')

// Ao iniciar a instância deve-se passar os dados do
// vendedor para obter acesso à API.
const simpleTransaction = () => new Promise((resolve, reject) => {
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
  simpleTransaction,
  checkTransaction,
}
