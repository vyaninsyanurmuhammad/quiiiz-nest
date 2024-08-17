import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CreateQuizDto,
  OutputCreateQuizDto,
  OutputQuestionDto,
} from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { OpenaiService } from 'src/lib/openai/openai.service';
import { QuestionDto } from 'src/lib/openai/dto/question.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private openaiService: OpenaiService,
    private prisma: PrismaService,
  ) {}

  async create(createQuizDto: CreateQuizDto): Promise<OutputCreateQuizDto> {
    try {
      const { topic, amount } = createQuizDto;

      const questions = await this.openaiService.generateQuiz(createQuizDto);
      const data = questions.map((q) => {
        return {
          ...q,
          options: JSON.stringify(q.options),
        };
      });

      const quiz = await this.prisma.quiz.create({
        data: {
          topic,
          Question: {
            createMany: {
              data,
            },
          },
        },
        include: {
          Question: {
            include: {
              _count: true,
            },
          },
          _count: true,
        },
      });

      const result: OutputCreateQuizDto = {
        quizId: quiz.quizId,
        topic: quiz.topic,
        amount: quiz._count.Question,
      };

      return result;
    } catch (error) {
      this.logger.error('Failed to create quiz:', error.message);
      this.logger.error(error.stack);
      throw new Error('Failed to create quiz');
    }
  }

  findAll() {
    return `This action returns all quiz`;
  }

  async findOne(id: string): Promise<OutputCreateQuizDto> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { quizId: id },
      include: { _count: true },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');
    return {
      quizId: quiz.quizId,
      topic: quiz.topic,
      amount: quiz._count.Question,
    };
  }

  async createGame(quizId: string, accountId: string) {
    return this.prisma.history.create({
      data: {
        timeStarted: new Date(),
        quiz: { connect: { quizId } },
        account: { connect: { accountId } },
      },
      include: {
        quiz: { include: { Question: true, _count: true } },
        Answer: true, // Ensure Answer is included
      },
    });
  }

  async startOrContinueQuiz(quizId: string, accountId: string) {
    try {
      let history = await this.prisma.history.findFirst({
        where: {
          quiz: {
            quizId,
          },
          timeEnded: null,
          account: { accountId },
        },
        include: {
          quiz: { include: { Question: true, _count: true } },
          Answer: true,
        },
      });

      if (!history) {
        history = await this.createGame(quizId, accountId);
      }

      const answeredQuizIds = history.Answer.map((a) => a.questionId);
      let firstUnansweredQuestion = history.quiz.Question.find(
        (question) => !answeredQuizIds.includes(question.id),
      );

      if (!firstUnansweredQuestion) {
        history = await this.createGame(quizId, accountId);
        firstUnansweredQuestion = history.quiz.Question[0];
      }

      return {
        gameId: history.hisyoryId,
        quizId: history.quiz.quizId,
        topic: history.quiz.topic,
        number: answeredQuizIds.length + 1,
        amount: history.quiz._count.Question,
        timeStarted: history.timeStarted,
        question: {
          questionId: firstUnansweredQuestion.questionId,
          question: firstUnansweredQuestion.question,
          options: firstUnansweredQuestion.options,
        },
      };
    } catch (error) {
      this.logger.error('Failed to start quiz:', error);
      throw new Error('Failed to start quiz');
    }
  }

  async finishQuiz(gameId: string, quizId: string, accountId: string) {
    try {
      const history = await this.prisma.history.findUnique({
        where: {
          hisyoryId: gameId,
          quiz: {
            quizId,
          },
          timeEnded: null,
          account: { accountId },
        },
        include: {
          quiz: { include: { Question: true, _count: true } },
          Answer: {
            where: {
              isCorrect: {
                equals: true,
              },
            },
          },
          _count: true,
        },
      });

      if (!history) {
        throw new NotFoundException('History not found');
      }

      const score =
        (history.Answer.length / history.quiz.Question.length) * 100;

      const historyUpdated = await this.prisma.history.update({
        where: {
          hisyoryId: history.hisyoryId,
          quiz: {
            quizId,
          },
          timeEnded: null,
          account: { accountId },
        },
        data: {
          score,
          timeEnded: new Date(),
        },
        include: {
          quiz: { include: { Question: true, _count: true } },
          Answer: true,
        },
      });

      return {
        gameId: historyUpdated.hisyoryId,
        quizId: historyUpdated.quiz.quizId,
        topic: historyUpdated.quiz.topic,
        score: historyUpdated.score,
        timeStarted: historyUpdated.timeStarted,
        timeEnded: historyUpdated.timeEnded,
      };
    } catch (error) {
      this.logger.error('Failed to start quiz:', error);
      throw new Error('Failed to start quiz');
    }
  }

  async answerQuiz(
    gameId: string,
    quizId: string,
    questionId: string,
    answer: string,
    accountId: string,
  ) {
    try {
      const history = await this.prisma.history.findUnique({
        where: {
          hisyoryId: gameId,
          quiz: {
            quizId,
          },
          timeEnded: null,
          account: { accountId },
        },
        include: {
          quiz: { include: { Question: true, _count: true } },
          Answer: true,
        },
      });

      const question = await this.prisma.question.findUnique({
        where: {
          questionId,
        },
      });

      if (!history) {
        throw new NotFoundException('History not found');
      }

      const isCorrect = question.answer === answer;

      const answered = await this.prisma.answer.create({
        data: {
          history: {
            connect: {
              hisyoryId: history.hisyoryId,
            },
          },
          question: {
            connect: {
              questionId: question.questionId,
            },
          },
          answer,
          isCorrect,
        },
      });

      return {
        gameId: history.hisyoryId,
        answerId: answered.answerId,
        answer: answered.answer,
        isCorrect: answered.isCorrect,
      };
    } catch (error) {
      this.logger.error('Failed to start quiz:', error);
      throw new Error('Failed to start quiz');
    }
  }

  update(id: number, updateQuizDto: UpdateQuizDto) {
    return `This action updates a #${id} quiz`;
  }

  remove(id: number) {
    return `This action removes a #${id} quiz`;
  }
}
