const { getUserId } = require('../../services/auth/utils')
const { simpleTransaction, } = require('../../services/payment/pagseguro')
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
    const { code } = await simpleTransaction()
    console.log('code', code)
    const order = await ctx.db.mutation.upsertOrder({
      where: { id: code},
      update: { ...input },
      create: {
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
  async addToCart(parent, args, ctx, info) {
    const { input: { productId, quantity, variantsIds } } = args
    if (variantsIds && variantsIds.length !== 1 && variantsIds.length !== 12) throw 'Variants must be 1 or 12'
    const id = getUserId(ctx)
    let cart
    cart = await ctx.db.query.user({ where: { id } }, `{ cart { id products { id product { id } variants { id } quantity } } }`).cart
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
    try {
      const { input } = args
      const id = getUserId(ctx)
      const orderId = input.orderId
      delete input.orderId
      const payment = await simpleTransaction()
      console.log('PAYMENT', payment)
      const {
        paymentId,
        type,
        currency,
        creditCard,
        tid,
        proofOfSale,
        authorizationCode,
        softDescriptor,
        provider,
        amount,
        serviceTaxAmount,
        installments,
        interest,
        capture,
        authenticate,
        recurrent,
        receivedDate,
        status,
        isSplitted,
        returnMessage,
        returnCode
      } = formatedPayment
      const card = await ctx.db.mutation.createCreditCard({
        data: creditCard
      })
      console.log('CREATED CARD ====> ', card)
      return await ctx.db.mutation.createPayment({
        data: {
          merchantOrderId: payment['MerchantOrderId'],
          customerName: payment['Customer']['Name'],
          order: { connect: { id: orderId } },
          customer: { connect: { id } },
          creditCard: { connect: { id: card.id }},
          paymentId,
          type,
          currency,
          tid,
          proofOfSale,
          authorizationCode,
          softDescriptor,
          provider,
          amount,
          serviceTaxAmount,
          installments,
          interest,
          capture,
          authenticate,
          recurrent,
          receivedDate: new Date(receivedDate),
          status,
          isSplitted,
          returnMessage,
          returnCode,
        }
      })
    } catch (err) {
      console.log('ERR on transaction', err)
    }
  },
}

module.exports = { shop }
