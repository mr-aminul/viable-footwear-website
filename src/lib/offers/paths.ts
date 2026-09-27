/** Admin routes for the unified Offers surface (delivery + promo code). */

export const OFFERS_PATH = '/admin/offers'

export function offerDeliveryPath(id?: string) {
  return id ? `${OFFERS_PATH}/delivery/${id}` : `${OFFERS_PATH}/delivery/new`
}

export function offerPromoPath(id?: string) {
  return id ? `${OFFERS_PATH}/promo/${id}` : `${OFFERS_PATH}/promo/new`
}
