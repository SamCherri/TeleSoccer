CREATE TYPE "PlayerCreationStep" AS ENUM (
  'NAME',
  'NATIONALITY',
  'POSITION',
  'DOMINANT_FOOT',
  'HEIGHT_CM',
  'WEIGHT_KG',
  'SKIN_TONE',
  'HAIR_STYLE',
  'CONFIRMATION'
);

ALTER TABLE "PlayerCreationConversation"
ALTER COLUMN "step" TYPE "PlayerCreationStep"
USING CASE "step"
  WHEN 'name' THEN 'NAME'::"PlayerCreationStep"
  WHEN 'nationality' THEN 'NATIONALITY'::"PlayerCreationStep"
  WHEN 'position' THEN 'POSITION'::"PlayerCreationStep"
  WHEN 'dominantFoot' THEN 'DOMINANT_FOOT'::"PlayerCreationStep"
  WHEN 'heightCm' THEN 'HEIGHT_CM'::"PlayerCreationStep"
  WHEN 'weightKg' THEN 'WEIGHT_KG'::"PlayerCreationStep"
  WHEN 'skinTone' THEN 'SKIN_TONE'::"PlayerCreationStep"
  WHEN 'hairStyle' THEN 'HAIR_STYLE'::"PlayerCreationStep"
  WHEN 'confirmation' THEN 'CONFIRMATION'::"PlayerCreationStep"
  ELSE 'NAME'::"PlayerCreationStep"
END;
