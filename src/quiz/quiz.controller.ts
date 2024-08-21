import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AnswerQuizDto } from './dto/answer-quiz.dto';
import { FinishQuizDto } from './dto/finish-quiz.dto';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req,
    @Body() createQuizDto: CreateQuizDto,
    @Res() res: Response,
  ) {
    const response = await this.quizService.create(createQuizDto);

    const { quizId, amount, topic } = response;

    return res.status(HttpStatus.CREATED).send({
      data: { quizId, topic, amount },
      message: `${amount} question about ${topic} successfully created`,
      ...req.user.jwt,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req, @Res() res: Response) {
    const data = await this.quizService.findAll();

    return res.status(HttpStatus.OK).send({
      data,
      message: `${data.length} quiz about successfully got`,
      ...req.user.jwt,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string, @Res() res: Response) {
    const response = await this.quizService.findOne(id);

    const { quizId, amount, topic } = response;

    return res.status(HttpStatus.OK).send({
      data: { quizId, topic, amount },
      message: `${amount} question about ${topic} successfully got`,
      ...req.user.jwt,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/startOrContinue')
  async startOrContinue(
    @Req() req,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const response = await this.quizService.startOrContinueQuiz(
      id,
      req.user.user.sub,
    );

    const { gameId, quizId, topic, number, amount, timeStarted, question } =
      response;

    return res.status(HttpStatus.OK).send({
      data: { gameId, quizId, topic, number, amount, timeStarted, question },
      message: `quiz about ${topic} with id ${gameId} successfully started`,
      ...req.user.jwt,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/answer')
  async answerQuiz(
    @Req() req,
    @Param('id') id: string,
    @Body() answerQuizDto: AnswerQuizDto,
    @Res() res: Response,
  ) {
    const response = await this.quizService.answerQuiz(
      answerQuizDto.gameId,
      id,
      answerQuizDto.questionId,
      answerQuizDto.answer,
      req.user.user.sub,
    );

    const { gameId, answerId, isCorrect, correctAnswer, answer } = response;

    return res.status(HttpStatus.CREATED).send({
      data: { gameId, answerId, isCorrect, correctAnswer, answer },
      message: `question ${answerQuizDto.questionId} successfully answered`,
      ...req.user.jwt,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/finish')
  async finishQuiz(
    @Req() req,
    @Param('id') id: string,
    @Body() finishQuizDto: FinishQuizDto,
    @Res() res: Response,
  ) {
    const response = await this.quizService.finishQuiz(
      finishQuizDto.gameId,
      id,
      req.user.user.sub,
    );

    const { gameId, quizId, topic, score, timeStarted, timeEnded } = response;

    return res.status(HttpStatus.CREATED).send({
      data: { gameId, quizId, topic, score, timeStarted, timeEnded },
      message: `quiz about ${topic} with id ${gameId} successfully finished`,
      ...req.user.jwt,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/summary')
  async remove(@Req() req, @Param('id') id: string, @Res() res: Response) {
    const summary = await this.quizService.summary(id, req.user.user.sub);

    return res.status(HttpStatus.OK).send({
      data: summary,
      message: `summary successfully got`,
    });
  }

  @Get('find/topics')
  async topics(@Res() res: Response) {
    const topics = await this.quizService.findAllTopic();

    return res.status(HttpStatus.OK).send({
      data: topics,
      message: `${topics.length} topics successfully finished`,
    });
  }
}
