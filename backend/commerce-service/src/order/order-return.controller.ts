import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Roles } from "../../../shared/src/auth";
import {
  RequestOrderReturnBodyDto,
  ReportDeliveryReturnBodyDto,
  DecideOrderReturnBodyDto,
  RecordReturnCodRefundBodyDto,
} from "../../../shared/src/dtos.generated";
import { OrderReturnService } from "./order-return.service";
@Controller()
@UseGuards(AuthGuard)
export class OrderReturnController {
  private service = new OrderReturnService();
  @Post("me/orders/:id/returns") @Roles("CUSTOMER") create(
    @Param("id") id: string,
    @Body() b: RequestOrderReturnBodyDto,
    @Req() r: any,
  ) {
    return this.service.create(id, b, r.auth, r.correlationId);
  }
  @Post("store/orders/:id/returns") @Roles("STORE_OWNER") failed(
    @Param("id") id: string,
    @Body() b: ReportDeliveryReturnBodyDto,
    @Req() r: any,
  ) {
    return this.service.create(id, b, r.auth, r.correlationId, true);
  }
  @Patch("store/orders/:id/returns") @Roles("STORE_OWNER") decide(
    @Param("id") id: string,
    @Body() b: DecideOrderReturnBodyDto,
    @Req() r: any,
  ) {
    return this.service.decide(id, b, r.auth, r.correlationId);
  }
  @Post("store/orders/:id/returns/cod-refund") @Roles("STORE_OWNER") cash(
    @Param("id") id: string,
    @Body() b: RecordReturnCodRefundBodyDto,
    @Req() r: any,
  ) {
    return this.service.cashRefund(id, b, r.auth, r.correlationId);
  }
}
