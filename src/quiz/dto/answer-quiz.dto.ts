import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AnswerQuizDto {
  @IsNotEmpty()
  @IsString()
  gameId: string;

  @IsNotEmpty()
  @IsString()
  answer: string;

  @IsNotEmpty()
  @IsString()
  questionId: string;
}
