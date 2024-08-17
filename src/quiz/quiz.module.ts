import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { OpenaiModule } from 'src/lib/openai/openai.module';
import { PrismaModule } from 'src/prisma.module';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';

@Module({
  imports: [OpenaiModule, PrismaModule],
  controllers: [QuizController],
  providers: [QuizService, JwtAuthGuard],
})
export class QuizModule {}
