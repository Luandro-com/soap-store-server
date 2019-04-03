const { getUserId } = require('../../services/auth/utils')
const { transaction, initSession } = require('../../services/payment/pagseguro')
const camel = require('camelcase')

const getSameItem = (products, productId, variantsIds) => products.filter(p => {
  if (variantsIds) {
    let formatedVariantes = []
    p.variants.filter(v => formatedVariantes.push(v.id))
    return (p.product.id === productId && formatedVariantes.length === variantsIds.length && formatedVariantes.sort().every((value, index) => { return value === variantsIds.sort()[index]}))
  }
  return p.product.id === productId
})[0]

const shop = {
  async saveAddress(parent, args, ctx, info) {
    const { input } = args
    const id = getUserId(ctx)
    const addressId = input.addressId
    if (input.addressId) {
      delete input.addressId
    }
    const address = await ctx.db.mutation.upsertAddress({
      where: { id: addressId || '' },
      update: { ...input },
      create: { ...input, customer: { connect: { id }} },
    }, info)
    return address
  },
  async removeAddress(parent, args, ctx, info) {
    const id = getUserId(ctx)
    await ctx.db.mutation.deleteAddress({
      where: { id: args.addressId }
    })
    return ctx.db.query.addresses({
      where: { customer: { id }}
    })
  },
  async saveOrder(parent, args, ctx, info) {
    const { input } = args
    const id = getUserId(ctx)
    const orderId = input.orderId
    const cartId = input.cartId
    const shippingAddressId = input.shippingAddressId
    if (input.orderId) delete input.orderId
    if (input.cartId) delete input.cartId
    if (input.shippingAddressId) delete input.shippingAddressId
    const address = await ctx.db.query.address({ where: { id: shippingAddressId } }, `{
      street
      number
      complement
      zip
      district
      city
      state
      country
      firstName
      lastName
    }`)
    const { products } = await ctx.db.query.cart({ where: { id: cartId } }, `{ products { product { price } } }`)
    const { product: { price } } = products.reduce((prev, curr) => {
      console.log('prev', prev)
      console.log('curr', curr)
      return prev.product.price + curr.procut.price
    })
    console.log('PRICE', price)
    // const { code } = await simpleTransaction()
    // console.log('code', code)
    const code = await initSession()
    console.log('CODE', code)
    const order = await ctx.db.mutation.upsertOrder({
      where: { code },
      update: { ...input },
      create: {
        code,
        ...input,
        subTotalPrice: price,
        totalPrice: price,
        customer: { connect: { id } },
        cart: { connect: { id: cartId } },
        shippingAddress: { create: { ...address } },
      },
    }, info)
    return order


  },
  async cancelOrder(parent, args, ctx, info) {
    const { orderId } = args
    const id = getUserId(ctx)
    await ctx.db.mutation.updateOrder({
      where: { id: orderId },
      data: { status: 'CANCELED'}
    })
    return ctx.db.query.orders({ where: { customer: { id } } })

  },
  async updateCartItem(parent, args, ctx, info) {
    const { input: { productId, quantity, variantsIds } } = args
    // if (variantsIds && variantsIds.length !== 1 && variantsIds.length !== 12) throw 'Variants must be 1 or 12'
    const id = getUserId(ctx)
    let cart
    const existingCart = await ctx.db.query.user({ where: { id } }, `{ cart { id products { id product { id } variants { id } quantity } } }`)
    cart = existingCart.cart
    if (!cart) {
      cart = await ctx.db.mutation.createCart({
        data: {
          customer: {
            connect: {
              id
            }
          }
        }
      }, `{ id products { id } }`)
    }
    const sameItem = getSameItem(cart.products, productId, variantsIds)
    if(sameItem) {
      if (quantity <= 0) {
        await ctx.db.mutation.deleteCartItem({
          where: { id: sameItem.id },
        })
      } else {
        await ctx.db.mutation.updateCartItem({
          where: { id: sameItem.id },
          data: {
            quantity: quantity
          }
        })
      }
    } else {
      if (variantsIds) {
        let variants = {}
        await variantsIds.map(v => Object.assign(variants, { connect: { id: v } }))
        await ctx.db.mutation.createCartItem({ data: {
          quantity,
          cart: { connect: { id: cart.id } },
          product: { connect: { id: productId }},
          variants,
        }})
    
      } else {
        await ctx.db.mutation.createCartItem({ data: {
          quantity,
          cart: { connect: { id: cart.id } },
          product: { connect: { id: productId }},
        }}) 
      }
    }
    const userCart = await ctx.db.query.cart({ where: { id: cart.id } }, info)
    return userCart
  },
  async removeCartItem(parent, args, ctx, info) {
    const { productId } = args
    const id = getUserId(ctx)
    const { cart } = await ctx.db.query.user({ where: { id } }, `{ cart { id products { id product { id } variants { id } quantity } } }`)
    const sameItem = getSameItem(cart.products, productId, variantsIds)
    if(sameItem) {
      const nextQuantity = sameItem.quantity - quantity
      if (nextQuantity > 0) {
        await ctx.db.mutation.updateCartItem({
          where: { id: sameItem.id },
          data: { quantity: nextQuantity }
        })
      } else {
        await ctx.db.mutation.deleteCartItem({
          where: { id: sameItem.id },
        })
      }
      
    } else {
      let variants = {}
      await variantsIds.map(v => Object.assign(variants, { connect: { id: v } }))
      await ctx.db.mutation.createCartItem({ data: {
        quantity,
        cart: { connect: { id: cart.id } },
        product: { connect: { id: productId }},
        variants,
      }})
    }
    const userCart = await ctx.db.query.cart({ where: { id: cart.id } }, info)
    console.log('userCart', info)
    return userCart
    
  },
  async addToCart(parent, args, ctx, info) {
    const { input: { productId, quantity, variantsIds } } = args
    if (variantsIds && variantsIds.length !== 1 && variantsIds.length !== 12) throw 'Variants must be 1 or 12'
    const id = getUserId(ctx)
    let cart
    const existingCart = await ctx.db.query.user({ where: { id } }, `{ cart { id products { id product { id } variants { id } quantity } } }`)
    cart = existingCart.cart
    if (!cart) {
      cart = await ctx.db.mutation.createCart({
        data: {
          customer: {
            connect: {
              id
            }
          }
        }
      }, `{ id products { id } }`)
    }
    const sameItem = getSameItem(cart.products, productId, variantsIds)
    if(sameItem) {
      await ctx.db.mutation.updateCartItem({
        where: { id: sameItem.id },
        data: {
          quantity: sameItem.quantity + quantity
        }
      })
    } else {
      if (variantsIds) {
        let variants = {}
        await variantsIds.map(v => Object.assign(variants, { connect: { id: v } }))
        await ctx.db.mutation.createCartItem({ data: {
          quantity,
          cart: { connect: { id: cart.id } },
          product: { connect: { id: productId }},
          variants,
        }})
    
      } else {
        await ctx.db.mutation.createCartItem({ data: {
          quantity,
          cart: { connect: { id: cart.id } },
          product: { connect: { id: productId }},
        }}) 
      }
    }
    const userCart = await ctx.db.query.cart({ where: { id: cart.id } }, info)
    return userCart
  },
  async removeFromCart(parent, args, ctx, info) {
    const { input: { productId, quantity, variantsIds } } = args
    const id = getUserId(ctx)
    const { cart } = await ctx.db.query.user({ where: { id } }, `{ cart { id products { id product { id } variants { id } quantity } } }`)
    const sameItem = getSameItem(cart.products, productId, variantsIds)
    if(sameItem) {
      const nextQuantity = sameItem.quantity - quantity
      if (nextQuantity > 0) {
        await ctx.db.mutation.updateCartItem({
          where: { id: sameItem.id },
          data: { quantity: nextQuantity }
        })
      } else {
        await ctx.db.mutation.deleteCartItem({
          where: { id: sameItem.id },
        })
      }
      
    } else {
      let variants = {}
      await variantsIds.map(v => Object.assign(variants, { connect: { id: v } }))
      await ctx.db.mutation.createCartItem({ data: {
        quantity,
        cart: { connect: { id: cart.id } },
        product: { connect: { id: productId }},
        variants,
      }})
    }
    const userCart = await ctx.db.query.cart({ where: { id: cart.id } }, info)
    console.log('userCart', info)
    return userCart
    
  },
  async subscribe(parent, args, ctx, info) {
    try {
      const res = await ctx.db.mutation.createNewsletterSubscription({ data: { email: args.email }})
      console.log('RES', res)
      return true
    } catch (err) {
      console.log('Error on newsletter', err)
      return false
    }
  },
  async payment(parent, args, ctx, info) {
    const { 
      method,
      orderId,
      document,
      paymentHash,
      cardToken,
      holderName,
      holderDocument,
      holderBirth,
      holderPhone,
      billingAddressId } = args.input
      let transactionData = {}
      if (method === "CREDITCARD") {
        transactionData = {
          "mode":"default",
          "method":"creditCard",
          "sender":{
          "name":"Fulano Silva",
          "email":"fulano.silva@uol.com.br",
          "phone":{
          "areaCode":"11",
          "number":"30380000"
          },
          "documents":{
          "document":{
          "type":"CPF",
          "value":"22111944785"
          }
          },
          "hash":"{hash_obtido_no_passo_2.3}"
          },
          "currency":"BRL",
          "notificationURL":"https://sualoja.com.br/notificacao",
          "items":{
          "item":{
          "id":"1",
          "description":"Descricao do item a ser vendido",
          "quantity":"1",
          "amount":"10.00"
          }
          },
          "extraAmount":"0.00",
          "reference":"R123456",
          "shippingAddressRequired":"true",
          "shipping":{
          "address":{
          "street":"Av. Brigadeiro Faria Lima",
          "number":"1384",
          "complement":"1 andar",
          "district":"Jardim Paulistano",
          "city":"Sao Paulo",
          "state":"SP",
          "country":"BRA",
          "postalCode":"01452002"
          },
          "type":"3",
          "cost":"0.00"
          },
          "creditCard":{
          "token":"{creditCard_token_obtido_no_passo_2.6}",
          "installment":{
          "quantity":"{quantidade_de_parcelas_escolhida}",
          "value":"{installmentAmount_obtido_no_retorno_do_passo_2.5}",
          "noInterestInstallmentQuantity":"{valor_maxInstallmentNoInterest_incluido_no_passo_2.5} "
          },
          "holder":{
          "name":"Nome impresso no cartao",
          "documents":{
          "document":{
          "type":"CPF",
          "value":"22111944785"
          }
          },
          "birthDate":"20/10/1980",
          "phone":{
          "areaCode":"11",
          "number":"999991111"
          }
          },
          "billingAddress":{
          "street":"Av. Brigadeiro Faria Lima",
          "number":"1384",
          "complement":"1 andar",
          "district":"Jardim Paulistano",
          "city":"Sao Paulo",
          "state":"SP",
          "country":"BRA",
          "postalCode":"01452002"
          }
        }
          // mode: 'default',
          // method: 'creditCard',
          // sender: {
          //   name:,
          //   email:,
          //   phone: {
          //     areaCode:,
          //     number:,
          //   },
          //   documents: {
          //     type: 'CPF',
          //     value:,
          //   },
          //   hash: paymentHash,
          // },
          // currency: 'BRL',
          // notificationURL: process.env.PRODUCTION ? `https://api.flordocerradosaboaria.com/payment_notification`,
          // items: {
          //   id:,
          //   description:,
          //   quantity:,
          //   amount:,
          // },
          // extraAmount:,
          // reference:,
          // shippingAddressRequired: true,
        }
        console.log(transactionData)
      } else if (method === "BOLETO") {

      } else if (method === "EFT") {

      }
      const res = await transaction(transactionData)
      console.log('RES', res)
      return res
  },
  // async payment(parent, args, ctx, info) {
  //   try {
  //     const { input } = args
  //     const id = getUserId(ctx)
  //     const orderId = input.orderId
  //     delete input.orderId
  //     const payment = await simpleTransaction()
  //     console.log('PAYMENT', payment)
  //     {
  //       "payment": {
  //         "mode": "default",
  //         "method": "creditCard",
  //         "sender": {
  //           "name": "Fulano Silva",
  //           "email": "fulano.silva@uol.com.br",
  //           "phone": {
  //             "areaCode": "11",
  //             "number": "30380000"
  //           },
  //           "documents": {
  //             "document": {
  //               "type": "CPF",
  //               "value": "22111944785"
  //             }
  //           },
  //           "hash": "{hash_obtido_no_passo_2.3}"
  //         },
  //         "currency": "BRL",
  //         "notificationURL": "https://sualoja.com.br/notificacao",
  //         "items": {
  //           "item": {
  //             "id": "1",
  //             "description": "Descricao do item a ser vendido",
  //             "quantity": "1",
  //             "amount": "10.00"
  //           }
  //         },
  //         "extraAmount": "0.00",
  //         "reference": "R123456",
  //         "shippingAddressRequired": "true",
  //         "shipping": {
  //           "address": {
  //             "street": "Av. Brigadeiro Faria Lima",
  //             "number": "1384",
  //             "complement": "1 andar",
  //             "district": "Jardim Paulistano",
  //             "city": "Sao Paulo",
  //             "state": "SP",
  //             "country": "BRA",
  //             "postalCode": "01452002"
  //           },
  //           "type": "3",
  //           "cost": "0.00"
  //         },
  //         "creditCard": {
  //           "token": "{creditCard_token_obtido_no_passo_2.6}",
  //           "installment": {
  //             "quantity": "{quantidade_de_parcelas_escolhida}",
  //             "value": "{installmentAmount_obtido_no_retorno_do_passo_2.5}",
  //             "noInterestInstallmentQuantity": "{valor_maxInstallmentNoInterest_incluido_no_passo_2.5}
  //                  "
  //           },
  //           "holder": {
  //             "name": "Nome impresso no cartao",
  //             "documents": {
  //               "document": {
  //                 "type": "CPF",
  //                 "value": "22111944785"
  //               }
  //             },
  //             "birthDate": "20/10/1980",
  //             "phone": {
  //               "areaCode": "11",
  //               "number": "999991111"
  //             }
  //           },
  //           "billingAddress": {
  //             "street": "Av. Brigadeiro Faria Lima",
  //             "number": "1384",
  //             "complement": "1 andar",
  //             "district": "Jardim Paulistano",
  //             "city": "Sao Paulo",
  //             "state": "SP",
  //             "country": "BRA",
  //             "postalCode": "01452002"
  //           }
  //         }
  //       }
  //     }
  //     const {
  //       paymentId,
  //       type,
  //       currency,
  //       creditCard,
  //       tid,
  //       proofOfSale,
  //       authorizationCode,
  //       softDescriptor,
  //       provider,
  //       amount,
  //       serviceTaxAmount,
  //       installments,
  //       interest,
  //       capture,
  //       authenticate,
  //       recurrent,
  //       receivedDate,
  //       status,
  //       isSplitted,
  //       returnMessage,
  //       returnCode
  //     } = formatedPayment
  //     const xml = js2xmlparser.parse("payment", obj)
  //     const card = await ctx.db.mutation.createCreditCard({
  //       data: creditCard
  //     })
  //     console.log('CREATED CARD ====> ', card)
  //     return await ctx.db.mutation.createPayment({
  //       data: {
  //         merchantOrderId: payment['MerchantOrderId'],
  //         customerName: payment['Customer']['Name'],
  //         order: { connect: { id: orderId } },
  //         customer: { connect: { id } },
  //         creditCard: { connect: { id: card.id }},
  //         paymentId,
  //         type,
  //         currency,
  //         tid,
  //         proofOfSale,
  //         authorizationCode,
  //         softDescriptor,
  //         provider,
  //         amount,
  //         serviceTaxAmount,
  //         installments,
  //         interest,
  //         capture,
  //         authenticate,
  //         recurrent,
  //         receivedDate: new Date(receivedDate),
  //         status,
  //         isSplitted,
  //         returnMessage,
  //         returnCode,
  //       }
  //     })
  //   } catch (err) {
  //     console.log('ERR on transaction', err)
  //   }
  // },
}

module.exports = { shop }
