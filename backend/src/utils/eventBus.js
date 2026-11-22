import { EventEmitter } from 'node:events';

class RealtimeEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
  }

  /**
   * Broadcasts an order lifecycle event to both the tenant's Admin stream
   * and the specific order's customer tracking stream.
   */
  emitOrderEvent(organizationId, eventType, order) {
    const orgKey = `org:${String(organizationId)}`;
    const orderKey = `order:${String(order._id)}`;

    this.emit(orgKey, { type: eventType, order });
    this.emit(orderKey, {
      type: eventType,
      order: {
        _id: order._id,
        status: order.status,
        statusHistory: order.statusHistory,
        updatedAt: order.updatedAt,
      },
    });
  }
}

export const eventBus = new RealtimeEventBus();
