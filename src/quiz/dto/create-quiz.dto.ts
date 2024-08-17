import { JsonValue } from '@prisma/client/runtime/library';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateQuizDto {
  @IsNotEmpty()
  @IsString()
  topic: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}

export class OutputQuestionDto {
  questionId: string;
  question: string;
  options: JsonValue;
}

export class OutputCreateQuizDto {
  quizId: string;
  topic: string;
  amount: number;
}
