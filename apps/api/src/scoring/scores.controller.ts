import { Controller, Post } from '@nestjs/common';
import { ScoresService } from './scores.service';

@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Post('recompute')
  recompute() {
    return this.scoresService.recomputeAll();
  }
}
