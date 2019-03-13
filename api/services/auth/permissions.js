const { rule, shield, and, or, not } = require('graphql-shield')
const { getUserId } = require('./utils')

const isAuthenticated = rule()(async (parent, args, ctx, info) => {
  return getUserId(ctx) !== null
})

const isAdmin = rule()(async (parent, args, ctx, info) => {
  const id = getUserId(ctx)
  const user = await ctx.db.query.user({ where: { id }})
  return user.role === 'ADMIN'
})

const isEditor = rule()(async (parent, args, ctx, info) => {
  const id = getUserId(ctx)
  const user = await ctx.db.query.user({ where: { id }})
  return user.role === 'EDITOR'
})

const isDelivery = rule()(async (parent, args, ctx, info) => {
  const id = getUserId(ctx)
  const user = await ctx.db.query.user({ where: { id }})
  return user.role === 'DELIVERY'
})


module.exports = shield({
  Query: {
    user: and(isAuthenticated),
    drafts: and(isAuthenticated, or(isAdmin, isEditor)),
    allCarts: and(isAuthenticated, isAdmin),
    allOrders: and(isAuthenticated, isAdmin),
    customers: and(isAuthenticated, isAdmin),
    admins: and(isAuthenticated, isAdmin),
    payments: and(isAuthenticated, isAdmin),
  },
  Mutation: {
    updateUser: and(isAuthenticated),
    login: not(isAuthenticated),
    addToCart: and(isAuthenticated),
    removeFromCart: and(isAuthenticated),
    saveAddress: and(isAuthenticated),
    removeAddress: and(isAuthenticated),
    saveOrder: and(isAuthenticated),
    cancelOrder: and(isAuthenticated),
    payment: and(isAuthenticated),
    updateUserRole: and(isAuthenticated, isAdmin),
    createDraft: or(isEditor, isAdmin),
    publish: or(isEditor, isAdmin),
    deletePost: or(isEditor, isAdmin),
    saveProduct: and(isAuthenticated, isAdmin),
    removeProduct: and(isAuthenticated, isAdmin),
    saveProductVariant: and(isAuthenticated, isAdmin),
    removeProductVariant: and(isAuthenticated, isAdmin),
    saveProductCategory: and(isAuthenticated, isAdmin),
    removeProductCategory: and(isAuthenticated, isAdmin),
    saveProductSubCategory: and(isAuthenticated, isAdmin),
    removeProductSubCategory: and(isAuthenticated, isAdmin),
    updateOrderStatus: and(isAuthenticated, isAdmin),
  },
}, {
  allowExternalErrors: true
})