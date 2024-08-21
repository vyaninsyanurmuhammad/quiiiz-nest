import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateQuizDto,
  OutputCreateQuizDto,
  OutputQuestionDto,
} from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { OpenaiService } from 'src/lib/openai/openai.service';
import { QuestionDto } from 'src/lib/openai/dto/question.dto';
import { PrismaService } from 'src/prisma.service';
import { capitalizeWords } from 'src/utils/text.util';
import { formatTimeDelta } from 'src/utils/date-time.utils';
import { differenceInSeconds } from 'date-fns';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private openaiService: OpenaiService,
    private prisma: PrismaService,
  ) {}

  async create(createQuizDto: CreateQuizDto): Promise<OutputCreateQuizDto> {
    const questions = await this.openaiService.generateQuiz(createQuizDto);

    try {
      const { topic } = createQuizDto;

      const lowerCaseTopic = topic.toLowerCase();

      const data = questions.map((q) => {
        return {
          ...q,
          options: JSON.stringify(q.options),
        };
      });

      const quiz = await this.prisma.quiz.create({
        data: {
          topic: lowerCaseTopic,
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
        topic: capitalizeWords(quiz.topic),
        amount: quiz._count.Question,
      };

      return result;
    } catch (error) {
      this.logger.error('Failed to create quiz:', error.message);
      this.logger.error(error.stack);
      throw new HttpException(
        'Failed to create quiz',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll() {
    const quiz = await this.prisma.quiz.findMany({
      include: { _count: true },
    });

    const result = quiz.map((data) => {
      return {
        quizId: data.quizId,
        topic: capitalizeWords(data.topic),
        amount: data._count.Question,
      };
    });

    return result;
  }

  async findOne(id: string): Promise<OutputCreateQuizDto> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { quizId: id },
      include: { _count: true },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');
    return {
      quizId: quiz.quizId,
      topic: capitalizeWords(quiz.topic),
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
        topic: capitalizeWords(history.quiz.topic),
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
      throw new HttpException(
        'Failed to start quiz',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
        topic: capitalizeWords(historyUpdated.quiz.topic),
        score: historyUpdated.score,
        timeStarted: historyUpdated.timeStarted,
        timeEnded: historyUpdated.timeEnded,
      };
    } catch (error) {
      this.logger.error('Failed to start quiz:', error);
      throw new HttpException(
        'Failed to finish quiz',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
        correctAnswer: question.answer,
        isCorrect: answered.isCorrect,
      };
    } catch (error) {
      this.logger.error('Failed to answer quiz:', error);
      throw new HttpException(
        'Failed to answer quiz',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllTopic() {
    try {
      const quiz = await this.prisma.quiz.findMany({});

      const seen = {};

      quiz.forEach((value) => {
        seen[value.topic] = (seen[value.topic] || 0) + 1;
      });

      const result: { text: string; value: number }[] = [];

      for (const key in seen) {
        result.push({ text: capitalizeWords(key), value: seen[key] });
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to start quiz:', error);
      throw new HttpException(
        'Failed to find all quiz topic',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async summary(quizId: string, accountId: string) {
    try {
      const quiz = await this.prisma.quiz.findUnique({
        where: {
          quizId,
        },
      });

      const history = await this.prisma.history.findMany({
        where: {
          quiz: {
            quizId,
          },
          timeEnded: {
            not: {
              equals: null,
            },
          },
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

      // Map the history and calculate the duration
      const historyList = history.map((data) => {
        const secondsPassed = differenceInSeconds(
          data.timeEnded,
          data.timeStarted,
        );

        const duration = formatTimeDelta(secondsPassed);

        return {
          gameId: data.hisyoryId,
          quizId: data.quiz.quizId,
          score: data.score,
          durationSeconds: secondsPassed, // For sorting and ranking
          duration, // Formatted duration for return
          timeStarted: data.timeStarted,
          timeEnded: data.timeEnded,
          medal: null, // Default to null, will be filled with ranking number
        };
      });

      // Get the top score (highest score with the best duration)
      const topScore =
        historyList.sort((a, b) => {
          const aValue = a.durationSeconds - a.score;
          const bValue = b.durationSeconds - b.score;
          return aValue - bValue; // Sort so smaller values come first (better ranking)
        })[0] || null;

      // Sort by timeStarted in descending order to get the latest score
      const latestScore =
        historyList.sort((a, b) => {
          return b.timeStarted.getTime() - a.timeStarted.getTime(); // Sort by timeStarted (latest first)
        })[0] || null;

      // Assign rank (starting from 1) to all participants
      historyList
        .sort((a, b) => {
          const aValue = a.durationSeconds - a.score;
          const bValue = b.durationSeconds - b.score;
          return aValue - bValue; // Sort so smaller values come first (better ranking)
        })
        .forEach((data, index) => {
          data.medal = index + 1; // Rank starts from 1
        });

      return {
        topic: capitalizeWords(quiz.topic),
        topScore,
        latestScore,
        summaries: historyList,
      };
    } catch (error) {
      this.logger.error('Failed to start quiz:', error);
      throw new HttpException(
        'Failed to get quiz summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
