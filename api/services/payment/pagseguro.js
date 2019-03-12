const pagseguro = require('pagseguro')

// Ao iniciar a instância deve-se passar os dados do
// vendedor para obter acesso à API.
const simpleTransaction = async () => {
  const compra = pagseguro({
    'name': process.env.PAGSEGURO_STORE_NAME,
    'email': process.env.PAGSEGURO_EMAIL,
    'token': process.env.PAGSEGURO_TOKEN
  })
  
  compra.product.add({
    'id': 'Livro - A Lei de Parkinson',
    'description': 'A "Lei de Parkinson" é um achado genial de transparente simplicidade.',
    'amount': 35.9,
    'quantity': 1,
    'weight': 30
  })
  
  compra.sender({
    'name': 'João da Silva',
    'email': 'comprador@uol.com.br',
    'areaCode': 11,
    'phone': '3030-3344',
    'document': '99999999999',
    'born': 'dd/MM/yyyy'
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
  
  return compra.checkout((err, res, body) => {
    if( !!err === false && !!body.errors === false ) {
      // grava os dados no banco de dados
      // mongodb.save( body.checkout )
      console.log('CHECKOUT', body.checkout)  
      return body.checkout
      // redireciona o usuário para pagamento
      // res.redirect('https://pagseguro.uol.com.br/v2/checkout/payment.html?code=' + body.checkout.code)
    }
  })
}

const checkTransaction = (code) => {
  // Efetuando a checagem de uma compra através do seu código
  compra.transactions(code, (err, res, body) => {
    if( !!err === false && !!res.statusCode !== 404 ) {
      // grava os dados no banco de dados
      // mongodb.save( body.transaction )
    }
  })
}

module.exports = {
  simpleTransaction,
  checkTransaction,
}
