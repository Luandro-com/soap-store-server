const { getUserId } = require('../services/auth/utils')
const shipping = require('../services/payment/shipping')

const Query = {
  async content(parent, args, ctx, info) {
    const res = await ctx.db.query.contents({}, info)
    return res[0]
  },
  feed(parent, args, ctx, info) {
    return ctx.db.query.posts({ where: { isPublished: true } }, info)
  },

  drafts(parent, args, ctx, info) {
    const id = getUserId(ctx)

    const where = {
      isPublished: false,
      author: {
        id
      }
    }

    return ctx.db.query.posts({ where }, info)
  },

  post(parent, { id }, ctx, info) {
    return ctx.db.query.post({ where: { id } }, info)
  },

  user(parent, args, ctx, info) {
    const id = getUserId(ctx)
    return ctx.db.query.user({ where: { id } }, info)
  },

  productCategories(parent, args, ctx, info) {
    return ctx.db.query.productCategories(null, info)
  },

  product(parent, args, ctx, info) {
    const { id, slug} = args
    if (id) {
      return ctx.db.query.product({ where: { id }}, info)
    } else if (slug) {
      return ctx.db.query.product({ where: { slug }}, info)
    }
  },

  products(parent, args, ctx, info) {
    const { id, slug, category, subCategory } = args
    if (category) {
      return ctx.db.query.products({ where: { category: { slug: category } }}, info)
    } else if (subCategory) {
      return ctx.db.query.products({ where: { subCategories: { slug: subCategory } }}, info)
    }
    return ctx.db.query.products(null, info)
  },

  // async allCarts(parent, args, ctx, info) {
  //   return await ctx.db.query.orders()
  // },

  // async userOrders(parent, args, ctx, info) {
  //   const id = getUserId(ctx)
  //   return await ctx.db.query.orders({ where: { id } }, info)
  // },

  async allOrders(parent, args, ctx, info) {
    return await ctx.db.query.orders({}, info)
  },

  async customers(parent, args, ctx, info) {
    return await ctx.db.query.users({ where: { role: 'CUSTOMER' } }, info)
  },

  async admins(parent, args, ctx, info) {
    return await ctx.db.query.users({ where: { role_in: ['ADMIN', 'EDITOR', 'DELIVERY'] } }, info)
  },
  
  async shipping(parent, args, ctx, info) {
    return await shipping(args.input)
  },

  async payments(parent, args, ctx, info) {
    return await ctx.db.query.payments({}, info)
  },
}

module.exports = { Query }
