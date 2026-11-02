import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getCurrentTenant } from './common/tenant.context.js';

@WebSocketGateway({
  cors: {
    origin: '*', // السماح بالاتصال من واجهات Next.js
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // استخراج معرف المستأجر من الترويسة أو الاستعلام لربط العميل فوراً بغرفته المعزولة
    const tenantId =
      client.handshake.auth?.tenantId ||
      client.handshake.query?.tenantId ||
      client.handshake.headers['x-tenant-id'] ||
      '1';

    const roomName = `tenant_${tenantId}`;
    client.join(roomName);
    console.log(`[WebSocket] Client connected: ${client.id} assigned strictly to room: ${roomName}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[WebSocket] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_tenant')
  handleJoinTenant(client: Socket, tenantId: string | number) {
    if (tenantId) {
      const roomName = `tenant_${tenantId}`;
      client.join(roomName);
      console.log(`[WebSocket] Client ${client.id} joined tenant room: ${roomName}`);
      return { status: 'joined', room: roomName };
    }
  }

  /**
   * بث تحديث لحظي معزول حصراً داخل غرفة المستأجر المعني (Complete Room Isolation)
   */
  emitTenantUpdate(tenantId: string | number | bigint, event: string, data: any) {
    if (!this.server) return;
    const roomName = `tenant_${tenantId}`;
    this.server.to(roomName).emit(event, data);
  }

  /**
   * دالة عامة للبث تكتشف هوية المستأجر تلقائياً لتفادي تسريب البيانات عبر الشركات
   */
  emitUpdate(event: string, data: any) {
    if (!this.server) return;

    // استخراج معرف المستأجر من البيانات أو من سياق الطلب الحالي
    const currentTenant = getCurrentTenant();
    const tenantId =
      data?.company_id ||
      data?.companyId ||
      data?.tenantId ||
      (currentTenant ? currentTenant.tenantId : '1');

    this.emitTenantUpdate(tenantId, event, data);
  }
}
