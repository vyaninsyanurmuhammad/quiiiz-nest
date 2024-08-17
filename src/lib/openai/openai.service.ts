import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { QuestionDto } from './dto/question.dto';
import { CreateQuizDto } from 'src/quiz/dto/create-quiz.dto';

@Injectable()
export class OpenaiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generatePrompt(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent([prompt]);

      return result.response.text();
    } catch (error) {
      console.error('Error generating prompt:', error);
      throw new Error('Failed to generate prompt');
    }
  }

  private validateQuizFormat(quiz: any): quiz is QuestionDto[] {
    if (!Array.isArray(quiz)) return false;

    for (const item of quiz) {
      if (
        typeof item.question !== 'string' ||
        typeof item.answer !== 'string' ||
        !Array.isArray(item.options) ||
        item.options.length !== 4 ||
        !item.options.every((option) => typeof option === 'string')
      ) {
        return false;
      }
    }
    return true;
  }

  async generateQuiz(createQuizDto: CreateQuizDto): Promise<QuestionDto[]> {
    const { topic, amount } = createQuizDto;
    const system_prompt = `You are a helpful AI that is able to generate ${amount} mcq questions and answers, the length of each answer should not be more than 15 words. Store all answers, questions, and options in a JSON array.`;
    const questions_prompt = `\nYou are to generate a random hard mcq question about ${topic}`;
    const output_format = {
      question: 'question',
      answer: 'answer with max length of 15 words',
      options: [
        'option1 with max length of 15 words',
        'option2 with max length of 15 words',
        'option3 with max length of 15 words',
        'option4 with max length of 15 words',
      ],
    };
    const output_format_prompt =
      `\nYou are to output the following in json format: ${JSON.stringify(
        output_format,
      )}. \nDo not put quotation marks or escape character \\ in the output fields.` +
      `\nIf output field is a list, classify output into the best element of the list.` +
      `\nGenerate a list of JSON, one JSON for each input element.`;

    const final_output_format_prompt =
      system_prompt + questions_prompt + output_format_prompt;

    let quiz;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const response = await this.model.generateContent(
          final_output_format_prompt,
        );

        const res = response.response.text() || '';
        const correctedJsonString = res.trim().replace(/,\s*]$/, ']');
        quiz = JSON.parse(correctedJsonString);

        if (this.validateQuizFormat(quiz)) {
          return quiz as QuestionDto[];
        }
      } catch (error) {
        if (error.message.includes('SAFETY')) {
          console.warn('Safety error occurred, retrying...');
        } else {
          console.error('Error generating quiz:', error);
          throw new Error('Failed to generate quiz');
        }
      }

      attempts++;
    }

    throw new Error(
      'Failed to generate quiz in the correct format after multiple attempts due to safety constraints.',
    );
  }
}
