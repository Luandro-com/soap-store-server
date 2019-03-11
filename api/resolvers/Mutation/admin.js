const { getUserId } = require('../../services/auth/utils'
)
const admin = {
  async updateUserRole(parent, { userId, role }, ctx, info) {
    return await ctx.db.mutation.updateUser({
      data: { role },
      where: { id: userId }
    }, info)
  },
  async saveProduct(parent, { input }, ctx, info) {
    return await ctx.db.mutation.upsertProduct({
      update: input,
      where: { id: input.productId || "" },
      create: input,
    }, info)
  },
  async removeProduct(parent, { productId }, ctx, info) {
    const { id } = await ctx.db.mutation.deleteProduct({ where: { id: productId }, data: { variants: { disconnect: true } } })
    console.log('ID', id)
    return id
  },
  async saveProductVariant(parent, { input }, ctx, info) {
    let validInputs = {
      product: {}
    }
    Object.keys(input).map(i => {
      if (i === 'productId') {
        validInputs.product = { connect: { id: input[i]} }
      } else {
        validInputs[i] = input[i]
      }
    })
    return await ctx.db.mutation.upsertProductVariant({
      update: validInputs,
      where: { id: input.variantId || "" },
      create: validInputs,
    }, info)
  },
  async removeProductVariant(parent, { variantId }, ctx, info) {
    const { id } = await ctx.db.mutation.deleteProductVariant({ where: { id: variantId } })
    console.log('ID', id)
    return id
  },
  async saveProductCategory(parent, { input }, ctx, info) {
    let validInputs = {
      product: {}
    }
    Object.keys(input).map(i => {
      if (i === 'productId') {
        validInputs.product = { connect: { id: input[i]} }
      } else {
        validInputs[i] = input[i]
      }
    })
    return await ctx.db.mutation.upsertProductVariant({
      update: validInputs,
      where: { id: input.variantId || "" },
      create: validInputs,
    }, info)
  },
  async removeProductCategory(parent, { variantId }, ctx, info) {
    const { id } = await ctx.db.mutation.deleteProductVariant({ where: { id: variantId } })
    console.log('ID', id)
    return id
  },
  async updateOrderStatus(parent, { orderId, status }, ctx, info) {
    return await ctx.db.mutation.updateOrder({
      where: { id: orderId },
      data: { status }
    }, info)
  },
  async updateContent(parent, { input }, ctx, info) {
    const update = await ctx.db.mutation.updateManyContents({
      where: { createdAt_not: "1900-01-01T00:00:00.263Z" },
      data: { ...input }
    }, `{ count }`)
    if (update.count === 1) {
      const contents = await ctx.db.query.contents({}, info)
      return contents[0]
    } else {
      throw 'Error on updating content.'
    }
  },
}

module.exports = { admin }
