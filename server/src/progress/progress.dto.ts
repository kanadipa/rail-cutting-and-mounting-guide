import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

/** One mount step: from the count the screen shows to the count it wants. */
export class StepDto {
  @IsInt()
  @Min(0)
  from!: number;

  @IsInt()
  @Min(0)
  to!: number;
}

export class ResetDto {
  /** The operator confirmed that the mounted parts come off. */
  @IsOptional()
  @IsBoolean()
  confirmReset?: boolean;
}
