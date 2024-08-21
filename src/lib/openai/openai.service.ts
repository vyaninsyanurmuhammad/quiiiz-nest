import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
    const system_prompt = `Anda adalah AI yang dapat menghasilkan ${amount} soal pilihan ganda beserta jawabannya. Panjang setiap jawaban tidak boleh lebih dari 15 kata. Simpan semua jawaban, pertanyaan, dan opsi dalam array JSON.`;
    const questions_prompt = `\nSilakan buat soal pilihan ganda tingkat sulit yang acak tentang ${topic}`;
    const output_format = {
      question: 'pertanyaan',
      answer: 'jawaban dengan panjang maksimal 15 kata',
      options: [
        'opsi1 dengan panjang maksimal 15 kata',
        'opsi2 dengan panjang maksimal 15 kata',
        'opsi3 dengan panjang maksimal 15 kata',
        'opsi4 dengan panjang maksimal 15 kata',
      ],
    };
    const output_format_prompt =
      `\nSilakan hasilkan output dalam format JSON berikut:` +
      `\n${JSON.stringify(output_format)}` +
      `\nJangan menambahkan tanda kutip atau karakter escape \\ di dalam field output.` +
      `\nJika field output berupa daftar (list), klasifikasikan output ke dalam elemen terbaik dari daftar.`;

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
        let res = response.response.text() || '';

        // Hapus blok kode ```json dan ``` jika ada
        res = res.replace(/```json|```/g, '').trim();

        // console.log(res); // Debugging: lihat hasil yang sudah dibersihkan

        // Perbaiki JSON yang mungkin tidak valid
        const correctedJsonString = res.trim().replace(/,\s*]$/, ']');
        quiz = JSON.parse(correctedJsonString);

        if (this.validateQuizFormat(quiz)) {
          return quiz as QuestionDto[];
        }
      } catch (error) {
        if (error.message.includes('SAFETY')) {
          console.warn('Kesalahan keamanan terjadi, mencoba ulang...');
          throw new HttpException(
            'Failed to generate quiz',
            HttpStatus.BAD_REQUEST, // Correct status code
          );
        } else {
          console.error('Error generating quiz:', error);
        }
      }

      attempts++;
    }

    throw new HttpException(
      'Gagal menghasilkan kuis dalam format yang benar setelah beberapa kali percobaan karena batasan keamanan.',
      HttpStatus.CONFLICT,
    );
  }
}
