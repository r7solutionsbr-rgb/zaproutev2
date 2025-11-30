import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('chat')
    async chat(@Body() body: { message: string, context?: string }) {
        if (!body.message) {
            throw new HttpException('Mensagem é obrigatória', HttpStatus.BAD_REQUEST);
        }

        try {
            const response = await this.aiService.chatWithLeonidas(body.message, body.context);
            return { response };
        } catch (error) {
            throw new HttpException('Erro ao processar mensagem', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
