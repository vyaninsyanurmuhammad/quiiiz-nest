import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class FinishQuizDto {
  @IsNotEmpty()
  @IsString()
  gameId: string;
}
