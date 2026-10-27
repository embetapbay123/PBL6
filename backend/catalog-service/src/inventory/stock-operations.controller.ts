import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Roles } from "../../../shared/src/auth";
import {
  CreateStockRequestBodyDto,
  DecideStockRequestBodyDto,
} from "../../../shared/src/dtos.generated";
import { StockOperationsService } from "./stock-operations.service";
@Controller()
@UseGuards(AuthGuard)
@Roles("STORE_OWNER", "SELLER")
export class StockOperationsController {
  private service = new StockOperationsService();
  @Get("store/inventory/summary") summary(@Req() r: any) {
    return this.service.summary(r.contract.query, r.auth);
  }
  @Get("store/inventory/requests") list(@Req() r: any) {
    return this.service.list(r.contract.query, r.auth);
  }
  @Post("store/inventory/requests") create(
    @Body() b: CreateStockRequestBodyDto,
    @Req() r: any,
  ) {
    return this.service.create(b, r.auth, r.correlationId);
  }
  @Patch("store/inventory/requests/:id") @Roles("STORE_OWNER") decide(
    @Param("id") id: string,
    @Body() b: DecideStockRequestBodyDto,
    @Req() r: any,
  ) {
    return this.service.decide(id, b, r.auth, r.correlationId);
  }
}
