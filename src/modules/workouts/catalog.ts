// Встроенный справочник упражнений. Это данные, а не тексты интерфейса, поэтому названия
// на обоих языках лежат здесь, а не в словаре. Id стабильны: на них ссылаются тренировки.
import type { Lang } from '../../i18n'
import type { CustomExercise, Exercise, ExerciseKind, MuscleGroup } from './types'

const W: ExerciseKind = 'weight_reps'
const R: ExerciseKind = 'reps'
const T: ExerciseKind = 'time'
const D: ExerciseKind = 'distance'

type Row = readonly [id: string, kind: ExerciseKind, ru: string, en: string]

const CATALOG: Record<MuscleGroup, readonly Row[]> = {
  chest: [
    ['bench-press', W, 'Жим штанги лёжа', 'Bench press'],
    ['incline-bench-press', W, 'Жим штанги на наклонной скамье', 'Incline bench press'],
    ['decline-bench-press', W, 'Жим штанги головой вниз', 'Decline bench press'],
    ['dumbbell-bench-press', W, 'Жим гантелей лёжа', 'Dumbbell bench press'],
    ['incline-dumbbell-press', W, 'Жим гантелей на наклонной скамье', 'Incline dumbbell press'],
    ['dumbbell-fly', W, 'Разведение гантелей лёжа', 'Dumbbell fly'],
    ['cable-crossover', W, 'Кроссовер', 'Cable crossover'],
    ['chest-press-machine', W, 'Жим от груди в тренажёре', 'Chest press machine'],
    ['pec-deck', W, 'Бабочка', 'Pec deck'],
    ['pullover', W, 'Пуловер с гантелью', 'Dumbbell pullover'],
    ['push-up', R, 'Отжимания от пола', 'Push-up'],
    ['dips', R, 'Отжимания на брусьях', 'Dips'],
  ],
  back: [
    ['deadlift', W, 'Становая тяга', 'Deadlift'],
    ['pull-up', R, 'Подтягивания', 'Pull-up'],
    ['chin-up', R, 'Подтягивания обратным хватом', 'Chin-up'],
    ['lat-pulldown', W, 'Тяга верхнего блока', 'Lat pulldown'],
    ['barbell-row', W, 'Тяга штанги в наклоне', 'Barbell row'],
    ['dumbbell-row', W, 'Тяга гантели в наклоне', 'Dumbbell row'],
    ['seated-cable-row', W, 'Тяга нижнего блока', 'Seated cable row'],
    ['t-bar-row', W, 'Тяга Т-грифа', 'T-bar row'],
    ['straight-arm-pulldown', W, 'Пуловер на верхнем блоке', 'Straight-arm pulldown'],
    ['face-pull', W, 'Тяга каната к лицу', 'Face pull'],
    ['shrug', W, 'Шраги', 'Shrug'],
    ['rack-pull', W, 'Тяга с плинтов', 'Rack pull'],
    ['good-morning', W, 'Наклоны со штангой', 'Good morning'],
    ['hyperextension', R, 'Гиперэкстензия', 'Back extension'],
  ],
  legs: [
    ['squat', W, 'Приседания со штангой', 'Squat'],
    ['front-squat', W, 'Фронтальные приседания', 'Front squat'],
    ['goblet-squat', W, 'Гоблет-приседания', 'Goblet squat'],
    ['hack-squat', W, 'Гакк-приседания', 'Hack squat'],
    ['leg-press', W, 'Жим ногами', 'Leg press'],
    ['lunge', W, 'Выпады', 'Lunge'],
    ['bulgarian-split-squat', W, 'Болгарские выпады', 'Bulgarian split squat'],
    ['step-up', W, 'Зашагивания на платформу', 'Step-up'],
    ['romanian-deadlift', W, 'Румынская тяга', 'Romanian deadlift'],
    ['sumo-deadlift', W, 'Становая тяга сумо', 'Sumo deadlift'],
    ['leg-extension', W, 'Разгибание ног в тренажёре', 'Leg extension'],
    ['leg-curl', W, 'Сгибание ног в тренажёре', 'Leg curl'],
    ['hip-thrust', W, 'Ягодичный мост', 'Hip thrust'],
    ['glute-kickback', W, 'Отведение ноги назад', 'Glute kickback'],
    ['hip-abduction', W, 'Разведение ног в тренажёре', 'Hip abduction'],
    ['hip-adduction', W, 'Сведение ног в тренажёре', 'Hip adduction'],
    ['calf-raise', W, 'Подъём на носки стоя', 'Standing calf raise'],
    ['seated-calf-raise', W, 'Подъём на носки сидя', 'Seated calf raise'],
    ['bodyweight-squat', R, 'Приседания без веса', 'Bodyweight squat'],
  ],
  shoulders: [
    ['overhead-press', W, 'Жим штанги стоя', 'Overhead press'],
    ['dumbbell-shoulder-press', W, 'Жим гантелей сидя', 'Dumbbell shoulder press'],
    ['arnold-press', W, 'Жим Арнольда', 'Arnold press'],
    ['machine-shoulder-press', W, 'Жим на плечи в тренажёре', 'Machine shoulder press'],
    ['lateral-raise', W, 'Махи гантелями в стороны', 'Lateral raise'],
    ['cable-lateral-raise', W, 'Махи в стороны на блоке', 'Cable lateral raise'],
    ['front-raise', W, 'Подъём гантелей перед собой', 'Front raise'],
    ['rear-delt-fly', W, 'Разведение гантелей в наклоне', 'Rear delt fly'],
    ['reverse-pec-deck', W, 'Обратная бабочка', 'Reverse pec deck'],
    ['upright-row', W, 'Тяга штанги к подбородку', 'Upright row'],
  ],
  arms: [
    ['barbell-curl', W, 'Сгибание рук со штангой', 'Barbell curl'],
    ['dumbbell-curl', W, 'Сгибание рук с гантелями', 'Dumbbell curl'],
    ['hammer-curl', W, 'Молотки', 'Hammer curl'],
    ['preacher-curl', W, 'Сгибание рук на скамье Скотта', 'Preacher curl'],
    ['cable-curl', W, 'Сгибание рук на блоке', 'Cable curl'],
    ['concentration-curl', W, 'Концентрированное сгибание', 'Concentration curl'],
    ['triceps-pushdown', W, 'Разгибание рук на блоке', 'Triceps pushdown'],
    ['skull-crusher', W, 'Французский жим', 'Skull crusher'],
    ['overhead-triceps-extension', W, 'Разгибание рук из-за головы', 'Overhead triceps extension'],
    ['triceps-kickback', W, 'Разгибание руки в наклоне', 'Triceps kickback'],
    ['close-grip-bench-press', W, 'Жим узким хватом', 'Close-grip bench press'],
    ['wrist-curl', W, 'Сгибание кистей', 'Wrist curl'],
    ['bench-dip', R, 'Обратные отжимания от скамьи', 'Bench dip'],
  ],
  core: [
    ['crunch', R, 'Скручивания', 'Crunch'],
    ['sit-up', R, 'Подъём корпуса', 'Sit-up'],
    ['bicycle-crunch', R, 'Велосипед', 'Bicycle crunch'],
    ['hanging-leg-raise', R, 'Подъём ног в висе', 'Hanging leg raise'],
    ['lying-leg-raise', R, 'Подъём ног лёжа', 'Lying leg raise'],
    ['v-up', R, 'Складка', 'V-up'],
    ['russian-twist', R, 'Русские скручивания', 'Russian twist'],
    ['ab-wheel', R, 'Ролик для пресса', 'Ab wheel rollout'],
    ['cable-crunch', W, 'Скручивания на блоке', 'Cable crunch'],
    ['plank', T, 'Планка', 'Plank'],
    ['side-plank', T, 'Боковая планка', 'Side plank'],
    ['mountain-climber', T, 'Скалолаз', 'Mountain climber'],
  ],
  cardio: [
    ['running', D, 'Бег', 'Running'],
    ['treadmill', D, 'Беговая дорожка', 'Treadmill'],
    ['walking', D, 'Ходьба', 'Walking'],
    ['cycling', D, 'Велосипед (улица)', 'Cycling'],
    ['stationary-bike', D, 'Велотренажёр', 'Stationary bike'],
    ['rowing-machine', D, 'Гребной тренажёр', 'Rowing machine'],
    ['swimming', D, 'Плавание', 'Swimming'],
    ['elliptical', T, 'Эллипсоид', 'Elliptical'],
    ['stair-climber', T, 'Степпер', 'Stair climber'],
    ['jump-rope', T, 'Скакалка', 'Jump rope'],
    ['burpee', R, 'Бёрпи', 'Burpee'],
    ['jumping-jack', R, 'Прыжки «звезда»', 'Jumping jack'],
    ['kettlebell-swing', W, 'Махи гирей', 'Kettlebell swing'],
  ],
}

export const MUSCLE_GROUPS = Object.keys(CATALOG) as MuscleGroup[]

/** Встроенные упражнения на нужном языке; id получает префикс b: */
export function builtinExercises(lang: Lang): Exercise[] {
  return MUSCLE_GROUPS.flatMap((muscle) =>
    CATALOG[muscle].map(([id, kind, ru, en]) => ({ id: `b:${id}`, name: lang === 'ru' ? ru : en, muscle, kind })),
  )
}

/** Весь список: встроенные и свои */
export function allExercises(custom: readonly CustomExercise[], lang: Lang): Exercise[] {
  return [...builtinExercises(lang), ...custom.map((c) => ({ ...c, custom: true }))]
}
