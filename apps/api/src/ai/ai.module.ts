import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { N8nClientService } from './n8n-client.service';
import { N8nMockAdapter } from './n8n-mock.adapter';

@Module({
  providers: [AiService, N8nClientService, N8nMockAdapter],
  exports: [AiService, N8nClientService, N8nMockAdapter],
})
export class AiModule {}
