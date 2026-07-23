import { Controller, Get, HttpStatus, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuthenticatedRequest } from '../common/auth/authenticated-request';
import { ACCESS_TOKEN_COOKIE } from '../common/auth/cookies';
import { Roles } from '../common/auth/roles.decorator';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { MembershipRole } from '../generated/prisma/client';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { DetailedReportResponseDto, ProductionSummaryResponseDto } from './dto/report-response.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@ApiStandardErrors(
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.TOO_MANY_REQUESTS,
  HttpStatus.INTERNAL_SERVER_ERROR,
)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('detailed')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.OPERATOR)
  @ApiOperation({
    summary: 'Get tenant-scoped detailed orders for browser printing or future PDF generation',
  })
  @ApiOkResponse({ type: DetailedReportResponseDto })
  detailed(@Req() request: AuthenticatedRequest, @Query() query: ReportPeriodQueryDto) {
    return this.reports.detailed(request.authentication!, query);
  }

  @Get('production-summary')
  @Roles(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.OPERATOR)
  @ApiOperation({ summary: 'Get production totals grouped by category, product and unit' })
  @ApiOkResponse({ type: ProductionSummaryResponseDto })
  productionSummary(@Req() request: AuthenticatedRequest, @Query() query: ReportPeriodQueryDto) {
    return this.reports.productionSummary(request.authentication!, query);
  }
}
